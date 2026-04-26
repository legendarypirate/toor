"use client";

import { useState, useEffect } from 'react';
import { 
  Package, 
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Eye,
  ArrowLeft,
  RotateCcw,
  FileText
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { useRouter } from 'next/navigation';
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

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    document.title = 'Захиалга | TOOR.MN';
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getOrders();
      
      if (response.success && response.orders) {
        setOrders(response.orders);
      } else {
        setError(response.message || 'Захиалгуудыг авахад алдаа гарлаа');
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Захиалгуудыг авахад алдаа гарлаа');
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
      day: 'numeric'
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto w-full max-w-layout px-3 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-900 mb-2">Алдаа гарлаа</h2>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={fetchOrders}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="mx-auto w-full max-w-layout px-3 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Буцах
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Миний захиалгууд</h1>
              <p className="text-gray-600 mt-1">{orders.length} захиалга</p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Захиалга байхгүй</h2>
            <p className="text-gray-600 mb-6">Та одоогоор захиалга хийгээгүй байна.</p>
            <Link
              href="/product"
              className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              Дэлгүүр рүү очих
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.order_status);
              const paymentStatusInfo = getPaymentStatusInfo(order.payment_status);
              const StatusIcon = statusInfo.icon;
              const itemCount = order.items?.length || 0;

              return (
                <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
                        <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${statusInfo.bgColor}`}>
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          <span className={statusInfo.color}>
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{formatDate(order.created_at)} • {itemCount} бараа</div>
                        <div>
                          Төлбөрийн хэрэгсэл: {getPaymentMethodText(order.payment_method)} • 
                          <span className={`ml-1 ${paymentStatusInfo.color}`}>
                            {paymentStatusInfo.text}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 mb-1">
                        {formatPrice(Number(order.grand_total))}
                      </div>
                      <div className="flex items-center gap-3 justify-end">
                        {order.order_status === 2 && (
                          <>
                            <Link
                              href={`/reorder/${order.id}`}
                              className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Дахин захиалах
                            </Link>
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/order/${order.id}/invoice/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              Нэхэмжлэх авах
                            </a>
                          </>
                        )}
                        <Link
                          href={`/order/${order.id}`}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Дэлгэрэнгүй
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-3 overflow-x-auto pb-2">
                        {order.items.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex-shrink-0 flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                            {item.image?.trim() ? (
                              <img
                                src={safeImgSrc(item.image)}
                                alt={item.name_mn || item.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
                                {item.name_mn || item.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {item.quantity} x {formatPrice(Number(item.price))}
                              </div>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 5 && (
                          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                            +{order.items.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shipping Address */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium text-gray-900 mb-1">Хүргэх хаяг:</div>
                      <div>{order.shipping_address}</div>
                      <div className="mt-1">{order.phone_number}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default OrdersPage;

