"use client";

import { useState, useRef, useEffect } from 'react';
import { Star, Heart, ShoppingCart, Share2, Truck, Shield, RotateCcw, ChevronLeft, ZoomIn, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { safeImgSrc } from '../lib/imageSrc';

const ProductDetailPage = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const product = {
    id: 1,
    name: 'mont-bell Өвлийн Хүрэм',
    nameMn: 'mont-bell Өвлийн Хүрэм',
    price: 259900,
    originalPrice: 299900,
    discount: 13,
    rating: 4.7,
    reviews: 124,
    inStock: true,
    category: 'Хувцас',
    brand: 'mont-bell',
    description: 'Өндөр чанартай, ус үл нэвтрүүлэх технологитой өвлийн хүрэм. -30°C хүйтэнд ч тохиромжтой.',
    descriptionMn: 'Өндөр чанартай, ус үл нэвтрүүлэх технологитой өвлийн хүрэм. -30°C хүйтэнд ч тохиромжтой.',
    tags: ['Өвлийн', 'Дулаан', 'Ус үл нэвтрүүлэх', 'mont-bell'],
    specifications: {
      'Материал': 'Nylon/Polyester',
      'Өнгө': 'Хар',
      'Хэмжээ': 'S, M, L, XL',
      'Жин': '850г',
      'Температур': '-30°C хүртэл',
      'Гарант': '2 жил'
    }
  };

  const images = [
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1200&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1539533017443-3c17669bb9c7?w=1200&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=1200&h=1200&fit=crop',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&h=1200&fit=crop',
  ];

  const relatedProducts = [
    { id: 2, name: 'mont-bell Флис Цамц', price: 125000, image: images[1] },
    { id: 3, name: 'Өвлийн Гутал', price: 189000, image: images[2] },
    { id: 4, name: 'Дулаан Шарф', price: 35000, image: images[3] },
  ];

  const sizes = ['S', 'M', 'L', 'XL'];

  // Custom cursor position
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  // Handle mouse move for custom cursor
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update cursor position
    setCursorPos({ x: e.clientX, y: e.clientY });
    
    // Only zoom if mouse is within image bounds
    const isWithinBounds = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    setIsZooming(isWithinBounds);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsZooming(false);
    setCursorPos({ x: -100, y: -100 }); // Hide cursor
  };

  // Calculate zoom effect
  const getZoomStyle = () => {
    if (!isZooming || !imageRef.current) return {};
    
    const rect = imageRef.current.getBoundingClientRect();
    const mouseX = cursorPos.x - rect.left;
    const mouseY = cursorPos.y - rect.top;
    
    // Calculate zoom position (center on mouse)
    const zoomX = (mouseX / rect.width) * 100;
    const zoomY = (mouseY / rect.height) * 100;
    
    return {
      transform: 'scale(2)',
      transformOrigin: `${zoomX}% ${zoomY}%`,
      transition: 'transform 0.1s ease-out',
    };
  };

  // Fullscreen zoom modal
  const openZoomModal = () => setShowZoomModal(true);
  const closeZoomModal = () => setShowZoomModal(false);

  // Keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showZoomModal && e.key === 'Escape') {
        closeZoomModal();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showZoomModal]);

  // Hide cursor when not zooming
  useEffect(() => {
    if (!isZooming) {
      setCursorPos({ x: -100, y: -100 });
    }
  }, [isZooming]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-layout px-3 py-3">
          <div className="flex items-center text-sm text-gray-600">
            <a href="/" className="hover:text-gray-900">Нүүр</a>
            <ChevronLeft className="w-4 h-4 mx-2 rotate-180" />
            <a href="/product" className="hover:text-gray-900">Хувцас</a>
            <ChevronLeft className="w-4 h-4 mx-2 rotate-180" />
            <span className="text-gray-900 font-medium">{product.nameMn}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-layout px-3 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Product Images with Simple Hover Zoom */}
            <div>
              <div className="mb-4">
                {/* Main Image Container with Hover Zoom */}
                <div className="relative">
                  <div 
                    ref={imageRef}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4 relative"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <img 
                      src={images[selectedImage]} 
                      alt={product.nameMn}
                      className="w-full h-full object-cover transition-transform duration-100"
                      style={getZoomStyle()}
                    />
                    
                    {/* Zoom Indicator Button */}
                    <button
                      onClick={openZoomModal}
                      className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white rounded-full p-2 transition-colors"
                      aria-label="Зураг томруулах"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    
                    {/* Custom Zoom Cursor (only shown when zooming) */}
                    <div 
                      ref={cursorRef}
                      className={`fixed pointer-events-none z-50 transition-opacity duration-100 ${
                        isZooming ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        left: `${cursorPos.x}px`,
                        top: `${cursorPos.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* Long narrow plus icon */}
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute w-[2px] h-8 bg-white -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
                        {/* Horizontal line */}
                        <div className="absolute w-8 h-[2px] bg-white -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Thumbnails */}
                  <div className="flex space-x-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`w-16 h-16 rounded border overflow-hidden flex-shrink-0 transition-all ${
                          selectedImage === idx 
                            ? 'border-gray-900 ring-2 ring-gray-900 ring-opacity-20' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img 
                          src={img} 
                          alt={`${product.nameMn} ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">{product.brand}</span>
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.nameMn}</h1>
                
                <div className="flex items-center mb-4">
                  <div className="flex items-center mr-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({product.reviews} үнэлгээ)</span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {product.price.toLocaleString()}₮
                    </span>
                    {product.originalPrice && (
                      <>
                        <span className="text-lg text-gray-500 line-through">
                          {product.originalPrice.toLocaleString()}₮
                        </span>
                        <span className="bg-red-100 text-red-700 text-sm font-bold px-2 py-0.5 rounded">
                          -{product.discount}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Тайлбар</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {product.descriptionMn}
                </p>
              </div>

              {/* Specifications */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Техникийн мэдээлэл</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-gray-500 w-32">{key}:</span>
                      <span className="text-gray-900 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Хэмжээ</h3>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      className="w-12 h-10 border border-gray-300 rounded hover:border-gray-900 text-sm font-medium transition-colors"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Actions */}
              <div className="mb-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center border border-gray-300 rounded">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <button className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-colors">
                      <ShoppingCart className="w-4 h-4" />
                      <span>Сагслах</span>
                    </button>
                  </div>
                </div>
                
                {/* Stock Status */}
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${product.inStock ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {product.inStock ? 'Бэлэн байгаа' : 'Дууссан'}
                </div>
              </div>

              {/* Features */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center text-gray-600">
                    <Truck className="w-4 h-4 mr-2" />
                    <span>Үнэгүй хүргэлт</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    <span>14 хоног буцаах</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Shield className="w-4 h-4 mr-2" />
                    <span>2 жил гарант</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Share2 className="w-4 h-4 mr-2" />
                    <span>Хуваалцах</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Холбоотой бүтээгдэхүүн</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                <div className="aspect-square bg-gray-100">
                  <img 
                    src={safeImgSrc(item.image)} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">{item.name}</h3>
                  <div className="text-base font-bold text-gray-900">
                    {item.price.toLocaleString()}₮
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Үнэлгээ ({product.reviews})</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((review) => (
              <div key={review} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Хэрэглэгч {review}</span>
                  </div>
                  <span className="text-xs text-gray-500">7 хоногийн өмнө</span>
                </div>
                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  Маш сайн бүтээгдэхүүн, чанартай материал ашигласан. Өвөлд зориулсан хамгийн сайн хүрэм.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {/* Fullscreen Zoom Modal */}
      {showZoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl h-full max-h-[90vh]">
            <button
              onClick={closeZoomModal}
              className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="w-full h-full flex flex-col lg:flex-row gap-6">
              {/* Zoomed Image in Modal */}
              <div className="flex-1 relative rounded-lg overflow-hidden">
                <img 
                  src={images[selectedImage]} 
                  alt={product.nameMn}
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Thumbnails in Modal */}
              <div className="lg:w-32 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 lg:w-full lg:h-20 rounded border overflow-hidden ${
                      selectedImage === idx 
                        ? 'border-white ring-2 ring-white' 
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.nameMn} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom cursor styles */}
      <style jsx>{`
        /* Hide default cursor when hovering image */
        .cursor-zoom-in {
          cursor: none;
        }
        
        /* Custom plus icon cursor */
        .custom-plus-cursor {
          cursor: none;
          position: fixed;
          pointer-events: none;
          z-index: 9999;
        }
      `}</style>
    </div>
  );
};

export default ProductDetailPage;