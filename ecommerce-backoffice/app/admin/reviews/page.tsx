"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, Search, Filter, Edit, Trash2, Loader2, Eye, MessageSquare, Plus } from "lucide-react";

// API base URL
const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/reviews`;

// Review type based on your API
export interface ReviewData {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  images?: string[];
  createdAt: string;
  product?: {
    id: string;
    name?: string;
    nameMn?: string;
  };
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
  };
}

// Review Form Component
function ReviewForm({
  review,
  onSubmit,
  onCancel,
  isLoading,
  products = [],
  users = []
}: {
  review?: ReviewData;
  onSubmit: (reviewData: Partial<ReviewData>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  products?: Array<{ id: string; name?: string; nameMn?: string }>;
  users?: Array<{ id: string; full_name?: string; email?: string }>;
}) {
  const [form, setForm] = useState<Partial<ReviewData>>({
    productId: review?.productId || "",
    userId: review?.userId || "",
    userName: review?.userName || "",
    rating: review?.rating || 5,
    title: review?.title || "",
    comment: review?.comment || "",
    verifiedPurchase: review?.verifiedPurchase || false,
  });

  // Reset form when review prop changes
  useEffect(() => {
    setForm({
      productId: review?.productId || "",
      userId: review?.userId || "",
      userName: review?.userName || "",
      rating: review?.rating || 5,
      title: review?.title || "",
      comment: review?.comment || "",
      verifiedPurchase: review?.verifiedPurchase || false,
    });
  }, [review]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!review && (
          <>
            <div>
              <Label htmlFor="productId">Бүтээгдэхүүн *</Label>
              <Select
                value={form.productId || ""}
                onValueChange={(value) => setForm({...form, productId: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Бүтээгдэхүүн сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product, idx) => (
                    <SelectItem
                      key={product.id || `p-${idx}`}
                      value={product.id ? String(product.id) : `__product_${idx}__`}
                    >
                      {product.nameMn || product.name || product.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="userId">Хэрэглэгч</Label>
              <Select
                value={form.userId ? form.userId : "__none__"}
                onValueChange={(value) => {
                  if (value === "__none__") {
                    setForm({ ...form, userId: "", userName: "" });
                    return;
                  }
                  const selectedUser = users.find((u) => u.id === value);
                  setForm({
                    ...form,
                    userId: value,
                    userName: selectedUser?.full_name || form.userName || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Хэрэглэгч сонгох (сонголттой)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Хэрэглэгч сонгохгүй</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div>
          <Label htmlFor="userName">Хэрэглэгчийн нэр</Label>
          <Input
            id="userName"
            value={form.userName || ""}
            onChange={(e) => setForm({...form, userName: e.target.value})}
            placeholder="Хэрэглэгчийн нэр"
            required
          />
        </div>

        <div>
          <Label htmlFor="rating">Үнэлгээ</Label>
          <Select
            value={form.rating?.toString()}
            onValueChange={(value) => setForm({...form, rating: parseInt(value)})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 од</SelectItem>
              <SelectItem value="2">2 од</SelectItem>
              <SelectItem value="3">3 од</SelectItem>
              <SelectItem value="4">4 од</SelectItem>
              <SelectItem value="5">5 од</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="title">Гарчиг</Label>
          <Input
            id="title"
            value={form.title || ""}
            onChange={(e) => setForm({...form, title: e.target.value})}
            placeholder="Шүүмжлэлийн гарчиг (сонголттой)"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="comment">Сэтгэгдэл</Label>
          <Textarea
            id="comment"
            value={form.comment || ""}
            onChange={(e) => setForm({...form, comment: e.target.value})}
            placeholder="Сэтгэгдэл бичих"
            rows={4}
            required
          />
        </div>

        <div>
          <Label htmlFor="verifiedPurchase">Баталгаажсан худалдан авалт</Label>
          <Select
            value={form.verifiedPurchase ? "true" : "false"}
            onValueChange={(value) => setForm({...form, verifiedPurchase: value === "true"})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Тийм</SelectItem>
              <SelectItem value="false">Үгүй</SelectItem>
            </SelectContent>
          </Select>
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
            review ? "Хадгалах" : "Үүсгэх"
          )}
        </Button>
      </div>
    </form>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [editingReview, setEditingReview] = useState<ReviewData | null>(null);
  const [viewingReview, setViewingReview] = useState<ReviewData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, reviewId?: string}>({open: false});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState<Array<{ id: string; name?: string; nameMn?: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name?: string; email?: string }>>([]);

  // Fetch reviews from API
  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50"
      });
      
      if (ratingFilter !== "all") {
        params.append("rating", ratingFilter);
      }
      
      if (verifiedFilter !== "all") {
        params.append("verifiedPurchase", verifiedFilter);
      }
      
      const response = await fetch(`${API_URL}/all?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.reviews && Array.isArray(result.reviews)) {
        setReviews(result.reviews);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } else if (Array.isArray(result)) {
        setReviews(result);
        setTotal(result.length);
        setTotalPages(1);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products and users for form dropdowns
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products?limit=1000`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || data || []);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?limit=1000`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || data || []);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchProducts();
    fetchUsers();
  }, []);

  // Fetch reviews on component mount and when filters change
  useEffect(() => {
    fetchReviews();
  }, [page, ratingFilter, verifiedFilter]);

  // Create review via API
  const createReview = async (reviewData: Partial<ReviewData>) => {
    try {
      if (!reviewData.productId || !reviewData.comment || !reviewData.rating) {
        throw new Error('Бүтээгдэхүүн, үнэлгээ, сэтгэгдэл заавал шаардлагатай');
      }
      
      setIsFormLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: reviewData.productId,
          userId: reviewData.userId || undefined,
          userName: reviewData.userName,
          rating: reviewData.rating,
          title: reviewData.title || undefined,
          comment: reviewData.comment,
          verifiedPurchase: reviewData.verifiedPurchase || false,
          images: reviewData.images || []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setEditingReview(null);
      setShowForm(false);
      setSuccess("Шүүмжлэл амжилттай үүсгэгдлээ");
      setTimeout(() => fetchReviews(), 500);
    } catch (err) {
      console.error('Error creating review:', err);
      setError(err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setIsFormLoading(false);
    }
  };

  // Update review via API
  const updateReview = async (reviewData: Partial<ReviewData>) => {
    try {
      if (!editingReview) return;
      
      setIsFormLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`${API_URL}/${editingReview.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setReviews(reviews.map(review => 
        review.id === editingReview.id 
          ? { ...review, ...result.review || result }
          : review
      ));
      
      setEditingReview(null);
      setShowForm(false);
      setSuccess("Шүүмжлэл амжилттай шинэчлэгдлээ");
      setTimeout(() => fetchReviews(), 500);
    } catch (err) {
      console.error('Error updating review:', err);
      setError(err instanceof Error ? err.message : 'Failed to update review');
    } finally {
      setIsFormLoading(false);
    }
  };

  // Delete review via API
  const deleteReview = async (reviewId: string) => {
    try {
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`${API_URL}/${reviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      setReviews(reviews.filter(review => review.id !== reviewId));
      setDeleteDialog({open: false});
      setSuccess("Шүүмжлэл амжилттай устгагдлаа");
      setTimeout(() => fetchReviews(), 500);
    } catch (err) {
      console.error('Error deleting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete review');
    }
  };

  // Filter reviews based on search
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product?.nameMn?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-300 text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Шүүмжлэл</h1>
          <p className="text-muted-foreground mt-1">
            Бүтээгдэхүүний шүүмжлэлүүдийг удирдах
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingReview(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Шинэ шүүмжлэл
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Хайх..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Үнэлгээ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүх үнэлгээ</SelectItem>
                <SelectItem value="5">5 од</SelectItem>
                <SelectItem value="4">4 од</SelectItem>
                <SelectItem value="3">3 од</SelectItem>
                <SelectItem value="2">2 од</SelectItem>
                <SelectItem value="1">1 од</SelectItem>
              </SelectContent>
            </Select>

            <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Баталгаажсан" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүгд</SelectItem>
                <SelectItem value="true">Тийм</SelectItem>
                <SelectItem value="false">Үгүй</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setRatingFilter("all");
                setVerifiedFilter("all");
                setPage(1);
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Цэвэрлэх
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Шүүмжлэл олдсонгүй</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {filteredReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{review.userName}</h3>
                            {review.verifiedPurchase && (
                              <Badge variant="outline" className="text-xs">
                                Баталгаажсан
                              </Badge>
                            )}
                          </div>
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      
                      {review.title && (
                        <h4 className="font-medium text-lg">{review.title}</h4>
                      )}
                      
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Бүтээгдэхүүн: {review.product?.nameMn || review.product?.name || "Тодорхойгүй"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(review.createdAt).toLocaleDateString('mn-MN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        {review.helpfulCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{review.helpfulCount} хэрэгтэй</span>
                          </>
                        )}
                      </div>
                      
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {review.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Review image ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingReview(review);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingReview(review);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteDialog({open: true, reviewId: review.id})}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Нийт {total} шүүмжлэл, {page}/{totalPages} хуудас
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Өмнөх
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Дараах
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? "Шүүмжлэл засах" : "Шинэ шүүмжлэл"}
            </DialogTitle>
          </DialogHeader>
          <ReviewForm
            review={editingReview || undefined}
            onSubmit={editingReview ? updateReview : createReview}
            onCancel={() => {
              setShowForm(false);
              setEditingReview(null);
            }}
            isLoading={isFormLoading}
            products={products}
            users={users}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Шүүмжлэлийн дэлгэрэнгүй</DialogTitle>
          </DialogHeader>
          {viewingReview && (
            <div className="space-y-4">
              <div>
                <Label>Хэрэглэгч</Label>
                <p className="font-semibold">{viewingReview.userName}</p>
                {viewingReview.user && (
                  <p className="text-sm text-muted-foreground">
                    {viewingReview.user.email && `${viewingReview.user.email} • `}
                    {viewingReview.user.phone}
                  </p>
                )}
              </div>
              
              <div>
                <Label>Үнэлгээ</Label>
                <div className="mt-1">{renderStars(viewingReview.rating)}</div>
              </div>
              
              {viewingReview.title && (
                <div>
                  <Label>Гарчиг</Label>
                  <p className="font-medium">{viewingReview.title}</p>
                </div>
              )}
              
              <div>
                <Label>Сэтгэгдэл</Label>
                <p className="text-sm">{viewingReview.comment}</p>
              </div>
              
              <div>
                <Label>Бүтээгдэхүүн</Label>
                <p className="font-medium">
                  {viewingReview.product?.nameMn || viewingReview.product?.name || "Тодорхойгүй"}
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <Label>Огноо</Label>
                  <p>
                    {new Date(viewingReview.createdAt).toLocaleDateString('mn-MN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <Label>Хэрэгтэй</Label>
                  <p>{viewingReview.helpfulCount}</p>
                </div>
                <div>
                  <Label>Баталгаажсан</Label>
                  <p>{viewingReview.verifiedPurchase ? "Тийм" : "Үгүй"}</p>
                </div>
              </div>
              
              {viewingReview.images && viewingReview.images.length > 0 && (
                <div>
                  <Label>Зураг</Label>
                  <div className="flex gap-2 mt-2">
                    {viewingReview.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Review image ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Шүүмжлэл устгах</DialogTitle>
          </DialogHeader>
          <p>Та энэ шүүмжлэлийг устгахдаа итгэлтэй байна уу?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({open: false})}>
              Цуцлах
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.reviewId) {
                  deleteReview(deleteDialog.reviewId);
                }
              }}
            >
              Устгах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

