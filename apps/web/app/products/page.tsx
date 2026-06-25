"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const products = [
  {
    id: 1,
    name: "Yamaha YAS-280",
    brand: "Yamaha",
    type: "Alto Saxophone",
    price: 35800000,
    image: "/images/yamaha-yas280.jpg",
  },
  {
    id: 2,
    name: "Selmer AS500",
    brand: "Selmer",
    type: "Alto Saxophone",
    price: 51000000,
    image: "/images/selmer-as500.jpg",
  },
  {
    id: 3,
    name: "Conn AS650",
    brand: "Conn",
    type: "Alto Saxophone",
    price: 12000000,
    image: "/images/conn-as650.jpg",
  },
  {
    id: 4,
    name: "Yamaha YTS-280",
    brand: "Yamaha",
    type: "Tenor Saxophone",
    price: 42000000,
    image: "/images/yamaha-yts280.jpg",
  },
  {
    id: 5,
    name: "Selmer TS400",
    brand: "Selmer",
    type: "Tenor Saxophone",
    price: 58000000,
    image: "/images/selmer-ts400.jpg",
  },
  {
    id: 6,
    name: "Jupiter JTS700",
    brand: "Jupiter",
    type: "Tenor Saxophone",
    price: 35000000,
    image: "/images/jupiter-jts700.jpg",
  },
  {
    id: 7,
    name: "Yamaha YSS475",
    brand: "Yamaha",
    type: "Soprano Saxophone",
    price: 56000000,
    image: "/images/yamaha-yss475.jpg",
  },
  {
    id: 8,
    name: "Yanagisawa S901",
    brand: "Yanagisawa",
    type: "Soprano Saxophone",
    price: 72000000,
    image: "/images/yanagisawa-s901.jpg",
  },
  {
    id: 9,
    name: "Jupiter JSS1000",
    brand: "Jupiter",
    type: "Soprano Saxophone",
    price: 39000000,
    image: "/images/jupiter-jss1000.jpg",
  },
  {
    id: 10,
    name: "Yamaha 4C Mouthpiece",
    brand: "Yamaha",
    type: "Mouthpiece",
    price: 1200000,
    image: "/images/yamaha-4c-mouthpiece.jpg",
  },
  {
    id: 11,
    name: "Selmer S80 Mouthpiece",
    brand: "Selmer",
    type: "Mouthpiece",
    price: 2500000,
    image: "/images/selmer-s80-mouthpiece.jpg",
  },
  {
    id: 12,
    name: "Vandoren AL3 Mouthpiece",
    brand: "Vandoren",
    type: "Mouthpiece",
    price: 2800000,
    image: "/images/vandoren-al3-mouthpiece.jpg",
  },
  {
    id: 13,
    name: "Dây Đeo Saxophone",
    brand: "Yamaha",
    type: "Phụ Kiện",
    price: 350000,
    image: "/images/day-deo-saxophone.jpg",
  },
  {
    id: 14,
    name: "Bộ Vệ Sinh Saxophone",
    brand: "Conn",
    type: "Phụ Kiện",
    price: 450000,
    image: "/images/bo-ve-sinh-saxophone.jpg",
  },
  {
    id: 15,
    name: "Reed Alto Saxophone",
    brand: "Vandoren",
    type: "Phụ Kiện",
    price: 250000,
    image: "/images/reed-alto-saxophone.jpg",
  },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim().toLowerCase() || "";

  const filteredProducts = products.filter((product) => {
    const name = product.name.toLowerCase();
    const brand = product.brand.toLowerCase();
    const type = product.type.toLowerCase();

    return (
      name.includes(q) ||
      brand.includes(q) ||
      type.includes(q)
    );
  });

  return (
    <main>
      <h1 className="section-title">
        {q ? `Kết quả tìm kiếm: ${q}` : "Danh Sách Sản Phẩm"}
      </h1>

      <section className="products">
        {filteredProducts.map((product) => (
          <div className="card" key={product.id}>
            <img src={product.image} alt={product.name} />

            <p className="product-type">{product.type}</p>

            <h3>{product.name}</h3>

            <p className="price">
              {product.price.toLocaleString("vi-VN")}đ
            </p>

            <Link href={`/product/${product.id}`}>
              <button>Xem Chi Tiết</button>
            </Link>
          </div>
        ))}
      </section>

      {filteredProducts.length === 0 && (
        <p className="no-product">
          Không tìm thấy sản phẩm phù hợp.
        </p>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  );
}
