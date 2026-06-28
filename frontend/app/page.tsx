import Image from "next/image";
import Link from "next/link";

import { HomeProductBrowser } from "./components/HomeProductBrowser";
import { getProducts } from "../lib/products";

export default async function Home() {
  const { products, error } = await getProducts();
  const heroProduct = products[0];

  return (
    <main className="home-page">
      <section className="premium-hero">
        <div className="premium-content">
          <span className="hero-badge">Nhạc cụ chính hãng</span>

          <h1>NhomTTTN Music</h1>

          <p>
            Saxophone chất lượng cao, âm thanh chuẩn, bảo hành uy tín cho người
            mới học đến nghệ sĩ chuyên nghiệp.
          </p>

          <div className="hero-stats">
            <div>
              <strong>500+</strong>
              <span>Khách hàng</span>
            </div>

            <div>
              <strong>{products.length || "100+"}</strong>
              <span>Sản phẩm</span>
            </div>

            <div>
              <strong>4.9</strong>
              <span>Đánh giá</span>
            </div>

            <div>
              <strong>24 tháng</strong>
              <span>Bảo hành</span>
            </div>
          </div>

          <div className="hero-actions">
            <Link href="/products">
              <button className="primary-btn">Mua ngay</button>
            </Link>

            <Link href="/products">
              <button className="secondary-btn">Xem sản phẩm</button>
            </Link>
          </div>
        </div>

        {heroProduct ? (
          <div className="premium-image-box">
            <div className="glow"></div>
            <Image
              src={heroProduct.imageUrl}
              alt={heroProduct.name}
              width={640}
              height={640}
              className="premium-sax"
              priority
            />
          </div>
        ) : null}
      </section>

      {error ? <p className="product-status">{error}</p> : null}

      <HomeProductBrowser products={products} />
    </main>
  );
}
