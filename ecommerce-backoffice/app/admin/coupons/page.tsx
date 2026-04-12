"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Ticket, CheckCircle, XCircle, Clock, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Coupon {
  id: number;
  code: string;
  discount_percentage: number;
  expires_at: string;
  is_active: boolean;
  is_manual?: boolean;
  created_at?: string;
  updated_at?: string;
  usage_count?: number;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    discount_percentage: '',
    expires_at: '',
    is_active: true,
    code: '',
    count: '1',
    generationType: 'random' as 'random' | 'manual',
  });

  // Search, filter, and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1
  });

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/coupons`;

  // Get auth token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Fetch coupons with search, filter, and pagination
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setCoupons(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch coupons');
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  // Create or update coupon
  const saveCoupon = async () => {
    try {
      if (!formData.discount_percentage || !formData.expires_at) {
        setError('Бүх шаардлагатай талбаруудыг бөглөнө үү');
        return;
      }

      const discount = parseFloat(formData.discount_percentage);
      if (discount <= 0 || discount > 100) {
        setError('Хөнгөлөлтийн хувь 1-100 хооронд байх ёстой');
        return;
      }

      const expirationDate = new Date(formData.expires_at);
      if (expirationDate <= new Date()) {
        setError('Дуусах огноо ирээдүйд байх ёстой');
        return;
      }

      // Validate manual code if generation type is manual
      if (!editingCoupon && formData.generationType === 'manual') {
        if (!formData.code || formData.code.trim().length === 0) {
          setError('Гараар үүсгэх тохиолдолд код оруулах шаардлагатай');
          return;
        }
        if (formData.code.length > 50) {
          setError('Код 50 тэмдэгтээс урт байж болохгүй');
          return;
        }
      }

      // Validate count if generating random coupons
      if (!editingCoupon && formData.generationType === 'random') {
        const count = parseInt(formData.count);
        if (isNaN(count) || count < 1 || count > 100) {
          setError('Кодны тоо 1-100 хооронд байх ёстой');
          return;
        }
      }

      const token = getAuthToken();
      const url = editingCoupon ? `${API_URL}/${editingCoupon.id}` : API_URL;
      const method = editingCoupon ? 'PUT' : 'POST';

      const requestBody: any = {
        discount_percentage: discount,
        expires_at: formData.expires_at,
        is_active: formData.is_active,
      };

      // Add code or count based on generation type
      if (!editingCoupon) {
        if (formData.generationType === 'manual') {
          requestBody.code = formData.code.toUpperCase().trim();
        } else {
          requestBody.count = parseInt(formData.count);
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        await fetchCoupons();
        setIsDialogOpen(false);
        resetForm();
      } else {
        throw new Error(result.error || 'Failed to save coupon');
      }
    } catch (err) {
      console.error('Error saving coupon:', err);
      setError(err instanceof Error ? err.message : 'Failed to save coupon');
    }
  };

  // Delete coupon
  const deleteCoupon = async (id: number) => {
    if (!window.confirm('Та энэ урамшууллын кодыг устгахдаа итгэлтэй байна уу?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      await fetchCoupons();
    } catch (err) {
      console.error('Error deleting coupon:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete coupon');
    }
  };

  // Open dialog for editing
  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    // Format date for datetime-local input
    const expiresDate = new Date(coupon.expires_at);
    const localDateTime = new Date(expiresDate.getTime() - expiresDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    setFormData({
      discount_percentage: coupon.discount_percentage.toString(),
      expires_at: localDateTime,
      is_active: coupon.is_active,
      code: coupon.code,
      count: '1',
      generationType: coupon.is_manual ? 'manual' : 'random',
    });
    setIsDialogOpen(true);
  };

  // Open dialog for creating
  const handleCreate = () => {
    setEditingCoupon(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      discount_percentage: '',
      expires_at: '',
      is_active: true,
      code: '',
      count: '1',
      generationType: 'random',
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('mn-MN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if coupon is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      // Fetch all coupons for export (without pagination)
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('page', '1');
      params.append('limit', '10000'); // Large limit to get all filtered results
      
      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const couponsToExport = result.data || [];

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Урамшууллын код");

      sheet.columns = [
        { header: "Код", key: "code", width: 18 },
        { header: "Хөнгөлөлт (%)", key: "discount", width: 14 },
        { header: "Дуусах огноо", key: "expires", width: 22 },
        { header: "Ашиглалт", key: "usage", width: 12 },
        { header: "Төлөв", key: "status", width: 20 },
        { header: "Төрөл", key: "type", width: 18 },
        { header: "Үүсгэсэн огноо", key: "created", width: 22 },
      ];

      for (const coupon of couponsToExport as Coupon[]) {
        const expired = isExpired(coupon.expires_at);
        let status = "Идэвхтэй";
        if (expired) {
          status = "Хугацаа дууссан";
        } else if (!coupon.is_active) {
          status = "Идэвхгүй";
        }
        sheet.addRow({
          code: coupon.code,
          discount: coupon.discount_percentage,
          expires: formatDate(coupon.expires_at),
          usage: coupon.usage_count || 0,
          status,
          type: coupon.is_manual ? "Олон хэрэглэгч" : "Нэг удаа",
          created: coupon.created_at ? formatDate(coupon.created_at) : "",
        });
      }

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const filename = `Урамшууллын_код_${dateStr}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setError(err instanceof Error ? err.message : 'Excel файл экспорт хийхэд алдаа гарлаа');
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Fetch when filters, page, or pageSize changes
  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Урамшууллын кодуудыг уншиж байна...</p>
      </div>
    );
  }

  const activeCount = coupons.filter(c => c.is_active && !isExpired(c.expires_at)).length;
  const expiredCount = coupons.filter(c => isExpired(c.expires_at)).length;
  const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Урамшууллын код</h1>
          <p className="text-gray-600">Урамшууллын кодуудыг удирдах</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Шинэ код нэмэх
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт код</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total || coupons.length}</div>
            <p className="text-xs text-muted-foreground">
              {searchTerm || statusFilter !== 'all' ? 'Шүүлтүүрт тохирох код' : 'Бүх урамшууллын код'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Идэвхтэй</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              Хүчинтэй код
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Хугацаа дууссан</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredCount}</div>
            <p className="text-xs text-muted-foreground">
              Дууссан код
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ашиглалт</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Нийт ашиглалтын тоо
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            Хаах
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Кодоор хайх..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Төлөв" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүх төлөв</SelectItem>
                <SelectItem value="active">Идэвхтэй</SelectItem>
                <SelectItem value="inactive">Идэвхгүй</SelectItem>
                <SelectItem value="expired">Хугацаа дууссан</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Excel экспорт
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Урамшууллын кодуудын жагсаалт</CardTitle>
            <div className="text-sm text-gray-500">
              Нийт: {pagination.total} код
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="mx-auto text-gray-400 mb-3" size={40} />
              <p className="text-gray-500">Урамшууллын код олдсонгүй</p>
              <Button onClick={handleCreate} variant="outline" className="mt-3">
                Эхний код нэмэх
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Хөнгөлөлт</TableHead>
                  <TableHead>Дуусах огноо</TableHead>
                  <TableHead>Ашиглалт</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead className="text-right">Үйлдэл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon.expires_at);
                  const isActive = coupon.is_active && !expired;
                  
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold text-lg">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          {coupon.discount_percentage}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {expired && <Clock className="h-4 w-4 text-red-500" />}
                          <span className={expired ? 'text-red-500' : ''}>
                            {formatDate(coupon.expires_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">
                          {coupon.usage_count || 0} удаа
                        </span>
                        {coupon.is_manual && (
                          <span className="text-xs text-blue-600 block mt-1">
                            (Олон хэрэглэгч)
                          </span>
                        )}
                        {!coupon.is_manual && (
                          <span className="text-xs text-gray-500 block mt-1">
                            (Нэг удаа)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Идэвхтэй
                          </span>
                        ) : expired ? (
                          <span className="text-red-500 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            Хугацаа дууссан
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            Идэвхгүй
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteCoupon(coupon.id)}
                            className="hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Хуудас {pagination.page} / {pagination.totalPages}
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Урамшууллын код засах' : 'Шинэ урамшууллын код нэмэх'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingCoupon && (
              <div className="p-3 bg-gray-50 rounded-md">
                <Label className="text-sm text-gray-600">Код</Label>
                <p className="font-mono font-bold text-lg mt-1">{editingCoupon.code}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {editingCoupon.is_manual ? 'Гараар үүсгэсэн код (олон хэрэглэгч ашиглаж болно)' : 'Автоматаар үүсгэгдсэн код (зөвхөн нэг удаа ашиглах)'}
                </p>
              </div>
            )}

            {!editingCoupon && (
              <div>
                <Label>Код үүсгэх арга *</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="generationType"
                      value="random"
                      checked={formData.generationType === 'random'}
                      onChange={(e) => setFormData({ ...formData, generationType: e.target.value as 'random' | 'manual' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Автоматаар үүсгэх (олон код)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="generationType"
                      value="manual"
                      checked={formData.generationType === 'manual'}
                      onChange={(e) => setFormData({ ...formData, generationType: e.target.value as 'random' | 'manual' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Гараар оруулах (нэг код)</span>
                  </label>
                </div>
              </div>
            )}

            {!editingCoupon && formData.generationType === 'manual' && (
              <div>
                <Label htmlFor="code">
                  Купон код *
                </Label>
                <Input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Жишээ: BNI-25"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Гараар үүсгэсэн код олон хэрэглэгч ашиглаж болно (хэрэглэгч бүр нэг удаа)
                </p>
              </div>
            )}

            {!editingCoupon && formData.generationType === 'random' && (
              <div>
                <Label htmlFor="count">
                  Үүсгэх кодуудын тоо *
                </Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                  placeholder="Жишээ: 10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Автоматаар үүсгэсэн код зөвхөн нэг удаа ашиглах боломжтой (1-100 хооронд)
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="discount_percentage">
                Хөнгөлөлтийн хувь (%) *
              </Label>
              <Input
                id="discount_percentage"
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                placeholder="Жишээ: 10, 20, 50"
              />
              <p className="text-xs text-gray-500 mt-1">
                1-100 хооронд утга оруулна уу
              </p>
            </div>
            
            <div>
              <Label htmlFor="expires_at">
                Дуусах огноо ба цаг *
              </Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ирээдүйн огноо ба цаг сонгоно уу
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Идэвхтэй (хэрэглэгчдэд харагдана)
              </Label>
            </div>
            
            {!editingCoupon && formData.generationType === 'random' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Анхаар:</strong> Автоматаар үүсгэсэн код зөвхөн нэг удаа ашиглах боломжтой.
                </p>
              </div>
            )}

            {!editingCoupon && formData.generationType === 'manual' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Анхаар:</strong> Гараар үүсгэсэн код олон хэрэглэгч ашиглаж болно (хэрэглэгч бүр нэг удаа).
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Цуцлах
            </Button>
            <Button onClick={saveCoupon}>
              {editingCoupon ? 'Хадгалах' : 'Нэмэх'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

