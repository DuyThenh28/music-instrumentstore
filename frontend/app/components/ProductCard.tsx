"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import type { Product } from "../../types/product";

type ProductCardProps = {
  product: Product;
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addToCart({
      id: Number(product.id),
      name: product.name,
      price: currencyFormatter.format(product.price),
      image: product.imageUrl,
      quantity: 1,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  // Generate a mock random review count based on product ID safely
  const idNum = parseInt(String(product.id).replace(/\D/g, '')) || 0;
  const mockReviewCount = 12 + (idNum % 30);

  return (
    <article 
      className="relative flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-300 border border-gray-100 hover:border-[#DF9E47]/30 group"
      style={{ boxShadow: isHovered ? '0 10px 40px -10px rgba(223,158,71,0.15)' : 'none' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        href={`/product/${product.id}`} 
        className="block relative w-full bg-[#F3EFEA] overflow-hidden"
        style={{ paddingTop: '85%' }}
      >
        <div className="absolute inset-6 md:inset-8">
          <Image
            src={product.imageUrl || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        
        {/* Wishlist Heart */}
        <button 
          onClick={handleWishlist}
          className="absolute top-4 right-4 z-10 flex items-center justify-center transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? "#A36B2B" : "none"} stroke="#A36B2B" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </Link>

      <div className="p-5 flex flex-col flex-grow">
        <p className="text-[10px] font-bold text-[#A36B2B] tracking-widest uppercase mb-1.5">
          {product.brand}
        </p>

        <Link href={`/product/${product.id}`} className="block">
          <h3 className="font-serif text-[#002B1F] text-lg leading-snug font-semibold line-clamp-2 mb-2 group-hover:text-[#A36B2B] transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Mock Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex text-[#DF9E47]">
            {[...Array(4)].map((_, i) => (
              <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-50">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <span className="text-[11px] text-gray-500">({mockReviewCount} đánh giá)</span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <p className="text-[#A36B2B] font-bold text-lg">
            {currencyFormatter.format(product.price)}
          </p>
          
          <button 
            type="button" 
            onClick={handleAddToCart}
            className="w-10 h-10 rounded-lg bg-[#002B1F] flex items-center justify-center text-white hover:bg-[#054030] transition-colors"
            title="Thêm vào giỏ hàng"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-[9999] bg-[#002B1F] text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in-up">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DF9E47" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          <span className="font-medium text-sm">Đã thêm vào giỏ hàng!</span>
        </div>
      )}
    </article>
  );
}
