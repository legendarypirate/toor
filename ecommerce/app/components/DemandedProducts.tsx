import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, ProductVariation } from '../lib/types';
import { Star, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { showAppMessage } from '@/app/lib/appMessage';
import { safeImgSrc } from '@/app/lib/imageSrc';

interface DemandedProductsProps {
  products?: Product[] | undefined;
}

const DemandedProducts: React.FC<DemandedProductsProps> = ({ products: propsProducts }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Fetch demanded products from API
  useEffect(() => {
    if (propsProducts) {
      // If products are passed as props, use them
      setProducts(propsProducts);
      setLoading(false);
    } else {
      // Otherwise fetch from API
      fetchDemandedProducts();
    }
  }, [propsProducts]);

  const fetchDemandedProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/products?isBestSeller=true&limit=12`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Handle both response formats: direct array or object with products array
      const demandedProducts: Product[] = Array.isArray(data) ? data : (data.products || []);
      setProducts(demandedProducts);
    } catch (err) {
      console.error('Error fetching bestseller products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bestseller products');
    } finally {
      setLoading(false);
    }
  };
  // Format price function
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mn-MN', {
      style: 'currency',
      currency: 'MNT',
      minimumFractionDigits: 0,
    }).format(price).replace('MNT', '₮');
  };

  // Get first variation from each product (or product itself if no variations)
  const getFirstVariationFromEachProduct = (): any[] => {
    if (!products || !Array.isArray(products)) {
      return [];
    }

    const variations: any[] = [];

    products.forEach(product => {
      // Get the first available variation or use product as variation
      let variationToShow: any = null;

      if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
        // Find first in-stock variation, or first variation if none are in stock
        const firstInStock = product.variations.find(v => v.inStock);
        variationToShow = firstInStock || product.variations[0];
      } else {
        // If no variations, use product as a variation
        variationToShow = {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          sku: product.sku || product.id,
          images: product.images || [product.thumbnail || ''],
          inStock: product.inStock,
          stockQuantity: product.stockQuantity,
          attributes: {},
        };
      }

      // Add parent product info
      if (variationToShow) {
        variations.push({
          ...variationToShow,
          _parentProduct: {
            id: product.id,
            name: product.name,
            rating: product.rating,
            reviewCount: product.reviewCount,
            brand: product.brand,
            category: product.category,
            isOnSale: product.isOnSale,
            discount: product.discount,
            thumbnail: product.thumbnail,
            images: product.images
          }
        });
      }
    });

    return variations;
  };

  const variations = getFirstVariationFromEachProduct();

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent, variation: any) => {
    e.preventDefault();
    e.stopPropagation();

    if (!variation.inStock) {
      showAppMessage('Энэ бүтээгдэхүүн дууссан байна', 'warning');
      return;
    }

    const variationId = String(variation.id);
    setAddingToCart(variationId);

    try {
      const parentProduct = variation._parentProduct;
      const productId = String(parentProduct?.id || variation.id);

      // Create cart item
      const cartItem = {
        id: `${productId}-${variationId}`, // Unique ID combining product and variation
        product: {
          id: productId,
          name: parentProduct?.name || variation.name,
          nameMn: parentProduct?.name || variation.nameMn || variation.name,
          price: variation.price,
          originalPrice: variation.originalPrice || undefined,
          image: variation.images?.[0] || parentProduct?.thumbnail || parentProduct?.images?.[0] || '',
          thumbnail: variation.thumbnail || parentProduct?.thumbnail || variation.images?.[0] || '',
          category: parentProduct?.category || '',
          inStock: variation.inStock,
          company: parentProduct?.company,
          bankAccountId: parentProduct?.bankAccountId,
        },
        quantity: 1,
        selectedSize: variation.attributes?.size || undefined,
        selectedColor: variation.attributes?.color || undefined,
        addedAt: new Date().toISOString()
      };

      const result = addToCart(cartItem);

      if (result.alreadyExists) {
        showAppMessage('энэ бараа сагсанд байна', 'warning');
      } else if (result.success) {
        showAppMessage('Сагсанд нэмэгдлээ', 'success');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showAppMessage('Алдаа гарлаа. Дахин оролдоно уу.', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="mx-auto w-full max-w-layout px-3">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              <span className="text-gray-800">Их</span>{' '}
              <span className="text-amber-700">зарагдсан</span>
            </h2>
            <p className="text-gray-500 text-sm">Ачаалж байна...</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mx-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="py-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="mx-auto w-full max-w-layout px-3">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Алдаа гарлаа</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  // Show empty state if no variations
  if (variations.length === 0) {
    return (
      <section className="py-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="mx-auto w-full max-w-layout px-3">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Их зарагдсан бүтээгдэхүүн байхгүй</h3>
            <p className="text-gray-500">Их зарагдсан бүтээгдэхүүн одоогоор бэлэн болоогүй байна.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-gradient-to-br from-gray-50 to-white">
      <div className="mx-auto w-full max-w-layout px-3">
        {/* Minimal Header with Amber Accent */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              {/* Decorative line with amber gradient */}
              <div className="absolute -inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
              <div className="relative px-4">
                <span className="text-gray-800 font-medium text-sm tracking-wider bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-gray-200/60 flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"></div>
                  <span>Их зарагдсан бүтээгдэхүүн</span>
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Products Grid with amber accent and hot badges */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mx-auto">
          {variations.slice(0, 12).map((variation, index) => {
            const parentProduct = variation._parentProduct;

            const raw =
              variation.images?.[0] ||
              variation.thumbnail ||
              parentProduct?.thumbnail ||
              parentProduct?.images?.[0];
            const imageSrc = safeImgSrc(raw);

            // Get valid product ID
            const productId = parentProduct?.id || variation.id;
            if (!productId || productId === 'NaN' || productId === 'undefined' || productId === 'null') {
              return null; // Skip rendering if no valid ID
            }

            return (
              <div key={`${variation.id}-${variation.sku}`} className="relative group">
                {/* Hot badge for top 3 products */}
                {index < 3 && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      🔥
                    </span>
                  </div>
                )}

                <Link
                  href={`/product/${productId}`}
                  className="block"
                >
                  <div className="group bg-white rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-sm transition-all duration-200 h-full flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={imageSrc}
                        alt={variation.nameMn || variation.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {parentProduct?.isOnSale && parentProduct?.discount > 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                          -{parentProduct.discount}%
                        </div>
                      )}
                      {!variation.inStock && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded border">Дууссан</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex flex-col flex-1">
                      {parentProduct?.brand && (
                        <div className="mb-1">
                          <span className="text-xs text-blue-600 font-medium">{parentProduct.brand}</span>
                        </div>
                      )}
                      {!parentProduct?.brand && <div className="mb-1 h-4"></div>}

                      <h3 className="text-sm text-gray-900 font-medium mb-1.5 line-clamp-2 h-10">
                        {variation.nameMn || variation.name}
                      </h3>

                      {/* Display attributes if available */}
                      {variation.attributes && Object.keys(variation.attributes).length > 0 && (
                        <div className="mb-2">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(variation.attributes as Record<string, string>).map(([key, value]) => (
                              <span
                                key={`${key}-${value}`}
                                className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded border"
                              >
                                {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!variation.attributes || Object.keys(variation.attributes).length === 0) && <div className="mb-2"></div>}

                      <div className="flex items-center mb-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.floor(parentProduct?.rating || 0)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                                }`}
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-xs text-gray-500">({parentProduct?.reviewCount || 0})</span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-base font-bold text-gray-900">
                            {formatPrice(variation.price)}
                          </span>
                          {variation.originalPrice && variation.originalPrice > variation.price && (
                            <span className="ml-1 text-xs text-gray-500 line-through">
                              {formatPrice(variation.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(e, variation)}
                        disabled={!variation.inStock || addingToCart === String(variation.id)}
                        className={`w-full py-2 text-sm rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors mt-auto ${variation.inStock && addingToCart !== String(variation.id)
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        {addingToCart === String(variation.id) ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Нэмэж байна...</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {variation.inStock ? 'Сагслах' : 'Дууссан'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Subtle Divider with Amber CTA */}
        <div className="mt-12 pt-6 border-t border-gray-200/40">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mb-4">
              <div className="h-px w-8 bg-gray-300"></div>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Их зарагдсан</span>
              </span>
              <div className="h-px w-8 bg-gray-300"></div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default DemandedProducts;