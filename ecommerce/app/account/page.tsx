"use client";

import { useState, useEffect } from 'react';
import { 
  User, 
  Package, 
  CreditCard, 
  MapPin, 
  Settings, 
  LogOut, 
  ChevronRight,
  CheckCircle,
  Clock,
  Truck,
  Star,
  Edit2,
  Eye,
  XCircle,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface OrderItem {
  id: number;
  product_id: string;
  name: string;
  name_mn: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
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
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

interface Address {
  id: string;
  name: string;
  address: string;
  phone: string;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  cardNumber: string;
  expiryDate: string;
  cardholderName?: string;
  isDefault: boolean;
}

interface Settings {
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    marketing: boolean;
  };
}

const MyPage = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [isClient, setIsClient] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const { user, logout: authLogout, updateUserProfile } = useAuth();

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    address: '',
    phone: ''
  });

  // Payment method state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cardholderName: ''
  });

  // Settings state
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      orderUpdates: true,
      promotions: true,
      marketing: false
    }
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    setIsClient(true);
    document.title = 'Миний хуудас | Outdoor World';
  }, []);

  // Load data from localStorage
  useEffect(() => {
    if (!isClient) return;

    // Load addresses
    const savedAddresses = localStorage.getItem('user_addresses');
    if (savedAddresses) {
      setAddresses(JSON.parse(savedAddresses));
    } else {
      // Initialize with default addresses
      const defaultAddresses: Address[] = [
        {
          id: '1',
          name: 'Гэр',
          address: 'Улаанбаатар, Сүхбаатар дүүрэг, Computer mall, 3 давхар',
          phone: '+976 99112233',
          isDefault: true,
        },
        {
          id: '2',
          name: 'Ажлын байр',
          address: 'Улаанбаатар, Хан-Уул дүүрэг, Сонгино хайрхан',
          phone: '+976 88112233',
          isDefault: false,
        }
      ];
      setAddresses(defaultAddresses);
      localStorage.setItem('user_addresses', JSON.stringify(defaultAddresses));
    }

    // Load payment methods
    const savedPayments = localStorage.getItem('user_payment_methods');
    if (savedPayments) {
      setPaymentMethods(JSON.parse(savedPayments));
    } else {
      // Initialize with default payment method
      const defaultPayment: PaymentMethod[] = [
        {
          id: '1',
          cardNumber: '1234',
          expiryDate: '12/25',
          isDefault: true
        }
      ];
      setPaymentMethods(defaultPayment);
      localStorage.setItem('user_payment_methods', JSON.stringify(defaultPayment));
    }

    // Load settings
    const savedSettings = localStorage.getItem('user_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [isClient]);

  // Initialize profile form when user data changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'orders' && isClient) {
      fetchOrders();
    }
  }, [activeTab, isClient]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const response = await apiService.getOrders();
      if (response.success && response.orders) {
        setOrders(response.orders);
      } else {
        setOrdersError(response.message || 'Захиалгуудыг авахад алдаа гарлаа');
      }
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      setOrdersError(error.message || 'Захиалгуудыг авахад алдаа гарлаа');
    } finally {
      setOrdersLoading(false);
    }
  };

  const userInfo = {
    name: user?.full_name || 'Хэрэглэгч',
    email: user?.email || '',
    phone: user?.phone || '',
    joinDate: user?.createdAt || '',
    points: 1250,
  };

  const getOrderStatus = (orderStatus: number, paymentStatus: number) => {
    // Order status: 0 = Processing, 1 = Shipped, 2 = Delivered, 3 = Cancelled
    if (orderStatus === 3) {
      return { status: 'cancelled', statusText: 'Цуцлагдсан' };
    }
    if (orderStatus === 2) {
      return { status: 'delivered', statusText: 'Хүргэгдсэн' };
    }
    if (orderStatus === 1) {
      return { status: 'shipped', statusText: 'Хүргэлтэнд гарсан' };
    }
    return { status: 'processing', statusText: 'Боловсруулж байна' };
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString() + '₮';
  };

  const formatDate = (dateString: string) => {
    if (!isClient) return dateString;
    const date = new Date(dateString);
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Profile handlers
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setProfileError(null);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileError(null);
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      await updateUserProfile(profileForm);
      setIsEditingProfile(false);
    } catch (error: any) {
      setProfileError(error.message || 'Профайл шинэчлэхэд алдаа гарлаа');
    } finally {
      setProfileLoading(false);
    }
  };

  // Address handlers
  const handleAddAddress = () => {
    setIsAddingAddress(true);
    setAddressForm({ name: '', address: '', phone: '' });
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      name: address.name,
      address: address.address,
      phone: address.phone
    });
  };

  const handleCancelAddress = () => {
    setIsAddingAddress(false);
    setEditingAddressId(null);
    setAddressForm({ name: '', address: '', phone: '' });
  };

  const handleSaveAddress = () => {
    if (!addressForm.name || !addressForm.address || !addressForm.phone) {
      alert('Бүх талбарыг бөглөнө үү');
      return;
    }

    let updatedAddresses: Address[];
    
    if (isAddingAddress) {
      const newAddress: Address = {
        id: Date.now().toString(),
        ...addressForm,
        isDefault: addresses.length === 0
      };
      updatedAddresses = [...addresses, newAddress];
    } else if (editingAddressId) {
      updatedAddresses = addresses.map(addr =>
        addr.id === editingAddressId
          ? { ...addr, ...addressForm }
          : addr
      );
    } else {
      return;
    }

    setAddresses(updatedAddresses);
    localStorage.setItem('user_addresses', JSON.stringify(updatedAddresses));
    handleCancelAddress();
  };

  const handleDeleteAddress = (id: string) => {
    if (confirm('Энэ хаягийг устгахдаа итгэлтэй байна уу?')) {
      const updatedAddresses = addresses.filter(addr => addr.id !== id);
      // If deleted address was default, make first one default
      if (updatedAddresses.length > 0 && addresses.find(a => a.id === id)?.isDefault) {
        updatedAddresses[0].isDefault = true;
      }
      setAddresses(updatedAddresses);
      localStorage.setItem('user_addresses', JSON.stringify(updatedAddresses));
    }
  };

  const handleSetDefaultAddress = (id: string) => {
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    }));
    setAddresses(updatedAddresses);
    localStorage.setItem('user_addresses', JSON.stringify(updatedAddresses));
  };

  // Payment method handlers
  const handleAddPayment = () => {
    setIsAddingPayment(true);
    setPaymentForm({ cardNumber: '', expiryDate: '', cardholderName: '' });
  };

  const handleEditPayment = (payment: PaymentMethod) => {
    setEditingPaymentId(payment.id);
    setPaymentForm({
      cardNumber: payment.cardNumber,
      expiryDate: payment.expiryDate,
      cardholderName: payment.cardholderName || ''
    });
  };

  const handleCancelPayment = () => {
    setIsAddingPayment(false);
    setEditingPaymentId(null);
    setPaymentForm({ cardNumber: '', expiryDate: '', cardholderName: '' });
  };

  const handleSavePayment = () => {
    if (!paymentForm.cardNumber || !paymentForm.expiryDate) {
      alert('Картын дугаар болон хугацааг бөглөнө үү');
      return;
    }

    // Format card number (show only last 4 digits)
    const last4 = paymentForm.cardNumber.slice(-4).padStart(4, '0');
    const formattedCardNumber = `•••• •••• •••• ${last4}`;

    let updatedPayments: PaymentMethod[];
    
    if (isAddingPayment) {
      const newPayment: PaymentMethod = {
        id: Date.now().toString(),
        cardNumber: formattedCardNumber,
        expiryDate: paymentForm.expiryDate,
        cardholderName: paymentForm.cardholderName,
        isDefault: paymentMethods.length === 0
      };
      updatedPayments = [...paymentMethods, newPayment];
    } else if (editingPaymentId) {
      updatedPayments = paymentMethods.map(pm =>
        pm.id === editingPaymentId
          ? { ...pm, expiryDate: paymentForm.expiryDate, cardholderName: paymentForm.cardholderName }
          : pm
      );
    } else {
      return;
    }

    setPaymentMethods(updatedPayments);
    localStorage.setItem('user_payment_methods', JSON.stringify(updatedPayments));
    handleCancelPayment();
  };

  const handleDeletePayment = (id: string) => {
    if (confirm('Энэ картыг устгахдаа итгэлтэй байна уу?')) {
      const updatedPayments = paymentMethods.filter(pm => pm.id !== id);
      // If deleted payment was default, make first one default
      if (updatedPayments.length > 0 && paymentMethods.find(p => p.id === id)?.isDefault) {
        updatedPayments[0].isDefault = true;
      }
      setPaymentMethods(updatedPayments);
      localStorage.setItem('user_payment_methods', JSON.stringify(updatedPayments));
    }
  };

  const handleSetDefaultPayment = (id: string) => {
    const updatedPayments = paymentMethods.map(pm => ({
      ...pm,
      isDefault: pm.id === id
    }));
    setPaymentMethods(updatedPayments);
    localStorage.setItem('user_payment_methods', JSON.stringify(updatedPayments));
  };

  // Settings handlers
  const handleSettingsChange = (key: keyof Settings['notifications'], value: boolean) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    });
  };

  const handleSaveSettings = () => {
    localStorage.setItem('user_settings', JSON.stringify(settings));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto w-full max-w-layout px-3 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="lg:col-span-3 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Миний хуудас</h1>
          <p className="text-gray-600">Хувийн мэдээлэл, захиалгын түүх</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              {/* User Info Card */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{userInfo.name}</div>
                  <div className="text-sm text-gray-500">{userInfo.email}</div>
                </div>
              </div>

              {/* Points */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-600 mb-1">Оноо</div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">{userInfo.points}</div>
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    activeTab === 'orders' 
                      ? 'bg-gray-900 text-white' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4" />
                    <span>Миний захиалга</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    activeTab === 'profile' 
                      ? 'bg-gray-900 text-white' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <span>Хувийн мэдээлэл</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setActiveTab('address')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    activeTab === 'address' 
                      ? 'bg-gray-900 text-white' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4" />
                    <span>Хаяг</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  disabled
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-colors opacity-50 cursor-not-allowed text-gray-400"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4" />
                    <span>Төлбөрийн хэрэгсэл</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  disabled
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-colors opacity-50 cursor-not-allowed text-gray-400"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4" />
                    <span>Тохиргоо</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full mt-6 p-3 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Гарах
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'orders' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Захиалгын түүх</h2>
                  {!ordersLoading && (
                    <span className="text-sm text-gray-600">{orders.length} захиалга</span>
                  )}
                </div>

                {ordersLoading ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                      <p className="text-gray-600">Захиалгуудыг ачааллаж байна...</p>
                    </div>
                  </div>
                ) : ordersError ? (
                  <div className="bg-white rounded-lg border border-red-200 p-6">
                    <div className="flex items-center gap-3 text-red-600">
                      <XCircle className="w-5 h-5" />
                      <p>{ordersError}</p>
                    </div>
                    <button
                      onClick={fetchOrders}
                      className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                    >
                      Дахин оролдох
                    </button>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Package className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-600 text-lg mb-2">Захиалга байхгүй байна</p>
                      <p className="text-gray-500 text-sm">Та одоогоор захиалга хийгээгүй байна</p>
                      <Link
                        href="/"
                        className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                      >
                        Дэлгүүр рүү очих
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const statusInfo = getOrderStatus(order.order_status, order.payment_status);
                      const itemsCount = order.items?.length || 0;
                      return (
                        <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-gray-900">{order.order_number}</h3>
                                <div className="flex items-center gap-1 text-sm">
                                  {getStatusIcon(statusInfo.status)}
                                  <span className={`
                                    ${statusInfo.status === 'delivered' ? 'text-green-600' : ''}
                                    ${statusInfo.status === 'shipped' ? 'text-blue-600' : ''}
                                    ${statusInfo.status === 'processing' ? 'text-yellow-600' : ''}
                                    ${statusInfo.status === 'cancelled' ? 'text-red-600' : ''}
                                  `}>
                                    {statusInfo.statusText}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDate(order.created_at)} • {itemsCount} бараа
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900 mb-1">
                                {formatPrice(Number(order.grand_total))}
                              </div>
                              <div className="flex items-center gap-3 justify-end">
                                <Link
                                  href={`/orders`}
                                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Дэлгэрэнгүй
                                </Link>
                              </div>
                            </div>
                          </div>

                          {order.items && order.items.length > 0 && (
                            <div className="border-t border-gray-100 pt-4">
                              <div className="text-sm text-gray-600 mb-2">Захиалгын бараа:</div>
                              <div className="flex flex-wrap gap-2">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                    <span>{item.name_mn || item.name}</span>
                                    <span className="text-gray-400">x{item.quantity}</span>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <span className="text-sm text-gray-500">
                                    +{order.items.length - 3} бусад
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Хувийн мэдээлэл</h2>
                  {!isEditingProfile ? (
                    <button 
                      onClick={handleEditProfile}
                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Засах
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEditProfile}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Цуцлах
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileLoading}
                        className="text-sm bg-gray-900 text-white px-4 py-1 rounded-lg hover:bg-gray-800 flex items-center gap-1 disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" />
                        Хадгалах
                      </button>
                    </div>
                  )}
                </div>

                {profileError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-600 text-sm">{profileError}</p>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Нэр</div>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={profileForm.full_name}
                          onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      ) : (
                        <div className="text-lg font-medium text-gray-900">{userInfo.name}</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Имэйл</div>
                      {isEditingProfile ? (
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      ) : (
                        <div className="text-lg font-medium text-gray-900">{userInfo.email || '-'}</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Утасны дугаар</div>
                      {isEditingProfile ? (
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      ) : (
                        <div className="text-lg font-medium text-gray-900">{userInfo.phone || '-'}</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Гишүүнээр элссэн</div>
                      <div className="text-lg font-medium text-gray-900">
                        {userInfo.joinDate ? formatDate(userInfo.joinDate) : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Account Stats */}
                  <div className="border-t border-gray-200 mt-6 pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Тоо баримт</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Захиалга</div>
                        <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Оноо</div>
                        <div className="text-2xl font-bold text-gray-900">{userInfo.points}</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Хаяг</div>
                        <div className="text-2xl font-bold text-gray-900">{addresses.length}</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Карт</div>
                        <div className="text-2xl font-bold text-gray-900">{paymentMethods.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Хаяг</h2>
                  {!isAddingAddress && (
                    <button 
                      onClick={handleAddAddress}
                      className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Шинэ хаяг нэмэх
                    </button>
                  )}
                </div>

                {isAddingAddress && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="font-bold text-gray-900 mb-4">Шинэ хаяг нэмэх</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">Нэр</label>
                        <input
                          type="text"
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          placeholder="Жишээ: Гэр, Ажлын байр"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">Хаяг</label>
                        <textarea
                          value={addressForm.address}
                          onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                          placeholder="Бүрэн хаяг"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">Утасны дугаар</label>
                        <input
                          type="tel"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="+976 99112233"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAddress}
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Хадгалах
                        </button>
                        <button
                          onClick={handleCancelAddress}
                          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Цуцлах
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      {editingAddressId === addr.id ? (
                        <div>
                          <h3 className="font-bold text-gray-900 mb-4">Хаяг засах</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm text-gray-600 mb-2">Нэр</label>
                              <input
                                type="text"
                                value={addressForm.name}
                                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-2">Хаяг</label>
                              <textarea
                                value={addressForm.address}
                                onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-2">Утасны дугаар</label>
                              <input
                                type="tel"
                                value={addressForm.phone}
                                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveAddress}
                                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Хадгалах
                              </button>
                              <button
                                onClick={handleCancelAddress}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Цуцлах
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-gray-900">{addr.name}</h3>
                                {addr.isDefault && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                    Үндсэн
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 mb-2">{addr.address}</p>
                              <p className="text-gray-600">{addr.phone}</p>
                            </div>
                            <button 
                              onClick={() => handleEditAddress(addr)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex gap-2">
                            {!addr.isDefault && (
                              <button 
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-sm text-gray-600 hover:text-gray-900"
                              >
                                Үндсэн болгох
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-sm text-red-600 hover:text-red-800 ml-auto flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Устгах
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {addresses.length === 0 && !isAddingAddress && (
                  <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <MapPin className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-600 text-lg mb-2">Хаяг байхгүй байна</p>
                      <p className="text-gray-500 text-sm mb-4">Шинэ хаяг нэмэхийн тулд дээрх товчийг дарна уу</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payment' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Төлбөрийн хэрэгсэл</h2>
                  {!isAddingPayment && (
                    <button 
                      onClick={handleAddPayment}
                      className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Карт нэмэх
                    </button>
                  )}
                </div>

                {isAddingPayment && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="font-bold text-gray-900 mb-4">Шинэ карт нэмэх</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-2">Картын дугаар</label>
                        <input
                          type="text"
                          value={paymentForm.cardNumber}
                          onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value })}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Хугацаа (MM/YY)</label>
                          <input
                            type="text"
                            value={paymentForm.expiryDate}
                            onChange={(e) => setPaymentForm({ ...paymentForm, expiryDate: e.target.value })}
                            placeholder="12/25"
                            maxLength={5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2">Карт эзэмшигчийн нэр</label>
                          <input
                            type="text"
                            value={paymentForm.cardholderName}
                            onChange={(e) => setPaymentForm({ ...paymentForm, cardholderName: e.target.value })}
                            placeholder="JOHN DOE"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSavePayment}
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Хадгалах
                        </button>
                        <button
                          onClick={handleCancelPayment}
                          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Цуцлах
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {paymentMethods.map((payment) => (
                    <div key={payment.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      {editingPaymentId === payment.id ? (
                        <div>
                          <h3 className="font-bold text-gray-900 mb-4">Карт засах</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm text-gray-600 mb-2">Картын дугаар</label>
                              <div className="text-gray-900 font-medium">{payment.cardNumber}</div>
                              <p className="text-xs text-gray-500 mt-1">Картын дугаарыг засах боломжгүй</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm text-gray-600 mb-2">Хугацаа (MM/YY)</label>
                                <input
                                  type="text"
                                  value={paymentForm.expiryDate}
                                  onChange={(e) => setPaymentForm({ ...paymentForm, expiryDate: e.target.value })}
                                  placeholder="12/25"
                                  maxLength={5}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-2">Карт эзэмшигчийн нэр</label>
                                <input
                                  type="text"
                                  value={paymentForm.cardholderName}
                                  onChange={(e) => setPaymentForm({ ...paymentForm, cardholderName: e.target.value })}
                                  placeholder="JOHN DOE"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSavePayment}
                                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Хадгалах
                              </button>
                              <button
                                onClick={handleCancelPayment}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Цуцлах
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-6 bg-blue-100 rounded flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{payment.cardNumber}</div>
                              <div className="text-sm text-gray-600">
                                Хугацаа: {payment.expiryDate}
                                {payment.cardholderName && ` • ${payment.cardholderName}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {payment.isDefault && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                Үндсэн
                              </span>
                            )}
                            {!payment.isDefault && (
                              <button
                                onClick={() => handleSetDefaultPayment(payment.id)}
                                className="text-sm text-gray-600 hover:text-gray-900"
                              >
                                Үндсэн болгох
                              </button>
                            )}
                            <button 
                              onClick={() => handleEditPayment(payment)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {paymentMethods.length === 0 && !isAddingPayment && (
                  <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <CreditCard className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-600 text-lg mb-2">Төлбөрийн карт байхгүй байна</p>
                      <p className="text-gray-500 text-sm mb-4">Шинэ карт нэмэхийн тулд дээрх товчийг дарна уу</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Тохиргоо</h2>
                
                {settingsSaved && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-600 text-sm">Тохиргоо амжилттай хадгалагдлаа</p>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3">Мэдэгдэл</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-gray-900" 
                            checked={settings.notifications.orderUpdates}
                            onChange={(e) => handleSettingsChange('orderUpdates', e.target.checked)}
                          />
                          <span className="text-gray-700">Захиалгын шинэчлэлт</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-gray-900" 
                            checked={settings.notifications.promotions}
                            onChange={(e) => handleSettingsChange('promotions', e.target.checked)}
                          />
                          <span className="text-gray-700">Хямдралын мэдэгдэл</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-gray-900" 
                            checked={settings.notifications.marketing}
                            onChange={(e) => handleSettingsChange('marketing', e.target.checked)}
                          />
                          <span className="text-gray-700">Маркетингийн имэйл</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-bold text-gray-900 mb-3">Нууцлал</h3>
                      <div className="space-y-3">
                        <button 
                          onClick={() => {
                            const currentPassword = prompt('Одоогийн нууц үгээ оруулна уу:');
                            if (currentPassword) {
                              const newPassword = prompt('Шинэ нууц үг оруулна уу:');
                              if (newPassword) {
                                if (newPassword.length < 6) {
                                  alert('Нууц үг хамгийн багадаа 6 тэмдэгтээс бүрдэх ёстой');
                                  return;
                                }
                                const confirmPassword = prompt('Шинэ нууц үгээ дахин оруулна уу:');
                                if (newPassword === confirmPassword) {
                                  apiService.changePassword(currentPassword, newPassword)
                                    .then(() => alert('Нууц үг амжилттай солигдлоо'))
                                    .catch((error) => alert(error.message || 'Нууц үг солиход алдаа гарлаа'));
                                } else {
                                  alert('Нууц үг таарахгүй байна');
                                }
                              }
                            }
                          }}
                          className="text-gray-700 hover:text-gray-900 block text-left"
                        >
                          Нууц үг солих
                        </button>
                        <button 
                          onClick={() => alert('Хандалтын түүх функц хөгжүүлэгдэж байна')}
                          className="text-gray-700 hover:text-gray-900 block text-left"
                        >
                          Хандалтын түүх
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Та бүртгэлээ устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.')) {
                              alert('Бүртгэл устгах функц хөгжүүлэгдэж байна');
                            }
                          }}
                          className="text-red-600 hover:text-red-800 block text-left"
                        >
                          Бүртгэл устгах
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <button 
                        onClick={handleSaveSettings}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Тохиргоог хадгалах
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MyPage;