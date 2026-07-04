import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "../components/product/ProductCard";
import { getProducts } from "../../lib/products";
import HomeRedirect from "../components/common/HomeRedirect";

export default async function Home() {
  const { products, error } = await getProducts();
  const categories = Array.from(
    new Set(products.map((p) => p.type).filter(Boolean))
  ) as string[];
  const brandsData = [
    { name: "Yamaha", slogan: "SOUND. PASSION. PERFECTION." },
    { name: "Selmer", slogan: "LEGENDARY SINCE 1885" },
    { name: "Conn", slogan: "INNOVATION IN EVERY NOTE" },
    { name: "Yanagisawa", slogan: "MASTERPIECE OF JAPAN" },
    { name: "Jupiter", slogan: "PLAY. INSPIRE. CREATE." }
  ];
  const featuredProducts = products.slice(0, 4);
  const bucketName = process.env.S3_BUCKET_NAME || "cdk-hnb659fds-assets-112613858653-ap-southeast-1";
  const s3BaseUrl = `https://${bucketName}.s3.ap-southeast-1.amazonaws.com`;

  return (
    <main>
      <HomeRedirect />

      {/* HERO */}
      <section className="hero-section">
        <div className="container grid grid-2 items-center gap-8">
          <div>
            <h1>Aureate Forest</h1>
            <p className="text-lg hero-subtitle">
              Saxophone chất lượng cao, âm thanh chuẩn, bảo hành uy tín cho người mới học đến nghệ sĩ chuyên nghiệp.
            </p>
            <div className="hero-buttons">
              <Link href="/products" className="btn-secondary">Mua ngay</Link>
              <Link href="/products" className="btn-outline btn-outline-light">Xem sản phẩm</Link>
            </div>
          </div>
          <div className="hero-image">
            {/* Hero image placeholder */}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section>
        <div className="container">
          <h2 className="text-center mb-8">Danh Mục Sản Phẩm</h2>
          <div className="grid grid-4">
            {categories.map((cat) => {
              const product = products.find((p) => p.type === cat);
              return (
                <Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`} className="card">
                  <div className="card-image">
                    {product && (
                      <Image src={product.imageUrl} alt={cat} width={200} height={200} />
                    )}
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{cat}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* BRANDS */}
      <section>
        <div className="container">
          <h2 className="text-center mb-8">Thương Hiệu Nổi Bật</h2>
          <div className="grid grid-4">
            {brandsData.map((brand) => (
              <Link key={brand.name} href={`/products?brand=${encodeURIComponent(brand.name)}`} className="card">
                <div className="card-image">
                  <Image
                    src={`${s3BaseUrl}/logos/${brand.name.toLowerCase()}-logo.png`}
                    alt={`${brand.name} logo`}
                    width={140}
                    height={60}
                  />
                </div>
                <div className="card-content">
                  <p className="text-sm brand-slogan">{brand.slogan}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section>
        <div className="container">
          <h2 className="text-center mb-8">Sản Phẩm Nổi Bật</h2>
          {error ? (
            <p className="text-center error-text">{error}</p>
          ) : (
            <>
              <div className="grid grid-4 mb-4">
                {featuredProducts.length > 0 ? (
                  featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <p className="text-center error-text">Không có sản phẩm nào nổi bật.</p>
                )}
              </div>
              <div className="text-center mt-8">
                <Link href="/products" className="btn-outline">
                  XEM TẤT CẢ SẢN PHẨM
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
