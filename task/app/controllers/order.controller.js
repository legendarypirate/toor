const db = require("../models");
const Order = db.orders;
const OrderItem = db.order_items;
const Address = db.addresses;
const Coupon = db.coupons;
const CouponUsage = db.coupon_usage;
const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD${year}${month}${day}${random}`;
};

// Helper function to clean order data for API responses (remove large qr_image to save memory)
const cleanOrderData = (order) => {
  if (!order) return null;
  
  const orderData = order.toJSON ? order.toJSON() : order;
  
  // Remove qr_image if it's a large base64 string (keep if it's a URL)
  if (orderData.qr_image) {
    // Only keep if it's a URL or small base64 (< 50KB)
    if (!orderData.qr_image.startsWith('http://') && 
        !orderData.qr_image.startsWith('https://') && 
        orderData.qr_image.length > 50000) {
      delete orderData.qr_image;
    }
  }
  
  return orderData;
};

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

// Create and Save a new Order
exports.create = (req, res) => {
  // Validate request
  if (!req.body.items || !req.body.items.length) {
    res.status(400).json({
      success: false,
      message: "Захиалгын бараа хоосон байна!"
    });
    return;
  }

  // Create an Order
  const transaction = db.sequelize.transaction().then(t => {
    const orderData = {
      order_number: generateOrderNumber(),
      user_id: req.body.userId || `guest_${Date.now()}`,
      subtotal: req.body.subtotal || 0,
      shipping_cost: req.body.shippingCost || 5000,
      tax: req.body.tax || 0,
      grand_total: req.body.grandTotal || 0,
      payment_method: req.body.paymentMethod || 0,
      payment_status: 0,
      order_status: 0,
      shipping_address: req.body.shippingAddress || "Хаяг оруулна уу",
      district: req.body.district || null,
      khoroo: req.body.khoroo || null,
      phone_number: req.body.phoneNumber || "Утасны дугаар оруулна уу",
      customer_name: req.body.customerName || "Хэрэглэгч",
      notes: req.body.notes,
      invoice_data: req.body.invoiceData ? JSON.stringify(req.body.invoiceData) : null,
      created_at: new Date(),
      updated_at: new Date()
    };

    return Order.create(orderData, { transaction: t })
      .then(order => {
        // Create order items
        const orderItems = req.body.items.map(item => ({
          order_id: order.id,
          product_id: item.productId || "",
          name: item.name || "Бараа",
          name_mn: item.nameMn || item.name || "Бараа",
          price: item.price || 0,
          quantity: item.quantity || 1,
          image: item.image || null,
          sku: item.sku || null,
          created_at: new Date()
        }));

        return OrderItem.bulkCreate(orderItems, { transaction: t })
          .then(() => {
            // Get the full order first, then commit transaction
            // Record coupon usage AFTER transaction commits to avoid aborting main transaction
            return Order.findOne({
              where: { id: order.id },
              include: [{ model: OrderItem, as: "items" }],
              transaction: t,
              attributes: {
                exclude: ['qr_image'] // Exclude large qr_image from response to save memory
              }
            });
          })
          .then(fullOrder => {
            // Commit the main transaction first
            return t.commit().then(() => {
              // Now record coupon usage in a separate transaction (after order is committed)
              // This way, if coupon usage fails, the order is still created
              if (req.body.couponId && req.body.couponDiscount) {
                // Validate that the coupon exists before trying to record usage
                return Coupon.findByPk(req.body.couponId)
                  .then(coupon => {
                    if (!coupon) {
                      console.warn(`Coupon with id ${req.body.couponId} not found, skipping coupon usage recording`);
                      return fullOrder;
                    }
                    
                    // Coupon exists, record usage in a separate transaction
                    return CouponUsage.create({
                      coupon_id: req.body.couponId,
                      user_id: orderData.user_id,
                      order_id: order.id,
                      discount_amount: req.body.couponDiscount,
                      used_at: new Date()
                    })
                      .then(() => {
                        console.log(`Coupon usage recorded successfully for coupon ${req.body.couponId} and order ${order.id}`);
                        return fullOrder;
                      })
                      .catch(couponError => {
                        // Log error but don't fail the order (it's already committed)
                        console.error("Error recording coupon usage (order already created):", couponError);
                        const isForeignKeyError = couponError.name === 'SequelizeForeignKeyConstraintError' ||
                                                 (couponError.parent && couponError.parent.code === '23503');
                        if (isForeignKeyError) {
                          console.warn(`Foreign key constraint error when recording coupon usage for coupon ${req.body.couponId}. Coupon may have been deleted.`);
                        }
                        // Return the order anyway since it's already created
                        return fullOrder;
                      });
                  })
                  .catch(couponCheckError => {
                    // If checking coupon fails, log but return order anyway
                    console.error("Error checking coupon existence (order already created):", couponCheckError);
                    return fullOrder;
                  });
              } else {
                return fullOrder;
              }
            });
          });
      })
      .then(order => {
        const cleanedOrder = cleanOrderData(order);
        res.json({
          success: true,
          message: "Захиалга амжилттай үүслээ!",
          order: cleanedOrder
        });
      })
      .catch(err => {
        return t.rollback().then(() => {
          throw err;
        });
      });
  }).catch(err => {
    console.error("Create order error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Захиалга үүсгэхэд алдаа гарлаа."
    });
  });
};

// Retrieve all Orders from the database by user ID
exports.findAllByUserId = (req, res) => {
  // Get userId from authenticated user (set by verifyToken middleware)
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Нэвтрэх шаардлагатай!"
    });
    return;
  }

  Order.findAll({
    where: { 
      user_id: userId,
      [Op.or]: [
        { isDeleted: false },
        { isDeleted: { [Op.is]: null } }
      ]
    },
    include: [{ model: OrderItem, as: "items" }],
    order: [["created_at", "DESC"]],
    attributes: {
      exclude: ['qr_image'] // Exclude large qr_image from response to save memory
    }
  })
    .then(data => {
      const cleanedData = data.map(order => cleanOrderData(order));
      res.json({
        success: true,
        orders: cleanedData
      });
    })
    .catch(err => {
      console.error("Find orders by user error:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Захиалгуудыг авахад алдаа гарлаа."
      });
    });
};

// Get last delivered order for a user
exports.getLastDeliveredOrder = (req, res) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Нэвтрэх шаардлагатай!"
    });
    return;
  }

  Order.findOne({
    where: { 
      user_id: userId,
      order_status: 2, // 2 = Delivered
      [Op.or]: [
        { isDeleted: false },
        { isDeleted: { [Op.is]: null } }
      ]
    },
    include: [{ model: OrderItem, as: "items" }],
    order: [["created_at", "DESC"]],
    attributes: {
      exclude: ['qr_image'] // Exclude large qr_image from response to save memory
    }
  })
    .then(data => {
      if (data) {
        const cleanedData = cleanOrderData(data);
        res.json({
          success: true,
          order: cleanedData
        });
      } else {
        res.json({
          success: true,
          order: null,
          message: "Хүргэгдсэн захиалга олдсонгүй"
        });
      }
    })
    .catch(err => {
      console.error("Find last delivered order error:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Захиалгыг авахад алдаа гарлаа."
      });
    });
};

// Find a single Order with an id
exports.findOne = async (req, res) => {
  const id = req.params.id;

  try {
    const data = await Order.findOne({
      where: { id: id },
      include: [{ model: OrderItem, as: "items" }],
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from response to save memory
      }
    });

    if (data) {
      const cleanedData = cleanOrderData(data);
      res.json({
        success: true,
        order: cleanedData
      });
    } else {
      res.status(404).json({
        success: false,
        message: `ID-тай захиалга олдсонгүй: ${id}`
      });
    }
  } catch (err) {
    console.error("Find order error:", err);
    
    // Check if error is related to aborted transaction
    if (err.message && err.message.includes('current transaction is aborted')) {
      console.error("CRITICAL: Transaction aborted error detected. This may indicate a previous query failed.");
      // Try to reset the connection by creating a new query
      try {
        await db.sequelize.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error("Error rolling back transaction:", rollbackErr);
      }
    }
    
    res.status(500).json({
      success: false,
      message: `ID-тай захиалгыг авахад алдаа гарлаа: ${id}`,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Find Order by order number
exports.findByOrderNumber = (req, res) => {
  const orderNumber = req.params.orderNumber;

  Order.findOne({
    where: { order_number: orderNumber },
    include: [{ model: OrderItem, as: "items" }],
    attributes: {
      exclude: ['qr_image'] // Exclude large qr_image from response to save memory
    }
  })
    .then(data => {
      if (data) {
        const cleanedData = cleanOrderData(data);
        res.json({
          success: true,
          order: cleanedData
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Захиалгын дугаартай захиалга олдсонгүй: ${orderNumber}`
        });
      }
    })
    .catch(err => {
      console.error("Find order by number error:", err);
      res.status(500).json({
        success: false,
        message: `Захиалгын дугаартай захиалгыг авахад алдаа гарлаа: ${orderNumber}`
      });
    });
};

// Update a Order by the id in the request
exports.update = (req, res) => {
  const id = req.params.id;

  Order.findByPk(id, {
    include: [{ model: OrderItem, as: "items" }]
  })
    .then(order => {
      if (!order) {
        res.status(404).json({
          success: false,
          message: `ID-тай захиалга олдсонгүй: ${id}`
        });
        return null;
      }

      // Check if order is deleted - allow update only if explicitly restoring (isDeleted = false)
      if (order.isDeleted === true && req.body.isDeleted !== false) {
        res.status(400).json({
          success: false,
          message: "Устгагдсан захиалгыг засах боломжгүй. Эхлээд сэргээх хэрэгтэй."
        });
        return null;
      }

      const updateData = {
        updated_at: new Date()
      };

      // Only update fields that are provided
      if (req.body.order_status !== undefined) {
        updateData.order_status = req.body.order_status;
      }
      if (req.body.payment_status !== undefined) {
        updateData.payment_status = req.body.payment_status;
      }
      if (req.body.shipping_address !== undefined) {
        updateData.shipping_address = req.body.shipping_address;
      }
      if (req.body.phone_number !== undefined) {
        updateData.phone_number = req.body.phone_number;
      }
      if (req.body.customer_name !== undefined) {
        updateData.customer_name = req.body.customer_name;
      }
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes;
      }
      if (req.body.district !== undefined) {
        updateData.district = req.body.district;
      }
      if (req.body.khoroo !== undefined) {
        updateData.khoroo = req.body.khoroo;
      }
      if (req.body.isDeleted !== undefined) {
        updateData.isDeleted = req.body.isDeleted;
      }
      if (req.body.invoiceData !== undefined) {
        // invoiceData can be an object or null
        if (req.body.invoiceData && typeof req.body.invoiceData === 'object') {
          updateData.invoice_data = JSON.stringify(req.body.invoiceData);
        } else {
          updateData.invoice_data = null;
        }
      }

      // Handle order items update if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        return Promise.all(
          req.body.items.map(item => {
            if (item.id) {
              // Update existing item
              return OrderItem.update(
                {
                  name: item.name,
                  name_mn: item.nameMn || item.name,
                  price: parseFloat(item.price) || 0,
                  quantity: parseInt(item.quantity) || 1
                },
                { where: { id: item.id, order_id: order.id } }
              );
            } else {
              // Create new item
              return OrderItem.create({
                order_id: order.id,
                product_id: item.productId || "",
                name: item.name || "Бараа",
                name_mn: item.nameMn || item.name || "Бараа",
                price: parseFloat(item.price) || 0,
                quantity: parseInt(item.quantity) || 1,
                image: item.image || null,
                sku: item.sku || null,
                created_at: new Date()
              });
            }
          })
        ).then(() => {
          // Recalculate totals after items update
          return OrderItem.findAll({ where: { order_id: order.id } })
            .then(items => {
              const subtotal = items.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * parseInt(item.quantity));
              }, 0);
              
              const shippingCost = parseFloat(order.shipping_cost) || 5000;
              const tax = parseFloat(order.tax) || 0;
              const grandTotal = subtotal + shippingCost + tax;

              updateData.subtotal = subtotal;
              updateData.grand_total = grandTotal;

              return order.update(updateData);
            });
        });
      } else {
        // No items to update, just update order fields
        return order.update(updateData);
      }
    })
    .then(updatedOrder => {
      if (updatedOrder) {
        // Return order with items
        return Order.findOne({
          where: { id: updatedOrder.id },
          include: [{ model: OrderItem, as: "items" }],
          attributes: {
            exclude: ['qr_image']
          }
        });
      }
      return null;
    })
    .then(fullOrder => {
      if (fullOrder) {
        res.json({
          success: true,
          message: "Захиалга амжилттай шинэчлэгдлээ.",
          order: cleanOrderData(fullOrder)
        });
      }
    })
    .catch(err => {
      console.error("Update order error:", err);
      res.status(500).json({
        success: false,
        message: err.message || `ID-тай захиалга шинэчлэхэд алдаа гарлаа: ${id}`
      });
    });
};

// Update order status only
exports.updateStatus = (req, res) => {
  const id = req.params.id;

  if (req.body.order_status === undefined) {
    res.status(400).json({
      success: false,
      message: "Захиалгын төлөв шаардлагатай!"
    });
    return;
  }

  Order.findByPk(id)
    .then(order => {
      if (!order) {
        res.status(404).json({
          success: false,
          message: `ID-тай захиалга олдсонгүй: ${id}`
        });
        return null;
      }

      // Prepare update data
      const updateData = {
        order_status: req.body.order_status,
        updated_at: new Date()
      };

      // If status is changing to processing (0) and it wasn't processing before, set processing_started_at
      if (req.body.order_status === 0 && order.order_status !== 0 && !order.processing_started_at) {
        updateData.processing_started_at = new Date();
      }

      return order.update(updateData);
    })
    .then(updatedOrder => {
      if (updatedOrder) {
        res.json({
          success: true,
          message: "Захиалгын төлөв амжилттай шинэчлэгдлээ.",
          order: updatedOrder
        });
      }
    })
    .catch(err => {
      console.error("Update order status error:", err);
      res.status(500).json({
        success: false,
        message: err.message || `Захиалгын төлөв шинэчлэхэд алдаа гарлаа: ${id}`
      });
    });
};

// Update payment status only
exports.updatePaymentStatus = (req, res) => {
  const id = req.params.id;

  if (req.body.payment_status === undefined) {
    res.status(400).json({
      success: false,
      message: "Төлбөрийн төлөв шаардлагатай!"
    });
    return;
  }

  Order.findByPk(id)
    .then(order => {
      if (!order) {
        res.status(404).json({
          success: false,
          message: `ID-тай захиалга олдсонгүй: ${id}`
        });
        return null;
      }

      return order.update({
        payment_status: req.body.payment_status,
        updated_at: new Date()
      });
    })
    .then(updatedOrder => {
      if (updatedOrder) {
        res.json({
          success: true,
          message: "Төлбөрийн төлөв амжилттай шинэчлэгдлээ.",
          order: updatedOrder
        });
      }
    })
    .catch(err => {
      console.error("Update payment status error:", err);
      res.status(500).json({
        success: false,
        message: err.message || `Төлбөрийн төлөв шинэчлэхэд алдаа гарлаа: ${id}`
      });
    });
};

// Delete a Order with the specified id in the request (soft delete)
exports.delete = (req, res) => {
  const id = req.params.id;

  Order.findByPk(id)
    .then(order => {
      if (!order) {
        res.status(404).json({
          success: false,
          message: `ID-тай захиалга олдсонгүй: ${id}`
        });
        return;
      }

      // Soft delete: set isDeleted to true
      return order.update({
        isDeleted: true,
        updated_at: new Date()
      });
    })
    .then(() => {
      res.json({
        success: true,
        message: "Захиалга амжилттай устгагдлаа!"
      });
    })
    .catch(err => {
      console.error("Delete order error:", err);
      res.status(500).json({
        success: false,
        message: err.message || `ID-тай захиалга устгахад алдаа гарлаа: ${id}`
      });
    });
};

// Find all Orders (admin)
exports.findAll = (req, res) => {
  const { page = 1, limit = 20, order_status, payment_status, start_date, end_date } = req.query;
  const offset = (page - 1) * limit;

  const whereCondition = {
    // Filter out soft-deleted orders
    [Op.or]: [
      { isDeleted: false },
      { isDeleted: { [Op.is]: null } }
    ]
  };

  if (order_status !== undefined) {
    whereCondition.order_status = order_status;
  }

  if (payment_status !== undefined) {
    whereCondition.payment_status = payment_status;
  }

  // Add date filtering
  if (start_date || end_date) {
    whereCondition.created_at = {};
    if (start_date) {
      // Start of the day
      const startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);
      whereCondition.created_at[Op.gte] = startDate;
    }
    if (end_date) {
      // End of the day
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
      whereCondition.created_at[Op.lte] = endDate;
    }
  }

  Order.findAndCountAll({
    where: whereCondition,
    include: [{ model: OrderItem, as: "items" }],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: parseInt(offset),
    attributes: {
      exclude: ['qr_image'] // Exclude large qr_image from response to save memory
    }
  })
    .then(data => {
      const cleanedRows = data.rows.map(order => cleanOrderData(order));
      res.json({
        success: true,
        orders: cleanedRows,
        total: data.count,
        page: parseInt(page),
        totalPages: Math.ceil(data.count / limit)
      });
    })
    .catch(err => {
      console.error("Find all orders error:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Захиалгуудыг авахад алдаа гарлаа."
      });
    });
};

// Create invoice (update order with invoice/shipping fields)
exports.createInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { address, district, khoroo, phone, invoiceData } = req.body;

    // Find the order (exclude qr_image to save memory)
    const order = await Order.findOne({
      where: { id: orderId },
      include: [{ model: OrderItem, as: "items" }],
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from response to save memory
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Захиалга олдсонгүй"
      });
    }

    // Update order with address and phone if provided
    const updateData = {
      updated_at: new Date()
    };
    
    if (address) {
      updateData.shipping_address = address;
    }
    
    if (district !== undefined) {
      updateData.district = district;
    }
    
    if (khoroo !== undefined) {
      updateData.khoroo = khoroo;
    }
    
    if (phone) {
      updateData.phone_number = phone;
    }
    
    if (invoiceData) {
      // Ensure invoiceNumber and invoiceDate are included in invoice_data
      const enhancedInvoiceData = {
        ...invoiceData,
        invoiceNumber: invoiceData.invoiceNumber || order.order_number || `INV-${order.id}`,
        invoiceDate: invoiceData.invoiceDate || invoiceData.invoice_date || new Date().toISOString().split('T')[0],
        customerRegister: invoiceData.customerRegister || invoiceData.customer_register || invoiceData.register || null,
        customerEmail: invoiceData.customerEmail || invoiceData.customer_email || invoiceData.email || null,
      };
      updateData.invoice_data = JSON.stringify(enhancedInvoiceData);
    }
    
    // Keep order as unpaid - only admin can change payment status to paid
    // Do not update payment_status here - it should remain 0 (unpaid)
    
    await order.update(updateData);

    // Reload order to get updated data (exclude qr_image to save memory)
    const updatedOrder = await Order.findOne({
      where: { id: orderId },
      include: [{ model: OrderItem, as: "items" }],
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from response to save memory
      }
    });

    // Save address when invoice is created (PDF will be downloaded client-side right after)
    // Call asynchronously so it doesn't block the response
    if (updatedOrder) {
      saveAddressFromOrder(updatedOrder).then(result => {
        if (result.success) {
          if (result.isDuplicate) {
            console.log('Address already exists for user when invoice was created for order:', order.order_number);
          } else {
            console.log('Address saved successfully when invoice was created for order:', order.order_number);
          }
        } else {
          // Only log if it's not a guest user or pickup order (expected cases)
          if (result.reason !== 'guest_user' && result.reason !== 'pickup_order') {
            console.warn('Failed to save address when invoice was created for order:', order.order_number, result.reason || result.error);
          }
        }
      }).catch(err => {
        console.error('Error saving address when invoice was created:', err);
      });
    }

    const cleanedOrder = cleanOrderData(updatedOrder || order);
    res.json({
      success: true,
      message: "Нэхэмжлэх амжилттай үүслээ",
      order: cleanedOrder
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Нэхэмжлэх үүсгэхэд алдаа гарлаа"
    });
  }
};

// Generate invoice PDF
exports.generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the order (exclude qr_image to save memory)
    const order = await Order.findOne({
      where: { id: id },
      include: [{ model: OrderItem, as: "items" }],
      attributes: {
        exclude: ['qr_image'] // Exclude large qr_image from response to save memory
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Захиалга олдсонгүй"
      });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.order_number}.pdf`);

    // Register font that supports Cyrillic/Mongolian characters
    // Try to use system fonts that support Cyrillic, or fallback to Helvetica
    try {
      // Try common system fonts that support Cyrillic
      const fontPaths = [
        path.join(__dirname, '../assets/fonts/DejaVuSans.ttf'),
        path.join(__dirname, '../assets/fonts/arial.ttf'),
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/arialuni.ttf',
      ];
      
      let fontRegistered = false;
      for (const fontPath of fontPaths) {
        try {
          if (fs.existsSync(fontPath)) {
            doc.registerFont('CyrillicFont', fontPath);
            doc.font('CyrillicFont');
            fontRegistered = true;
            break;
          }
        } catch (e) {
          // Continue to next font
          continue;
        }
      }
      
      // If no font found, use Helvetica (will show some characters but may have issues with Cyrillic)
      if (!fontRegistered) {
        console.warn('No Cyrillic-supporting font found, using default font. Consider adding DejaVuSans.ttf to app/assets/fonts/');
        doc.font('Helvetica');
      }
    } catch (fontError) {
      console.error('Font registration error:', fontError);
      // Fallback to default font
      doc.font('Helvetica');
    }

    // Pipe PDF to response
    doc.pipe(res);

    // Add content
    doc.fontSize(20).text('НЭХЭМЖЛЭЛ', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Нэхэмжлэлийн дугаар: ${order.id}`, { align: 'left' });
    doc.text(`Захиалгын дугаар: ${order.order_number}`, { align: 'left' });
    doc.moveDown();

    // Company info
    doc.text('Нэхэмжлэгч:', { continued: false });
    doc.text('Байгууллагын нэр: ТЭРГҮҮН ГЭРЭГЭ ХХК', { indent: 20 });
    doc.text('Регистерийн дугаар: 6002536', { indent: 20 });
    doc.text('Хаяг: ХУД, 2-р хороо, Дунд Гол гудамж, Хийморь хотхон, 34 р байр', { indent: 20 });
    doc.text('Утас: 7000-5060, 98015060', { indent: 20 });
    doc.text('Банкны нэр: Тэргүүн гэрэгэ ххк', { indent: 20 });
    doc.text('Дансны дугаар: 26000 500 5003966474', { indent: 20 });
    doc.text('Дансны эзэмшигч: Idersaikhan', { indent: 20 });
    doc.text(`Гүйлгээний утга: ${order.order_number}`, { indent: 20 });
    doc.moveDown();

    // Customer info - use invoice data if available
    let invoiceData = null;
    if (order.invoice_data) {
      try {
        invoiceData = JSON.parse(order.invoice_data);
      } catch (e) {
        console.error('Error parsing invoice_data:', e);
      }
    }
    
    doc.text('Төлөгч тал:', { continued: false });
    
    // Only show organization name if provided in invoice data, leave blank otherwise
    if (invoiceData?.name) {
      doc.text(`Байгууллагын нэр: ${invoiceData.name}`, { indent: 20 });
    } else {
      doc.text('Байгууллагын нэр: ', { indent: 20 });
    }
    
    // Only show address if not pickup
    if (order.shipping_address && order.shipping_address !== 'Ирж авах') {
      doc.text(`Хаяг: ${order.shipping_address}`, { indent: 20 });
    }
    
    // Only show register number if available from invoice data (leave blank if not)
    if (invoiceData?.register) {
      doc.text(`Регистрийн дугаар: ${invoiceData.register}`, { indent: 20 });
    } else {
      doc.text('Регистрийн дугаар: ', { indent: 20 });
    }
    
    // Show email if available from invoice data
    if (invoiceData?.email) {
      doc.text(`Цахим шуудан: ${invoiceData.email}`, { indent: 20 });
    }
    
    doc.text(`Утас: ${invoiceData?.phone || order.phone_number}`, { indent: 20 });
    doc.text(`Нэхэмжилсэн огноо: ${new Date(order.created_at).toLocaleDateString('mn-MN')}`, { indent: 20 });
    doc.moveDown();

    // Items table
    let startY = doc.y;
    doc.fontSize(10);
    
    // Table header
    doc.text('№', 50, startY);
    doc.text('Бүтээгдэхүүн', 80, startY);
    doc.text('Үнийн дүн', 300, startY);
    doc.text('Тоо ширхэг', 380, startY);
    doc.text('Нийт', 450, startY);
    
    startY += 20;
    doc.moveTo(50, startY).lineTo(550, startY).stroke();
    startY += 10;

    // Table rows
    let itemNumber = 1;
    order.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      doc.text(itemNumber.toString(), 50, startY);
      doc.text(item.name_mn || item.name, 80, startY, { width: 200 });
      doc.text(item.price.toLocaleString() + '₮', 300, startY);
      doc.text(item.quantity.toString() + 'ш', 380, startY);
      doc.text(itemTotal.toLocaleString() + '₮', 450, startY);
      startY += 20;
      itemNumber++;
    });

    startY += 10;
    doc.moveTo(50, startY).lineTo(550, startY).stroke();
    startY += 20;

    // Totals
    doc.text('Дүн:', 350, startY);
    doc.text(order.subtotal.toLocaleString() + '₮', 450, startY);
    startY += 20;

    if (order.shipping_cost > 0) {
      doc.text('Хүргэлт:', 350, startY);
      doc.text(order.shipping_cost.toLocaleString() + '₮', 450, startY);
      startY += 20;
    }

    doc.fontSize(12);
    doc.text('Нийт дүн:', 350, startY);
    doc.text(order.grand_total.toLocaleString() + '₮', 450, startY);

    // Save address when PDF is downloaded (for authenticated users, non-pickup orders)
    // Call asynchronously so it doesn't block PDF generation
    saveAddressFromOrder(order).then(result => {
      if (result.success) {
        if (result.isDuplicate) {
          console.log('Address already exists for user when PDF was downloaded for order:', order.order_number);
        } else {
          console.log('Address saved successfully when PDF was downloaded for order:', order.order_number);
        }
      } else {
        // Only log if it's not a guest user or pickup order (expected cases)
        if (result.reason !== 'guest_user' && result.reason !== 'pickup_order') {
          console.warn('Failed to save address when PDF was downloaded for order:', order.order_number, result.reason || result.error);
        }
      }
    }).catch(err => {
      console.error('Error saving address when PDF was downloaded:', err);
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Generate PDF error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "PDF үүсгэхэд алдаа гарлаа"
    });
  }
};