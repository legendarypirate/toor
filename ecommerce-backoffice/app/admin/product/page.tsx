"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Eye, Trash, Upload, X, ChevronLeft, Minus, Copy, Package, Check, AlertCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { getApiBase } from "@/lib/apiBase";

// Simple Textarea component
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={`flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
);
Textarea.displayName = "Textarea";

// Custom Progress Bar component
const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// Custom Alert component
const Alert = ({ 
  children, 
  variant = "default",
  className = ""
}: { 
  children: React.ReactNode; 
  variant?: "default" | "destructive";
  className?: string;
}) => {
  const variants = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    destructive: "bg-red-50 border-red-200 text-red-800"
  };

  return (
    <div className={`border rounded-md p-4 ${variants[variant]} ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="h-4 w-4 mr-3 mt-0.5" />
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

// Types
type Category = {
  id: string;
  name: string;
  nameMn: string;
  image: string;
  description: string | null;
  productCount: number;
  parentId: string | null;
  children?: Category[];
};

type Product = {
  id: string;
  sku: string;
  name: string;
  nameMn: string;
  price: number;
  originalPrice?: number;
  images: string[];
  thumbnail: string;
  category: string;
  categoryId?: string;
  subcategory?: string;
  // Owning company (affects which bank accounts show on checkout)
  company?: string;
  bankAccountId?: number;
  inStock: boolean;
  stockQuantity: number;
  brand?: string;
  description: string;
  descriptionMn?: string;
  specifications: Record<string, string>;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  isBestSeller: boolean;
  isLimited: boolean;
  isGift: boolean;
  discount: number;
  discountAmount?: number;
  salePrice?: number;
  saleEndDate?: string;
  sales: number;
  rating: number;
  reviewCount: number;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  tags: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  variations?: ProductVariation[];
};

type ProductVariation = {
  id: string;
  productId: string;
  name: string;
  nameMn: string;
  price: number;
  originalPrice?: number;
  sku: string;
  images: string[];
  inStock: boolean;
  stockQuantity: number;
  attributes: Record<string, string>;
};

type BankAccount = {
  id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  display_order: number;
  color_scheme: string;
  company?: string;
};

// API base URL (…/api — avoids /api/api when env already ends with /api)
const API_URL = getApiBase();

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

// Attribute types for variations
type AttributeType = {
  name: string;
  nameMn: string;
  values: string[];
};

const defaultAttributes: AttributeType[] = [
  { name: "color", nameMn: "Өнгө", values: ["Улаан", "Хөх", "Ногоон", "Хар", "Цагаан"] },
  { name: "size", nameMn: "Хэмжээ", values: ["S", "M", "L", "XL", "XXL"] },
  { name: "material", nameMn: "Материал", values: ["Ноос", "Хөвөн", "Савхи", "Нэхмэл"] },
];

// Custom Tree Select Component
interface TreeSelectProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string, categoryName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function TreeSelect({ categories, value, onChange, placeholder = "Ангилал сонгох", disabled }: TreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Find the selected category for display
  const findCategoryById = (categories: Category[], id: string): Category | null => {
    for (const category of categories) {
      if (category.id === id) return category;
      if (category.children) {
        const found = findCategoryById(category.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedCategory = value ? findCategoryById(categories, value) : null;

  // Filter categories based on search
  const filterCategories = (cats: Category[], term: string): Category[] => {
    if (!term) return cats;
    
    return cats.filter(cat => {
      const matches = cat.nameMn?.toLowerCase().includes(term.toLowerCase()) || 
                     cat.name?.toLowerCase().includes(term.toLowerCase());
      if (matches) return true;
      
      if (cat.children) {
        const filteredChildren = filterCategories(cat.children, term);
        return filteredChildren.length > 0;
      }
      return false;
    }).map(cat => ({
      ...cat,
      children: cat.children ? filterCategories(cat.children, term) : []
    }));
  };

  const filteredCategories = filterCategories(categories, searchTerm);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderCategory = (category: Category, depth = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.includes(category.id);

    return (
      <div key={category.id}>
        <div
          className={`flex items-center p-2 hover:bg-gray-100 cursor-pointer ${value === category.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
          onClick={() => {
            onChange(category.id, category.nameMn);
            setIsOpen(false);
          }}
        >
          <div style={{ marginLeft: depth * 20 }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(category.id);
                }}
                className="mr-1 p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-6 inline-block" />
            )}
          </div>
          <div className="flex-1 truncate">
            <span className="text-sm">
              {category.nameMn || category.name}
              {category.productCount > 0 && (
                <span className="text-gray-500 text-xs ml-2">
                  ({category.productCount})
                </span>
              )}
            </span>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-6">
            {category.children!.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm bg-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'
        } ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
      >
        <span className="truncate">
          {selectedCategory ? (selectedCategory.nameMn || selectedCategory.name) : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
            <div className="p-2 border-b">
              <Input
                placeholder="Ангилал хайх..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ScrollArea className="h-64">
              <div className="p-1">
                {filteredCategories.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Ангилал олдсонгүй
                  </div>
                ) : (
                  filteredCategories.map(category => renderCategory(category))
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}

interface ProductEditFormProps {
  product: Product;
  onCancel: () => void;
  onSave: (product: Product, uploadedImages: string[]) => Promise<{ success: boolean; productId?: string }>;
  isCreating?: boolean;
  categories: Category[];
  bankAccounts: BankAccount[];
  bankAccountsLoading?: boolean;
}

function ProductEditForm({ product, onCancel, onSave, isCreating = false, categories, bankAccounts, bankAccountsLoading = false }: ProductEditFormProps) {
  const [form, setForm] = useState<Product>({ ...product });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<AttributeType[]>([defaultAttributes[0]]);
  const [variations, setVariations] = useState<ProductVariation[]>(product.variations || []);
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [infoImageFiles, setInfoImageFiles] = useState<File[]>([]);
  const [infoImages, setInfoImages] = useState<string[]>([]);
  const [loadingInfoImages, setLoadingInfoImages] = useState(false);
  const [uploadingInfoImages, setUploadingInfoImages] = useState(false);

  const DEFAULT_COMPANY_KEY = 'terguun_gereg';
  /** Radix SelectItem cannot use value="" — reserved for clearing the Select */
  const NO_BANK_ACCOUNTS_PLACEHOLDER = '__no_bank_accounts__';
  const selectedCompany = form.company || DEFAULT_COMPANY_KEY;
  const bankAccountsForCompany = bankAccounts.filter((ba) => (ba.company || DEFAULT_COMPANY_KEY) === selectedCompany);

  // If user has not selected a bank account yet (or company changed), default to the first match.
  useEffect(() => {
    if (!bankAccountsForCompany.length) return;

    const currentId = form.bankAccountId;
    const hasValidSelection = currentId != null && bankAccountsForCompany.some((ba) => ba.id === currentId);

    if (!hasValidSelection) {
      setForm((prev) => ({
        ...prev,
        company: selectedCompany,
        bankAccountId: bankAccountsForCompany[0].id,
      }));
    }
  }, [bankAccounts, selectedCompany, form.bankAccountId]);

  // Function to upload images to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'products');
      formData.append('tags', 'product_image');

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/dgpk9aqnc/image/upload`);
      xhr.send(formData);
    });
  };

  // Upload all images
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const cloudinaryUrl = await uploadToCloudinary(file);
        uploadedUrls.push(cloudinaryUrl);
      } catch (error) {
        console.error(`Failed to upload image ${file.name}:`, error);
        errors.push(`Зураг оруулахад алдаа гарлаа: ${file.name}`);
      }
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    return uploadedUrls;
  };

  function updateField<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Calculate the third value when two of price, originalPrice, or discount are provided
  const calculatePriceFields = (
    price: number,
    originalPrice: number | undefined,
    discount: number,
    changedField: 'price' | 'originalPrice' | 'discount'
  ) => {
    const priceVal = price || 0;
    const originalPriceVal = originalPrice || 0;
    const discountVal = discount || 0;

    let newPrice = priceVal;
    let newOriginalPrice = originalPriceVal;
    let newDiscount = discountVal;

    // If two fields are filled, calculate the third
    if (changedField === 'price') {
      // Price was changed
      if (originalPriceVal > 0 && originalPriceVal >= priceVal) {
        // Calculate discount from price and originalPrice
        newDiscount = originalPriceVal > 0 ? ((originalPriceVal - priceVal) / originalPriceVal) * 100 : 0;
      } else if (discountVal > 0 && discountVal < 100 && priceVal > 0) {
        // Calculate originalPrice from price and discount
        newOriginalPrice = priceVal / (1 - discountVal / 100);
      }
    } else if (changedField === 'originalPrice') {
      // OriginalPrice was changed
      if (priceVal > 0 && originalPriceVal > 0 && originalPriceVal >= priceVal) {
        // Calculate discount from price and originalPrice
        newDiscount = ((originalPriceVal - priceVal) / originalPriceVal) * 100;
      } else if (discountVal > 0 && discountVal <= 100 && originalPriceVal > 0) {
        // Calculate price from originalPrice and discount
        newPrice = originalPriceVal * (1 - discountVal / 100);
      }
    } else if (changedField === 'discount') {
      // Discount was changed
      if (originalPriceVal > 0 && discountVal >= 0 && discountVal <= 100) {
        // Calculate price from originalPrice and discount
        newPrice = originalPriceVal * (1 - discountVal / 100);
      } else if (priceVal > 0 && discountVal > 0 && discountVal < 100) {
        // Calculate originalPrice from price and discount
        newOriginalPrice = priceVal / (1 - discountVal / 100);
      }
    }

    return {
      price: Math.round(newPrice * 100) / 100,
      originalPrice: newOriginalPrice > 0 ? Math.round(newOriginalPrice * 100) / 100 : undefined,
      discount: Math.round(newDiscount * 100) / 100
    };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    
    // Show preview temporarily
    const previewUrls = newFiles.map(file => URL.createObjectURL(file));
    setForm(prev => ({
      ...prev,
      images: [...prev.images, ...previewUrls]
    }));
    
    // Store files for later upload
    setImageFiles(prev => [...prev, ...newFiles]);
  };

  const removeImage = (index: number) => {
    setForm(prev => {
      // Revoke blob URL to free memory
      const imageToRemove = prev.images[index];
      if (imageToRemove && imageToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove);
      }
      return {
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      };
    });
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index: number, field: keyof AttributeType, value: string | string[]) => {
    const updated = [...selectedAttributes];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedAttributes(updated);
  };

  const addAttribute = () => {
    if (selectedAttributes.length < defaultAttributes.length) {
      setSelectedAttributes([...selectedAttributes, defaultAttributes[selectedAttributes.length]]);
    }
  };

  const removeAttribute = (index: number) => {
    setSelectedAttributes(selectedAttributes.filter((_, i) => i !== index));
  };

  const generateVariations = () => {
    setGeneratingVariations(true);
    
    // Generate all possible combinations of selected attributes
    const combinations: string[][] = [];
    
    function combine(current: string[], depth: number) {
      if (depth === selectedAttributes.length) {
        combinations.push([...current]);
        return;
      }
      
      selectedAttributes[depth].values.forEach(value => {
        combine([...current, value], depth + 1);
      });
    }
    
    combine([], 0);
    
    // Create variations from combinations
    const newVariations: ProductVariation[] = combinations.map((combo, index) => {
      const sku = `${form.sku}-${index + 1}`;
      const name = combo.join(' ');
      const attributes: Record<string, string> = {};
      
      selectedAttributes.forEach((attr, idx) => {
        attributes[attr.name] = combo[idx];
      });
      
      return {
        id: `temp-${index}`,
        productId: form.id,
        name: name,
        nameMn: name,
        price: form.price,
        originalPrice: form.originalPrice,
        sku: sku,
        images: [],
        inStock: true,
        stockQuantity: form.stockQuantity,
        attributes: attributes
      };
    });
    
    setVariations(newVariations);
    setGeneratingVariations(false);
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    setVariations(updated);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (categoryId: string, categoryName: string) => {
    updateField('categoryId', categoryId);
    updateField('category', categoryName);
  };

  // Fetch existing info images when product loads
  useEffect(() => {
    if (product.id && !isCreating) {
      fetchInfoImages();
    }
  }, [product.id, isCreating]);

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    const formImages = form.images;
    const infoImagesList = infoImages;
    
    return () => {
      // Cleanup blob URLs when component unmounts
      formImages.forEach(img => {
        if (img && typeof img === 'string' && img.startsWith('blob:')) {
          URL.revokeObjectURL(img);
        }
      });
      infoImagesList.forEach(img => {
        if (img && typeof img === 'string' && img.startsWith('blob:')) {
          URL.revokeObjectURL(img);
        }
      });
    };
  }, [form.images, infoImages]); // Cleanup when images change or component unmounts

  const fetchInfoImages = async () => {
    if (!product.id) return;
    try {
      setLoadingInfoImages(true);
      const response = await fetch(`${API_URL}/product-info-images/product/${product.id}`);
      if (response.ok) {
        const data = await response.json();
        setInfoImages(data.map((img: any) => img.imageUrl));
      }
    } catch (error) {
      console.error('Error fetching info images:', error);
    } finally {
      setLoadingInfoImages(false);
    }
  };

  const handleInfoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    
    // Check total image count (existing + new)
    const existingCount = infoImages.filter(url => 
      url.startsWith('http') && !url.startsWith('blob:')
    ).length;
    const totalCount = existingCount + newFiles.length;
    
    if (totalCount > 5) {
      alert(`Хамгийн ихдээ 5 зураг оруулж болно. Та ${existingCount} зурагтай, ${newFiles.length} шинэ зураг нэмэх гэж байна.`);
      e.target.value = ''; // Reset input
      return;
    }
    
    // Limit to 5 total
    const allowedNewFiles = newFiles.slice(0, 5 - existingCount);
    if (allowedNewFiles.length < newFiles.length) {
      alert(`Хамгийн ихдээ 5 зураг оруулж болно. ${allowedNewFiles.length} зураг нэмэгдлээ.`);
    }
    
    const previewUrls = allowedNewFiles.map(file => URL.createObjectURL(file));
    setInfoImages(prev => [...prev, ...previewUrls]);
    setInfoImageFiles(prev => [...prev, ...allowedNewFiles]);
    e.target.value = ''; // Reset input
  };

  const removeInfoImage = (index: number) => {
    setInfoImages(prev => {
      // Revoke blob URL to free memory
      const imageToRemove = prev[index];
      if (imageToRemove && imageToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove);
      }
      return prev.filter((_, i) => i !== index);
    });
    setInfoImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const saveInfoImages = async (productId: string) => {
    if (infoImageFiles.length === 0 && infoImages.length === 0) return;

    try {
      setUploadingInfoImages(true);
      
      // Upload new images to Cloudinary
      const uploadedUrls: string[] = [];
      for (let i = 0; i < infoImageFiles.length; i++) {
        const file = infoImageFiles[i];
        const url = await uploadToCloudinary(file);
        uploadedUrls.push(url);
      }

      // Combine existing URLs (filter out blob URLs) with new uploaded URLs
      // Also revoke blob URLs before filtering to free memory
      const blobUrls: string[] = [];
      const existingUrls = infoImages.filter(url => {
        if (url.startsWith('blob:')) {
          blobUrls.push(url);
          return false;
        }
        return url.startsWith('http');
      });
      
      // Revoke all blob URLs to free memory
      blobUrls.forEach(url => URL.revokeObjectURL(url));
      
      const allImageUrls = [...existingUrls, ...uploadedUrls];

      // Limit to 5 images max
      const limitedImageUrls = allImageUrls.slice(0, 5);

      // Delete existing info images for this product
      await fetch(`${API_URL}/product-info-images/product/${productId}`, {
        method: 'DELETE'
      });

      // Bulk create new info images
      if (limitedImageUrls.length > 0) {
        await fetch(`${API_URL}/product-info-images/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productId,
            images: limitedImageUrls
          })
        });
      }
    } catch (error) {
      console.error('Error saving info images:', error);
      throw error;
    } finally {
      setUploadingInfoImages(false);
    }
  };

 const handleSave = async () => {
  try {
    setUploading(true);
    setUploadErrors([]);

    // Upload images to Cloudinary
    let uploadedImageUrls: string[] = [];
    if (imageFiles.length > 0) {
      uploadedImageUrls = await uploadImages(imageFiles);
    }

    // Combine existing URLs (filter out blob URLs) with new uploaded URLs
    // Also revoke blob URLs before filtering to free memory
    const blobUrls: string[] = [];
    const existingUrls = form.images.filter(url => {
      if (url.startsWith('blob:')) {
        blobUrls.push(url);
        return false;
      }
      return url.startsWith('http');
    });
    
    // Revoke all blob URLs to free memory
    blobUrls.forEach(url => URL.revokeObjectURL(url));
    
    const allImageUrls = [...existingUrls, ...uploadedImageUrls];

    // Prepare product data for API
    const productToSave = {
      ...form,
      images: allImageUrls,
      thumbnail: allImageUrls[0] || form.thumbnail,
      variations: variations,
      // Ensure we send BOTH category and categoryId for backward compatibility
      category: form.category, // Category name (from TreeSelect)
      categoryId: form.categoryId, // Category ID (from TreeSelect)
    };

    // Remove blob URLs before saving
    const cleanProduct = {
      ...productToSave,
      images: productToSave.images.filter(url => !url.startsWith('blob:'))
    };

    console.log('Saving product with category data:', {
      category: cleanProduct.category,
      categoryId: cleanProduct.categoryId
    });

    // Save product first
    const saveResult = await onSave(cleanProduct, uploadedImageUrls);
    
    // Then save info images if product was created/updated successfully
    const productId = saveResult?.productId || cleanProduct.id || form.id;
    if (productId && (saveResult?.success !== false)) {
      await saveInfoImages(productId);
    }
  } catch (error) {
    console.error('Error uploading images:', error);
    setUploadErrors(['Зурагнуудыг оруулахад алдаа гарлаа. Дахин оролдоно уу.']);
  } finally {
    setUploading(false);
  }
};
  return (
    <div className="space-y-6 h-full overflow-y-auto">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="basic">Үндсэн мэдээлэл</TabsTrigger>
          <TabsTrigger value="details">Дэлгэрэнгүй</TabsTrigger>
          <TabsTrigger value="attributes">Шинж чанарууд</TabsTrigger>
          <TabsTrigger value="variants">Вариантууд</TabsTrigger>
          <TabsTrigger value="info-images">Мэдээллийн зураг</TabsTrigger>
        </TabsList>

        {/* Upload Status */}
        {uploading && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Зурагнуудыг оруулж байна... {uploadProgress.toFixed(0)}%
              <Progress value={uploadProgress} className="mt-2" />
            </AlertDescription>
          </Alert>
        )}

        {uploadErrors.length > 0 && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {uploadErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Барааны код (SKU)</label>
              <Input 
                value={form.sku} 
                onChange={(e) => updateField('sku', e.target.value)} 
                placeholder="PRD-001"
                disabled={uploading}
              /> 
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Ангилал</label>
              <TreeSelect 
                categories={categories}
                value={form.categoryId || form.category}
                onChange={handleCategoryChange}
                placeholder="Ангилал сонгох"
                disabled={uploading}
              />
              {form.category && !form.categoryId && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Хуучин ангилал: {form.category}. Шинэ ангилал сонгох хэрэгтэй.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Компани</label>
              <Select
                value={selectedCompany}
                onValueChange={(value) => {
                  updateField("company", value);
                  const first = bankAccounts.find((ba) => (ba.company || DEFAULT_COMPANY_KEY) === value);
                  if (first) {
                    updateField("bankAccountId", first.id);
                  }
                }}
                disabled={uploading || bankAccountsLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terguun_gereg">Тэргүүн гэрэгэ</SelectItem>
                  <SelectItem value="geregesoft">Гэрэгесофт</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Банкны данс</label>
              <Select
                value={
                  bankAccountsForCompany.length === 0
                    ? NO_BANK_ACCOUNTS_PLACEHOLDER
                    : form.bankAccountId != null
                      ? String(form.bankAccountId)
                      : ""
                }
                onValueChange={(value) => {
                  if (value === NO_BANK_ACCOUNTS_PLACEHOLDER) return;
                  if (!value) return updateField("bankAccountId", undefined);
                  updateField("bankAccountId", parseInt(value, 10));
                }}
                disabled={uploading || bankAccountsLoading || bankAccountsForCompany.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Банкны данс сонгох" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccountsForCompany.length === 0 ? (
                    <SelectItem value={NO_BANK_ACCOUNTS_PLACEHOLDER} disabled>
                      Энэ компанид данс олдсонгүй
                    </SelectItem>
                  ) : (
                    bankAccountsForCompany.map((ba) => (
                      <SelectItem key={ba.id} value={String(ba.id)}>
                        {ba.bank_name} - {ba.account_number}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Барааны нэр</label>
              <Input 
                value={form.name} 
                onChange={(e) => updateField('name', e.target.value)} 
                placeholder="Product name in English"
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Барааны нэр (Монгол)</label>
              <Input 
                value={form.nameMn} 
                onChange={(e) => updateField('nameMn', e.target.value)} 
                placeholder="Барааны нэр монголоор"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Үнэ (₮)</label>
              <Input 
                type="number" 
                value={form.price} 
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value) || 0;
                  const calculated = calculatePriceFields(
                    newPrice,
                    form.originalPrice,
                    form.discount,
                    'price'
                  );
                  setForm((f) => ({
                    ...f,
                    price: calculated.price,
                    originalPrice: calculated.originalPrice !== undefined ? calculated.originalPrice : f.originalPrice,
                    discount: calculated.discount
                  }));
                }} 
                placeholder="0"
                min="0"
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Анхны үнэ (₮)</label>
              <Input 
                type="number" 
                value={form.originalPrice || ''} 
                onChange={(e) => {
                  const inputValue = e.target.value;
                  const newOriginalPrice = inputValue === '' ? undefined : (parseFloat(inputValue) || 0);
                  const calculated = calculatePriceFields(
                    form.price,
                    newOriginalPrice,
                    form.discount,
                    'originalPrice'
                  );
                  setForm((f) => ({
                    ...f,
                    price: calculated.price,
                    originalPrice: calculated.originalPrice !== undefined ? calculated.originalPrice : newOriginalPrice,
                    discount: calculated.discount
                  }));
                }} 
                placeholder="0"
                min="0"
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Хямдрал (%)</label>
              <Input 
                type="number" 
                value={form.discount} 
                onChange={(e) => {
                  const newDiscount = parseFloat(e.target.value) || 0;
                  const calculated = calculatePriceFields(
                    form.price,
                    form.originalPrice,
                    newDiscount,
                    'discount'
                  );
                  setForm((f) => ({
                    ...f,
                    price: calculated.price,
                    originalPrice: calculated.originalPrice !== undefined ? calculated.originalPrice : f.originalPrice,
                    discount: calculated.discount
                  }));
                }} 
                placeholder="0"
                min="0"
                max="100"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-1">Дурын хоёр утга оруулахад гурав дахь нь автоматаар тооцоолно</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Нөөц</label>
              <Input 
                type="number" 
                value={form.stockQuantity} 
                onChange={(e) => updateField('stockQuantity', parseInt(e.target.value) || 0)} 
                placeholder="0"
                min="0"
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Барааны төлөв</label>
              <Select 
                value={form.inStock ? "in-stock" : "out-of-stock"} 
                onValueChange={(value) => updateField('inStock', value === "in-stock")}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-stock">Бэлэн</SelectItem>
                  <SelectItem value="out-of-stock">Дууссан</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Бренд</label>
              <Input 
                value={form.brand || ""} 
                onChange={(e) => updateField('brand', e.target.value)} 
                placeholder="Бренд"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isGift"
              checked={form.isGift || false}
              onChange={(e) => updateField('isGift', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={uploading}
            />
            <label htmlFor="isGift" className="text-sm font-medium">
              Бэлэг бараа
            </label>
          </div>
        </TabsContent>

        {/* Details Tab - With Checkboxes */}
        <TabsContent value="details" className="space-y-6">
          <div>
            <label className="text-sm font-medium block mb-1">Тайлбар (Монгол)</label>
            <div className={uploading ? "opacity-50 pointer-events-none" : ""}>
              <TiptapEditor
                value={form.descriptionMn || form.description || ""}
                onChange={(value: string) => updateField("descriptionMn", value)}
                placeholder="Барааны тайлбар монголоор"
                disabled={uploading}
                minHeight={150}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Тайлбар (Англи)</label>
            <div className={uploading ? "opacity-50 pointer-events-none" : ""}>
              <TiptapEditor
                value={form.description || ""}
                onChange={(value: string) => updateField("description", value)}
                placeholder="Product description in English"
                disabled={uploading}
                minHeight={150}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Тэмдэглэгээ</label>
            <Input 
              value={form.tags.join(", ")} 
              onChange={(e) => updateField('tags', e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag))} 
              placeholder="tag1, tag2, tag3"
              disabled={uploading}
            />
          </div>

          {/* Status Checkboxes */}
          <div className="space-y-4">
            <h4 className="font-medium">Барааны төрөл</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={form.isFeatured}
                    onChange={(e) => updateField('isFeatured', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <label htmlFor="isFeatured" className="text-sm font-medium">
                    Онцлох бараа
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isBestSeller"
                    checked={form.isBestSeller}
                    onChange={(e) => updateField('isBestSeller', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <label htmlFor="isBestSeller" className="text-sm font-medium">
                    Хамгийн их зарагдсан
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isNew"
                    checked={form.isNew}
                    onChange={(e) => updateField('isNew', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <label htmlFor="isNew" className="text-sm font-medium">
                    Шинэ бараа
                  </label>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isOnSale"
                    checked={form.isOnSale}
                    onChange={(e) => updateField('isOnSale', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <label htmlFor="isOnSale" className="text-sm font-medium">
                    Хямдралтай
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isLimited"
                    checked={form.isLimited}
                    onChange={(e) => updateField('isLimited', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <label htmlFor="isLimited" className="text-sm font-medium">
                    Хязгаарлагдмал тоо
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Зураг оруулах</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {uploading ? "Зурагнуудыг оруулж байна..." : "Зурагнуудыг энд дарж оруулна уу"}
                </p>
                <p className="text-xs text-gray-500">Хэдэн зураг оруулж болно</p>
              </label>
            </div>
            
            {form.images.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Зургийн урьдчилсан харца</p>
                <div className="grid grid-cols-4 gap-2">
                  {form.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={uploading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="attributes" className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium mb-3">Шинж чанарууд</h4>
            <p className="text-sm text-gray-600 mb-4">
              Энд барааны техникийн шинж чанаруудыг оруулна уу.
            </p>
            
            {Object.entries(form.specifications).map(([key, value], index) => (
              <div key={index} className="grid grid-cols-2 gap-3 mb-3">
                <Input
                  value={key}
                  onChange={(e) => {
                    const newSpecs = { ...form.specifications };
                    const oldKey = Object.keys(form.specifications)[index];
                    const oldValue = newSpecs[oldKey];
                    delete newSpecs[oldKey];
                    newSpecs[e.target.value] = oldValue;
                    updateField('specifications', newSpecs);
                  }}
                  placeholder="Шинж чанарын нэр"
                  disabled={uploading}
                />
                <div className="flex gap-2">
                  <Input
                    value={value}
                    onChange={(e) => {
                      const newSpecs = { ...form.specifications };
                      const currentKey = Object.keys(form.specifications)[index];
                      newSpecs[currentKey] = e.target.value;
                      updateField('specifications', newSpecs);
                    }}
                    placeholder="Утга"
                    disabled={uploading}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newSpecs = { ...form.specifications };
                      const keyToRemove = Object.keys(form.specifications)[index];
                      delete newSpecs[keyToRemove];
                      updateField('specifications', newSpecs);
                    }}
                    disabled={uploading}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              onClick={() => {
                const newSpecs = { ...form.specifications };
                newSpecs[`Шинэ шинж чанар ${Object.keys(form.specifications).length + 1}`] = "";
                updateField('specifications', newSpecs);
              }}
              disabled={uploading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Шинж чанар нэмэх
            </Button>
          </div>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants" className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium mb-3">Вариант шинж чанарууд</h4>
            <div className="space-y-3">
              {selectedAttributes.map((attr, index) => (
                <div key={index} className="grid grid-cols-3 gap-3 items-start">
                  <Input
                    value={attr.nameMn}
                    onChange={(e) => handleAttributeChange(index, 'nameMn', e.target.value)}
                    placeholder="Шинж чанар (монгол)"
                    disabled={uploading}
                  />
                  <Input
                    value={attr.values.join(", ")}
                    onChange={(e) => handleAttributeChange(index, 'values', e.target.value.split(",").map(v => v.trim()).filter(v => v))}
                    placeholder="Утгууд (тайлбар)"
                    disabled={uploading}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => removeAttribute(index)}
                      disabled={selectedAttributes.length <= 1 || uploading}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={addAttribute}
                  disabled={selectedAttributes.length >= defaultAttributes.length || uploading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Шинж чанар нэмэх
                </Button>
                <Button 
                  onClick={generateVariations}
                  disabled={generatingVariations || selectedAttributes.length === 0 || uploading}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {generatingVariations ? "Вариантууд үүсгэж байна..." : "Вариантууд үүсгэх"}
                </Button>
              </div>
            </div>
          </div>

          {variations.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Вариантууд ({variations.length})</h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {variations.map((variant, index) => (
                  <div key={index} className="border rounded-md p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{variant.nameMn}</div>
                        <div className="text-sm text-gray-500">
                          {Object.entries(variant.attributes).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              <Badge variant="outline" className="text-xs">
                                {value}
                              </Badge>
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariation(index)}
                        disabled={uploading}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-medium block mb-1">Код</label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1">Үнэ</label>
                        <Input
                          type="number"
                          value={variant.price}
                          onChange={(e) => updateVariation(index, 'price', parseFloat(e.target.value) || 0)}
                          disabled={uploading}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1">Нөөц</label>
                        <Input
                          type="number"
                          value={variant.stockQuantity}
                          onChange={(e) => updateVariation(index, 'stockQuantity', parseInt(e.target.value) || 0)}
                          disabled={uploading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Info Images Tab */}
        <TabsContent value="info-images" className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium mb-3">Мэдээллийн зураг</h4>
            <p className="text-sm text-gray-600 mb-4">
              Энд барааны мэдээллийн зургуудыг оруулна уу. Эдгээр зурагнууд барааны дэлгэрэнгүй хуудас дээр үнэлгээний хэсгийн дээр харагдана.
            </p>
            
            <div>
              <label className="text-sm font-medium block mb-1">
                Зураг оруулах 
                <span className="text-xs text-gray-500 ml-2">
                  (Хамгийн ихдээ 5 зураг, одоо: {infoImages.filter(url => 
                    url.startsWith('http') && !url.startsWith('blob:')
                  ).length}/5)
                </span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleInfoImageUpload}
                  className="hidden"
                  id="info-image-upload"
                  disabled={uploading || loadingInfoImages || uploadingInfoImages || infoImages.filter(url => 
                    url.startsWith('http') && !url.startsWith('blob:')
                  ).length >= 5}
                />
                <label 
                  htmlFor="info-image-upload" 
                  className={`cursor-pointer ${
                    (uploading || loadingInfoImages || uploadingInfoImages || infoImages.filter(url => 
                      url.startsWith('http') && !url.startsWith('blob:')
                    ).length >= 5) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingInfoImages ? (
                    <>
                      <Loader2 className="mx-auto h-8 w-8 text-blue-600 mb-2 animate-spin" />
                      <p className="text-sm text-blue-600 font-medium">
                        Зурагнуудыг Cloudinary-д оруулж байна...
                      </p>
                      <Progress value={uploadProgress} className="mt-2 max-w-xs mx-auto" />
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {uploading || loadingInfoImages 
                          ? "Зурагнуудыг оруулж байна..." 
                          : infoImages.filter(url => 
                              url.startsWith('http') && !url.startsWith('blob:')
                            ).length >= 5
                            ? "Хамгийн ихдээ 5 зураг оруулж болно"
                            : "Зурагнуудыг энд дарж оруулна уу"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Хамгийн ихдээ 5 зураг оруулж болно
                      </p>
                    </>
                  )}
                </label>
              </div>
              
              {loadingInfoImages && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
                  Мэдээллийн зургуудыг ачаалж байна...
                </div>
              )}
              
              {infoImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    Зургийн урьдчилсан харца ({infoImages.length}/5)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {infoImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Info Image ${index + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeInfoImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={uploading || uploadingInfoImages}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={uploading}>
          Цуцлах
        </Button>
        <Button onClick={handleSave} disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Оруулж байна...
            </>
          ) : (
            isCreating ? "Үүсгэх" : "Хадгалах"
          )}
        </Button>
      </div>
    </div>
  );
}

// Custom Drawer Component
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/10 z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchBankAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchProducts();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `${API_URL}/products?includeVariations=true&page=${currentPage}&limit=${pageSize}`;
      
      // Add search query if present
      if (query.trim()) {
        url += `&search=${encodeURIComponent(query.trim())}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch(`${API_URL}/categories?tree=true`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCategories(data.tree || data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      setBankAccountsLoading(true);
      const response = await fetch(`${API_URL}/bank-accounts/active`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const accounts = result?.data || [];
      setBankAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setBankAccounts([]);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  // Helper function to find category name by ID
  const getCategoryNameById = (categoryId: string): string => {
    const findCategory = (cats: Category[], id: string): string | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat.nameMn || cat.name;
        if (cat.children) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findCategory(categories, categoryId) || categoryId;
  };

  const createProduct = async (productData: any) => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      await fetchProducts();
      return true;
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
      return false;
    }
  };

  const updateProduct = async (id: string, productData: any) => {
    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      await fetchProducts();
      return true;
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product');
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchProducts();
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      return false;
    }
  };

  // Products are already filtered server-side, so we use them directly
  const filtered = products;

  function handleView(product: Product) {
    setSelected(product);
    setIsViewOpen(true);
  }

  function handleEdit(product: Product) {
    setSelected(product);
    setIsCreating(false);
    setIsEditOpen(true);
  }

  function handleDelete(product: Product) {
    setSelected(product);
    setIsDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!selected) return;

    const success = await deleteProduct(selected.id);
    if (success) {
      setIsDeleteOpen(false);
      setSelected(null);
    }
  }

  async function saveEdit(edited: Product, uploadedImages: string[]) {
    try {
      let success = false;
      let savedProductId = edited.id;
      
      if (isCreating) {
        success = await createProduct(edited);
        if (success) {
          // Fetch the created product to get its ID
          const response = await fetch(`${API_URL}/products?sku=${edited.sku}`);
          if (response.ok) {
            const data = await response.json();
            const products = Array.isArray(data) ? data : (data.products || []);
            if (products.length > 0) {
              savedProductId = products[0].id;
            }
          }
          setIsEditOpen(false);
          setSelected(null);
          setIsCreating(false);
        }
      } else {
        success = await updateProduct(edited.id, edited);
        if (success) {
          setIsEditOpen(false);
          setSelected(null);
          setIsCreating(false);
        }
      }
      
      if (!success) {
        // Handle error (already shown by setError)
      }
      
      return { success, productId: savedProductId || undefined };
    } catch (error) {
      console.error('Error saving product:', error);
      return { success: false, productId: undefined };
    }
  }

  function addProduct() {
    const newProduct: Product = { 
      id: '', 
      sku: `PRD-${Date.now()}`, 
      name: "New Product", 
      nameMn: "Шинэ бараа",
      price: 0, 
      originalPrice: 0,
      images: [],
      thumbnail: "default.jpg",
      category: "",
      categoryId: "",
      subcategory: "",
      company: "terguun_gereg",
      bankAccountId: undefined,
      inStock: true,
      stockQuantity: 0,
      brand: "",
      description: "",
      descriptionMn: "",
      specifications: {},
      isFeatured: false,
      isNew: true,
      isOnSale: false,
      isBestSeller: false,
      isLimited: false,
      isGift: false,
      discount: 0,
      sales: 0,
      rating: 0,
      reviewCount: 0,
      slug: `product-${Date.now()}`,
      metaTitle: "",
      metaDescription: "",
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variations: []
    };
    setSelected(newProduct);
    setIsCreating(true);
    setIsEditOpen(true);
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mn-MN').format(price) + '₮';
  };

  const getTotalStock = (product: Product) => {
    if (product.variations && product.variations.length > 0) {
      return product.variations.reduce((sum, variant) => sum + variant.stockQuantity, 0);
    }
    return product.stockQuantity;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Барааны мэдээлэл уншиж байна...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Бараа бүтээгдэхүүн</h2>
          <span className="text-sm text-muted-foreground">Барааны мэдээллийг удирдах</span>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Барааны нэр, кодоор хайх..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-72"
          />
          <Button onClick={addProduct} variant="default" className="flex items-center gap-2">
            <Plus size={16} /> Шинэ бараа
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Барааны жагсаалт</span>
            <span className="text-sm text-muted-foreground">
              Нийт: {total} ширхэг (Хуудас {currentPage}/{totalPages})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Код</TableHead>
                <TableHead>Барааны нэр</TableHead>
                <TableHead className="w-32">Ангилал</TableHead>
                <TableHead className="w-28">Үнэ</TableHead>
                <TableHead className="w-24">Хямдрал</TableHead>
                <TableHead className="w-20">Нөөц</TableHead>
                <TableHead className="w-24">Вариант</TableHead>
                <TableHead className="w-32">Төлөв</TableHead>
                <TableHead className="w-48 text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{p.sku}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{p.nameMn}</div>
                      <div className="text-sm text-muted-foreground">{p.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.categoryId ? getCategoryNameById(p.categoryId) : p.category}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatPrice(p.salePrice || p.price)}
                    {p.originalPrice && p.originalPrice > p.price && (
                      <div className="text-xs text-gray-500 line-through">
                        {formatPrice(p.originalPrice)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.discount > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {p.discount}%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{getTotalStock(p)}</span>
                      {p.variations && p.variations.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {p.variations.length}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.variations && p.variations.length > 0 ? (
                      <Badge variant="secondary" className="text-xs">
                        {p.variations.length} вариант
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {p.inStock ? (
                        <Badge variant="default" className="w-fit">Бэлэн</Badge>
                      ) : (
                        <Badge variant="destructive" className="w-fit">Дууссан</Badge>
                      )}
                      {p.isFeatured && <Badge variant="outline" className="w-fit text-xs bg-blue-50 text-blue-700 border-blue-200">Онцлох</Badge>}
                      {p.isNew && <Badge variant="outline" className="w-fit text-xs bg-purple-50 text-purple-700 border-purple-200">Шинэ</Badge>}
                      {p.isBestSeller && <Badge variant="outline" className="w-fit text-xs bg-green-50 text-green-700 border-green-200">Хамгийн их зарагдсан</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleView(p)} 
                        className="hover:shadow-md"
                      >
                        <Eye size={14} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEdit(p)} 
                        className="hover:shadow-md"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(p)} 
                        className="hover:shadow-md text-destructive"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                    {query ? "Хайлтын үр дүнд бараа олдсонгүй." : "Бараа олдсонгүй."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Хуудасны хэмжээ:
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
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
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Өмнөх
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
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
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  Дараах
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Барааны дэлгэрэнгүй</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {selected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Үндсэн мэдээлэл</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Код:</span>
                        <span className="font-medium">{selected.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Нэр (Монгол):</span>
                        <span>{selected.nameMn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Нэр (Англи):</span>
                        <span>{selected.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ангилал:</span>
                        <span>
                          {selected.categoryId ? getCategoryNameById(selected.categoryId) : selected.category}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Бренд:</span>
                        <span>{selected.brand || "-"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Үнийн мэдээлэл</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Үнэ:</span>
                        <span className="font-medium">{formatPrice(selected.price)}</span>
                      </div>
                      {selected.originalPrice && selected.originalPrice > selected.price && (
                        <div className="flex justify-between">
                          <span>Анхны үнэ:</span>
                          <span className="line-through">{formatPrice(selected.originalPrice)}</span>
                        </div>
                      )}
                      {selected.discount > 0 && (
                        <div className="flex justify-between">
                          <span>Хямдрал:</span>
                          <span className="font-medium text-red-600">{selected.discount}%</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Нөөц:</span>
                        <span>{getTotalStock(selected)} ширхэг</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Төлөв:</span>
                        <span>
                          {selected.inStock ? (
                            <Badge variant="default" className="text-xs">Бэлэн</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Дууссан</Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Type Status */}
                <div>
                  <h4 className="font-semibold mb-2">Барааны төрөл</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.isFeatured && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Check className="h-3 w-3 mr-1" /> Онцлох бараа
                      </Badge>
                    )}
                    {selected.isBestSeller && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="h-3 w-3 mr-1" /> Хамгийн их зарагдсан
                      </Badge>
                    )}
                    {selected.isNew && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Check className="h-3 w-3 mr-1" /> Шинэ бараа
                      </Badge>
                    )}
                    {selected.isOnSale && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <Check className="h-3 w-3 mr-1" /> Хямдралтай
                      </Badge>
                    )}
                    {selected.isLimited && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <Check className="h-3 w-3 mr-1" /> Хязгаарлагдмал тоо
                      </Badge>
                    )}
                  </div>
                </div>

                {selected.variations && selected.variations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Вариантууд ({selected.variations.length})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selected.variations.map((variant, index) => (
                        <div key={variant.id || index} className="border rounded-md p-2 text-sm">
                          <div className="font-medium">{variant.nameMn}</div>
                          <div className="text-gray-600">
                            {Object.entries(variant.attributes).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                <Badge variant="outline" className="text-xs">
                                  {value}
                                </Badge>
                              </span>
                            ))}
                          </div>
                          <div className="flex justify-between mt-1 text-xs">
                            <span>Код: {variant.sku}</span>
                            <span className="font-medium">{formatPrice(variant.price)}</span>
                            <span>Нөөц: {variant.stockQuantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Тайлбар</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-700">{selected.descriptionMn || selected.description}</p>
                    </div>
                  </div>
                </div>

                {selected.images && selected.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Зургууд ({selected.images.length})</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {selected.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Product ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/default-product.jpg";
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>Ачааллаж байна...</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Хаах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Drawer */}
      <Drawer 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)}
        title={isCreating ? "Шинэ бараа үүсгэх" : "Бараа засах"}
      >
        {selected && (
          <ProductEditForm 
            product={selected} 
            onCancel={() => setIsEditOpen(false)} 
            onSave={saveEdit}
            isCreating={isCreating}
            categories={categories}
            bankAccounts={bankAccounts}
            bankAccountsLoading={bankAccountsLoading}
          />
        )}
      </Drawer>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Бараа устгах уу?</DialogTitle>
            <DialogDescription>
              Энэ үйлдлийг буцаах боломжгүй.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            Та <strong>"{selected?.nameMn}"</strong> барааг устгахдаа итгэлтэй байна уу?
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Цуцлах</Button>
              <Button variant="destructive" onClick={confirmDelete}>Устгах</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}