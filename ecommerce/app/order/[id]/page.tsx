"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Package, 
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  ArrowLeft,
  MapPin,
  Phone,
  FileText,
  RotateCcw
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
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

const OrderDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Захиалгын дэлгэрэнгүй | TOOR.MN';
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
        setOrder(response.order);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { text: 'Боловсруулж байна', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
      case 1:
        return { text: 'Хүргэлтэнд гарсан', icon: Truck, color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 2:
        return { text: 'Хүргэгдсэн', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
      case 3:
        return { text: 'Цуцлагдсан', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' };
      default:
        return { text: 'Тодорхойгүй', icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  const getPaymentStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { text: 'Хүлээгдэж байна', color: 'text-yellow-600' };
      case 1:
        return { text: 'Төлбөр төлөгдсөн', color: 'text-green-600' };
      case 2:
        return { text: 'Амжилтгүй', color: 'text-red-600' };
      case 3:
        return { text: 'Буцаагдсан', color: 'text-red-600' };
      default:
        return { text: 'Тодорхойгүй', color: 'text-gray-600' };
    }
  };

  const getPaymentMethodText = (method: number) => {
    switch (method) {
      case 0:
        return 'QPay';
      case 1:
        return 'Бэлэн мөнгө';
      case 2:
        return 'Карт';
      case 3:
        return 'SocialPay';
      default:
        return 'Тодорхойгүй';
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
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Захиалгууд руу буцах
            </Link>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-900 mb-2">Алдаа гарлаа</h2>
              <p className="text-red-700 mb-4">{error || 'Захиалга олдсонгүй'}</p>
              <button
                onClick={fetchOrder}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Дахин оролдох
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.order_status);
  const paymentStatusInfo = getPaymentStatusInfo(order.payment_status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="mx-auto w-full max-w-layout px-3 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Захиалгууд руу буцах
          </Link>

          {/* Order Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{order.order_number}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Огноо: {formatDate(order.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${statusInfo.bgColor}`}>
                  <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                  <span className={`font-medium ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Нийт дүн</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(Number(order.grand_total))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Захиалгын бараа</h2>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                    {item.image?.trim() ? (
                      <img
                        src={safeImgSrc(item.image)}
                        alt={item.name_mn || item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : null}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {item.name_mn || item.name}
                      </h3>
                      {item.sku && (
                        <p className="text-sm text-gray-500 mb-2">SKU: {item.sku}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Тоо ширхэг: {item.quantity}
                        </div>
                        <div className="font-medium text-gray-900">
                          {formatPrice(Number(item.price) * item.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Бараа олдсонгүй</p>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Тооцоо</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Дэд дүн</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              {order.shipping_cost > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Хүргэлтийн төлбөр</span>
                  <span>{formatPrice(Number(order.shipping_cost))}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Татвар</span>
                  <span>{formatPrice(Number(order.tax))}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="font-bold text-gray-900">Нийт дүн</span>
                <span className="font-bold text-gray-900">{formatPrice(Number(order.grand_total))}</span>
              </div>
            </div>
          </div>

          {/* Payment & Shipping Info */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Payment Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Төлбөрийн мэдээлэл</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Төлбөрийн хэрэгсэл:</span>
                  <span className="font-medium text-gray-900">{getPaymentMethodText(order.payment_method)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Төлбөрийн төлөв:</span>
                  <span className={`font-medium ${paymentStatusInfo.color}`}>
                    {paymentStatusInfo.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Хүргэлтийн мэдээлэл</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-gray-600 mb-1">Хаяг:</div>
                    <div className="font-medium text-gray-900">{order.shipping_address}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="text-gray-600 mb-1">Утас:</div>
                    <div className="font-medium text-gray-900">{order.phone_number}</div>
                  </div>
                </div>
                {order.customer_name && (
                  <div>
                    <div className="text-gray-600 mb-1">Хүлээн авагч:</div>
                    <div className="font-medium text-gray-900">{order.customer_name}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Тэмдэглэл</h2>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {order.order_status === 2 && (
              <>
                <Link
                  href={`/reorder/${order.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Дахин захиалах
                </Link>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/order/${order.id}/invoice/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Нэхэмжлэх авах
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OrderDetailPage;

