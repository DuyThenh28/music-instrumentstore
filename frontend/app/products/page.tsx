import Image from "next/image";
import Link from "next/link";

import { getProducts } from "../../lib/products";

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
  }>;
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const getQuery = async (searchParams?: ProductsPageProps["searchParams"]) => {
  const params = searchParams ? await searchParams : {};
  const value = params.q;
  const rawQuery = Array.isArray(value) ? value[0] : value;

  return rawQuery?.trim().toLowerCase() ?? "";
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const [{ products, error }, query] = await Promise.all([
    getProducts(),
    getQuery(searchParams),
  ]);

  const filteredProducts = products.filter((product) => {
    if (!query) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );
  });

  return (
    <main className="product-listing-page">
      <h1 className="section-title">
        {query ? `Kết quả tìm kiếm: ${query}` : "Danh Sách Sản Phẩm"}
      </h1>

      {error ? <p className="product-status">{error}</p> : null}

      {!error && filteredProducts.length === 0 ? (
        <p className="product-status">Không tìm thấy sản phẩm phù hợp.</p>
      ) : null}

      <section className="products" aria-label="Danh sách sản phẩm">
        {filteredProducts.map((product) => (
          <article className="card" key={product.id}>
            <Link href={`/product/${product.id}`} className="product-card-image">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={420}
                height={320}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            </Link>

            <p className="product-type">{product.brand}</p>

            <h3>{product.name}</h3>

            <p className="product-description">{product.description}</p>

            <p className="price">{currencyFormatter.format(product.price)}</p>

            <button type="button">Thêm vào giỏ hàng</button>
          </article>
        ))}
      </section>
    </main>
  );
}
