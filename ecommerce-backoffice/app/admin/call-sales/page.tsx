"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Phone, Plus, Edit, Trash2, Search, Filter, Loader2, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CALL_SALES_API = `${API_URL}/api/call-sales-activities`;
const USERS_API = `${API_URL}/api/user/all`;

// Call Sales Activity type
export interface CallSalesActivityData {
  id?: string;
  sales_manager_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  phone_number: string;
  call_type: "outgoing" | "incoming";
  call_date: string;
  call_time?: string | null;
  call_duration_sec?: number | null;
  call_result?: "answered" | "no_answer" | "busy" | "rejected" | null;
  interest_level?: "high" | "medium" | "low" | null;
  sale_status?: "sold" | "follow_up" | "not_interested" | null;
  product?: string | null;
  quantity?: number | null;
  price_offer?: number | null;
  sale_amount?: number | null;
  order_id?: string | null;
  next_call_date?: string | null;
  next_action?: "call_back" | "send_price" | "meeting" | null;
  follow_up_status?: "pending" | "done" | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  sales_manager?: {
    id: string;
    full_name: string;
    phone?: string;
  };
  customer?: {
    id: string;
    full_name: string;
    phone?: string;
  } | null;
}

interface User {
  id: string;
  full_name: string;
  phone?: string;
  role?: string;
}

// Call Sales Activity Form Component
function CallSalesActivityForm({
  activity,
  onSubmit,
  onCancel,
  isLoading,
  users
}: {
  activity?: CallSalesActivityData;
  onSubmit: (activityData: Omit<CallSalesActivityData, "id" | "created_at" | "updated_at" | "sales_manager" | "customer">) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  users: User[];
}) {
  const [form, setForm] = useState<Omit<CallSalesActivityData, "id" | "created_at" | "updated_at" | "sales_manager" | "customer">>({
    sales_manager_id: activity?.sales_manager_id || "",
    customer_id: activity?.customer_id || null,
    customer_name: activity?.customer_name || "",
    phone_number: activity?.phone_number || "",
    call_type: activity?.call_type || "outgoing",
    call_date: activity?.call_date || new Date().toISOString().split('T')[0],
    call_time: activity?.call_time || new Date().toTimeString().slice(0, 5),
    call_duration_sec: activity?.call_duration_sec || 0,
    call_result: activity?.call_result || null,
    interest_level: activity?.interest_level || null,
    sale_status: activity?.sale_status || null,
    product: activity?.product || "",
    quantity: activity?.quantity || null,
    price_offer: activity?.price_offer || null,
    sale_amount: activity?.sale_amount || null,
    order_id: activity?.order_id || null,
    next_call_date: activity?.next_call_date || null,
    next_action: activity?.next_action || null,
    follow_up_status: activity?.follow_up_status || "pending",
    note: activity?.note || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Үндсэн мэдээлэл */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="font-semibold text-lg">Үндсэн мэдээлэл</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sales_manager_id">Борлуулалтын менежер *</Label>
            <Select
              value={form.sales_manager_id}
              onValueChange={(value) => setForm({...form, sales_manager_id: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.id != null && String(u.id).trim() !== "")
                  .map((user) => (
                    <SelectItem key={String(user.id)} value={String(user.id)}>
                      {user.full_name} {user.phone ? `(${user.phone})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="phone_number">Утасны дугаар *</Label>
            <Input
              id="phone_number"
              value={form.phone_number}
              onChange={(e) => setForm({...form, phone_number: e.target.value})}
              placeholder="99999999"
              required
            />
          </div>

          <div>
            <Label htmlFor="customer_id">Харилцагч (сонгох)</Label>
            <Select
              value={form.customer_id || "none"}
              onValueChange={(value) => setForm({...form, customer_id: value === "none" ? null : value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Сонгох (сонгосон бол customer_name-ийг ашиглахгүй)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Харилцагч сонгохгүй</SelectItem>
                {users
                  .filter((u) => u.id != null && String(u.id).trim() !== "")
                  .map((user) => (
                    <SelectItem key={String(user.id)} value={String(user.id)}>
                      {user.full_name} {user.phone ? `(${user.phone})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="customer_name">Харилцагчийн нэр (шинэ бол)</Label>
            <Input
              id="customer_name"
              value={form.customer_name || ""}
              onChange={(e) => setForm({...form, customer_name: e.target.value || null})}
              placeholder="Харилцагчийн нэр"
              disabled={!!form.customer_id}
            />
          </div>
        </div>
      </div>

      {/* Залгалтын мэдээлэл */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="font-semibold text-lg">Залгалтын мэдээлэл</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="call_type">Залгалтын төрөл *</Label>
            <Select
              value={form.call_type}
              onValueChange={(value: "outgoing" | "incoming") => setForm({...form, call_type: value})}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outgoing">Гарах залгалт</SelectItem>
                <SelectItem value="incoming">Ирж буй залгалт</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="call_date">Залгалтын огноо *</Label>
            <Input
              id="call_date"
              type="date"
              value={form.call_date}
              onChange={(e) => setForm({...form, call_date: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="call_time">Залгалтын цаг</Label>
            <Input
              id="call_time"
              type="time"
              value={form.call_time || ""}
              onChange={(e) => setForm({...form, call_time: e.target.value || null})}
            />
          </div>

          <div>
            <Label htmlFor="call_duration_sec">Үргэлжилсэн хугацаа (секунд)</Label>
            <Input
              id="call_duration_sec"
              type="number"
              value={form.call_duration_sec || 0}
              onChange={(e) => setForm({...form, call_duration_sec: parseInt(e.target.value) || 0})}
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="call_result">Залгалтын үр дүн</Label>
            <Select
              value={form.call_result || "none"}
              onValueChange={(value) => setForm({...form, call_result: value === "none" ? null : value as any})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Сонгохгүй</SelectItem>
                <SelectItem value="answered">Хариулсан</SelectItem>
                <SelectItem value="no_answer">Хариулаагүй</SelectItem>
                <SelectItem value="busy">Зангуу</SelectItem>
                <SelectItem value="rejected">Татгалзсан</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Борлуулалтын үр дүн */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="font-semibold text-lg">Борлуулалтын үр дүн</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="interest_level">Сонирхлын түвшин</Label>
            <Select
              value={form.interest_level || "none"}
              onValueChange={(value) => setForm({...form, interest_level: value === "none" ? null : value as any})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Сонгохгүй</SelectItem>
                <SelectItem value="high">Өндөр</SelectItem>
                <SelectItem value="medium">Дунд</SelectItem>
                <SelectItem value="low">Бага</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sale_status">Борлуулалтын статус</Label>
            <Select
              value={form.sale_status || "none"}
              onValueChange={(value) => setForm({...form, sale_status: value === "none" ? null : value as any})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Сонгохгүй</SelectItem>
                <SelectItem value="sold">Борлуулсан</SelectItem>
                <SelectItem value="follow_up">Дараагийн залгалт</SelectItem>
                <SelectItem value="not_interested">Сонирхолгүй</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="product">POS цаасны төрөл</Label>
            <Input
              id="product"
              value={form.product || ""}
              onChange={(e) => setForm({...form, product: e.target.value || null})}
              placeholder="57mm, 80mm гэх мэт"
            />
          </div>

          <div>
            <Label htmlFor="quantity">Тоо ширхэг</Label>
            <Input
              id="quantity"
              type="number"
              value={form.quantity || ""}
              onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || null})}
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="price_offer">Санал болгосон үнэ</Label>
            <Input
              id="price_offer"
              type="number"
              step="0.01"
              value={form.price_offer || ""}
              onChange={(e) => setForm({...form, price_offer: parseFloat(e.target.value) || null})}
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="sale_amount">Борлуулалтын дүн</Label>
            <Input
              id="sale_amount"
              type="number"
              step="0.01"
              value={form.sale_amount || ""}
              onChange={(e) => setForm({...form, sale_amount: parseFloat(e.target.value) || null})}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Follow-up */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="font-semibold text-lg">Follow-up</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="next_call_date">Дараагийн залгалт хийх огноо</Label>
            <Input
              id="next_call_date"
              type="date"
              value={form.next_call_date || ""}
              onChange={(e) => setForm({...form, next_call_date: e.target.value || null})}
            />
          </div>

          <div>
            <Label htmlFor="next_action">Дараагийн үйлдэл</Label>
            <Select
              value={form.next_action || "none"}
              onValueChange={(value) => setForm({...form, next_action: value === "none" ? null : value as any})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Сонгохгүй</SelectItem>
                <SelectItem value="call_back">Дахин залгах</SelectItem>
                <SelectItem value="send_price">Үнэ илгээх</SelectItem>
                <SelectItem value="meeting">Уулзалт</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="follow_up_status">Follow-up статус</Label>
            <Select
              value={form.follow_up_status || "pending"}
              onValueChange={(value) => setForm({...form, follow_up_status: value as any || "pending"})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Хүлээгдэж байна</SelectItem>
                <SelectItem value="done">Дууссан</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Тэмдэглэл */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Тэмдэглэл</h3>
        <div>
          <Label htmlFor="note">Ярьсан зүйл, нөхцөл</Label>
          <Textarea
            id="note"
            value={form.note || ""}
            onChange={(e) => setForm({...form, note: e.target.value || null})}
            placeholder="Ярьсан зүйл, нөхцөл..."
            className="min-h-[120px]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Цуцлах
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Хадгалж байна...
            </>
          ) : (
            activity ? "Хадгалах" : "Бүртгэх"
          )}
        </Button>
      </div>
    </form>
  );
}

export default function CallSalesActivitiesPage() {
  const [activities, setActivities] = useState<CallSalesActivityData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editingActivity, setEditingActivity] = useState<CallSalesActivityData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saleStatusFilter, setSaleStatusFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, activityId?: string}>({open: false});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Fetch users for dropdowns
  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(USERS_API, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setUsers(result.data);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Fetch activities from API
  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const token = getAuthToken();
      const response = await fetch(CALL_SALES_API, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setActivities([]);
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      let activitiesData: CallSalesActivityData[] = [];
      if (Array.isArray(result)) {
        activitiesData = result;
      } else if (Array.isArray(result.data)) {
        activitiesData = result.data;
      } else if (result.success && Array.isArray(result.data)) {
        activitiesData = result.data;
      }
      
      setActivities(activitiesData);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setActivities([]);
      if (err instanceof Error && !err.message.includes('404')) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchActivities();
  }, []);

  // Create activity via API
  const createActivity = async (activityData: Omit<CallSalesActivityData, "id" | "created_at" | "updated_at" | "sales_manager" | "customer">) => {
    try {
      setIsFormLoading(true);
      setError(null);
      setSuccess(null);
      
      const token = getAuthToken();
      const response = await fetch(CALL_SALES_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success || result.id) {
        setShowForm(false);
        setSuccess("Утасны харилцаа амжилттай бүртгэгдлээ");
        setTimeout(() => fetchActivities(), 500);
      } else {
        throw new Error(result.message || 'Failed to create activity');
      }
    } catch (err) {
      console.error('Error creating activity:', err);
      setError(err instanceof Error ? err.message : 'Утасны харилцаа бүртгэхэд алдаа гарлаа');
    } finally {
      setIsFormLoading(false);
    }
  };

  // Update activity via API
  const updateActivity = async (activityData: Omit<CallSalesActivityData, "id" | "created_at" | "updated_at" | "sales_manager" | "customer">) => {
    try {
      if (!editingActivity || !editingActivity.id) return;
      
      setIsFormLoading(true);
      setError(null);
      setSuccess(null);
      
      const token = getAuthToken();
      const response = await fetch(`${CALL_SALES_API}/${editingActivity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success || result.id) {
        setEditingActivity(null);
        setShowForm(false);
        setSuccess("Утасны харилцаа амжилттай шинэчлэгдлээ");
        setTimeout(() => fetchActivities(), 500);
      } else {
        throw new Error(result.message || 'Failed to update activity');
      }
    } catch (err) {
      console.error('Error updating activity:', err);
      setError(err instanceof Error ? err.message : 'Утасны харилцаа шинэчлэхэд алдаа гарлаа');
    } finally {
      setIsFormLoading(false);
    }
  };

  // Delete activity via API
  const deleteActivity = async (activityId: string) => {
    try {
      setError(null);
      setSuccess(null);
      
      const token = getAuthToken();
      const response = await fetch(`${CALL_SALES_API}/${activityId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success || response.ok) {
        setActivities(activities.filter(activity => activity.id !== activityId));
        setDeleteDialog({open: false});
        setSuccess("Утасны харилцаа амжилттай устгагдлаа");
        setTimeout(() => fetchActivities(), 500);
      } else {
        throw new Error(result.message || 'Failed to delete activity');
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError(err instanceof Error ? err.message : 'Утасны харилцаа устгахад алдаа гарлаа');
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      (activity.customer_name && activity.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      activity.phone_number.includes(searchTerm) ||
      (activity.note && activity.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (activity.sales_manager?.full_name && activity.sales_manager.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSaleStatus = saleStatusFilter === "all" || activity.sale_status === saleStatusFilter;
    const matchesFollowUp = followUpFilter === "all" || activity.follow_up_status === followUpFilter;

    return matchesSearch && matchesSaleStatus && matchesFollowUp;
  });

  // Calculate statistics
  const stats = {
    total: activities.length,
    answered: activities.filter(a => a.call_result === "answered").length,
    sold: activities.filter(a => a.sale_status === "sold").length,
    followUp: activities.filter(a => a.follow_up_status === "pending").length,
    totalSaleAmount: activities.filter(a => a.sale_status === "sold").reduce((sum, a) => sum + (a.sale_amount || 0), 0),
  };

  const getSaleStatusColor = (status?: string | null) => {
    switch (status) {
      case "sold":
        return "bg-green-100 text-green-800";
      case "follow_up":
        return "bg-blue-100 text-blue-800";
      case "not_interested":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSaleStatusLabel = (status?: string | null) => {
    switch (status) {
      case "sold":
        return "Борлуулсан";
      case "follow_up":
        return "Дараагийн залгалт";
      case "not_interested":
        return "Сонирхолгүй";
      default:
        return "-";
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Утасны харилцааны мэдээлэл уншиж байна...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Утасны харилцаа / Борлуулалтын бүртгэл</h2>
          <p className="text-gray-600">Борлуулалтын менежерийн утасны харилцаа, борлуулалтын бүртгэл</p>
        </div>
        <Button 
          onClick={() => { setEditingActivity(null); setShowForm(true); setError(null); }}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Шинэ утасны харилцаа бүртгэх
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div className="flex-1 text-sm text-red-800">{error}</div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-1 text-sm text-green-800">{success}</div>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт залгалт</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Бүх залгалт
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Хариулсан</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.answered}</div>
            <p className="text-xs text-muted-foreground">
              Хариулсан залгалт
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Борлуулсан</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sold}</div>
            <p className="text-xs text-muted-foreground">
              Амжилттай борлуулалт
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-up</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.followUp}</div>
            <p className="text-xs text-muted-foreground">
              Хүлээгдэж байна
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт борлуулалт</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalSaleAmount.toLocaleString()}₮</div>
            <p className="text-xs text-muted-foreground">
              Борлуулалтын дүн
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 max-w-md w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Харилцагчийн нэр, утас, тэмдэглэлээр хайх..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select 
                value={saleStatusFilter}
                onValueChange={setSaleStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Борлуулалтын статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Бүх статус</SelectItem>
                  <SelectItem value="sold">Борлуулсан</SelectItem>
                  <SelectItem value="follow_up">Дараагийн залгалт</SelectItem>
                  <SelectItem value="not_interested">Сонирхолгүй</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={followUpFilter}
                onValueChange={setFollowUpFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Follow-up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Бүх</SelectItem>
                  <SelectItem value="pending">Хүлээгдэж байна</SelectItem>
                  <SelectItem value="done">Дууссан</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingActivity ? "Утасны харилцаа засах" : "Шинэ утасны харилцаа бүртгэх"}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <CallSalesActivityForm
              activity={editingActivity || undefined}
              onSubmit={editingActivity ? updateActivity : createActivity}
              onCancel={() => { setShowForm(false); setEditingActivity(null); }}
              isLoading={isFormLoading}
              users={users}
            />
          </CardContent>
        </Card>
      )}

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Утасны харилцааны жагсаалт</span>
            <span className="text-sm text-muted-foreground">
              {filteredActivities.length} утасны харилцаа
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Борлуулалтын менежер</th>
                  <th className="text-left p-3">Харилцагч</th>
                  <th className="text-left p-3">Утас</th>
                  <th className="text-left p-3">Залгалтын төрөл</th>
                  <th className="text-left p-3">Огноо</th>
                  <th className="text-left p-3">Үргэлжилсэн</th>
                  <th className="text-left p-3">Борлуулалтын статус</th>
                  <th className="text-left p-3">Follow-up</th>
                  <th className="text-left p-3">Дүн</th>
                  <th className="text-left p-3">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{activity.sales_manager?.full_name || "-"}</div>
                    </td>
                    <td className="p-3">
                      <div>{activity.customer?.full_name || activity.customer_name || "-"}</div>
                    </td>
                    <td className="p-3">
                      <div>{activity.phone_number}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {activity.call_type === "outgoing" ? "Гарах" : "Ирж буй"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-xs">{formatDate(activity.call_date)}</div>
                      {activity.call_time && (
                        <div className="text-xs text-gray-500">{activity.call_time}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div>{formatDuration(activity.call_duration_sec)}</div>
                    </td>
                    <td className="p-3">
                      <Badge className={getSaleStatusColor(activity.sale_status)}>
                        {getSaleStatusLabel(activity.sale_status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {activity.next_call_date && (
                        <div className="text-xs">
                          <div>{formatDate(activity.next_call_date)}</div>
                          {activity.next_action && (
                            <div className="text-gray-500">
                              {activity.next_action === "call_back" ? "Дахин залгах" :
                               activity.next_action === "send_price" ? "Үнэ илгээх" :
                               activity.next_action === "meeting" ? "Уулзалт" : ""}
                            </div>
                          )}
                        </div>
                      )}
                      {activity.follow_up_status === "pending" && (
                        <Badge variant="outline" className="bg-yellow-50">Хүлээгдэж байна</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {activity.sale_amount ? (
                        <div className="font-medium">{activity.sale_amount.toLocaleString()}₮</div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingActivity(activity); setShowForm(true); setError(null); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => activity.id && setDeleteDialog({open: true, activityId: activity.id})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500">
                      Утасны харилцаа олдсонгүй
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Утасны харилцаа устгах уу?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Энэ үйлдлийг буцаах боломжгүй. Та устгахдаа итгэлтэй байна уу?
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteDialog({open: false})}>
                Цуцлах
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteDialog.activityId && deleteActivity(deleteDialog.activityId)}
              >
                Устгах
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

