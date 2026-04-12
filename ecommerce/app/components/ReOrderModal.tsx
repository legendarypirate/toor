"use client";

import { useState, useEffect } from 'react';
import { X, ShoppingCart, Package, Calendar, MapPin, Phone, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import { safeImgSrc } from '@/app/lib/imageSrc';

interface OrderItem {
  id: number;
  product_id: string;
  name: string;
  name_mn: string;
  price: number;
  quantity: number;
  image: string | null;
  sku: string | null;
}

interface Order {
  id: number;
  order_number: string;
  grand_total: number;
  created_at: string;
  shipping_address: string;
  phone_number: string;
  customer_name: string;
  items: OrderItem[];
}

interface ReOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function ReOrderModal({ isOpen, onClose, order }: ReOrderModalProps) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [isReordering, setIsReordering] = useState(false);
  const [reorderStatus, setReorderStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const formatPrice = (price: number) => {
    return price.toLocaleString() + '₮';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleReOrder = async () => {
    if (!order || !order.items || order.items.length === 0) {
      setReorderStatus({
        success: false,
        message: 'Захиалгад бараа байхгүй байна'
      });
      return;
    }

    setIsReordering(true);
    setReorderStatus(null);

    try {
      let addedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Add each item to cart
      for (const item of order.items) {
        try {
          // Fetch product details to get current price and availability
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          const productResponse = await fetch(`${API_URL}/products/${item.product_id}?includeVariations=true`);
          
          if (!productResponse.ok) {
            errors.push(`${item.name_mn || item.name}: Бараа олдсонгүй`);
            skippedCount++;
            continue;
          }

          const productData = await productResponse.json();
          const product = productData.product || productData;

          // Check if product is in stock
          if (product.inStock === false) {
            errors.push(`${item.name_mn || item.name}: Дууссан`);
            skippedCount++;
            continue;
          }

          // Try to find matching variation by SKU or name
          let selectedVariation = null;
          let selectedSize: string | undefined = undefined;
          let selectedColor: string | undefined = undefined;
          
          if (product.variations && product.variations.length > 0 && item.sku) {
            // Try to find variation by SKU first
            selectedVariation = product.variations.find((v: any) => v.sku === item.sku);
            
            // If not found by SKU, try to match by name
            if (!selectedVariation) {
              selectedVariation = product.variations.find((v: any) => 
                v.name === item.name || v.nameMn === item.name_mn
              );
            }
            
            // Extract size and color from variation attributes
            if (selectedVariation && selectedVariation.attributes) {
              selectedSize = selectedVariation.attributes.size;
              selectedColor = selectedVariation.attributes.color;
            }
          }

          // Use variation price if found, otherwise use product price
          const price = selectedVariation 
            ? parseFloat(selectedVariation.price) 
            : parseFloat(product.price || item.price);
          
          const originalPrice = selectedVariation?.originalPrice 
            ? parseFloat(selectedVariation.originalPrice)
            : (product.originalPrice ? parseFloat(product.originalPrice) : price);

          // Use variation images if available, otherwise product images
          const image = selectedVariation?.thumbnail || selectedVariation?.images?.[0] 
            || product.thumbnail || product.images?.[0] || item.image || '';
          
          const thumbnail = selectedVariation?.thumbnail || selectedVariation?.images?.[0]
            || product.thumbnail || product.images?.[0] || item.image || '';

          // Check variation stock if using variation
          if (selectedVariation && selectedVariation.inStock === false) {
            errors.push(`${item.name_mn || item.name}: Дууссан`);
            skippedCount++;
            continue;
          }

          // Create cart item ID - use product ID, and variation ID if available
          const cartItemId = selectedVariation 
            ? `${item.product_id}-${selectedVariation.id}`
            : String(item.product_id);

          // Create cart item
          const cartItem = {
            id: cartItemId,
            product: {
              id: item.product_id,
              name: product.name || item.name,
              nameMn: product.nameMn || item.name_mn || item.name,
              price: price,
              originalPrice: originalPrice,
              image: image,
              thumbnail: thumbnail,
              category: product.category || '',
              inStock: selectedVariation ? (selectedVariation.inStock !== false) : (product.inStock !== false),
              sku: selectedVariation?.sku || product.sku || item.sku || '',
              company: product.company,
              bankAccountId: product.bankAccountId,
            },
            quantity: item.quantity,
            selectedSize: selectedSize,
            selectedColor: selectedColor,
            addedAt: new Date().toISOString(),
          };

          const result = addToCart(cartItem);
          
          if (result.success) {
            addedCount++;
          } else if (result.alreadyExists) {
            skippedCount++;
          } else {
            errors.push(`${item.name_mn || item.name}: ${result.message || 'Алдаа гарлаа'}`);
            skippedCount++;
          }
        } catch (error: any) {
          console.error(`Error adding item ${item.id} to cart:`, error);
          errors.push(`${item.name_mn || item.name}: ${error.message || 'Алдаа гарлаа'}`);
          skippedCount++;
        }
      }

      // Show result message
      if (addedCount > 0) {
        setReorderStatus({
          success: true,
          message: `${addedCount} бараа сагсанд нэмэгдлээ${skippedCount > 0 ? `. ${skippedCount} бараа алгассан` : ''}`
        });

        // Close modal and redirect to cart after 2 seconds
        setTimeout(() => {
          onClose();
          router.push('/cart');
        }, 2000);
      } else {
        setReorderStatus({
          success: false,
          message: `Бараа нэмэхэд алдаа гарлаа. ${errors.length > 0 ? errors[0] : ''}`
        });
      }
    } catch (error) {
      console.error('Re-order error:', error);
      setReorderStatus({
        success: false,
        message: 'Дахин захиалах явцад алдаа гарлаа'
      });
    } finally {
      setIsReordering(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Хүргэгдсэн захиалга</h2>
              <p className="text-sm text-gray-500">Таны сүүлд хүргэгдсэн захиалга</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Захиалгын дугаар:</span>
              <span className="font-semibold text-gray-900">{order.order_number}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Огноо:</span>
              <span className="font-medium text-gray-900">{formatDate(order.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Хаяг:</span>
              <span className="font-medium text-gray-900">{order.shipping_address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Утас:</span>
              <span className="font-medium text-gray-900">{order.phone_number}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Нийт дүн:</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(order.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Захиалгын бараа</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  {item.image?.trim() ? (
                    <img
                      src={safeImgSrc(item.image)}
                      alt={item.name_mn || item.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = '/default.jpg';
                      }}
                    />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {item.name_mn || item.name}
                    </h4>
                    {item.sku && (
                      <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-600">Тоо ширхэг: {item.quantity}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Message */}
          {reorderStatus && (
            <div
              className={`p-4 rounded-lg ${
                reorderStatus.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm ${
                  reorderStatus.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {reorderStatus.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Хаах
            </button>
            <button
              onClick={handleReOrder}
              disabled={isReordering}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isReordering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Нэмэж байна...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Дахин захиалах
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

