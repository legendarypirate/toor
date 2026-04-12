// app/context/CartContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getPublicApiBase } from '../lib/apiBase';

interface Product {
  id: string | number;
  name: string;
  nameMn: string;
  price: number;
  originalPrice?: number;
  image: string;
  thumbnail?: string;
  inStock: boolean;
  categoryId?: string;
  category?: string;
  sku?: string;
  // Optional: affects which bank accounts should show on checkout
  company?: string;
  bankAccountId?: number;
  // Add other product fields as needed
}

interface CartItem {
  id: string | number;
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  addedAt: string;
  isGift?: boolean; // Mark gift items
}

interface AddToCartResult {
  success: boolean;
  message: string;
  alreadyExists: boolean;
}

interface WishlistItem {
  id: string | number;
  product: Product;
  addedAt: string;
}

interface CartContextType {
  cartItems: CartItem[];
  wishlistItems: WishlistItem[];
  cartCount: number;
  wishlistCount: number;
  cartTotal: number;
  addToCart: (item: CartItem) => AddToCartResult;
  removeFromCart: (id: number | string) => void;
  updateCartItemQuantity: (id: number | string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (product: Product) => void;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: number | string) => void;
  clearWishlist: () => void;
  isInWishlist: (id: number | string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const isCheckingGiftsRef = useRef(false);
  const lastNonGiftTotalRef = useRef<number | null>(null);

  // Load cart and wishlist from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedWishlist = localStorage.getItem('wishlist');
    
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
        setCartItems([]);
      }
    }
    
    if (savedWishlist) {
      try {
        setWishlistItems(JSON.parse(savedWishlist));
      } catch (error) {
        console.error('Error parsing wishlist from localStorage:', error);
        setWishlistItems([]);
      }
    }
    
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isInitialized]);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, isInitialized]);

  // Check and auto-add gift products when cart threshold is met
  useEffect(() => {
    if (!isInitialized || cartItems.length === 0) {
      lastNonGiftTotalRef.current = null;
      return;
    }

    // Calculate totals excluding gift items (gifts shouldn't count toward threshold)
    const nonGiftItems = cartItems.filter(item => !item.isGift);
    const cartTotal = nonGiftItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    // Only check if non-gift total changed (prevents infinite loop)
    if (lastNonGiftTotalRef.current === cartTotal && cartItems.some(item => item.isGift)) {
      return; // No change in non-gift total, skip check
    }
    
    // Prevent concurrent checks
    if (isCheckingGiftsRef.current) {
      return;
    }

    const checkAndAddGifts = async () => {
      isCheckingGiftsRef.current = true;
      try {
        const itemCount = nonGiftItems.reduce((sum, item) => sum + item.quantity, 0);

        // Check eligibility
        const response = await fetch(`${getPublicApiBase()}/gift-settings/check-eligibility`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cart_total: cartTotal,
            item_count: itemCount,
          }),
        });

        if (!response.ok) {
          // Try to parse JSON error response, fallback to text
          let errorMessage = 'Unknown error';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
          } catch {
            try {
              errorMessage = await response.text();
            } catch {
              errorMessage = `HTTP ${response.status}`;
            }
          }
          console.error('Failed to check gift eligibility:', response.status, errorMessage);
          // Don't throw - gracefully handle the error and continue
          isCheckingGiftsRef.current = false;
          return;
        }

        const result = await response.json();
        
        // Get current non-gift items (may have changed during async operation)
        setCartItems(currentItems => {
          const currentNonGiftItems = currentItems.filter(item => !item.isGift);
          const currentNonGiftTotal = currentNonGiftItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
          
          // If non-gift total changed during async operation, skip update
          if (currentNonGiftTotal !== cartTotal) {
            isCheckingGiftsRef.current = false;
            return currentItems;
          }
          
          if (result.success && result.eligible && result.gift_products && result.gift_products.length > 0) {
            // Filter gift products that should be added (not already in cart)
            const giftProductsToAdd = result.gift_products.filter((giftProduct: any) => {
              // Check if gift product is already in cart (either as gift or non-gift)
              return !currentItems.some(item => String(item.product.id) === String(giftProduct.id));
            });

            // Convert gift products to cart items
            const newGiftItems: CartItem[] = giftProductsToAdd.map((giftProduct: any) => {
              // Use first variation if available, otherwise use product price
              const originalPrice = giftProduct.variations && giftProduct.variations.length > 0
                ? parseFloat(giftProduct.variations[0].price)
                : parseFloat(giftProduct.price);

              return {
                id: `gift-${giftProduct.id}`,
                product: {
                  id: giftProduct.id,
                  name: giftProduct.name || giftProduct.nameMn || 'Бэлэг',
                  nameMn: giftProduct.nameMn || giftProduct.name || 'Бэлэг',
                  price: 0, // Gift items are free
                  originalPrice: originalPrice,
                  image: giftProduct.thumbnail || (giftProduct.images && giftProduct.images[0]) || '',
                  thumbnail: giftProduct.thumbnail || (giftProduct.images && giftProduct.images[0]) || '',
                  inStock: giftProduct.inStock !== false,
                  category: giftProduct.category || '',
                  sku: giftProduct.sku || '',
                },
                quantity: 1,
                addedAt: new Date().toISOString(),
                isGift: true,
              };
            });

            // Get current gift items and their IDs
            const currentGiftItems = currentItems.filter(item => item.isGift);
            const currentGiftIds = new Set<string>(currentGiftItems.map(item => String(item.product.id)));
            
            // Get expected gift product IDs from API response
            const expectedGiftIds = new Set<string>(result.gift_products.map((gp: any) => String(gp.id)));
            
            // Check if gift items changed (need to add new ones or remove old ones)
            const giftsChanged = 
              currentGiftIds.size !== expectedGiftIds.size ||
              Array.from(currentGiftIds).some((id: string) => !expectedGiftIds.has(id)) ||
              Array.from(expectedGiftIds).some((id: string) => !currentGiftIds.has(id));
            
            if (giftsChanged) {
              // Remove old gift items that are no longer eligible
              const updatedNonGiftItems = currentNonGiftItems;
              
              // Add new gift items
              const finalGiftItems = result.gift_products.map((giftProduct: any) => {
                // Check if already exists as gift item
                const existingGiftItem = currentGiftItems.find(
                  item => String(item.product.id) === String(giftProduct.id)
                );
                
                if (existingGiftItem) {
                  return existingGiftItem;
                }
                
                // Create new gift item
                const originalPrice = giftProduct.variations && giftProduct.variations.length > 0
                  ? parseFloat(giftProduct.variations[0].price)
                  : parseFloat(giftProduct.price);

                return {
                  id: `gift-${giftProduct.id}`,
                  product: {
                    id: giftProduct.id,
                    name: giftProduct.name || giftProduct.nameMn || 'Бэлэг',
                    nameMn: giftProduct.nameMn || giftProduct.name || 'Бэлэг',
                    price: 0,
                    originalPrice: originalPrice,
                    image: giftProduct.thumbnail || (giftProduct.images && giftProduct.images[0]) || '',
                    thumbnail: giftProduct.thumbnail || (giftProduct.images && giftProduct.images[0]) || '',
                    inStock: giftProduct.inStock !== false,
                    category: giftProduct.category || '',
                    sku: giftProduct.sku || '',
                  },
                  quantity: 1,
                  addedAt: new Date().toISOString(),
                  isGift: true,
                };
              });
              
              lastNonGiftTotalRef.current = currentNonGiftTotal;
              isCheckingGiftsRef.current = false;
              return [...updatedNonGiftItems, ...finalGiftItems];
            }
            
            isCheckingGiftsRef.current = false;
            return currentItems;
          } else {
            // Not eligible - remove gift items if any
            if (currentItems.some(item => item.isGift)) {
              lastNonGiftTotalRef.current = currentNonGiftTotal;
              isCheckingGiftsRef.current = false;
              return currentNonGiftItems;
            }
            
            isCheckingGiftsRef.current = false;
            return currentItems;
          }
        });
      } catch (error) {
        console.error('Error checking gift eligibility:', error);
        isCheckingGiftsRef.current = false;
      }
    };

    // Debounce to avoid too many API calls
    const timeoutId = setTimeout(checkAndAddGifts, 500);
    return () => {
      clearTimeout(timeoutId);
      isCheckingGiftsRef.current = false;
    };
  }, [cartItems, isInitialized]);

  const addToCart = (item: CartItem): AddToCartResult => {
    // Don't allow manually adding gift items
    if (item.isGift) {
      return {
        success: false,
        message: 'Бэлгийн бараа зөвхөн автоматаар нэмэгдэнэ',
        alreadyExists: false
      };
    }

    // Check if item already exists in current cart state BEFORE updating
    // Compare by product ID and variation attributes, not cart item ID
    // since different pages may create different cart item IDs for the same product
    // Also exclude gift items from this check
    const existingItem = cartItems.find(cartItem => 
      !cartItem.isGift &&
      String(cartItem.product.id) === String(item.product.id) && 
      cartItem.selectedSize === item.selectedSize &&
      cartItem.selectedColor === item.selectedColor
    );

    if (existingItem) {
      // Item already exists, don't add it again
      return {
        success: false,
        message: 'энэ бараа сагсанд байна',
        alreadyExists: true
      };
    }

    // Item doesn't exist, add it
    setCartItems(prev => [...prev, item]);

    return {
      success: true,
      message: 'Сагсанд нэмэгдлээ',
      alreadyExists: false
    };
  };

  const removeFromCart = (id: number | string) => {
    const idStr = String(id);
    setCartItems(prev => prev.filter(item => String(item.id) !== idStr));
  };

  const updateCartItemQuantity = (id: number | string, quantity: number) => {
    const idStr = String(id);
    setCartItems(prev =>
      prev.map(item =>
        String(item.id) === idStr ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Wishlist functions
  const toggleWishlist = (product: Product) => {
    setWishlistItems(prev => {
      const productIdStr = String(product.id);
      const isInWishlist = prev.some(item => String(item.id) === productIdStr);
      
      if (isInWishlist) {
        return prev.filter(item => String(item.id) !== productIdStr);
      } else {
        return [...prev, {
          id: product.id,
          product: product,
          addedAt: new Date().toISOString()
        }];
      }
    });
  };

  const addToWishlist = (item: WishlistItem) => {
    setWishlistItems(prev => {
      // Use string comparison for UUIDs
      const itemId = String(item.id);
      
      // Validate item ID
      if (!itemId || itemId === 'NaN' || itemId === 'undefined' || itemId === 'null' || itemId.trim() === '') {
        console.warn('Invalid item ID:', item.id);
        return prev;
      }
      
      // Check if item already exists - compare IDs as strings
      const isInWishlist = prev.some(wishlistItem => {
        const wishlistItemId = String(wishlistItem.id);
        return wishlistItemId === itemId;
      });
      
      if (!isInWishlist) {
        return [...prev, item];
      }
      return prev;
    });
  };

  const removeFromWishlist = (id: number | string) => {
    const idStr = String(id);
    setWishlistItems(prev => prev.filter(item => String(item.id) !== idStr));
  };

  const clearWishlist = () => {
    setWishlistItems([]);
  };

  const isInWishlist = (id: number | string): boolean => {
    const idStr = String(id);
    return wishlistItems.some(item => String(item.id) === idStr);
  };

  // Calculate cart count
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate wishlist count
  const wishlistCount = wishlistItems.length;
  
  // Calculate cart total (excluding gift items - they are free)
  const cartTotal = cartItems
    .filter(item => !item.isGift)
    .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        wishlistItems,
        cartCount,
        wishlistCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        isInWishlist,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};