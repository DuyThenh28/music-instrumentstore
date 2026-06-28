"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "../../context/CartContext";
import type { Product } from "../../../types/product";

type ProductDetailClientProps = {
  product: Product;
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = () => {
    addToCart({
      id: Number(product.id),
      name: product.name,
      price: currencyFormatter.format(product.price),
      image: product.imageUrl,
      quantity: 1,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2200);
  };

  return (
    <main className="product-detail-page">
      <section className="yamaha-style-detail">
        <h1 className="yamaha-product-title">{product.name}</h1>

        <div className="yamaha-detail-layout">
          <div className="yamaha-left">
            <div className="yamaha-main-image">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={640}
                height={640}
                priority
              />
            </div>
          </div>

          <div className="yamaha-right">
            <div className="yamaha-tab-content">
              <p className="product-detail-type">{product.type ?? product.brand}</p>
              <h2>{product.name}</h2>
              <p className="product-detail-price">
                {currencyFormatter.format(product.price)}
              </p>
              <p className="product-detail-desc">{product.description}</p>

              <div className="product-detail-meta">
                <p>
                  <strong>Thương hiệu:</strong> {product.brand}
                </p>
                {product.type ? (
                  <p>
                    <strong>Loại sản phẩm:</strong> {product.type}
                  </p>
                ) : null}
                <p>
                  <strong>Tình trạng:</strong> Còn hàng
                </p>
              </div>
            </div>

            <div className="product-detail-actions">
              <button onClick={handleAddToCart}>Thêm Vào Giỏ Hàng</button>

              <Link href="/products">
                <button className="back-btn">Quay Lại</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {showSuccess ? (
        <div className="cart-success-toast">
          Đã thêm {product.name} vào giỏ hàng.
        </div>
      ) : null}
    </main>
  );
}
