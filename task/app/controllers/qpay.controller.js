const db = require("../models");
const Order = db.orders;
const OrderItem = db.order_items;
const Address = db.addresses;
const Product = db.products;
const axios = require('axios');

// QPay credentials - should be in environment variables
const QPAY_LOGIN = process.env.QPAY_LOGIN || 'toor_mn_admin';
const QPAY_PASSWORD = process.env.QPAY_PASSWORD || '7G61nNTM';
const QPAY_BASE_URL = 'https://merchant.qpay.mn/v2';

// Helper function to save address from order (only for authenticated users, non-pickup orders)
const saveAddressFromOrder = async (order) => {
  try {
    // Only save if user is authenticated (not guest) and not pickup
    if (!order.user_id || order.user_id.startsWith('guest_')) {
      return { success: false, reason: 'guest_user' };
    }

    // Skip if pickup order
    if (!order.shipping_address || order.shipping_address === 'Ирж авах' || order.shipping_address.trim() === '') {
      return { success: false, reason: 'pickup_order' };
    }

    // Parse shipping address string to extract components
    // Format: "Улаанбаатар, Дүүрэг: Баянзүрх, Хороо: 15-р хороо, Байр, орц, давхар, тоот"
    const addressParts = order.shipping_address.split(',').map(part => part.trim());
    
    let city = '';
    let district = null;
    let khoroo = null;
    let address = '';

    // First part is usually the city
    if (addressParts.length > 0) {
      city = addressParts[0];
    }

    // Find district (Дүүрэг: ...)
    const districtIndex = addressParts.findIndex(part => part.startsWith('Дүүрэг:'));
    if (districtIndex !== -1) {
      district = addressParts[districtIndex].replace('Дүүрэг:', '').trim();
    }

    // Find khoroo (Хороо: ...)
    const khorooIndex = addressParts.findIndex(part => part.startsWith('Хороо:'));
    if (khorooIndex !== -1) {
      khoroo = addressParts[khorooIndex].replace('Хороо:', '').trim();
    }

    // Everything after district/khoroo is the detailed address
    const addressStartIndex = Math.max(
      districtIndex !== -1 ? districtIndex + 1 : 0,
      khorooIndex !== -1 ? khorooIndex + 1 : 0,
      1 // At least start from index 1 (after city)
    );
    
    if (addressParts.length > addressStartIndex) {
      address = addressParts.slice(addressStartIndex).join(', ').trim();
    } else {
      // Fallback: if no detailed address found, use the full string minus city/district/khoroo
      address = order.shipping_address;
    }

    // Validate we have at least city and address
    if (!city || !address) {
      return { success: false, reason: 'invalid_address_format' };
    }

    // Normalize address data for comparison
    const normalizedAddress = {
      city: city.trim(),
      district: district ? district.trim() : null,
      khoroo: khoroo ? khoroo.trim() : null,
      address: address.trim()
    };

    // Check if address already exists for this user
    const whereClause = {
      user_id: order.user_id,
      city: normalizedAddress.city,
      address: normalizedAddress.address,
      district: normalizedAddress.district || null,
      khoroo: normalizedAddress.khoroo || null
    };

    const existingAddress = await Address.findOne({
      where: whereClause
    });

    if (existingAddress) {
      // Address already exists, return success without creating duplicate
      return { 
        success: true, 
        address: existingAddress, 
        isDuplicate: true 
      };
    }

    // Create new address (not set as default)
    const newAddress = await Address.create({
      user_id: order.user_id,
      city: normalizedAddress.city,
      district: normalizedAddress.district,
      khoroo: normalizedAddress.khoroo,
      address: normalizedAddress.address,
      is_default: false
    });

    return { 
      success: true, 
      address: newAddress, 
      isDuplicate: false 
    };
  } catch (error) {
    console.error('Error saving address from order:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Helper function to deduct product stock when payment is successful
const deductProductStock = async (orderItems) => {
  try {
    if (!orderItems || orderItems.length === 0) {
      console.log('No order items to deduct stock for');
      return { success: true, message: 'No items to process' };
    }

    const stockUpdates = [];
    const errors = [];

    for (const item of orderItems) {
      try {
        const productId = item.product_id;
        const quantity = item.quantity || 1;

        if (!productId) {
          console.warn(`Order item ${item.id} has no product_id, skipping stock deduction`);
          continue;
        }

        // Find the product
        const product = await Product.findByPk(productId);
        
        if (!product) {
          console.warn(`Product ${productId} not found for order item ${item.id}`);
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        const currentStock = product.stockQuantity || 0;
        const newStock = Math.max(0, currentStock - quantity); // Ensure stock doesn't go negative

        // Update stock quantity
        await Product.update(
          {
            stockQuantity: newStock,
            inStock: newStock > 0
          },
          {
            where: { id: productId }
          }
        );

        stockUpdates.push({
          productId,
          productName: item.name_mn || item.name,
          quantity,
          oldStock: currentStock,
          newStock
        });

        console.log(`Stock deducted for product ${productId} (${item.name_mn || item.name}): ${currentStock} -> ${newStock} (deducted ${quantity})`);
      } catch (itemError) {
        console.error(`Error deducting stock for order item ${item.id}:`, itemError);
        errors.push({ 
          productId: item.product_id, 
          error: itemError.message 
        });
      }
    }

    return {
      success: errors.length === 0,
      stockUpdates,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error in deductProductStock:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to extract transaction information (ORDERID, Phone, Name) from QPay invoice
const extractTransactionInfo = async (invoiceId, order = null) => {
  try {
    // Initialize with order data if available
    let transactionInfo = {
      ORDERID: order?.order_number || null,
      Phone: order?.phone_number || null,
      Name: order?.customer_name || null
    };

    if (!invoiceId) {
      return transactionInfo;
    }

    // Get invoice details from QPay
    const token = await getQPayToken();
    const invoiceResponse = await axios.get(
      `${QPAY_BASE_URL}/invoice/${invoiceId}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const invoiceData = invoiceResponse.data;
    
    // Extract ORDERID from sender_invoice_no
    if (invoiceData.sender_invoice_no) {
      const orderMatch = invoiceData.sender_invoice_no.match(/ECO_([^_]+)/);
      if (orderMatch) {
        transactionInfo.ORDERID = orderMatch[1];
      } else {
        transactionInfo.ORDERID = invoiceData.sender_invoice_no;
      }
    }
    
    // Extract Name and Phone from invoice_receiver_data
    if (invoiceData.invoice_receiver_data) {
      const receiverData = invoiceData.invoice_receiver_data;
      if (receiverData.name) {
        transactionInfo.Name = receiverData.name;
      }
      if (receiverData.phone) {
        transactionInfo.Phone = receiverData.phone;
      }
      if (receiverData.register && !transactionInfo.Phone) {
        transactionInfo.Phone = receiverData.register;
      }
    }

    return transactionInfo;
  } catch (error) {
    // If invoice fetch fails, return order data if available
    console.log('Could not fetch invoice details for transaction info:', error.message);
    return {
      ORDERID: order?.order_number || null,
      Phone: order?.phone_number || null,
      Name: order?.customer_name || null
    };
  }
};

// Get QPay access token
async function getQPayToken() {
  try {
    const response = await axios.post(
      `${QPAY_BASE_URL}/auth/token`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${QPAY_LOGIN}:${QPAY_PASSWORD}`).toString('base64')}`
        }
      }
    );

    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
    throw new Error('Failed to get QPay token');
  } catch (error) {
    console.error('QPay token error:', error.response?.data || error.message);
    throw new Error(`QPay authentication failed: ${error.response?.data?.message || error.message}`);
  }
}

// Create QPay invoice for checkout order
exports.createCheckoutInvoice = async (req, res) => {
  try {
    const { orderId, amount, description, invoiceData: requestInvoiceData } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Order ID and amount are required' 
      });
    }

    // Find the order
    const order = await Order.findOne({
      where: { id: orderId },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Update order with invoice data if provided
    if (requestInvoiceData) {
      try {
        // Get existing invoice_data if any
        let existingInvoiceData = null;
        if (order.invoice_data) {
          try {
            existingInvoiceData = typeof order.invoice_data === 'string' 
              ? JSON.parse(order.invoice_data) 
              : order.invoice_data;
          } catch (e) {
            console.warn('Error parsing existing invoice_data:', e);
          }
        }

        // Merge invoice data
        const updatedInvoiceData = {
          ...existingInvoiceData,
          invoiceType: requestInvoiceData.invoiceType || null,
          register: requestInvoiceData.register || null,
          orgName: requestInvoiceData.orgName || null,
        };

        await order.update({
          invoice_data: JSON.stringify(updatedInvoiceData),
          updated_at: new Date()
        });
      } catch (updateError) {
        console.error('Error updating order with invoice data:', updateError);
        // Continue with invoice creation even if update fails
      }
    }

    // Get QPay token
    const token = await getQPayToken();

    // Generate unique invoice number
    const senderInvoiceNo = `ECO_${order.order_number}_${Date.now()}`;
    const invoiceCode = process.env.QPAY_INVOICE_CODE || 'TOOR_MN_INVOICE';
    const invoiceReceiverCode = process.env.QPAY_RECEIVER_CODE || 'DEFAULT_COM_ID';

    // Create invoice in QPay with timeout and error handling
    const invoiceResponse = await axios.post(
      `${QPAY_BASE_URL}/invoice`,
      {
        invoice_code: invoiceCode,
        sender_invoice_no: senderInvoiceNo,
        invoice_receiver_code: invoiceReceiverCode,
        invoice_description: `${order.phone_number}, ${order.customer_name}${description ? ` - ${description}` : ''}`,
        amount: parseFloat(amount)
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000 // 30 second timeout to prevent hanging
      }
    );

    if (!invoiceResponse.data || !invoiceResponse.data.invoice_id) {
      throw new Error('Failed to create QPay invoice');
    }

    const invoiceData = invoiceResponse.data;

    // Optimize QR image: Only store if it's a URL (not base64), or limit base64 size
    // Never store large base64 images in database to prevent memory issues
    let qrImageToStore = null;
    try {
      if (invoiceData.qr_image && typeof invoiceData.qr_image === 'string') {
        // If it's a URL, store it (most memory efficient)
        if (invoiceData.qr_image.startsWith('http://') || invoiceData.qr_image.startsWith('https://')) {
          qrImageToStore = invoiceData.qr_image;
        } 
        // If it's base64, only store if it's very small (less than 30KB base64 = ~22KB image)
        // Base64 is ~33% larger than binary, so 30KB base64 ≈ 22KB image
        else if (invoiceData.qr_image.length < 30000) {
          qrImageToStore = invoiceData.qr_image;
        } else {
          // For large base64 images, don't store - we'll use qr_text to generate QR instead
          console.warn(`QR image too large (${invoiceData.qr_image.length} chars), not storing. Will use qr_text instead.`);
          qrImageToStore = null;
        }
      }
    } catch (qrError) {
      console.error('Error processing QR image:', qrError);
      qrImageToStore = null; // Don't store if there's any error
    }

    // Update order with QPay invoice information
    // Use try-catch to prevent database update from crashing
    try {
      await order.update({
        invoice_id: invoiceData.invoice_id,
        qr_image: qrImageToStore,
        qr_text: invoiceData.qr_text || null,
        updated_at: new Date()
      });
    } catch (updateError) {
      console.error('Error updating order with QR image:', updateError);
      // Try updating without qr_image if update fails
      try {
        await order.update({
          invoice_id: invoiceData.invoice_id,
          qr_text: invoiceData.qr_text || null,
          updated_at: new Date()
        });
      } catch (retryError) {
        console.error('Error updating order without QR image:', retryError);
        throw retryError;
      }
    }

    // Reload order to get updated data (exclude qr_image from response to save memory)
    const updatedOrder = await Order.findOne({
      where: { id: orderId },
      include: [{ model: OrderItem, as: 'items' }],
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from order response
      }
    });

    // Convert order to plain object and ensure qr_image is not included
    const orderData = updatedOrder ? updatedOrder.toJSON() : null;
    if (orderData) {
      delete orderData.qr_image; // Ensure it's not in the response
    }

    // Only include qr_image in invoice if it's a URL or small enough
    // Use try-catch to prevent response from crashing
    let qrImageForResponse = null;
    try {
      if (invoiceData.qr_image && typeof invoiceData.qr_image === 'string') {
        if (invoiceData.qr_image.startsWith('http://') || invoiceData.qr_image.startsWith('https://')) {
          qrImageForResponse = invoiceData.qr_image;
        } else if (invoiceData.qr_image.length < 30000) {
          qrImageForResponse = invoiceData.qr_image;
        }
        // If larger, don't include - frontend will generate from qr_text
      }
    } catch (qrResponseError) {
      console.error('Error processing QR image for response:', qrResponseError);
      qrImageForResponse = null; // Don't include if there's any error
    }

    // Ensure qr_text is always included for fallback QR generation
    const qrText = invoiceData.qr_text || null;

    res.json({
      success: true,
      order: orderData,
      invoice: {
        invoice_id: invoiceData.invoice_id,
        qr_image: qrImageForResponse, // Only include if URL or small base64
        qr_text: qrText, // Always include for fallback QR generation
        qr_code: invoiceData.qr_code || null,
        urls: invoiceData.urls || []
      }
    });
  } catch (error) {
    console.error('Create checkout invoice error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to create invoice';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // If order was created but invoice creation failed, still return order info
    // so frontend can handle gracefully
    if (req.body.orderId) {
      try {
        const order = await Order.findOne({
          where: { id: req.body.orderId },
          include: [{ model: OrderItem, as: 'items' }],
          attributes: {
            exclude: ['qr_image']
          }
        });
        
        if (order) {
          const orderData = order.toJSON();
          delete orderData.qr_image;
          
          return res.status(500).json({
            success: false,
            error: 'Failed to create invoice',
            message: errorMessage,
            order: orderData // Include order so frontend can retry
          });
        }
      } catch (orderError) {
        console.error('Error fetching order after invoice failure:', orderError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create invoice',
      message: errorMessage
    });
  }
};

// Check payment status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Find order by invoice ID (exclude qr_image to save memory)
    const order = await Order.findOne({
      where: { invoice_id: invoiceId },
      include: [{ model: OrderItem, as: 'items' }],
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from response
      }
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Get QPay token
    const token = await getQPayToken();

    // Check payment status in QPay
    const checkResponse = await axios.post(
      `${QPAY_BASE_URL}/payment/check`,
      {
        object_type: 'INVOICE',
        object_id: invoiceId,
        offset: {
          page_number: 1,
          page_limit: 100
        }
      },
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentData = checkResponse.data;
    let paymentStatus = 'PENDING';
    let isPaid = false;

    if (paymentData.rows && paymentData.rows.length > 0) {
      const payment = paymentData.rows[0];
      paymentStatus = payment.payment_status || 'PENDING';
      isPaid = paymentStatus === 'PAID';
    }
    
    // Extract transaction information: ORDERID, Phone, Name
    const transactionInfo = await extractTransactionInfo(invoiceId, order);
    
    // Also check payment data rows for additional transaction info
    if (paymentData.rows && paymentData.rows.length > 0) {
      const payment = paymentData.rows[0];
      
      // Extract transaction data from QPay payment response
      if (payment.customer_name || payment.customer_name_mn) {
        transactionInfo.Name = payment.customer_name || payment.customer_name_mn || transactionInfo.Name;
      }
      if (payment.phone || payment.phone_number || payment.customer_phone) {
        transactionInfo.Phone = payment.phone || payment.phone_number || payment.customer_phone || transactionInfo.Phone;
      }
      if (payment.sender_invoice_no && !transactionInfo.ORDERID) {
        const orderMatch = payment.sender_invoice_no.match(/ECO_([^_]+)/);
        if (orderMatch) {
          transactionInfo.ORDERID = orderMatch[1];
        }
      }
    }

    // Update order status if paid
    if (isPaid && order.payment_status !== 1) {
      await order.update({ 
        payment_status: 1, // 1 = Paid
        updated_at: new Date()
      });
      order.payment_status = 1;

      // Reload order with items for stock deduction and address save
      const orderWithItems = await Order.findOne({
        where: { id: order.id },
        include: [{ model: OrderItem, as: 'items' }]
      });

      // Deduct product stock when QPay payment is successful (direct payment)
      if (orderWithItems && orderWithItems.items && orderWithItems.items.length > 0) {
        const stockResult = await deductProductStock(orderWithItems.items);
        if (stockResult.success) {
          console.log(`Stock deducted successfully for order ${order.id} after QPay payment`);
        } else {
          console.warn(`Stock deduction had errors for order ${order.id}:`, stockResult.errors);
        }
      }

      // Save address when QPay payment is successful (for authenticated users, non-pickup orders)
      if (orderWithItems) {
        saveAddressFromOrder(orderWithItems).then(result => {
          if (result.success) {
            if (result.isDuplicate) {
              console.log('Address already exists for user when QPay payment succeeded for order:', order.order_number);
            } else {
              console.log('Address saved successfully when QPay payment succeeded for order:', order.order_number);
            }
          } else {
            if (result.reason !== 'guest_user' && result.reason !== 'pickup_order') {
              console.warn('Failed to save address when QPay payment succeeded for order:', order.order_number, result.reason || result.error);
            }
          }
        }).catch(err => {
          console.error('Error saving address when QPay payment succeeded:', err);
        });
      }
    }

    // Convert order to plain object and ensure qr_image is not included
    const orderData = order ? order.toJSON() : null;
    if (orderData) {
      delete orderData.qr_image; // Ensure it's not in the response
    }

    res.json({
      success: true,
      order: orderData,
      payment: {
        status: paymentStatus,
        isPaid,
        data: paymentData
      },
      transaction: {
        ORDERID: transactionInfo.ORDERID,
        Phone: transactionInfo.Phone,
        Name: transactionInfo.Name
      }
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status',
      message: error.response?.data?.message || error.message
    });
  }
};

// Webhook endpoint for QPay payment notifications
exports.paymentWebhook = async (req, res) => {
  try {
    const { object_type, object_id, payment_status } = req.body;

    if (object_type !== 'INVOICE' || !object_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid webhook data' 
      });
    }

    // Find order by invoice ID (exclude qr_image to save memory)
    const order = await Order.findOne({
      where: { invoice_id: object_id },
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from response
      }
    });

    if (!order) {
      console.warn(`Order not found for invoice ID: ${object_id}`);
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Update order status based on payment status
    if (payment_status === 'PAID' && order.payment_status !== 1) {
      await order.update({ 
        payment_status: 1, // 1 = Paid
        updated_at: new Date()
      });
      console.log(`Order ${order.id} marked as paid via webhook`);

      // Reload order with items for stock deduction and address save
      const orderWithItems = await Order.findOne({
        where: { id: order.id },
        include: [{ model: OrderItem, as: 'items' }]
      });

      // Deduct product stock when QPay payment is successful via webhook (direct payment)
      if (orderWithItems && orderWithItems.items && orderWithItems.items.length > 0) {
        const stockResult = await deductProductStock(orderWithItems.items);
        if (stockResult.success) {
          console.log(`Stock deducted successfully for order ${order.id} via QPay webhook`);
        } else {
          console.warn(`Stock deduction had errors for order ${order.id} via webhook:`, stockResult.errors);
        }
      }

      // Save address when QPay payment is successful via webhook (for authenticated users, non-pickup orders)
      if (orderWithItems) {
        saveAddressFromOrder(orderWithItems).then(result => {
          if (result.success) {
            if (result.isDuplicate) {
              console.log('Address already exists for user when QPay payment succeeded via webhook for order:', order.order_number);
            } else {
              console.log('Address saved successfully when QPay payment succeeded via webhook for order:', order.order_number);
            }
          } else {
            if (result.reason !== 'guest_user' && result.reason !== 'pickup_order') {
              console.warn('Failed to save address when QPay payment succeeded via webhook for order:', order.order_number, result.reason || result.error);
            }
          }
        }).catch(err => {
          console.error('Error saving address when QPay payment succeeded via webhook:', err);
        });
      }
    } else if (payment_status === 'CANCELLED' && order.payment_status !== 2) {
      await order.update({ 
        payment_status: 2, // 2 = Failed/Cancelled
        updated_at: new Date()
      });
      console.log(`Order ${order.id} marked as cancelled via webhook`);
    }

    // Extract transaction information: ORDERID, Phone, Name
    const transactionInfo = await extractTransactionInfo(object_id, order);

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      orderId: order.id,
      status: order.payment_status,
      transaction: {
        ORDERID: transactionInfo.ORDERID,
        Phone: transactionInfo.Phone,
        Name: transactionInfo.Name
      }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message
    });
  }
};

// Get order by invoice ID
exports.getOrderByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Find order by invoice ID (exclude qr_image to save memory)
    const order = await Order.findOne({
      where: { invoice_id: invoiceId },
      include: [{ model: OrderItem, as: 'items' }],
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from response
      }
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Extract transaction information: ORDERID, Phone, Name
    const transactionInfo = await extractTransactionInfo(invoiceId, order);

    // Convert order to plain object and ensure qr_image is not included
    const orderData = order ? order.toJSON() : null;
    if (orderData) {
      delete orderData.qr_image; // Ensure it's not in the response
    }

    res.json({
      success: true,
      order: orderData,
      transaction: {
        ORDERID: transactionInfo.ORDERID,
        Phone: transactionInfo.Phone,
        Name: transactionInfo.Name
      }
    });
  } catch (error) {
    console.error('Get order by invoice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order',
      message: error.message
    });
  }
};

// Get all QPay payments (orders with invoice_id)
exports.getAllPayments = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { page = 1, limit = 1000, status } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = {
      [Op.and]: [
        { invoice_id: { [Op.ne]: null } },
        { invoice_id: { [Op.ne]: '' } }
      ]
    };

    // Map status filter to payment_status
    if (status === 'paid') {
      whereCondition.payment_status = 1;
    } else if (status === 'pending') {
      whereCondition.payment_status = 0;
    } else if (status === 'cancelled') {
      whereCondition.payment_status = 2;
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereCondition,
      include: [{ model: OrderItem, as: 'items' }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image to save memory
      }
    });

    // Map orders to QPay payment format
    const payments = rows.map(order => {
      const orderData = order.toJSON();
      
      // Determine status based on payment_status and order age
      let paymentStatus = 'pending';
      if (orderData.payment_status === 1) {
        paymentStatus = 'paid';
      } else if (orderData.payment_status === 2) {
        paymentStatus = 'cancelled';
      } else {
        // Check if invoice is expired (older than 30 minutes)
        const createdAt = new Date(orderData.created_at);
        const now = new Date();
        const diffMinutes = (now - createdAt) / (1000 * 60);
        if (diffMinutes > 30) {
          paymentStatus = 'expired';
        }
      }

      // Get description from order items
      const description = orderData.items && orderData.items.length > 0
        ? orderData.items.map(item => `${item.name_mn || item.name} x${item.quantity}`).join(', ')
        : 'Захиалга';

      return {
        id: orderData.id.toString(),
        invoice_id: orderData.invoice_id || orderData.order_number,
        amount: parseFloat(orderData.grand_total) || 0,
        status: paymentStatus,
        description: description,
        customer_name: orderData.customer_name || 'Хэрэглэгч',
        customer_phone: orderData.phone_number || '',
        created_at: orderData.created_at ? new Date(orderData.created_at).toLocaleString('mn-MN') : '',
        paid_at: orderData.payment_status === 1 && orderData.updated_at 
          ? new Date(orderData.updated_at).toLocaleString('mn-MN') 
          : null,
        qpay_invoice_id: orderData.invoice_id || '',
        payment_url: orderData.invoice_id ? `https://qpay.mn/pay/${orderData.invoice_id}` : '',
        qr_image: orderData.qr_text ? `data:image/png;base64,${orderData.qr_text}` : '/api/placeholder/100/100',
        order_number: orderData.order_number
      };
    });

    res.json({
      success: true,
      payments: payments,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get all QPay payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payments',
      message: error.message
    });
  }
};

