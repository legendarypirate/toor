"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, X, ChevronDown, ChevronRight, Star, ShoppingCart, Sliders, Loader2, Store, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { showAppMessage } from '@/app/lib/appMessage';
import { firstNonEmptyImg } from '@/app/lib/imageSrc';

interface Product {
  id: string;
  name: string;
  nameMn?: string;
  price: string;
  originalPrice?: string;
  discount: string;
  rating: string;
  reviewCount: number;
  images: string[];
  thumbnail: string;
  category: string;
  categoryId?: string | null;
  brand?: string;
  inStock: boolean;
  stockQuantity: number;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  isBestSeller: boolean;
  isLimited: boolean;
  sales: number;
  slug: string;
  // Optional: affects checkout bank accounts
  company?: string;
  bankAccountId?: number;
  variations?: ProductVariation[];
  colorOptions?: ColorOption[];
  categories?: Category[];
}

interface ProductVariation {
  id: string;
  name: string;
  nameMn: string;
  price: string;
  originalPrice?: string;
  sku: string;
  images: string[];
  inStock: boolean;
  stockQuantity: number;
  attributes: Record<string, string>;
}

interface ColorOption {
  name: string;
  value: string;
  hex: string;
}

interface Category {
  id: string;
  name: string;
  nameMn: string | null;
  image: string;
  description: string | null;
  productCount: number;
  parentId: string | null;
  children?: Category[];
}

interface ApiResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  minPrice?: number;
  maxPrice?: number;
}

interface CategoriesResponse {
  flat: Category[];
  tree: Category[];
  total: number;
}

interface CatalogBrandRow {
  id: string;
  name: string;
}

interface RetailStoreRow {
  id: string;
  name: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const ProductListPageContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const categoryId = searchParams.get('category') || 'all';
  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    document.title = 'Дэлгүүр | TOOR.MN';
  }, []);
  
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryId);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [catalogBrands, setCatalogBrands] = useState<CatalogBrandRow[]>([]);
  const [retailStores, setRetailStores] = useState<RetailStoreRow[]>([]);
  const [sortBy, setSortBy] = useState<string>('default');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<number>(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [priceStats, setPriceStats] = useState<{ min: number; max: number }>({ min: 0, max: 5000000 });
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [priceRangeInitialized, setPriceRangeInitialized] = useState<boolean>(false);
  /** Ref (not state) so in-flight fetches do not clobber: after the first product fetch, filter refetches use list-only loading. */
  const initialFetchDoneRef = useRef(false);
  const [listLoading, setListLoading] = useState<boolean>(false);

  // Sync selectedCategory with URL params when URL changes
  useEffect(() => {
    const urlCategory = searchParams.get('category') || 'all';
    const urlSearchQuery = searchParams.get('q') || '';
    if (urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory);
    }
    // If search query exists, reset category to 'all' to show all search results
    if (urlSearchQuery && selectedCategory !== 'all') {
      setSelectedCategory('all');
    }
  }, [searchParams, selectedCategory]);

  // Fetch categories only once on mount
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [bRes, sRes] = await Promise.all([
          fetch(`${API_URL}/brands/active`),
          fetch(`${API_URL}/retail-stores/active`),
        ]);
        if (bRes.ok) {
          const data = await bRes.json();
          setCatalogBrands(Array.isArray(data) ? data : []);
        }
        if (sRes.ok) {
          const data = await sRes.json();
          setRetailStores(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      }
    };
    loadCatalog();
  }, []);

  // Fetch products when filters change (but wait for categories to load first)
  useEffect(() => {
    // Don't fetch if categories haven't loaded yet (unless it's a category change or search)
    if (categories.length === 0 && selectedCategory !== 'all' && !searchQuery) {
      return;
    }
    
    // Allow initial fetch to proceed - price range will be updated after API response
    // This fixes the deadlock where products never load on initial page visit
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, priceRange, selectedBrands, selectedStoreIds, sortBy, categories.length, searchQuery]);

  useEffect(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (priceRange[0] > priceStats.min || priceRange[1] < priceStats.max) count++;
    if (selectedBrands.length > 0) count++;
    if (selectedStoreIds.length > 0) count++;
    setActiveFilters(count);
  }, [selectedCategory, priceRange, selectedBrands, selectedStoreIds, priceStats]);

  useEffect(() => {
    if (selectedCategory !== 'all' && categories.length > 0) {
      expandParentCategories(selectedCategory, categories);
    }
  }, [selectedCategory, categories]);

  const expandParentCategories = (categoryId: string, allCategories: Category[]) => {
    const newExpanded = new Set(expandedCategories);
    
    const findAndExpandParents = (id: string, cats: Category[], parentId?: string): boolean => {
      for (const cat of cats) {
        if (cat.id === id) {
          if (parentId) {
            newExpanded.add(parentId);
          }
          return true;
        }
        if (cat.children && cat.children.length > 0) {
          const found = findAndExpandParents(id, cat.children, cat.id);
          if (found) {
            if (parentId) {
              newExpanded.add(parentId);
            }
            return true;
          }
        }
      }
      return false;
    };

    findAndExpandParents(categoryId, allCategories);
    setExpandedCategories(newExpanded);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories?tree=true`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data: CategoriesResponse = await response.json();
      setCategories(data.tree || []);
      
      const initialExpanded = new Set<string>();
      data.tree?.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          initialExpanded.add(cat.id);
        }
      });
      setExpandedCategories(initialExpanded);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Ангилалын мэдээлэл авахад алдаа гарлаа');
    }
  };

  const fetchProducts = async (pageNum: number = 1, reset: boolean = true) => {
    try {
      if (reset) {
        if (!initialFetchDoneRef.current) {
          setLoading(true);
        } else {
          setListLoading(true);
        }
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      let url = `${API_URL}/products?page=${pageNum}&limit=12`;
      
      // Add search query if present
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      
      if (selectedCategory !== 'all') {
        const category = findCategoryById(selectedCategory, categories);
        if (category) {
          // Send categoryId instead of category name for better filtering
          url += `&categoryId=${encodeURIComponent(category.id)}`;
        }
      }
      
      url += `&minPrice=${priceRange[0]}&maxPrice=${priceRange[1]}`;
      
      if (selectedBrands.length > 0) {
        url += `&brand=${selectedBrands.map(encodeURIComponent).join(',')}`;
      }

      if (selectedStoreIds.length > 0) {
        url += `&retailStoreId=${selectedStoreIds.map(encodeURIComponent).join(',')}`;
      }
      
      switch (sortBy) {
        case 'price-low':
          url += '&sortBy=price_asc';
          break;
        case 'price-high':
          url += '&sortBy=price_desc';
          break;
        case 'rating':
          url += '&sortBy=rating';
          break;
        case 'discount':
          url += '&sortBy=discount';
          break;
        default:
          url += '&sortBy=createdAt';
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data: ApiResponse = await response.json();
      
      if (reset) {
        setProducts(data.products || []);
      } else {
        setProducts(prev => [...prev, ...(data.products || [])]);
      }
      
      setTotalProducts(data.total || 0);
      setHasMore(data.page < data.totalPages);
      
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        const newPriceStats = { min: data.minPrice, max: data.maxPrice };
        // Only update if values actually changed to prevent unnecessary re-renders
        setPriceStats(prev => {
          if (prev.min === newPriceStats.min && prev.max === newPriceStats.max) {
            return prev;
          }
          return newPriceStats;
        });
        
        // Only update priceRange on initial load if it's still at default values
        if (reset && !priceRangeInitialized && priceRange[0] === 0 && priceRange[1] === 5000000) {
          // Mark as initialized first to prevent useEffect from running
          setPriceRangeInitialized(true);
          setIsInitialLoad(false);
          // Only update if the new range is different from current
          if (data.minPrice !== priceRange[0] || data.maxPrice !== priceRange[1]) {
            setPriceRange([data.minPrice, data.maxPrice]);
          }
        } else if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
      
      const uniqueBrands = (data.products || [])
        .filter(p => p.brand && p.brand.trim())
        .map(p => p.brand as string);

      setBrands(prev => {
        const combined = [...prev, ...uniqueBrands];
        const newBrands = combined.filter((brand, index, self) => 
          self.indexOf(brand) === index
        );
        return newBrands.sort();
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Бүтээгдэхүүний мэдээлэл авахад алдаа гарлаа');
    } finally {
      setLoading(false);
      setListLoading(false);
      setLoadingMore(false);
      initialFetchDoneRef.current = true;
    }
  };

  const findCategoryById = (id: string, cats: Category[]): Category | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children && cat.children.length > 0) {
        const found = findCategoryById(id, cat.children);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleCategoryExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const params = new URLSearchParams(searchParams.toString());
    categoryId === 'all' ? params.delete('category') : params.set('category', categoryId);
    // Clear search query when changing category
    params.delete('q');
    router.push(`/product?${params.toString()}`, { scroll: false });
    
    if (categoryId !== 'all') {
      expandParentCategories(categoryId, categories);
    }
  };

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const handleStoreToggle = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const brandFilterOptions =
    catalogBrands.length > 0 ? catalogBrands.map((b) => b.name).filter(Boolean) : brands;

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, false);
    }
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '0₮';
    return new Intl.NumberFormat('mn-MN').format(numPrice) + '₮';
  };

  const calculateDiscount = (price: string, originalPrice?: string): number => {
    if (!originalPrice) return 0;
    const priceNum = parseFloat(price);
    const originalNum = parseFloat(originalPrice);
    if (isNaN(priceNum) || isNaN(originalNum) || originalNum <= priceNum) return 0;
    return Math.round(((originalNum - priceNum) / originalNum) * 100);
  };

  const getCategoryDisplayName = (category: Category | null | undefined): string => {
    if (!category) return 'Unknown';
    return category.nameMn || category.name || 'Unknown';
  };

  const currentCategory = selectedCategory !== 'all' 
    ? categories.find(c => c.id === selectedCategory)
    : null;

  const priceSpan = Math.max(1, priceStats.max - priceStats.min);
  const rangeStep = Math.max(1, Math.round(priceStats.max / 1000));

  const clearAllFilters = () => {
    handleCategoryChange('all');
    setPriceRange([priceStats.min, priceStats.max]);
    setSelectedBrands([]);
    setSelectedStoreIds([]);
  };

  const renderCategoryTree = (categories: Category[], level: number = 0) => {
    if (!categories || categories.length === 0) return null;
    
    return categories.map(category => {
      if (!category) return null;
      
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories.has(category.id);
      const isSelected = selectedCategory === category.id;
      // Backend already calculates productCount including children, so use it directly
      const totalCount = category.productCount || 0;
      
      return (
        <div key={category.id} className="w-full">
          <div 
            className={`w-full flex justify-between items-center rounded-xl border border-transparent px-2.5 py-2 text-[15px] transition-colors ${
              isSelected
                ? 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50/80 font-semibold text-emerald-900 shadow-sm'
                : 'text-slate-700 hover:border-slate-200 hover:bg-slate-50/90'
            }`}
            style={{ paddingLeft: `${level * 14 + 10}px` }}
          >
            <div className="flex items-center flex-1 min-w-0">
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryExpand(category.id);
                  }}
                  className="mr-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/80 hover:text-emerald-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <div className="mr-1 w-7 flex-shrink-0" />
              )}
              
              <button
                onClick={() => handleCategoryChange(category.id)}
                className="min-w-0 flex-1 truncate text-left"
                title={getCategoryDisplayName(category)}
              >
                {getCategoryDisplayName(category)}
              </button>
            </div>
            
            {totalCount > 0 && (
              <span className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                isSelected ? 'bg-emerald-600/15 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {totalCount}
              </span>
            )}
          </div>
          
          {hasChildren && isExpanded && (
            <div className="w-full">
              {renderCategoryTree(category.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const handleProductClick = (product: Product) => {
    if (!product?.id || product.id === 'NaN' || product.id === 'undefined' || product.id === 'null') {
      console.error('Invalid product ID:', product?.id);
      return;
    }
    router.push(`/product/${product.id}`);
  };

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product) return;
    
    // Check if product is in stock
    if (!product.inStock) {
      showAppMessage('Энэ бүтээгдэхүүн дууссан байна', 'warning');
      return;
    }
    
    try {
      // Get the first available variation or use base product
      let selectedVariation: ProductVariation | null = null;
      if (product.variations && product.variations.length > 0) {
        selectedVariation = product.variations.find(v => v.inStock) || product.variations[0];
      }
      
      // Determine price and stock status
      const currentPrice = selectedVariation 
        ? parseFloat(selectedVariation.price) 
        : parseFloat(product.price);
      const currentOriginalPrice = selectedVariation && selectedVariation.originalPrice
        ? parseFloat(selectedVariation.originalPrice)
        : product.originalPrice ? parseFloat(product.originalPrice) : undefined;
      const currentInStock = selectedVariation 
        ? selectedVariation.inStock 
        : product.inStock;
      
      if (!currentInStock) {
        showAppMessage('Энэ бүтээгдэхүүн дууссан байна', 'warning');
        return;
      }
      
      // Keep product.id as string (UUID)
      const productId = String(product.id);
      
      // Create CartItem object with UUID string ID
      const cartItem = {
        id: productId, // UUID string
        product: {
          id: productId, // UUID string
          name: product.name,
          nameMn: product.nameMn || product.name,
          price: currentPrice,
          originalPrice: currentOriginalPrice,
          image: product.images?.[0] || '',
          thumbnail: product.thumbnail || product.images?.[0] || '',
          category: product.category || '',
          inStock: currentInStock,
          company: product.company,
          bankAccountId: product.bankAccountId,
        },
        quantity: 1,
        selectedSize: selectedVariation?.attributes?.size || undefined,
        selectedColor: selectedVariation?.attributes?.color || undefined,
        addedAt: new Date().toISOString()
      };
      
      const result = addToCart(cartItem);
      
      if (result.alreadyExists) {
        showAppMessage('энэ бараа сагсанд байна', 'warning');
      } else if (result.success) {
        const displayName = product.nameMn || product.name || 'Бүтээгдэхүүн';
        showAppMessage(`${displayName} сагсанд нэмэгдлээ`, 'success');
      }
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      showAppMessage('Алдаа гарлаа. Дахин оролдоно уу.', 'error');
    }
  };

  const toggleExpandAll = () => {
    if (!categories || categories.length === 0) return;
    
    if (expandedCategories.size === categories.length) {
      setExpandedCategories(new Set());
    } else {
      const allCategoryIds = new Set<string>();
      const collectAllIds = (cats: Category[]) => {
        cats.forEach(cat => {
          allCategoryIds.add(cat.id);
          if (cat.children && cat.children.length > 0) {
            collectAllIds(cat.children);
          }
        });
      };
      collectAllIds(categories);
      setExpandedCategories(allCategoryIds);
    }
  };

  if (loading && !initialFetchDoneRef.current) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto w-full max-w-layout px-3 py-6 pt-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Бүтээгдэхүүний мэдээлэл уншиж байна...</p>
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

      <div className="mx-auto w-full max-w-layout px-3 py-6">
        {/* Page Header */}
        <div className="mb-6 pt-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {searchQuery 
              ? `"${searchQuery}" хайлтын үр дүн` 
              : selectedCategory === 'all' 
                ? 'Бүх бүтээгдэхүүн' 
                : getCategoryDisplayName(currentCategory)
            }
          </h1>
          <p className="text-sm text-gray-500">
            {searchQuery 
              ? `${totalProducts} бүтээгдэхүүн олдлоо` 
              : `${totalProducts} бүтээгдэхүүн`
            }
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Desktop Filters — өргөн, тод харагдах панел */}
          <div className="hidden lg:block w-[min(100%,22rem)] xl:w-96 flex-shrink-0">
            <div className="sticky top-20 rounded-2xl border border-emerald-100/90 bg-gradient-to-b from-white via-slate-50/40 to-white p-5 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
              <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-900/20">
                    <Sliders className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">Шүүлтүүр</h2>
                    <p className="text-xs font-medium text-slate-500">Ангилал, дэлгүүр, брэнд, үнэ</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {activeFilters > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs font-semibold text-emerald-700 underline-offset-2 hover:text-emerald-900 hover:underline"
                    >
                      Цэвэрлэх
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleExpandAll}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                    title={expandedCategories.size === categories.length ? "Бүгдийг хаах" : "Бүгдийг дэлгэх"}
                  >
                    {expandedCategories.size === categories.length ? "Бүгдийг хаах" : "Бүгдийг дэлгэх"}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-7 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" aria-hidden />
                  <h3 className="text-base font-bold text-slate-900">Ангилал</h3>
                </div>
                <div className="max-h-[min(52vh,26rem)] space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[15px] font-medium transition ${
                      selectedCategory === "all"
                        ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 shadow-sm"
                        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <span>Бүх бүтээгдэхүүн</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        selectedCategory === "all" ? "bg-emerald-600/15 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {totalProducts}
                    </span>
                  </button>
                  {renderCategoryTree(categories)}
                </div>
              </div>

              {retailStores.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4 text-emerald-700" strokeWidth={2} aria-hidden />
                    <span className="h-7 w-1 rounded-full bg-gradient-to-b from-teal-500 to-cyan-600" aria-hidden />
                    <h3 className="text-base font-bold text-slate-900">Дэлгүүр</h3>
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {retailStores.map((store) => (
                      <label
                        key={store.id}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-slate-200 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStoreIds.includes(store.id)}
                          onChange={() => handleStoreToggle(store.id)}
                          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="truncate text-[15px] font-medium text-slate-700 group-hover:text-slate-900">
                          {store.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {brandFilterOptions.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-violet-700" strokeWidth={2} aria-hidden />
                    <span className="h-7 w-1 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" aria-hidden />
                    <h3 className="text-base font-bold text-slate-900">Брэнд</h3>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {brandFilterOptions.map((brand) => (
                      <label
                        key={brand}
                        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-slate-200 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => handleBrandToggle(brand)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate text-[15px] font-medium text-slate-700 group-hover:text-slate-900">
                          {brand}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6 rounded-xl border border-slate-100 bg-white/80 p-4 shadow-inner">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-7 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600" aria-hidden />
                  <h3 className="text-base font-bold text-slate-900">Үнэ</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium text-slate-600">
                    <span>{formatPrice(priceStats.min)}</span>
                    <span>{formatPrice(priceStats.max)}</span>
                  </div>
                  <div className="relative h-2.5">
                    <div className="absolute h-full w-full rounded-full bg-slate-200/90" />
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-sm"
                      style={{
                        left: `${((priceRange[0] - priceStats.min) / priceSpan) * 100}%`,
                        right: `${100 - ((priceRange[1] - priceStats.min) / priceSpan) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={priceStats.min}
                      max={priceStats.max}
                      step={rangeStep}
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value, 10), priceRange[1]])}
                      className="absolute z-10 h-full w-full cursor-pointer opacity-0"
                    />
                    <input
                      type="range"
                      min={priceStats.min}
                      max={priceStats.max}
                      step={rangeStep}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value, 10)])}
                      className="absolute z-20 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-800">
                    {formatPrice(priceRange[0])} — {formatPrice(priceRange[1])}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Controls Bar */}
            <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Шүүлтүүр
                  {activeFilters > 0 && (
                    <span className="ml-1 w-5 h-5 text-xs bg-blue-600 text-white rounded-full flex items-center justify-center">
                      {activeFilters}
                    </span>
                  )}
                </button>
                {activeFilters > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Бүгдийг цэвэрлэх
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white text-sm border rounded px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="default">Анхдагч</option>
                  <option value="price-low">Үнэ өсөх</option>
                  <option value="price-high">Үнэ буурах</option>
                  <option value="rating">Үнэлгээ өндөр</option>
                  <option value="discount">Хямдрал их</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Products Grid */}
            <div className="relative">
            {listLoading && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]"
                aria-busy
                aria-label="Ачааллаж байна"
              >
                <Loader2 className="h-9 w-9 animate-spin text-emerald-600" strokeWidth={2} />
              </div>
            )}
            {(!products || products.length === 0) ? (
              <div className="text-center py-12">
                <div className="inline-flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Filter className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Хайлтад тохирох бүтээгдэхүүн олдсонгүй</p>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Шүүлтүүр цэвэрлэх
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                  {products.map(product => {
                    if (!product) return null;
                    
                    const discount = calculateDiscount(product.price, product.originalPrice);
                    const displayName = product.nameMn || product.name || 'Бүтээгдэхүүн';
                    const displayBrand = product.brand || '';
                    const rating = parseFloat(product.rating) || 0;
                    const reviewCount = product.reviewCount || 0;
                    
                    return (
                      <div 
                        key={product.id} 
                        className="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <img 
                            src={firstNonEmptyImg(product.thumbnail, product.images?.[0])} 
                            alt={displayName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/default.jpg';
                            }}
                          />
                          {discount > 0 && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                              -{discount}%
                            </div>
                          )}
                          {product.isFeatured && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                              Онцлох
                            </div>
                          )}
                          {!product.inStock && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded border">Дууссан</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3">
                          {displayBrand && (
                            <div className="mb-1">
                              <span className="text-xs text-blue-600 font-medium">{displayBrand}</span>
                            </div>
                          )}
                          
                          <h3 className="text-sm text-gray-900 font-medium mb-1.5 line-clamp-2 h-10">
                            {displayName}
                          </h3>
                          
                          {rating > 0 && (
                            <div className="flex items-center mb-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < Math.floor(rating)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {reviewCount > 0 && (
                                <span className="ml-1 text-xs text-gray-500">({reviewCount})</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-base font-bold text-gray-900">
                                {formatPrice(product.price)}
                              </span>
                              {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                                <span className="ml-1 text-xs text-gray-500 line-through">
                                  {formatPrice(product.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => handleAddToCart(product, e)}
                            disabled={!product.inStock}
                            className={`w-full py-2 text-sm rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors ${
                              product.inStock
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {product.inStock ? 'Сагслах' : 'Дууссан'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center mt-8 pb-8">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-2 mx-auto"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Уншиж байна...
                        </>
                      ) : (
                        'Илүү их үзэх'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
            onClick={() => setShowMobileFilters(false)}
            aria-hidden
          />
          <div className="animate-slideIn absolute right-0 top-0 h-full w-[min(100vw-0.5rem,22rem)] max-w-[calc(100vw-8px)] border-l border-emerald-100/80 bg-gradient-to-b from-white to-slate-50 shadow-2xl sm:w-96">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-white/90 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
                    <Sliders className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Шүүлтүүр</h2>
                    <p className="text-xs font-medium text-slate-500">{products.length} бүтээгдэхүүн</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Хаах"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" aria-hidden />
                      <h3 className="text-base font-bold text-slate-900">Ангилал</h3>
                    </div>
                    <button
                      type="button"
                      onClick={toggleExpandAll}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                    >
                      {expandedCategories.size === categories.length ? "Хаах" : "Дэлгэх"}
                    </button>
                  </div>
                  <div className="max-h-[min(45vh,20rem)] space-y-1 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleCategoryChange("all")}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[15px] font-medium transition ${
                        selectedCategory === "all"
                          ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900"
                          : "border-transparent text-slate-700 hover:bg-white"
                      }`}
                    >
                      <span>Бүх бүтээгдэхүүн</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          selectedCategory === "all" ? "bg-emerald-600/15 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {totalProducts}
                      </span>
                    </button>
                    {renderCategoryTree(categories)}
                  </div>
                </div>

                {retailStores.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Store className="h-4 w-4 text-emerald-700" strokeWidth={2} aria-hidden />
                      <span className="h-6 w-1 rounded-full bg-gradient-to-b from-teal-500 to-cyan-600" aria-hidden />
                      <h3 className="text-base font-bold text-slate-900">Дэлгүүр</h3>
                    </div>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {retailStores.map((store) => (
                        <label key={store.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-1.5">
                          <input
                            type="checkbox"
                            checked={selectedStoreIds.includes(store.id)}
                            onChange={() => handleStoreToggle(store.id)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600"
                          />
                          <span className="truncate text-[15px] font-medium text-slate-700">{store.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {brandFilterOptions.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-violet-700" strokeWidth={2} aria-hidden />
                      <span className="h-6 w-1 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" aria-hidden />
                      <h3 className="text-base font-bold text-slate-900">Брэнд</h3>
                    </div>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {brandFilterOptions.map((brand) => (
                        <label key={brand} className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-1.5">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => handleBrandToggle(brand)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                          />
                          <span className="truncate text-[15px] font-medium text-slate-700">{brand}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6 rounded-xl border border-slate-100 bg-white/90 p-4 shadow-inner">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-6 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600" aria-hidden />
                    <h3 className="text-base font-bold text-slate-900">Үнэ</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium text-slate-600">
                      <span>{formatPrice(priceStats.min)}</span>
                      <span>{formatPrice(priceStats.max)}</span>
                    </div>
                    <div className="relative h-2.5">
                      <div className="absolute h-full w-full rounded-full bg-slate-200/90" />
                      <div
                        className="absolute h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                        style={{
                          left: `${((priceRange[0] - priceStats.min) / priceSpan) * 100}%`,
                          right: `${100 - ((priceRange[1] - priceStats.min) / priceSpan) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min={priceStats.min}
                        max={priceStats.max}
                        step={rangeStep}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value, 10), priceRange[1]])}
                        className="absolute z-10 h-full w-full cursor-pointer opacity-0"
                      />
                      <input
                        type="range"
                        min={priceStats.min}
                        max={priceStats.max}
                        step={rangeStep}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value, 10)])}
                        className="absolute z-20 h-full w-full cursor-pointer opacity-0"
                      />
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2 text-center text-sm font-semibold text-slate-800">
                      {formatPrice(priceRange[0])} — {formatPrice(priceRange[1])}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white/95 p-4">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/25 transition hover:from-emerald-700 hover:to-teal-800"
                >
                  Үр дүн харах ({products.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// Mark page as dynamic since it uses useSearchParams
export const dynamic = 'force-dynamic';

export default function ProductListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto w-full max-w-layout px-3 py-6 pt-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm">Бүтээгдэхүүний мэдээлэл уншиж байна...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    }>
      <ProductListPageContent />
    </Suspense>
  );
}