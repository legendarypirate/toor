"use client";

import { Product, ProductVariation } from "../lib/types";
import { useState, useEffect } from "react";
import { firstNonEmptyImg, safeImgSrc } from "../lib/imageSrc";

interface ProductCardProps {
  product: Product;
  layout?: "grid" | "list";
  className?: string;
  selectedVariantId?: string; 
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  layout = "grid",
  className = "",
  selectedVariantId,
}) => {
  // -------------------------
  // 1) Get selected variant
  // -------------------------
  const selectedVariant: ProductVariation | undefined =
    product.variations?.find((v) => v.id === selectedVariantId) ??
    product.variations?.[0]; // Default variant

  // -------------------------
  // 2) Select base values
  // -------------------------
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayOriginal = selectedVariant?.originalPrice ?? product.originalPrice;
  const displayName = selectedVariant?.nameMn ?? product.name;

  // -------------------------
  // 3) Select best image
  // -------------------------
  const displayImages =
    selectedVariant?.images?.length && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.images;

  const fallbackImage = product.thumbnail;
  const firstImage = firstNonEmptyImg(
    displayImages?.[0],
    fallbackImage,
    product.images?.[0]
  );

  const [imageUrl, setImageUrl] = useState(firstImage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolved = firstNonEmptyImg(firstImage, fallbackImage, product.images?.[0]);
    const img = new Image();
    img.onload = () => {
      setImageUrl(safeImgSrc(resolved));
      setLoading(false);
    };
    img.onerror = () => {
      setImageUrl(safeImgSrc(fallbackImage));
      setLoading(false);
    };
    img.src = resolved;
  }, [firstImage, fallbackImage, product.images]);

  // -------------------------
  //  LIST VIEW REMAINS SAME
  // -------------------------
  if (layout === "list") {
    return <div>/** your same list layout code here **/</div>;
  }

  // -------------------------
  //  GRID VIEW
  // -------------------------
  return (
    <div
      className={`group bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 h-full flex flex-col ${className}`}
    >
      {/* IMAGE */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
            -{product.discount}%
          </div>
        )}

        {loading ? (
          <div className="w-full h-full flex items-center justify-center animate-pulse">
            <div className="w-10 h-10 bg-gray-300 rounded-md"></div>
          </div>
        ) : (
          <img
            src={safeImgSrc(imageUrl)}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>

      {/* CONTENT */}
      <div className="p-3 flex flex-col flex-1">
        {product.brand && (
          <span className="text-xs text-blue-600 font-medium mb-1">
            {product.brand}
          </span>
        )}
        {!product.brand && <div className="mb-1 h-4"></div>}

        <h3 className="text-sm text-gray-900 font-medium mb-1.5 line-clamp-2 h-10">
          {displayName}
        </h3>

        {/* PRICE */}
        <div className="mt-auto">
          <span className="text-base font-bold text-gray-900">
            {displayPrice.toLocaleString()}₮
          </span>

          {displayOriginal && displayOriginal > displayPrice && (
            <span className="ml-1 text-xs text-gray-500 line-through">
              {displayOriginal.toLocaleString()}₮
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
