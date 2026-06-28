import type { Product } from "../types/product";

type ProductsResult = {
  products: Product[];
  error?: string;
};

type ProductResult = {
  product?: Product;
  error?: string;
};

const isProduct = (value: unknown): value is Product => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const product = value as Record<string, unknown>;

  return (
    typeof product.id === "string" &&
    typeof product.name === "string" &&
    typeof product.brand === "string" &&
    (product.type === undefined || typeof product.type === "string") &&
    typeof product.price === "number" &&
    typeof product.imageUrl === "string" &&
    typeof product.description === "string"
  );
};

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return "/api";
  }
  return process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, "") || "";
};

export async function getProducts(): Promise<ProductsResult> {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return {
      products: [],
      error: "NEXT_PUBLIC_API_GATEWAY_URL is not configured.",
    };
  }

  try {
    const response = await fetch(`${apiUrl}/products`, {
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      return {
        products: [],
        error: `Product API returned ${response.status}.`,
      };
    }

    const data: unknown = await response.json();
    const products = Array.isArray(data)
      ? data
      : data &&
          typeof data === "object" &&
          Array.isArray((data as { products?: unknown }).products)
        ? (data as { products: unknown[] }).products
        : undefined;

    if (!products) {
      return {
        products: [],
        error: "Product API returned an unexpected response.",
      };
    }

    return {
      products: products.filter(isProduct),
    };
  } catch {
    return {
      products: [],
      error: "Unable to load products right now.",
    };
  }
}

export async function getProduct(id: string): Promise<ProductResult> {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return {
      error: "NEXT_PUBLIC_API_GATEWAY_URL is not configured.",
    };
  }

  try {
    const response = await fetch(`${apiUrl}/products/${encodeURIComponent(id)}`, {
      next: {
        revalidate: 300,
      },
    });

    if (response.status === 404) {
      return {
        error: "Product not found.",
      };
    }

    if (!response.ok) {
      return {
        error: `Product API returned ${response.status}.`,
      };
    }

    const data: unknown = await response.json();
    const product = data && typeof data === "object"
      ? (data as { product?: unknown }).product
      : undefined;

    if (!isProduct(product)) {
      return {
        error: "Product API returned an unexpected response.",
      };
    }

    return {
      product,
    };
  } catch {
    return {
      error: "Unable to load this product right now.",
    };
  }
}
