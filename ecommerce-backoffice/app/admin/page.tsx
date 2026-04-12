"use client";

import { useState, useEffect } from "react";
import { getApiBase } from "@/lib/apiBase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Repeat,
  Star,
  BarChart3,
  Truck,
  Ticket
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type OrderStatus = 'delivered' | 'processing' | 'shipped' | 'pending';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: LucideIcon }> = {
  delivered: { label: 'Хүргэгдсэн', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  processing: { label: 'Боловсруулж байна', color: 'bg-blue-100 text-blue-800', icon: Clock },
  shipped: { label: 'Хүргэлтэнд гарсан', color: 'bg-purple-100 text-purple-800', icon: Package },
  pending: { label: 'Хүлээгдэж байна', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
};

interface DashboardStats {
  totalUsers: number;
  activeOrders: number;
  revenue: number;
  totalProducts: number;
  pendingOrders: number;
  todaySales: number;
  monthlySales: number;
  orderCount: number;
  yesterdayComparison: number;
  last7DaysComparison: number;
  couponUsageRate: number;
  deliveryMetrics: {
    deliveryCostAmount: number;
    averageDeliveryTime: number; // in hours
    deliveryCount: number;
  };
  funnelMetrics: {
    newOrders: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    cancelledPercentage: number;
  };
  conversionMetrics: {
    visitorCount: number;
    orderConversionRate: number;
    productViewToCartRate: number;
    cartAbandonmentRate: number;
    checkoutCompletionRate: number;
  };
}

interface RecentOrder {
  id: string;
  customer: string;
  amount: number;
  status: OrderStatus;
  date: string;
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

interface TopSellingProduct {
  sku: string;
  name: string;
  nameMn?: string;
  quantity: number;
  revenue: number;
}

interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  nameMn?: string;
  stockQuantity: number;
  inStock: boolean;
}

interface TopCustomer {
  userId: string;
  customerName: string;
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export default function AdminHome() {
  // Initialize date range to today
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeOrders: 0,
    revenue: 0,
    totalProducts: 0,
    pendingOrders: 0,
    todaySales: 0,
    monthlySales: 0,
    orderCount: 0,
    yesterdayComparison: 0,
    last7DaysComparison: 0,
    couponUsageRate: 0,
    deliveryMetrics: {
      deliveryCostAmount: 0,
      averageDeliveryTime: 0,
      deliveryCount: 0,
    },
    funnelMetrics: {
      newOrders: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      cancelledPercentage: 0,
    },
    conversionMetrics: {
      visitorCount: 0,
      orderConversionRate: 0,
      productViewToCartRate: 0,
      cartAbandonmentRate: 0,
      checkoutCompletionRate: 0,
    },
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [repeatPurchaseRate, setRepeatPurchaseRate] = useState<number>(0);
  const [averagePurchaseFrequency, setAveragePurchaseFrequency] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = getApiBase();

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const mapOrderStatus = (status: number): OrderStatus => {
    // Order status: 0 = Processing, 1 = Shipped, 2 = Delivered, 3 = Cancelled
    if (status === 2) return 'delivered';
    if (status === 1) return 'shipped';
    if (status === 0) return 'processing';
    return 'pending';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('mn-MN');
  };

  // Check if a date is within the selected range
  const isDateInRange = (dateString: string): boolean => {
    const date = new Date(dateString);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date
    start.setHours(0, 0, 0, 0); // Start from beginning of start date
    return date >= start && date <= end;
  };

  // Check if a date is today
  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if a date is yesterday
  const isYesterday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  // Check if a date is within last 7 days (excluding today)
  const isLast7Days = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return date >= sevenDaysAgo && date < today;
  };

  // Check if a date is within current month
  const isCurrentMonth = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();

      // Fetch data with pagination/limits to prevent memory issues
      const [usersRes, ordersRes, productsRes, couponsRes] = await Promise.all([
        fetch(`${API_BASE}/user/all?page=1&limit=1000`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/order/admin/all?page=1&limit=1000`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/products?page=1&limit=1000`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/coupons/stats`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }),
      ]);

      // Process users - filter by date range (created_at)
      let totalUsers = 0;
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        let users: any[] = [];
        
        if (Array.isArray(usersData)) {
          users = usersData;
        } else if (Array.isArray(usersData.users)) {
          users = usersData.users;
        } else if (Array.isArray(usersData.data)) {
          users = usersData.data;
        }
        
        // Filter users by date range
        const filteredUsers = users.filter((user: any) => {
          if (!user.created_at) return false;
          return isDateInRange(user.created_at);
        });
        
        totalUsers = filteredUsers.length;
      }

      // Process orders - filter by date range (created_at)
      let activeOrders = 0;
      let pendingOrders = 0;
      let revenue = 0;
      let todaySales = 0;
      let monthlySales = 0;
      let orderCount = 0;
      let yesterdaySales = 0;
      let last7DaysSales = 0;
      const ordersList: RecentOrder[] = [];
      
      // Initialize funnel metrics
      let newOrders = 0;
      let processing = 0;
      let shipped = 0;
      let delivered = 0;
      let cancelled = 0;
      let cancelledPercentage = 0;
      
      // Store parsed orders data to reuse later (avoid reading response body twice)
      let allOrders: any[] = [];
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        
        if (Array.isArray(ordersData)) {
          allOrders = ordersData;
        } else if (Array.isArray(ordersData.orders)) {
          allOrders = ordersData.orders;
        } else if (Array.isArray(ordersData.data)) {
          allOrders = ordersData.data;
        }
        
        // Use allOrders for processing
        const orders = allOrders;
        
        // Filter orders by date range
        const filteredOrders = orders.filter((order: any) => {
          if (!order.created_at) return false;
          return isDateInRange(order.created_at);
        });
        
        activeOrders = filteredOrders.filter((o: any) => o.order_status !== 3).length;
        pendingOrders = filteredOrders.filter((o: any) => o.order_status === 0).length;
        orderCount = filteredOrders.length;

        // Calculate funnel metrics
        newOrders = filteredOrders.length;
        processing = filteredOrders.filter((o: any) => o.order_status === 0).length;
        shipped = filteredOrders.filter((o: any) => o.order_status === 1).length;
        delivered = filteredOrders.filter((o: any) => o.order_status === 2).length;
        cancelled = filteredOrders.filter((o: any) => o.order_status === 3).length;
        cancelledPercentage = newOrders > 0 ? (cancelled / newOrders) * 100 : 0;
        
        // Calculate revenue from all paid orders (not just delivered ones)
        // This includes orders that are paid but may still be processing or shipped
        revenue = filteredOrders
          .filter((o: any) => o.payment_status === 1)
          .reduce((sum: number, o: any) => sum + (parseFloat(o.grand_total) || 0), 0);

        // Calculate today's sales (paid orders from today)
        todaySales = orders
          .filter((o: any) => o.created_at && isToday(o.created_at) && o.payment_status === 1)
          .reduce((sum: number, o: any) => sum + (parseFloat(o.grand_total) || 0), 0);

        // Calculate monthly sales (paid orders from current month)
        monthlySales = orders
          .filter((o: any) => o.created_at && isCurrentMonth(o.created_at) && o.payment_status === 1)
          .reduce((sum: number, o: any) => sum + (parseFloat(o.grand_total) || 0), 0);

        // Calculate yesterday's sales for comparison
        yesterdaySales = orders
          .filter((o: any) => o.created_at && isYesterday(o.created_at) && o.payment_status === 1)
          .reduce((sum: number, o: any) => sum + (parseFloat(o.grand_total) || 0), 0);

        // Calculate last 7 days sales (excluding today) for comparison
        last7DaysSales = orders
          .filter((o: any) => o.created_at && isLast7Days(o.created_at) && o.payment_status === 1)
          .reduce((sum: number, o: any) => sum + (parseFloat(o.grand_total) || 0), 0);

        // Get recent orders (last 4) - sorted by date descending
        const recent = [...filteredOrders]
          .sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 4)
          .map((order: any) => ({
            id: order.order_number || String(order.id),
            customer: order.customer_name || 'Хэрэглэгч',
            amount: parseFloat(order.grand_total) || 0,
            status: mapOrderStatus(order.order_status),
            date: order.created_at || new Date().toISOString(),
          }));
        ordersList.push(...recent);

        // Calculate top selling products by SKU from order items
        // Only count paid orders
        const paidOrders = filteredOrders.filter((o: any) => o.payment_status === 1);
        const skuSalesMap = new Map<string, { sku: string; name: string; nameMn?: string; quantity: number; revenue: number }>();
        
        paidOrders.forEach((order: any) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const sku = item.sku || 'N/A';
              const quantity = parseInt(item.quantity) || 0;
              const price = parseFloat(item.price) || 0;
              const revenue = quantity * price;
              const name = item.name_mn || item.name || 'Бараа';
              
              if (skuSalesMap.has(sku)) {
                const existing = skuSalesMap.get(sku)!;
                existing.quantity += quantity;
                existing.revenue += revenue;
              } else {
                skuSalesMap.set(sku, {
                  sku,
                  name: item.name || name,
                  nameMn: item.name_mn,
                  quantity,
                  revenue
                });
              }
            });
          }
        });

        // Convert to array and sort by quantity (top sellers)
        const topSelling = Array.from(skuSalesMap.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);
        
        setTopSellingProducts(topSelling);

        // Calculate customer metrics
        const customerMap = new Map<string, { 
          userId: string; 
          customerName: string; 
          orders: any[]; 
          totalRevenue: number;
          orderCount: number;
        }>();

        // Group orders by user_id
        paidOrders.forEach((order: any) => {
          const userId = order.user_id || 'unknown';
          const customerName = order.customer_name || 'Хэрэглэгч';
          const orderTotal = parseFloat(order.grand_total) || 0;

          if (customerMap.has(userId)) {
            const customer = customerMap.get(userId)!;
            customer.orders.push(order);
            customer.orderCount += 1;
            customer.totalRevenue += orderTotal;
          } else {
            customerMap.set(userId, {
              userId,
              customerName,
              orders: [order],
              totalRevenue: orderTotal,
              orderCount: 1,
            });
          }
        });

        // Calculate repeat purchase rate
        const totalCustomers = customerMap.size;
        const repeatCustomers = Array.from(customerMap.values()).filter(
          (customer) => customer.orderCount > 1
        ).length;
        const repeatRate = totalCustomers > 0 
          ? (repeatCustomers / totalCustomers) * 100 
          : 0;
        setRepeatPurchaseRate(repeatRate);

        // Calculate average purchase frequency
        const totalOrders = paidOrders.length;
        const avgFrequency = totalCustomers > 0 
          ? totalOrders / totalCustomers 
          : 0;
        setAveragePurchaseFrequency(avgFrequency);

        // Get TOP 10 customers (sorted by total revenue, then by order count)
        const topCustomersList = Array.from(customerMap.values())
          .map((customer) => ({
            userId: customer.userId,
            customerName: customer.customerName,
            orderCount: customer.orderCount,
            totalRevenue: customer.totalRevenue,
            averageOrderValue: customer.orderCount > 0 
              ? customer.totalRevenue / customer.orderCount 
              : 0,
          }))
          .sort((a, b) => {
            // First sort by total revenue (descending)
            if (b.totalRevenue !== a.totalRevenue) {
              return b.totalRevenue - a.totalRevenue;
            }
            // Then by order count (descending)
            return b.orderCount - a.orderCount;
          })
          .slice(0, 10);
        
        setTopCustomers(topCustomersList);
      } else {
        // No orders or request failed
        setTopSellingProducts([]);
        setTopCustomers([]);
        setRepeatPurchaseRate(0);
        setAveragePurchaseFrequency(0);
      }

      // Calculate comparison percentages
      const yesterdayComparison = yesterdaySales > 0 
        ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
        : (todaySales > 0 ? 100 : 0);
      
      const avgLast7DaysSales = last7DaysSales / 7; // Average daily sales for last 7 days
      const last7DaysComparison = avgLast7DaysSales > 0 
        ? ((todaySales - avgLast7DaysSales) / avgLast7DaysSales) * 100 
        : (todaySales > 0 ? 100 : 0);

      // Process products
      let totalProducts = 0;
      const productsList: TopProduct[] = [];
      
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        let products: any[] = [];
        
        if (Array.isArray(productsData)) {
          products = productsData;
        } else if (Array.isArray(productsData.products)) {
          products = productsData.products;
        } else if (Array.isArray(productsData.data)) {
          products = productsData.data;
        }
        
        totalProducts = products.length;

        // Calculate top products from order items
        // This is a simplified version - in a real app, you'd aggregate from order_items table
        // For now, we'll show products with highest stock or most recent
        const sortedProducts = [...products]
          .sort((a: any, b: any) => (b.stock || 0) - (a.stock || 0))
          .slice(0, 4)
          .map((product: any) => ({
            name: product.name_mn || product.name || 'Бараа',
            sales: 0, // Would need to calculate from order_items
            revenue: 0, // Would need to calculate from order_items
          }));
        productsList.push(...sortedProducts);

        // Find low stock products (stockQuantity <= 10)
        const lowStock = products
          .filter((product: any) => {
            const stock = parseInt(product.stockQuantity || product.stock_quantity || 0);
            return stock > 0 && stock <= 10;
          })
          .sort((a: any, b: any) => {
            const stockA = parseInt(a.stockQuantity || a.stock_quantity || 0);
            const stockB = parseInt(b.stockQuantity || b.stock_quantity || 0);
            return stockA - stockB; // Sort by lowest stock first
          })
          .slice(0, 5)
          .map((product: any) => ({
            id: product.id,
            sku: product.sku || 'N/A',
            name: product.name || 'Бараа',
            nameMn: product.name_mn,
            stockQuantity: parseInt(product.stockQuantity || product.stock_quantity || 0),
            inStock: product.inStock !== false && product.in_stock !== false
          }));
        
        setLowStockProducts(lowStock);
      } else {
        // No products or request failed
        setLowStockProducts([]);
      }

      // Calculate conversion metrics
      // Visitor count: Use total users as proxy (in a real app, this would come from analytics)
      let visitorCount = totalUsers;
      
      // Get unique users who placed orders
      const usersWithOrders = new Set<string>();
      let uniqueProductsInOrders = new Set<string>();
      
      if (ordersRes.ok && allOrders.length > 0) {
        // Reuse the already-parsed orders data instead of reading response again
        const orders = allOrders;

        // Filter orders by date range
        const filteredOrders = orders.filter((order: any) => {
          if (!order.created_at) return false;
          return isDateInRange(order.created_at);
        });

        filteredOrders.forEach((order: any) => {
          if (order.user_id || order.userId) {
            usersWithOrders.add(String(order.user_id || order.userId));
          }
          // Get products from order items
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              if (item.productId || item.product_id || item.sku) {
                uniqueProductsInOrders.add(String(item.productId || item.product_id || item.sku));
              }
            });
          }
        });
      }

      // Calculate Order Conversion Rate: Orders / Visitors
      // Visitor count is estimated as total users (or users with orders * 10 for better estimate)
      // In a real app, this would come from analytics tracking
      const estimatedVisitors = Math.max(totalUsers, usersWithOrders.size * 10);
      visitorCount = estimatedVisitors;
      const orderConversionRate = estimatedVisitors > 0 
        ? (orderCount / estimatedVisitors) * 100 
        : 0;

      // Calculate Product View to Cart Rate: Products in orders / Total products
      // This is an approximation - ideally we'd track product views separately
      const productViewToCartRate = totalProducts > 0 
        ? (uniqueProductsInOrders.size / totalProducts) * 100 
        : 0;

      // Calculate Cart Abandonment Rate: Estimate based on users who might have abandoned
      // This is an estimate: assume some users visited but didn't order
      const potentialCartUsers = estimatedVisitors;
      const cartAbandonmentRate = potentialCartUsers > 0 
        ? ((potentialCartUsers - usersWithOrders.size) / potentialCartUsers) * 100 
        : 0;

        // Calculate Checkout Completion Rate: Orders / Estimated cart users
        // Estimate cart users as a percentage of visitors (e.g., 30% add to cart)
        const estimatedCartUsers = Math.floor(estimatedVisitors * 0.3);
        const checkoutCompletionRate = estimatedCartUsers > 0 
          ? (orderCount / estimatedCartUsers) * 100 
          : 0;

      // Calculate delivery metrics for orders in the date range
      let deliveryCostAmount = 0;
      let averageDeliveryTime = 0;
      let deliveryCount = 0;
      let totalDeliveryTimeHours = 0;

      if (ordersRes.ok && allOrders.length > 0) {
        // Filter delivered orders (order_status = 2) that were created within the date range
        // This shows deliveries for orders created in the selected period
        const deliveredOrders = allOrders.filter((order: any) => {
          if (!order.created_at) return false;
          // Check if order was created within the date range and is delivered
          return isDateInRange(order.created_at) && order.order_status === 2;
        });

        deliveryCount = deliveredOrders.length;

        // Calculate total delivery cost
        deliveryCostAmount = deliveredOrders.reduce((sum: number, order: any) => {
          return sum + (parseFloat(order.shipping_cost) || 0);
        }, 0);

        // Calculate average delivery time (from processing_started_at to updated_at when delivered)
        const ordersWithProcessingTime = deliveredOrders.filter((order: any) => {
          return order.processing_started_at && order.updated_at;
        });

        if (ordersWithProcessingTime.length > 0) {
          ordersWithProcessingTime.forEach((order: any) => {
            const processingStart = new Date(order.processing_started_at);
            const deliveryTime = new Date(order.updated_at);
            const timeDiffMs = deliveryTime.getTime() - processingStart.getTime();
            const timeDiffHours = timeDiffMs / (1000 * 60 * 60); // Convert to hours
            if (timeDiffHours > 0) { // Only count positive time differences
              totalDeliveryTimeHours += timeDiffHours;
            }
          });

          averageDeliveryTime = ordersWithProcessingTime.length > 0 
            ? totalDeliveryTimeHours / ordersWithProcessingTime.length 
            : 0;
        }
      }

      // Process coupon statistics
      let couponUsageRate = 0;
      if (couponsRes.ok) {
        try {
          const couponsData = await couponsRes.json();
          if (couponsData.success && couponsData.data) {
            couponUsageRate = couponsData.data.usage_rate || 0;
          }
        } catch (err) {
          console.error('Error parsing coupon statistics:', err);
        }
      }

      setStats({
        totalUsers,
        activeOrders,
        revenue,
        totalProducts,
        pendingOrders,
        todaySales,
        monthlySales,
        orderCount,
        yesterdayComparison,
        last7DaysComparison,
        couponUsageRate,
        deliveryMetrics: {
          deliveryCostAmount,
          averageDeliveryTime,
          deliveryCount,
        },
        funnelMetrics: {
          newOrders,
          processing,
          shipped,
          delivered,
          cancelled,
          cancelledPercentage,
        },
        conversionMetrics: {
          visitorCount: visitorCount,
          orderConversionRate: orderConversionRate,
          productViewToCartRate: productViewToCartRate,
          cartAbandonmentRate: cartAbandonmentRate,
          checkoutCompletionRate: checkoutCompletionRate,
        },
      });
      setRecentOrders(ordersList);
      setTopProducts(productsList);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Мэдээлэл авахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mn-MN').format(price) + '₮';
  };

  const resetToToday = () => {
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(today);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Мэдээлэл ачаалж байна...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
          <Button 
            onClick={fetchDashboardData} 
            variant="outline" 
            className="mt-4"
          >
            Дахин оролдох
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Хянах самбар</h1>
          <p className="text-gray-600">Өнөөдрийн үйл ажиллагааны тойм</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Date Range Picker */}
          <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
            <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <Label htmlFor="start-date" className="text-xs text-gray-500 mb-1">
                  Эхлэх
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-32 text-sm"
                />
              </div>
              <span className="text-gray-400 mt-5">-</span>
              <div className="flex flex-col">
                <Label htmlFor="end-date" className="text-xs text-gray-500 mb-1">
                  Дуусах
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="h-8 w-32 text-sm"
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToToday}
              className="h-8 text-xs ml-2"
            >
              Өнөөдөр
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchDashboardData}
            disabled={loading}
            className="h-10"
          >
            Шинэчлэх
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт хэрэглэгч</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-blue-600">
              Бүртгэлтэй хэрэглэгч
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Идэвхтэй захиалга</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeOrders}</div>
            <p className="text-xs text-green-600">
              {stats.pendingOrders} хүлээгдэж байна
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Орлого</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.revenue)}</div>
            <p className="text-xs text-purple-600">
              Төлөгдсөн захиалгууд
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Барааны тоо</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-orange-600">
              Нийт бараа
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Өнөөдрийн борлуулалт</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.todaySales)}</div>
            <div className="flex items-center gap-1 mt-1">
              {stats.yesterdayComparison >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${stats.yesterdayComparison >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {stats.yesterdayComparison >= 0 ? '+' : ''}{stats.yesterdayComparison.toFixed(1)}% өчигдөртэй
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сарын нийт борлуулалт</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.monthlySales)}</div>
            <p className="text-xs text-indigo-600">
              Энэ сарын төлөгдсөн захиалгууд
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Захиалгын тоо</CardTitle>
            <ShoppingCart className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orderCount}</div>
            <p className="text-xs text-cyan-600">
              Сонгосон хугацааны захиалга
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">7 хоногийн харьцуулалт</CardTitle>
            <TrendingUp className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.last7DaysComparison >= 0 ? '+' : ''}{stats.last7DaysComparison.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              {stats.last7DaysComparison >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${stats.last7DaysComparison >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Өмнөх 7 хоногтой харьцуулалт
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupon Usage Rate */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Хямдралын КУПОН ашиглалтын хувь</CardTitle>
            <Ticket className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.couponUsageRate.toFixed(1)}%</div>
            <p className="text-xs text-pink-600">
              Ашигласан купон / Нийт купон
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Хүргэлтийн зардлын дүн</CardTitle>
            <Truck className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.deliveryMetrics.deliveryCostAmount)}</div>
            <p className="text-xs text-teal-600">
              Хүргэгдсэн захиалгуудын хүргэлтийн зардал
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нэгж хүргэлтийн дундаж хугацаа</CardTitle>
            <Clock className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.deliveryMetrics.averageDeliveryTime > 0 
                ? `${stats.deliveryMetrics.averageDeliveryTime.toFixed(1)} цаг`
                : '0 цаг'}
            </div>
            <p className="text-xs text-violet-600">
              Боловсруулалтаас хүргэлт хүртэлх дундаж хугацаа
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Хүргэлтийн тоо</CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryMetrics.deliveryCount}</div>
            <p className="text-xs text-amber-600">
              Сонгосон хугацаанд хүргэгдсэн захиалгын тоо
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <span>Хөрвүүлэлтийн үзүүлэлтүүд</span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Худалдааны урсгалын үзүүлэлтүүд
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Visitor Count */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Хандалтын тоо</CardTitle>
                <Eye className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.conversionMetrics.visitorCount}</div>
                <p className="text-xs text-slate-600">
                  Нийт хандалт
                </p>
              </CardContent>
            </Card>

            {/* Order Conversion Rate */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Захиалга Conversion %</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.conversionMetrics.orderConversionRate.toFixed(2)}%
                </div>
                <p className="text-xs text-blue-600">
                  Visitor → Захиалга
                </p>
              </CardContent>
            </Card>

            {/* Product View to Cart Rate */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Product view → Add to cart %</CardTitle>
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.conversionMetrics.productViewToCartRate.toFixed(2)}%
                </div>
                <p className="text-xs text-green-600">
                  Бараа харах → Сагсанд нэмэх
                </p>
              </CardContent>
            </Card>

            {/* Cart Abandonment Rate */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cart abandonment rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.conversionMetrics.cartAbandonmentRate.toFixed(2)}%
                </div>
                <p className="text-xs text-red-600">
                  Сагс орхигдсон хувь
                </p>
              </CardContent>
            </Card>

            {/* Checkout Completion Rate */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checkout completion rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.conversionMetrics.checkoutCompletionRate.toFixed(2)}%
                </div>
                <p className="text-xs text-purple-600">
                  Төлбөр төлөх дууссан хувь
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Order Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            <span>Захиалгын урсгал</span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            👉 Борлуулалт хаана &quot;унаж&quot; байгааг харна
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* New Orders */}
            <div className="relative">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {stats.funnelMetrics.newOrders}
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">Шинэ захиалга</div>
                    <div className="text-xs text-blue-700">Нийт захиалгын тоо</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">{stats.funnelMetrics.newOrders}</div>
                  <div className="text-xs text-blue-600">100%</div>
                </div>
              </div>
            </div>

            {/* Processing */}
            <div className="relative ml-8">
              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 border-l-2 border-b-2 border-gray-300 h-8"></div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                    {stats.funnelMetrics.processing}
                  </div>
                  <div>
                    <div className="font-semibold text-yellow-900">Боловсруулж буй</div>
                    <div className="text-xs text-yellow-700">Захиалга боловсруулж байна</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-900">{stats.funnelMetrics.processing}</div>
                  <div className="text-xs text-yellow-600">
                    {stats.funnelMetrics.newOrders > 0 
                      ? ((stats.funnelMetrics.processing / stats.funnelMetrics.newOrders) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Shipped */}
            <div className="relative ml-8">
              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 border-l-2 border-b-2 border-gray-300 h-8"></div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {stats.funnelMetrics.shipped}
                  </div>
                  <div>
                    <div className="font-semibold text-purple-900">Хүргэлтэд гарсан</div>
                    <div className="text-xs text-purple-700">Хүргэлтэнд гарсан захиалга</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-900">{stats.funnelMetrics.shipped}</div>
                  <div className="text-xs text-purple-600">
                    {stats.funnelMetrics.newOrders > 0 
                      ? ((stats.funnelMetrics.shipped / stats.funnelMetrics.newOrders) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Delivered */}
            <div className="relative ml-8">
              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 border-l-2 border-b-2 border-gray-300 h-8"></div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    {stats.funnelMetrics.delivered}
                  </div>
                  <div>
                    <div className="font-semibold text-green-900">Амжилттай дууссан</div>
                    <div className="text-xs text-green-700">Хүргэгдсэн захиалга</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-900">{stats.funnelMetrics.delivered}</div>
                  <div className="text-xs text-green-600">
                    {stats.funnelMetrics.newOrders > 0 
                      ? ((stats.funnelMetrics.delivered / stats.funnelMetrics.newOrders) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Cancelled */}
            <div className="relative ml-8">
              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 border-l-2 border-b-2 border-gray-300 h-8"></div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border-2 border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    {stats.funnelMetrics.cancelled}
                  </div>
                  <div>
                    <div className="font-semibold text-red-900">Цуцлагдсан захиалга</div>
                    <div className="text-xs text-red-700">Цуцлагдсан захиалгын тоо</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-900">{stats.funnelMetrics.cancelled}</div>
                  <div className="text-xs text-red-600">
                    {stats.funnelMetrics.cancelledPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Selling Products and Low Stock Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Selling Products by SKU */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span>TOP борлуулалттай бүтээгдэхүүн (SKU)</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSellingProducts.length > 0 ? (
              <div className="space-y-3">
                {topSellingProducts.map((product, index) => (
                  <div key={product.sku} className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {product.nameMn || product.name}
                        </div>
                        <div className="text-xs text-gray-600">SKU: {product.sku}</div>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="font-semibold text-emerald-700">{product.quantity} ширхэг</div>
                      <div className="text-xs text-emerald-600">{formatPrice(product.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Борлуулалтын мэдээлэл байхгүй байна
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-100 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span>Дуусахад ойртсон бараа (Alert)</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        product.stockQuantity <= 3 ? 'bg-red-500' : 
                        product.stockQuantity <= 5 ? 'bg-orange-500' : 
                        'bg-yellow-500'
                      }`}>
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {product.nameMn || product.name}
                        </div>
                        <div className="text-xs text-gray-600">SKU: {product.sku}</div>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className={`font-semibold ${
                        product.stockQuantity <= 3 ? 'text-red-700' : 
                        product.stockQuantity <= 5 ? 'text-orange-700' : 
                        'text-yellow-700'
                      }`}>
                        {product.stockQuantity} ширхэг
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.inStock ? 'Байгаа' : 'Дууссан'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Барааны нөөц хангалттай байна
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Давтан худалдан авалтын хувь</CardTitle>
            <Repeat className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repeatPurchaseRate.toFixed(1)}%</div>
            <p className="text-xs text-violet-600">
              Давтан худалдан авсан харилцагч
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Дундаж худалдан авах давтамж</CardTitle>
            <BarChart3 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePurchaseFrequency.toFixed(2)}</div>
            <p className="text-xs text-amber-600">
              Харилцагч бүрт дундаж захиалгын тоо
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOP харилцагч</CardTitle>
            <Star className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topCustomers.length}</div>
            <p className="text-xs text-pink-600">
              Шилдэг харилцагчдын тоо
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TOP 10 Customers */}
      <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-indigo-600" />
              <span>TOP 10 харилцагч (B2B)</span>
            </div>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Борлуулалтаар эрэмбэлсэн шилдэг харилцагчид
          </p>
        </CardHeader>
        <CardContent>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={customer.userId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-200">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 
                      'bg-indigo-500'
                    }`}>
                      <span className="text-sm font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {customer.customerName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {customer.orderCount} захиалга • Дундаж: {formatPrice(customer.averageOrderValue)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="font-semibold text-indigo-700">{formatPrice(customer.totalRevenue)}</div>
                    <div className="text-xs text-indigo-600">Нийт орлого</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Харилцагчийн мэдээлэл байхгүй байна
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts and Additional Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Сүүлийн захиалгууд</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/admin/order'}
              >
                Бүгдийг харах
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => {
                  const StatusIcon = statusConfig[order.status].icon;
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${statusConfig[order.status].color}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{order.id}</div>
                          <div className="text-sm text-gray-500">{order.customer}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(order.amount)}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.date)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Захиалга байхгүй байна
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Бараанууд</span>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">Бараа</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Бараа байхгүй байна
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Түргэн үйлдлүүд</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="h-16 flex-col gap-1"
                onClick={() => window.location.href = '/admin/order'}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">Захиалга харах</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-1"
                onClick={() => window.location.href = '/admin/product'}
              >
                <Package className="h-5 w-5" />
                <span className="text-xs">Бараа нэмэх</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-1"
                onClick={() => window.location.href = '/admin/users'}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Хэрэглэгч харах</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-1"
                onClick={() => window.location.href = '/admin/order'}
              >
                <Eye className="h-5 w-5" />
                <span className="text-xs">Тайлан харах</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}