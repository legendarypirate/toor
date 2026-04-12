"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Edit2, MapPin, Phone, Package, QrCode, Wallet } from 'lucide-react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/app/context/AuthContext';
import { apiService } from '@/app/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import PaymentAppLink from '@/app/checkout/components/PaymentAppLink';
import { getPublicApiBase } from '@/app/lib/apiBase';
import { safeImgSrc } from '@/app/lib/imageSrc';

interface OrderItem {
  id: number;
  order_id: number;
  product_id: string;
  name: string;
  name_mn: string;
  price: number;
  quantity: number;
  image: string | null;
  sku: string | null;
}

interface Order {
  id: number;
  order_number: string;
  user_id: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  grand_total: number;
  payment_method: number;
  payment_status: number;
  order_status: number;
  shipping_address: string;
  phone_number: string;
  customer_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

const ReorderPage = () => {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'verify' | 'payment'>('verify');
  const [qrCode, setQrCode] = useState('');
  const [qrText, setQrText] = useState('');
  const [paymentUrls, setPaymentUrls] = useState<any[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [checkInterval, setCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qpay' | 'bank'>('qpay');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    note: '',
  });

  useEffect(() => {
    document.title = 'Дахин захиалах | Outdoor World';
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && orderId) {
      fetchOrder();
    }
  }, [isAuthenticated, authLoading, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getOrderById(orderId);
      
      if (response.success && response.order) {
        const orderData = response.order;
        
        // Check if order is delivered (status 2)
        if (orderData.order_status !== 2) {
          setError('Зөвхөн хүргэгдсэн захиалгыг дахин захиалж болно');
          return;
        }
        
        setOrder(orderData);
        
        // Pre-fill form with order data
        setFormData({
          address: orderData.shipping_address || '',
          phone: orderData.phone_number || '',
          note: orderData.notes || '',
        });
      } else {
        setError(response.message || 'Захиалга олдсонгүй');
      }
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.message || 'Захиалга авахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mn-MN').format(price) + '₮';
  };

  const calculateTotals = () => {
    if (!order) return { subtotal: 0, shipping: 0, total: 0 };
    
    const subtotal = order.subtotal || 0;
    const shipping = order.shipping_cost || 0;
    const total = order.grand_total || subtotal + shipping;
    
    return { subtotal, shipping, total };
  };

  const startPaymentCheck = (invoiceId: string) => {
    if (checkInterval) clearInterval(checkInterval);
    
    const interval = setInterval(async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_URL}/qpay/check/${invoiceId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(isAuthenticated && { 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
          },
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.payment?.isPaid) {
            setPaymentStatus('paid');
            setIsProcessing(false);
            clearInterval(interval);
            setCheckInterval(null);
            
            setTimeout(() => {
              router.push(`/order/${newOrderId}`);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }, 5000);
    
    setCheckInterval(interval);
    
    // Cleanup on unmount
    return () => {
      if (interval) clearInterval(interval);
    };
  };

  useEffect(() => {
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [checkInterval]);

  // Fetch bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        setLoadingBankAccounts(true);
        const response = await fetch(`${getPublicApiBase()}/bank-accounts/active`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bank accounts');
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          setBankAccounts(result.data);
        }
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
        setBankAccounts([]);
      } finally {
        setLoadingBankAccounts(false);
      }
    };

    fetchBankAccounts();
  }, []);

  const handleReOrder = async () => {
    if (!order || !order.items || order.items.length === 0) {
      alert('Захиалгад бараа байхгүй байна');
      return;
    }

    // Validate form
    if (!formData.address || formData.address.trim().length < 3) {
      alert('Хүргэлтийн хаягаа оруулна уу');
      return;
    }

    if (!formData.phone || !/^\d{8}$/.test(formData.phone)) {
      alert('Утасны дугаараа зөв оруулна уу (8 оронтой)');
      return;
    }

    try {
      setIsProcessing(true);

      const { subtotal, shipping, total } = calculateTotals();

      // Prepare order items
      const orderItems = order.items.map(item => ({
        productId: String(item.product_id || ''),
        name: item.name || 'Бараа',
        nameMn: item.name_mn || item.name || 'Бараа',
        price: item.price || 0,
        quantity: item.quantity || 1,
        image: item.image || null,
        sku: item.sku || null,
      }));

      // Determine delivery method
      const deliveryMethod = formData.address === 'Ирж авах' ? 'pickup' : 'delivery';
      const paymentMethodMap: Record<string, number> = {
        'qpay': 0,
        'bank': 1,
        'card': 2,
      };

      // Create order data
      const orderData = {
        userId: isAuthenticated ? user?.id : `guest_${Date.now()}`,
        items: orderItems,
        subtotal: subtotal,
        shippingCost: shipping,
        tax: 0,
        grandTotal: total,
        paymentMethod: paymentMethodMap[paymentMethod] || 0,
        shippingAddress: formData.address.trim(),
        phoneNumber: formData.phone,
        customerName: order.customer_name || user?.full_name || 'Хэрэглэгч',
        notes: formData.note || null,
      };

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      // Create new order
      const orderResponse = await fetch(`${API_URL}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated && { 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
        },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to create order');
      }

      const orderResult = await orderResponse.json();
      
      if (!orderResult.success || !orderResult.order?.id) {
        throw new Error('Failed to create order');
      }

      const createdOrder = orderResult.order;
      setNewOrderId(createdOrder.id);
      
      if (createdOrder.order_number) {
        setOrderNumber(createdOrder.order_number);
      }

      // If bank transfer, skip QPay invoice creation
      if (paymentMethod === 'bank') {
        setIsProcessing(false);
        setPaymentStep('payment');
        return;
      }

      // Create QPay invoice
      const invoiceResponse = await fetch(`${API_URL}/qpay/checkout/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated && { 'Authorization': `Bearer ${localStorage.getItem('token')}` }),
        },
        body: JSON.stringify({
          orderId: createdOrder.id,
          amount: total,
          description: `Захиалга - ${createdOrder.order_number}`
        }),
      });

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to create QPay invoice');
      }

      const invoiceResult = await invoiceResponse.json();
      
      if (!invoiceResult.success || !invoiceResult.invoice) {
        throw new Error('Failed to create QPay invoice');
      }

      const invoice = invoiceResult.invoice;
      setInvoiceId(invoice.invoice_id);

      // Set QR code
      const qrTextValue = invoice.qr_text || '';
      setQrText(qrTextValue);
      
      const qrImageValue = invoice.qr_image;
      if (qrImageValue) {
        if (qrImageValue.startsWith('http://') || qrImageValue.startsWith('https://')) {
          setQrCode(qrImageValue);
        } else if (qrImageValue.startsWith('data:') && qrImageValue.length < 100000) {
          setQrCode(qrImageValue);
        } else if (!qrImageValue.startsWith('data:') && qrImageValue.length < 100000) {
          setQrCode(`data:image/png;base64,${qrImageValue}`);
        } else if (qrTextValue) {
          setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTextValue)}`);
        }
      } else if (qrTextValue) {
        setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTextValue)}`);
      }
      
      if (invoice.urls && Array.isArray(invoice.urls)) {
        setPaymentUrls(invoice.urls);
      }
      
      setIsProcessing(false);
      setPaymentStep('payment');
      startPaymentCheck(invoice.invoice_id);
      
    } catch (error: any) {
      console.error('Re-order failed:', error);
      alert(`Дахин захиалахад алдаа гарлаа: ${error?.message || 'Тодорхойгүй алдаа'}`);
      setIsProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto w-full max-w-layout px-3 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Ачааллаж байна...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto w-full max-w-layout px-3 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-bold text-red-900 mb-2">Алдаа гарлаа</h2>
              <p className="text-red-700 mb-4">{error || 'Захиалга олдсонгүй'}</p>
              <Button onClick={() => router.push('/orders')}>
                Захиалгууд руу буцах
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { subtotal, shipping, total } = calculateTotals();

  // Payment step UI
  if (paymentStep === 'payment') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="mx-auto w-full max-w-layout px-3 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setPaymentStep('verify')}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Буцах
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                {paymentMethod === 'qpay' ? 'QPay төлбөр төлөх' : 'Банкаар шилжүүлэх'}
              </h1>
              <p className="text-gray-600 mt-1">Захиалга: {orderNumber}</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Төлбөрийн мэдээлэл</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethod === 'qpay' ? (
                  <div className="text-center py-6">
                    {isProcessing ? (
                      <div className="mb-6">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                        <p className="text-gray-600">Төлбөрийн мэдээлэл бэлдэж байна...</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6">
                          <p className="text-sm text-gray-600 mb-2">
                            Төлбөрийн дүн: <span className="font-bold text-gray-900">{formatPrice(total)}</span>
                          </p>
                          <p className="text-sm text-gray-600 mb-4">
                            Доорх QR кодыг QPay апп-аар уншуулна уу
                          </p>
                          {qrCode?.trim() ? (
                            <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                              <img 
                                src={qrCode.trim()} 
                                alt="QPay QR Code" 
                                className="w-48 h-48 mx-auto object-contain"
                                onError={(e) => {
                                  console.error('QR image failed to load');
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="inline-block p-4 bg-gray-100 border border-gray-200 rounded-lg">
                              <div className="w-48 h-48 flex items-center justify-center">
                                <QrCode className="w-24 h-24 text-gray-400" />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Mobile App Links */}
                        {paymentUrls.length > 0 && (
                          <div className="mb-6 md:hidden">
                            <p className="text-sm text-gray-600 mb-3">Төлбөр төлөх:</p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {paymentUrls.map((url, index) => (
                                <PaymentAppLink key={index} url={url} index={index} />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Payment Status */}
                        {paymentStatus === 'paid' ? (
                          <Card className="bg-green-50 border-green-200 mb-6">
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <div className="text-sm text-green-800">
                                  <p className="font-medium">Төлбөр амжилттай төлөгдлөө!</p>
                                  <p className="text-xs mt-1">Захиалга баталгаажуулж байна...</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="bg-blue-50 border-blue-200 mb-6">
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                                <div className="text-sm text-blue-800">
                                  <p className="font-medium">Төлбөрийн статус автоматаар шалгаж байна...</p>
                                  <p className="text-xs mt-1">Төлбөр төлсний дараа автоматаар баталгаажуулах болно.</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-6">
                    <div className="max-w-lg mx-auto">
                      {loadingBankAccounts ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                          <p className="text-gray-600">Банкны дансыг уншиж байна...</p>
                        </div>
                      ) : bankAccounts.length === 0 ? (
                        <div className="text-center py-8">
                          <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Одоогоор банкны данс байхгүй байна</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 mb-4 text-center">
                            Төлбөрийн дүн: <span className="font-bold text-gray-900">{formatPrice(total)}</span>
                          </p>
                          {bankAccounts.map((account) => (
                            <Card key={account.id} className="bg-gray-50 border-gray-200">
                              <CardContent className="pt-6">
                                <h3 className="font-bold text-gray-900 mb-2">{account.bank_name}</h3>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Дансны дугаар:</span>
                                    <span className="font-mono font-bold">{account.account_number}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Дансны нэр:</span>
                                    <span className="font-medium">{account.account_name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Гүйлгээний утга:</span>
                                    <span className="font-medium">{orderNumber}</span>
                                  </div>
                                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex flex-col gap-1">
                                  <span className="text-red-700 font-semibold">Гүйлгээний утга дээр та:</span>
                                  <span className="text-red-600 font-bold">Order Id, утасны дугаар мөн ААН нэгж бол регистрийн дугаараа бичнэ үү.</span>
                                </div>
                              </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <Button
                              onClick={() => router.push(`/order/${newOrderId}`)}
                              className="w-full"
                            >
                              Гүйлгээ хийсэн
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Verification step UI
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="mx-auto w-full max-w-layout px-3 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/orders')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Буцах
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Дахин захиалах</h1>
            <p className="text-gray-600 mt-1">Захиалга: {order.order_number}</p>
          </div>

          {/* Order Items */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Захиалгын бараа
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      {item.image?.trim() ? (
                        <img
                          src={safeImgSrc(item.image)}
                          alt={item.name_mn || item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : null}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {item.name_mn || item.name}
                        </h3>
                        {item.sku && (
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatPrice(Number(item.price))} x {item.quantity}
                        </div>
                        <div className="text-sm text-gray-600">
                          Нийт: {formatPrice(Number(item.price) * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">Бараа байхгүй</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address and Phone */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Хүргэлтийн мэдээлэл
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {isEditing ? 'Цуцлах' : 'Засах'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Хүргэх хаяг</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Хүргэх хаягаа оруулна уу"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Утасны дугаар</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="99112233"
                      className="mt-1"
                      maxLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">8 оронтой утасны дугаар</p>
                  </div>
                  <div>
                    <Label htmlFor="note">Тэмдэглэл (сонголттой)</Label>
                    <Textarea
                      id="note"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Нэмэлт мэдээлэл..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Хаяг</p>
                      <p className="text-gray-600">{formData.address || 'Хаяг оруулаагүй'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Утас</p>
                      <p className="text-gray-600">{formData.phone || 'Утас оруулаагүй'}</p>
                    </div>
                  </div>
                  {formData.note && (
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Тэмдэглэл</p>
                        <p className="text-gray-600">{formData.note}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Захиалгын дүн</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Барааны үнэ</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Хүргэлтийн төлбөр</span>
                  <span className="font-medium">{formatPrice(shipping)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">Нийт дүн</span>
                    <span className="font-bold text-lg">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Төлбөрийн арга</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as 'qpay' | 'bank')}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <label
                  htmlFor="reorder-qpay"
                  className={`flex flex-col items-center justify-center rounded-lg border-2 bg-white p-4 hover:bg-gray-50 cursor-pointer transition-all ${
                    paymentMethod === 'qpay' 
                      ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900 ring-opacity-20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <RadioGroupItem value="qpay" id="reorder-qpay" className="sr-only" />
                  <QrCode className={`w-8 h-8 mb-2 ${paymentMethod === 'qpay' ? 'text-gray-900' : 'text-gray-400'}`} />
                  <div className="font-medium">QPay</div>
                  <div className="text-xs text-gray-500 mt-1">QR код, апп</div>
                </label>
                
                <label
                  htmlFor="reorder-bank"
                  className={`flex flex-col items-center justify-center rounded-lg border-2 bg-white p-4 hover:bg-gray-50 cursor-pointer transition-all ${
                    paymentMethod === 'bank' 
                      ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900 ring-opacity-20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <RadioGroupItem value="bank" id="reorder-bank" className="sr-only" />
                  <Wallet className={`w-8 h-8 mb-2 ${paymentMethod === 'bank' ? 'text-gray-900' : 'text-gray-400'}`} />
                  <div className="font-medium">Банкаар шилжүүлэх</div>
                  <div className="text-xs text-gray-500 mt-1">Хаан, Голомт, ХХБ</div>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/orders')}
              className="flex-1"
            >
              Цуцлах
            </Button>
            <Button
              onClick={handleReOrder}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Бэлдэж байна...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {paymentMethod === 'qpay' ? 'QPay-аар төлөх' : 'Банкаар шилжүүлэх'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReorderPage;

