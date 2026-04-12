// app/components/Header.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Facebook, 
  Chrome,
  Heart,
  ShoppingCart,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  Package,
  CreditCard,
  Bell,
  AlertCircle,
  LayoutGrid,
  Truck,
  Clock,
  RotateCcw,
  UserPlus,
  Store,
  Tags,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Category as ApiCategory } from '../lib/types';
import { getPublicApiBase } from '../lib/apiBase';
import { showAppMessage } from '@/app/lib/appMessage';
import { BRAND_NAME, publicBrandName, publicLogoUrl, storefrontLogoSrc } from '../lib/brand';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface Category {
  id: string;
  name: string;
  image: string;
  parentId: string | null | undefined;
}

/** Matches API GET /categories `tree` nodes (recursive, up to 3 levels in UI) */
interface CategoryTreeNode {
  id: string;
  name: string;
  image?: string;
  parentId?: string | null;
  order?: number | null;
  children?: CategoryTreeNode[];
}

interface ApiResponse {
  flat: ApiCategory[];
  tree: CategoryTreeNode[];
  total: number;
}

/** Build nested tree from flat rows (parentId). Ensures drawer always gets real `children` arrays. */
function buildCategoryTreeFromFlat(flat: ApiCategory[]): CategoryTreeNode[] {
  if (!flat?.length) return [];

  const validIds = new Set(flat.map((c) => String(c.id)));

  const normParent = (p: string | null | undefined) => {
    if (p === null || p === undefined || p === '') return null;
    return String(p);
  };

  const isRoot = (c: ApiCategory) => {
    const p = normParent(c.parentId ?? null);
    if (p === null) return true;
    if (!validIds.has(p)) return true;
    return false;
  };

  const childrenOf = (parentId: string) =>
    flat.filter((c) => normParent(c.parentId ?? null) === parentId);

  const sortRoot = (a: ApiCategory, b: ApiCategory) => {
    const ao = (a as ApiCategory & { order?: number | null }).order;
    const bo = (b as ApiCategory & { order?: number | null }).order;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
    return a.name.localeCompare(b.name);
  };

  const sortChild = (a: ApiCategory, b: ApiCategory) => a.name.localeCompare(b.name);

  const toNode = (c: ApiCategory): CategoryTreeNode => {
    const pid = String(c.id);
    const rawKids = childrenOf(pid).sort(sortChild);
    return {
      id: c.id,
      name: c.name,
      image: c.image,
      parentId: normParent(c.parentId ?? null),
      order: (c as ApiCategory & { order?: number | null }).order ?? null,
      children: rawKids.map(toNode),
    };
  };

  return flat.filter(isRoot).sort(sortRoot).map(toNode);
}

const Header = () => {
  const router = useRouter();
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [categoryDrawerMounted, setCategoryDrawerMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated, login, loginWithGoogle, logout } = useAuth();
  const { cartCount, wishlistCount } = useCart();

  // Login modal states
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Categories: top-level strip + full tree for drawer (2–3 levels)
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  /** Drawer: which category nodes are expanded (L1/L2 with children) */
  const [drawerExpandedIds, setDrawerExpandedIds] = useState<Set<string>>(new Set());

  // Site/logo data (same as footer)
  const [siteData, setSiteData] = useState<{ companyName: string; companySuffix?: string; logoUrl: string } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function to get correct image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath || imagePath === "default-category.jpg") {
      return null;
    }
    
    if (imagePath.startsWith('blob:')) {
      return null;
    }
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Get base URL without /api for asset paths
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const baseUrl = apiUrl.replace('/api', '');
    
    if (imagePath.startsWith('/assets')) {
      return `${baseUrl}${imagePath}`;
    }
    
    return `${baseUrl}/assets/category/${imagePath}`;
  };

  // Fetch site/footer data for logo (same as Footer)
  useEffect(() => {
    const fetchSiteData = async () => {
      try {
        const response = await fetch(`${getPublicApiBase()}/footer`);
        if (response.ok) {
          const data = await response.json();
          const legacy = /tsaas/i.test(String(data.companyName ?? ""));
          setSiteData({
            companyName: publicBrandName(data.companyName),
            companySuffix: legacy ? undefined : data.companySuffix,
            logoUrl: publicLogoUrl(data.logoUrl),
          });
        } else {
          setSiteData({ companyName: BRAND_NAME, logoUrl: publicLogoUrl(null) });
        }
      } catch {
        setSiteData({ companyName: BRAND_NAME, logoUrl: publicLogoUrl(null) });
      }
    };
    fetchSiteData();
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await fetch(`${getPublicApiBase()}/categories`);
        const data: ApiResponse = await response.json();

        const flat: ApiCategory[] = Array.isArray(data.flat) ? data.flat : [];
        // Prefer client-built tree so `children` always match `parentId` (API `tree` can be empty or shallow).
        const tree =
          flat.length > 0
            ? buildCategoryTreeFromFlat(flat)
            : Array.isArray(data.tree)
              ? data.tree
              : [];

        setCategoryTree(tree);

        const topFromTree: Category[] = tree.map((c) => ({
          id: c.id,
          name: c.name,
          image: c.image || '',
          parentId: null,
        }));

        if (topFromTree.length > 0) {
          setCategories(topFromTree);
        } else {
          const parentCategories = flat.filter(
            (category: ApiCategory) =>
              category.parentId === null || category.parentId === undefined || category.parentId === ''
          );
          parentCategories.sort((a: ApiCategory, b: ApiCategory) => {
            const aOrder = (a as ApiCategory & { order?: number | null }).order;
            const bOrder = (b as ApiCategory & { order?: number | null }).order;
            if (aOrder != null && bOrder != null) return aOrder - bOrder;
            if (aOrder != null) return -1;
            if (bOrder != null) return 1;
            return a.name.localeCompare(b.name);
          });
          setCategories(
            parentCategories.map((category: ApiCategory) => ({
              id: category.id,
              name: category.name,
              image: category.image,
              parentId: category.parentId,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setCategoryDrawerMounted(true);
  }, []);

  // Reset drawer expansion when opening so L1 starts collapsed (tap to show L2/L3)
  useEffect(() => {
    if (isCategoryMenuOpen) {
      setDrawerExpandedIds(new Set());
    }
  }, [isCategoryMenuOpen]);

  // Category drawer: body scroll lock + Escape (drawer uses portal; not in header ref)
  useEffect(() => {
    if (!isCategoryMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCategoryMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isCategoryMenuOpen]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for Google auth success from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'google_auth_success') {
        console.log('Google auth success received:', event.data);
        setIsLoginOpen(false);
        setIsGoogleLoading(false);
      } else if (event.data.type === 'google_auth_error') {
        setLoginError(event.data.message || 'Google нэвтрэхэд алдаа гарлаа');
        setIsGoogleLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    router.push(`/product?category=${categoryId}`);
  };

  const handleAllCategoriesClick = () => {
    setActiveCategory('');
    router.push('/product');
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/product?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // User button click handler
  const handleUserButtonClick = () => {
    if (isAuthenticated) {
      setIsUserMenuOpen(!isUserMenuOpen);
    } else {
      setIsLoginOpen(true);
      setIsUserMenuOpen(false);
    }
  };

  // Handle login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    try {
      // Check if input is email or phone number
      const credentials: any = { password };
      
      // Check if input looks like email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        credentials.email = email;
      } else {
        // Assume it's a phone number (Mongolian format)
        credentials.phone = email;
      }
      
      await login(credentials);
      showAppMessage('амжилттай нэвтэрлээ', 'success');
      setIsLoginOpen(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      setLoginError(error.message || 'Нэвтрэхэд алдаа гарлаа. Та имэйл/утас болон нууц үгээ шалгана уу.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setLoginError(null);
    
    try {
      const result = await loginWithGoogle();
      
      if (result.success) {
        showAppMessage('амжилттай нэвтэрлээ', 'success');
        setIsLoginOpen(false);
      } else {
        setLoginError('Google нэвтрэхэд алдаа гарлаа');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      setLoginError(error.message || 'Google нэвтрэхэд алдаа гарлаа');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  // Handle register button
  const handleRegisterClick = () => {
    setIsLoginOpen(false);
    router.push('/register');
  };

  // Render category image or fallback
  const renderCategoryImage = (category: Category, size: 'small' | 'medium' = 'small') => {
    const imageUrl = getImageUrl(category.image);
    const sizeClass = size === 'small' ? 'w-5 h-5' : 'w-10 h-10';
    
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={category.name}
          className={`${sizeClass} object-cover rounded-full border border-gray-200`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    return (
      <div className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center`}>
        <span className={`${size === 'small' ? 'text-[10px]' : 'text-sm'} font-medium text-gray-600`}>
          {category.name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const closeDrawerAndGoCategory = (categoryId: string) => {
    handleCategoryClick(categoryId);
    setIsCategoryMenuOpen(false);
  };

  const toggleDrawerCategoryExpand = (id: string) => {
    const key = String(id);
    setDrawerExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /** Renders up to 3 category levels (L1 → L2 → L3). Parents expand to show children; leaves navigate. */
  const renderCategoryTreeBranch = (nodes: CategoryTreeNode[], depth: number): React.ReactNode => {
    if (!nodes?.length || depth > 2) return null;
    return (
      <ul className={depth === 0 ? 'space-y-0.5' : 'mt-1.5 space-y-0.5 border-l-2 border-gray-100 pl-3 ml-0.5'}>
        {nodes.map((node) => {
          const childList = node.children && node.children.length > 0 ? node.children : [];
          const hasChildren = childList.length > 0;
          const canNestDeeper = hasChildren && depth < 2;
          const nodeKey = String(node.id);
          const isExpanded = drawerExpandedIds.has(nodeKey);
          const cat: Category = {
            id: node.id,
            name: node.name,
            image: node.image || '',
            parentId: node.parentId ?? null,
          };

          return (
            <li key={node.id}>
              <div
                className={`flex w-full items-stretch gap-1 rounded-xl transition hover:bg-gray-50/80 ${
                  depth === 0 ? 'py-0.5' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (hasChildren) {
                      toggleDrawerCategoryExpand(nodeKey);
                    } else {
                      closeDrawerAndGoCategory(node.id);
                    }
                  }}
                  className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition active:bg-gray-100 ${
                    depth === 0
                      ? 'px-3 py-3 text-[15px] font-semibold text-gray-900'
                      : depth === 1
                        ? 'px-3 py-2.5 text-sm font-medium text-gray-800'
                        : 'px-2.5 py-2 text-sm text-gray-700'
                  }`}
                >
                  <span className="shrink-0">{renderCategoryImage(cat, depth === 0 ? 'medium' : 'small')}</span>
                  <span className="min-w-0 flex-1 leading-snug">{node.name}</span>
                  {hasChildren ? (
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90 text-gray-600' : ''
                      }`}
                      aria-hidden
                    />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                  )}
                </button>
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => closeDrawerAndGoCategory(node.id)}
                    className="shrink-0 self-center rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50"
                  >
                    Бүгд
                  </button>
                )}
              </div>
              {canNestDeeper && isExpanded && (
                <div className="pb-0.5">{renderCategoryTreeBranch(childList, depth + 1)}</div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-lg shadow-gray-200/60 ring-1 ring-gray-100' : ''}`}>
        {/* Promotional top strip */}
        <div className="bg-gradient-to-r from-[#1a1744] via-[#2d2666] to-[#1a1744] text-white">
          <div className="mx-auto flex max-w-layout flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 sm:justify-between sm:gap-4 sm:py-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/95 sm:text-xs">
              <Truck className="h-3.5 w-3.5 shrink-0 text-amber-300/90" strokeWidth={2} aria-hidden />
              Хот доторх хүргэлт
            </span>
            <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/95 sm:text-xs">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-300/90" strokeWidth={2} aria-hidden />
              24 цагийн дотор таны гарт
            </span>
            <span className="hidden h-4 w-px bg-white/20 md:block" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/95 sm:text-xs">
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-300/90" strokeWidth={2} aria-hidden />
              Хялбар буцаалт
            </span>
            <span className="hidden h-4 w-px bg-white/20 lg:block" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/95 sm:text-xs">
              <UserPlus className="h-3.5 w-3.5 shrink-0 text-amber-300/90" strokeWidth={2} aria-hidden />
              Бүртгүүлхэд хялбар
            </span>
          </div>
        </div>

        {/* Main bar: logo · Ангилал · search (inline left cluster) · icons */}
        <div className="border-b border-gray-100/90 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-layout px-3 py-3 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {/* Logo */}
              <button
                type="button"
                onClick={() => router.push('/')}
                className="group flex shrink-0 items-center gap-2.5 rounded-2xl py-1 pr-2 transition hover:bg-gray-50 sm:gap-3"
              >
                <span className="relative">
                  <img
                    src={storefrontLogoSrc()}
                    alt={`${publicBrandName(siteData?.companyName)} Logo`}
                    width={44}
                    height={44}
                    className="h-10 w-10 rounded-xl object-cover shadow-md ring-2 ring-white transition group-hover:ring-indigo-200 sm:h-11 sm:w-11"
                  />
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-base font-bold tracking-tight text-gray-900">
                    {publicBrandName(siteData?.companyName)}
                  </span>
                  {siteData?.companySuffix && (
                    <span className="block truncate text-[11px] text-gray-500">{siteData.companySuffix}</span>
                  )}
                </span>
              </button>

              {/* Ангилал */}
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((open) => !open)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-white shadow-md transition-all duration-200 sm:px-4 sm:text-sm ${
                  isCategoryMenuOpen
                    ? 'bg-gray-800 ring-2 ring-indigo-400/60 ring-offset-2'
                    : 'bg-gradient-to-br from-gray-900 to-indigo-950 hover:from-gray-800 hover:to-indigo-900 hover:shadow-lg active:scale-[0.98]'
                }`}
                aria-expanded={isCategoryMenuOpen}
                aria-haspopup="dialog"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="whitespace-nowrap">Ангилал</span>
                <ChevronDown className={`h-4 w-4 shrink-0 opacity-90 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Search — шууд Ангилалын баруун талд */}
              <div className="min-w-0 flex-1">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    type="search"
                    placeholder="Бараа хайх..."
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-12 text-sm text-gray-900 shadow-inner transition placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 to-indigo-950 text-white shadow-sm transition hover:from-gray-800 hover:to-indigo-900"
                    aria-label="Хайх"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Three icon actions */}
              <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/wishlist')}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-700 transition hover:border-indigo-200 hover:bg-white hover:text-indigo-700 hover:shadow-md sm:h-11 sm:w-11"
                  aria-label="Дуртай"
                >
                  <Heart className="h-5 w-5" strokeWidth={2} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white shadow-sm">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </button>

                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={handleUserButtonClick}
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-700 transition hover:border-indigo-200 hover:bg-white hover:shadow-md sm:h-11 sm:w-11"
                    aria-label={isAuthenticated ? 'Профайл' : 'Нэвтрэх'}
                  >
                    {isAuthenticated ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white shadow-inner">
                        {getUserInitials()}
                      </span>
                    ) : (
                      <User className="h-5 w-5" strokeWidth={2} />
                    )}
                    {isAuthenticated && (
                      <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && isAuthenticated && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 shadow-lg rounded-lg z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {getUserInitials()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user?.full_name || user?.email || user?.phone}</p>
                            {user?.provider === 'google' && (
                              <div className="flex items-center gap-1">
                                <Chrome className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-gray-500">Google хаяг</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            router.push('/account');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>Миний профайл</span>
                        </button>
                        <button
                          onClick={() => {
                            router.push('/orders');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          <span>Миний захиалгууд</span>
                        </button>
                        <button
                          disabled
                          className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed rounded-lg opacity-60"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Төлбөрийн хэрэгсэл</span>
                        </button>
                        <button
                          disabled
                          className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed rounded-lg opacity-60"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Тохиргоо</span>
                        </button>
                        <div className="border-t border-gray-100 my-2"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Гарах</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/cart')}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-700 transition hover:border-indigo-200 hover:bg-white hover:text-indigo-700 hover:shadow-md sm:h-11 sm:w-11"
                  aria-label="Сагс"
                >
                  <ShoppingCart className="h-5 w-5" strokeWidth={2} />
                  {cartCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white shadow-sm">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category chips (quick links; Ангилал is on main bar above) */}
        <div className="border-b border-gray-100/90 bg-gradient-to-b from-gray-50/80 to-white">
          <div className="mx-auto w-full max-w-layout px-3">
            <div className="flex items-center gap-2 py-1 sm:gap-3 sm:py-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-[12px] no-scrollbar sm:gap-3 sm:text-[13px]">
                {isLoadingCategories ? (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-6 w-20 rounded-md bg-gray-200 sm:h-7 sm:w-24"></div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleAllCategoriesClick}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 transition-all sm:gap-2 sm:px-2.5 sm:py-1.5 ${
                        activeCategory === ''
                          ? 'bg-gradient-to-r from-gray-100 to-gray-50 font-medium text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 sm:h-5 sm:w-5">
                        <span className="text-[11px] font-medium leading-none sm:text-xs">📦</span>
                      </div>
                      <span className="max-w-[160px] truncate font-medium sm:max-w-[180px]">Бүгд</span>
                    </button>
                    {categories.slice(0, 6).map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 transition-all sm:gap-2 sm:px-2.5 sm:py-1.5 ${
                          activeCategory === category.id
                            ? 'bg-gradient-to-r from-gray-100 to-gray-50 font-medium text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {renderCategoryImage(category, 'small')}
                        <span className="max-w-[160px] truncate font-medium sm:max-w-[180px]">
                          {category.name}
                        </span>
                      </button>
                    ))}
                    {categories.length > 6 && (
                      <button
                        onClick={() => setIsCategoryMenuOpen(true)}
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-gray-600 hover:bg-gray-50 hover:text-gray-900 sm:px-2.5 sm:py-1.5"
                      >
                        <span className="font-medium">...</span>
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1 border-l border-gray-200/90 pl-2 sm:gap-1.5 sm:pl-3">
                <button
                  type="button"
                  onClick={() => router.push('/stores')}
                  className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 sm:gap-1.5 sm:px-2.5 sm:text-xs"
                >
                  <Store className="h-3.5 w-3.5 shrink-0 text-emerald-700 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
                  <span className="whitespace-nowrap">Дэлгүүрүүд</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/brands')}
                  className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 sm:gap-1.5 sm:px-2.5 sm:text-xs"
                >
                  <Tags className="h-3.5 w-3.5 shrink-0 text-indigo-700 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
                  <span className="whitespace-nowrap">Брэндүүд</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          .animate-bounce {
            animation: bounce 1s infinite;
          }
        `}</style>
      </header>

      {categoryDrawerMounted &&
        isCategoryMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              className="animate-category-backdrop absolute inset-0 z-0 cursor-default border-0 bg-gray-900/45 backdrop-blur-[2px]"
              aria-label="Хаалт"
              onClick={() => setIsCategoryMenuOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-drawer-title"
              className="animate-category-drawer absolute left-0 top-0 z-10 flex h-[100dvh] w-full max-w-full flex-col border-r border-gray-200/80 bg-white shadow-[0_0_40px_rgba(0,0,0,0.12)] sm:max-w-xl md:max-w-2xl lg:max-w-[42rem]"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-900 via-gray-900 to-black px-4 py-4 text-white">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                    <LayoutGrid className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 id="category-drawer-title" className="truncate text-lg font-bold leading-tight">
                      Ангилал
                    </h2>
                    <p className="text-xs font-medium text-white/65">Бүх ангилалаас сонгоно уу</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Хаах"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
                {isLoadingCategories ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
                    <p className="text-sm">Ангилал ачаалж байна...</p>
                  </div>
                ) : (
                  <nav className="flex flex-col gap-3" aria-label="Ангилал">
                    <button
                      type="button"
                      onClick={() => {
                        handleAllCategoriesClick();
                        setIsCategoryMenuOpen(false);
                      }}
                      className="group flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3.5 text-left text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-200 hover:shadow-md"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-inner">
                        📦
                      </span>
                      <span className="min-w-0 flex-1">Бүх бараа</span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-700" />
                    </button>

                    {categoryTree.length > 0 ? (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-2">
                        {renderCategoryTreeBranch(categoryTree, 0)}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => closeDrawerAndGoCategory(category.id)}
                            className="group flex w-full items-center gap-4 rounded-2xl border border-transparent px-4 py-3.5 text-left text-sm font-medium text-gray-800 transition hover:border-gray-100 hover:bg-white"
                          >
                            <span className="shrink-0">{renderCategoryImage(category, 'medium')}</span>
                            <span className="min-w-0 flex-1 leading-snug">{category.name}</span>
                            <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </nav>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}

      {/* Login Modal */}
      {isLoginOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] animate-in fade-in duration-200"
            onClick={() => setIsLoginOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div 
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsLoginOpen(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Нэвтрэх</h2>
                  <p className="text-sm text-gray-600">Тавтай морилно уу</p>
                </div>

                {/* Error Message */}
                {loginError && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-600">{loginError}</p>
                    </div>
                  </div>
                )}

                {/* Google Login Button */}
                <div className="mb-6">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGoogleLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-700 font-medium">
                          Google нэвтэрч байна...
                        </span>
                      </>
                    ) : (
                      <>
                        <Chrome className="w-5 h-5 text-red-500" />
                        <span className="text-sm text-gray-700 font-medium">
                          Google хаягаар нэвтрэх
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">Эсвэл имэйл/утас</span>
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Имэйл хаяг эсвэл утасны дугаар
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-300 text-sm transition-all"
                        placeholder="имэйл@жишээ.com эсвэл 99112233"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-700">
                        Нууц үг
                      </label>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Нууц үгээ мартсан уу?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-300 text-sm transition-all"
                        placeholder="Нууц үгээ оруулна уу"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || isGoogleLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-gray-900 to-black text-white text-sm font-medium rounded-lg hover:from-gray-800 hover:to-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] shadow-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Нэвтэрч байна...
                      </span>
                    ) : (
                      'Нэвтрэх'
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Шинэ хэрэглэгч үү?{' '}
                    <button
                      onClick={handleRegisterClick}
                      className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      Бүртгүүлэх
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Add missing ChevronRight component
const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default Header;