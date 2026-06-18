"use client";

import { useMemo, memo, useCallback } from 'react';
import { Package, Shield, Truck, Clock } from 'lucide-react';
import { safeImgSrc } from '@/app/lib/imageSrc';

interface OrderSummaryProps {
  cartItems: any[];
  formData: any;
  subtotal: number;
  shipping: number;
  total: number;
  couponDiscount?: number;
  appliedCoupon?: {code: string, discount: number} | null;
  formatPrice: (price: number) => string;
  onInvoiceTypeChange?: (invoiceType: string) => void;
  onInvoiceDataChange?: (field: string, value: string) => void;
  step?: number;
}

const OrderSummary = ({
  cartItems,
  formData,
  subtotal,
  shipping,
  total,
  couponDiscount = 0,
  appliedCoupon = null,
  formatPrice,
  onInvoiceTypeChange,
  onInvoiceDataChange,
  step = 1
}: OrderSummaryProps) => {
  // Calculate subtotal from cartItems (excluding gift items)
  // Always calculate from cartItems when available, as it's the source of truth
  const calculatedSubtotal = useMemo(() => {
    // If cartItems is available and has items, always calculate from them
    if (cartItems && cartItems.length > 0) {
      const calculated = cartItems
        .filter(item => !item.isGift && item.product && item.product.price)
        .reduce((sum, item) => {
          const price = typeof item.product.price === 'number' 
            ? item.product.price 
            : parseFloat(String(item.product.price)) || 0;
          const quantity = typeof item.quantity === 'number' 
            ? item.quantity 
            : parseInt(String(item.quantity)) || 0;
          return sum + (price * quantity);
        }, 0);
      
      // Return calculated value (even if 0, as it might be accurate)
      return calculated;
    }
    
    // Fallback to prop when cartItems is empty (e.g., after order completion in Step 3)
    // Use the prop value directly, as it should contain stored order totals
    return subtotal;
  }, [cartItems, subtotal]);

  // Use calculated subtotal
  const displaySubtotal = calculatedSubtotal;

  // Memoize invoice handlers to prevent unnecessary re-renders
  const handleInvoiceTypeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onInvoiceTypeChange?.(e.target.value);
  }, [onInvoiceTypeChange]);

  const handleInvoiceDataChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onInvoiceDataChange?.(field, e.target.value);
  }, [onInvoiceDataChange]);

  const handleInvoiceFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);
  return (
    <div className="lg:col-span-1 order-2 lg:order-1">
      <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Захиалгын дэлгэрэнгүй</h2>
        
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
          {cartItems.map((item, index) => (
            <div key={`${item.id}-${item.selectedSize || ''}-${item.selectedColor || ''}-${index}`} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                  {item.product.image?.trim() ? (
                    <img 
                      src={safeImgSrc(item.product.image)} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/default.jpg';
                      }}
                    />
                  ) : (
                    <Package className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{item.product.name}</div>
                  <div className="text-sm text-gray-500">x{item.quantity}</div>
                  <div className="text-xs text-gray-400">
                    {item.selectedSize && `Хэмжээ: ${item.selectedSize}`}
                    {item.selectedColor && ` • Өнгө: ${item.selectedColor}`}
                  </div>
                </div>
              </div>
              <div className="font-medium whitespace-nowrap ml-2">
                {formatPrice(item.product.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Барааны үнэ</span>
            <span>{formatPrice(displaySubtotal)}</span>
          </div>
          {couponDiscount > 0 && appliedCoupon && (
            <div className="flex justify-between text-green-600">
              <span>Урамшуулал ({appliedCoupon.code})</span>
              <span>-{formatPrice(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3">
            <span>Нийт дүн</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        
        {/* Invoice Type Selection - Only show in Step 1 */}
        {step === 1 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Ибаримт</h3>
            <form onSubmit={handleInvoiceFormSubmit} onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLElement;
                // Allow Enter on radio buttons and textareas
                if (target instanceof HTMLInputElement && target.type === 'radio') {
                  return; // Allow default behavior for radio buttons
                }
                if (target instanceof HTMLTextAreaElement) {
                  return; // Allow default behavior for textareas
                }
                // Prevent form submission for all other inputs
                e.preventDefault();
                e.stopPropagation();
              }
            }}>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="invoiceType"
                    value="individual"
                    checked={formData.invoiceType === 'individual'}
                    onChange={handleInvoiceTypeChange}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Хувь хүн</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="invoiceType"
                    value="organization"
                    checked={formData.invoiceType === 'organization'}
                    onChange={handleInvoiceTypeChange}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Байгууллага</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="invoiceType"
                    value="taxpayer"
                    checked={formData.invoiceType === 'taxpayer'}
                    onChange={handleInvoiceTypeChange}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Татвар төлөгч иргэн</div>
                  </div>
                </label>
              </div>
              
              {/* Invoice Data Fields */}
              {(formData.invoiceType === 'individual' || formData.invoiceType === 'organization' || formData.invoiceType === 'taxpayer') && (
                <div className="mt-4 space-y-3">
                  {formData.invoiceType === 'organization' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Байгууллагын нэр *
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceOrgName || ''}
                        onChange={handleInvoiceDataChange('invoiceOrgName')}
                        placeholder="Байгууллагын нэр"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Регистрийн дугаар *
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceRegister || ''}
                      onChange={handleInvoiceDataChange('invoiceRegister')}
                      placeholder="Регистрийн дугаар"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>Төлбөрийн аюулгүй байдал</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Truck className="w-4 h-4" />
            <span>Хүргэлт 24 цаг</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>24/7 захиалга</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(OrderSummary);

