"use client";

import { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Trash2, Eye, ArrowLeft, Share2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { showAppMessage } from '@/app/lib/appMessage';
import { firstNonEmptyImg, safeImgSrc } from '@/app/lib/imageSrc';

const WishlistPage = () => {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { 
    wishlistItems, 
    removeFromWishlist: contextRemoveFromWishlist, 
    addToCart, 
    addToWishlist,
    isInWishlist 
  } = useCart();

  useEffect(() => {
    setIsClient(true);
    document.title = 'Хүслийн жагсаалт | TOOR.MN';
  }, []);

  // Format price
  const formatPrice = (price: number | string | undefined): string => {
    if (price === undefined || price === null) return '0₮';
    
    let numPrice: number;
    
    if (typeof price === 'string') {
      const cleanString = price.replace(/[^\d.-]/g, '');
      numPrice = parseFloat(cleanString);
      
      if (isNaN(numPrice)) {
        const match = price.match(/\d+/);
        numPrice = match ? parseInt(match[0], 10) : 0;
      }
    } else {
      numPrice = price;
    }
    
    if (isNaN(numPrice) || !isFinite(numPrice)) {
      return '0₮';
    }
    
    const integerPrice = Math.round(numPrice);
    return integerPrice.toLocaleString('en-US') + '₮';
  };

  // Get price as number
  const getPriceAsNumber = (price: number | string | undefined): number => {
    if (price === undefined || price === null) return 0;
    
    if (typeof price === 'string') {
      const cleanString = price.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleanString);
      return isNaN(num) ? 0 : num;
    }
    
    return price;
  };

  // Move to cart
  const moveToCart = (item: any) => {
    // Prevent parent click from navigating away
    // when a button inside the card is pressed
    // (useful when the entire card is clickable)
    const cartItem = {
      id: item.id,
      product: {
        id: item.id,
        name: item.product.name,
        nameMn: item.product.nameMn || item.product.name,
        price: getPriceAsNumber(item.product.price),
        originalPrice: getPriceAsNumber(item.product.originalPrice),
        image: item.product.image || item.product.thumbnail || '',
        thumbnail: item.product.thumbnail || item.product.image || '',
        category: item.product.category || '',
        inStock: item.product.inStock || true,
        company: item.product.company,
        bankAccountId: item.product.bankAccountId
      },
      quantity: 1,
      selectedSize: 'M',
      selectedColor: 'Хар',
      addedAt: new Date().toISOString()
    };
    
    const result = addToCart(cartItem);
    if (result.alreadyExists) {
      showAppMessage('энэ бараа сагсанд байна', 'warning');
    } else if (result.success) {
      showAppMessage(`${item.product.nameMn} сагсанд нэмэгдлээ`, 'success');
    }
  };

  // Move all to cart
  const moveAllToCart = () => {
    const availableItems = wishlistItems.filter(item => item.product.inStock);
    let addedCount = 0;
    let alreadyExistsCount = 0;
    
    availableItems.forEach(item => {
      const cartItem = {
        id: item.id,
        product: {
          id: item.id,
          name: item.product.name,
          nameMn: item.product.nameMn || item.product.name,
          price: getPriceAsNumber(item.product.price),
          originalPrice: getPriceAsNumber(item.product.originalPrice),
          image: item.product.image || item.product.thumbnail || '',
          thumbnail: item.product.thumbnail || item.product.image || '',
          category: item.product.category || '',
          inStock: item.product.inStock || true,
          company: item.product.company,
          bankAccountId: item.product.bankAccountId
        },
        quantity: 1,
        selectedSize: 'M',
        selectedColor: 'Хар',
        addedAt: new Date().toISOString()
      };
      
      const result = addToCart(cartItem);
      if (result.alreadyExists) {
        alreadyExistsCount++;
      } else if (result.success) {
        addedCount++;
      }
    });
    
    if (addedCount > 0 && alreadyExistsCount === 0) {
      showAppMessage(`${addedCount} бараа сагсанд нэмэгдлээ`, 'success');
    } else if (addedCount > 0 && alreadyExistsCount > 0) {
      showAppMessage(`${addedCount} бараа нэмэгдлээ, ${alreadyExistsCount} бараа сагсанд байна`, 'warning');
    } else if (alreadyExistsCount > 0) {
      showAppMessage('Эдгээр бараа сагсанд байна', 'warning');
    }
  };

  // FIXED: Directly use context function with immediate UI update
  const handleRemoveFromWishlist = (id: number | string) => {
    console.log('Removing wishlist item:', id);
    
    // Call context function
    if (typeof contextRemoveFromWishlist === 'function') {
      contextRemoveFromWishlist(id);
      showAppMessage('Бүтээгдэхүүн хүслийн жагсаалтаас хасагдлаа', 'success');
    } else {
      console.error('contextRemoveFromWishlist is not a function');
      showAppMessage('Алдаа гарлаа. Дахин оролдоно уу.', 'error');
    }
  };

  // Clear all wishlist
  const handleClearWishlist = () => {
    if (confirm('Та хүслийн жагсаалтаа бүрэн цэвэрлэхдээ итгэлтэй байна уу?')) {
      // Remove all items one by one
      wishlistItems.forEach(item => {
        if (typeof contextRemoveFromWishlist === 'function') {
          contextRemoveFromWishlist(item.id);
        }
      });
      
      showAppMessage('Хүслийн жагсаалт цэвэрлэгдлээ', 'success');
    }
  };

  // Toggle wishlist
  const handleToggleWishlist = (product: any) => {
    if (isInWishlist(product.id)) {
      contextRemoveFromWishlist(product.id);
      showAppMessage('Бүтээгдэхүүн хүслийн жагсаалтаас хасагдлаа', 'success');
    } else {
      addToWishlist({
        id: product.id,
        product: {
          id: product.id,
          name: product.name,
          nameMn: product.nameMn || product.name,
          price: getPriceAsNumber(product.price),
          originalPrice: getPriceAsNumber(product.originalPrice),
          image: product.image || product.thumbnail || '',
          thumbnail: product.thumbnail || product.image || '',
          category: product.category || '',
          inStock: product.inStock || true
        },
        addedAt: new Date().toISOString()
      });
      showAppMessage('Бүтээгдэхүүн хүслийн жагсаалтанд нэмэгдлээ', 'success');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!isClient) return dateString;
    const date = new Date(dateString);
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Calculate stats
  const totalItems = wishlistItems.length;
  const inStockItems = wishlistItems.filter(item => item.product.inStock).length;
  
  const totalValue = wishlistItems.reduce((sum, item) => {
    const price = getPriceAsNumber(item.product.price);
    return sum + price;
  }, 0);

  // Recommendations data
  const recommendedProducts = [
    { 
      id: 7, 
      name: 'Кофе чанагч', 
      nameMn: 'Кофе чанагч', 
      price: 599000, 
      originalPrice: 699000,
      image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop', 
      thumbnail: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop',
      category: 'Цахилгаан',
      inStock: true,
      discount: 15 
    },
    { 
      id: 8, 
      name: 'Угаалгын машин', 
      nameMn: 'Угаалгын машин', 
      price: 1599000, 
      originalPrice: 1799000,
      image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop', 
      thumbnail: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop',
      category: 'Гэрийн тавилга',
      inStock: true,
      discount: 12 
    },
    { 
      id: 9, 
      name: 'Ном: Монголын түүх', 
      nameMn: 'Ном: Монголын түүх', 
      price: 35000, 
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop', 
      thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop',
      category: 'Ном',
      inStock: true 
    },
    { 
      id: 10, 
      name: 'Спорт гутал', 
      nameMn: 'Спорт гутал', 
      price: 189000, 
      originalPrice: 229000,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', 
      thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      category: 'Гутал',
      inStock: true,
      discount: 20 
    },
  ];

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto w-full max-w-layout px-3 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="aspect-square bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="mx-auto w-full max-w-layout px-3 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Хүслийн жагсаалт хоосон</h1>
            <p className="text-gray-600 mb-8">
              Та хүслийн жагсаалтад бараа нэмээгүй байна. Дуртай бараагаа хадгалахын тулд дуртай товчийг дарна уу.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/product"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Дэлгүүр рүү буцах
              </Link>
              
              <Link
                href="/product?category=featured"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Онцлох бараа үзэх
              </Link>
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
        {/* Page Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Миний хүсэл</h1>
              <p className="text-gray-600">{totalItems} бараа</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={moveAllToCart}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Бүгдийг сагслах
              </button>
              
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Share2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Нийт бараа</div>
              <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Боломжтой</div>
              <div className="text-2xl font-bold text-gray-900">{inStockItems}</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Нийт үнэ</div>
              <div className="text-2xl font-bold text-gray-900">{formatPrice(totalValue)}</div>
            </div>
          </div>
        </div>

        {/* Wishlist Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {wishlistItems.map((item) => {
            const priceNumber = getPriceAsNumber(item.product.price);
            const originalPriceNumber = getPriceAsNumber(item.product.originalPrice);
            const discount = originalPriceNumber > 0 && originalPriceNumber > priceNumber
              ? Math.round((1 - priceNumber / originalPriceNumber) * 100)
              : 0;
            
            // Get product ID - prefer product.id, fallback to item.id, ensure it's valid
            const getProductId = (): string | null => {
              // Try product.id first
              if (item.product?.id !== undefined && item.product?.id !== null) {
                const id = String(item.product.id);
                if (id && id !== 'NaN' && id !== 'undefined' && id !== 'null' && id.trim() !== '') {
                  return id;
                }
              }
              
              // Fallback to item.id
              if (item.id !== undefined && item.id !== null) {
                const id = String(item.id);
                if (id && id !== 'NaN' && id !== 'undefined' && id !== 'null' && id.trim() !== '') {
                  return id;
                }
              }
              
              return null;
            };

            const productId = getProductId();

            const handleNavigate = () => {
              if (productId) {
                router.push(`/product/${productId}`);
              } else {
                showAppMessage('Бүтээгдэхүүний ID олдсонгүй', 'error');
              }
            };

            return (
              <div 
                key={item.id} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 group cursor-pointer"
                onClick={handleNavigate}
                role="button"
                tabIndex={0}
              >
                {/* Product Image */}
                <div className="relative">
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={firstNonEmptyImg(item.product.image, item.product.thumbnail)}
                      alt={item.product.nameMn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = '/default.jpg';
                      }}
                    />
                  </div>
                  
                  {/* Discount Badge */}
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      -{discount}%
                    </div>
                  )}
                  
                  {/* Stock Status */}
                  {!item.product.inStock && (
                    <div className="absolute top-3 right-3 bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded">
                      Дууссан
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWishlist(item.id);
                      }}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{item.product.category}</span>
                    <span className="text-xs text-gray-500">{formatDate(item.addedAt)}</span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">{item.product.nameMn}</h3>
                  
                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatPrice(priceNumber)}
                      </div>
                      {originalPriceNumber > 0 && originalPriceNumber > priceNumber && (
                        <div className="text-sm text-gray-500 line-through">
                          {formatPrice(originalPriceNumber)}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWishlist(item.id);
                      }}
                      className="text-gray-400 hover:text-red-500 lg:hidden"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {productId ? (
                      <Link
                        href={`/product/${productId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-3 h-3" />
                        Дэлгэрэнгүй
                      </Link>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showAppMessage('Бүтээгдэхүний ID олдсонгүй', 'error');
                        }}
                        className="flex-1 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <Eye className="w-3 h-3" />
                        Дэлгэрэнгүй
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveToCart(item);
                      }}
                      disabled={!item.product.inStock}
                      className={`flex-1 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 ${
                        item.product.inStock
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Сагслах
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{inStockItems}</span> бараа сагслах боломжтой
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={moveAllToCart}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Боломжтойг нь сагслах
              </button>
              
              <button
                onClick={handleClearWishlist}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Бүгдийг цэвэрлэх
              </button>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Танд таалагдах</h2>
            <Link
              href="/product"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              Бүгдийг үзэх
              <ArrowLeft className="w-3 h-3 rotate-180" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendedProducts.map((product) => {
              const isInWishlistItem = wishlistItems.some(item => item.id === product.id);
              const discount = product.originalPrice 
                ? Math.round((1 - product.price / product.originalPrice) * 100)
                : 0;
              
              return (
                <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300">
                  <div className="relative">
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={safeImgSrc(product.image)}
                        alt={product.nameMn}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {discount > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        -{discount}%
                      </div>
                    )}
                    <button 
                      onClick={() => handleToggleWishlist(product)}
                      className={`absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 ${
                        isInWishlistItem ? 'text-red-500' : 'hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isInWishlistItem ? 'fill-red-500' : ''}`} />
                    </button>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">{product.nameMn}</h3>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-bold text-gray-900">{formatPrice(product.price)}</div>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <div className="text-sm text-gray-500 line-through">{formatPrice(product.originalPrice)}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default WishlistPage;