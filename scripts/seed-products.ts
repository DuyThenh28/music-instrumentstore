const fs = require("node:fs") as typeof import("node:fs");
const path = require("node:path") as typeof import("node:path");
const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb") as typeof import("@aws-sdk/client-dynamodb");
const {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} = require("@aws-sdk/lib-dynamodb") as typeof import("@aws-sdk/lib-dynamodb");

type ProductSeed = {
  id: string | number;
  name: string;
  brand: string;
  type: string;
  price: number;
  imagePath?: string;
  image?: string;
  imageUrl?: string;
  description: string;
};

type ProductItem = {
  PK: string;
  SK: "METADATA";
  id: string;
  name: string;
  brand: string;
  type: string;
  price: number;
  imageUrl: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

type BatchWriteRequest = {
  PutRequest: {
    Item: ProductItem;
  };
};

const repoRoot = path.resolve(__dirname, "..");
const envFiles = [
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, "frontend", ".env.local"),
];

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");

    process.env[key] ??= value;
  }
};

envFiles.forEach(loadEnvFile);

const tableName = (process.env.PRODUCTS_TABLE_NAME ?? process.env.TABLE_NAME) as string;
const awsRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const imageBaseUrl = process.env.PRODUCT_IMAGE_BASE_URL;

const defaultMockDataPath = fs.existsSync(path.join(repoRoot, "scripts", "mock-data.json"))
  ? path.join(repoRoot, "scripts", "mock-data.json")
  : path.join(repoRoot, "scripts", "product-catalog.json");

const mockDataPath = path.resolve(
  repoRoot,
  process.env.MOCK_DATA_PATH ?? defaultMockDataPath
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isProductSeed = (value: unknown): value is ProductSeed => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (typeof value.id === "string" || typeof value.id === "number") &&
    typeof value.name === "string" &&
    typeof value.brand === "string" &&
    typeof value.type === "string" &&
    typeof value.price === "number" &&
    typeof value.description === "string" &&
    (typeof value.imagePath === "string" ||
      typeof value.image === "string" ||
      typeof value.imageUrl === "string")
  );
};

const readProducts = (): ProductSeed[] => {
  const raw = fs.readFileSync(mockDataPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  const products = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.products)
      ? parsed.products
      : undefined;

  if (!products) {
    throw new Error(
      `Expected ${mockDataPath} to contain a product array or { "products": [...] }.`
    );
  }

  const invalidIndex = products.findIndex((product) => !isProductSeed(product));

  if (invalidIndex !== -1) {
    throw new Error(`Invalid product at index ${invalidIndex} in ${mockDataPath}.`);
  }

  return products;
};

const toImageUrl = (product: ProductSeed) => {
  const source = product.imageUrl ?? product.imagePath ?? product.image;

  if (!source) {
    throw new Error(`Product ${product.id} is missing an image path.`);
  }

  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  if (!imageBaseUrl) {
    throw new Error("PRODUCT_IMAGE_BASE_URL is required for local image paths.");
  }

  return `${imageBaseUrl.replace(/\/$/, "")}/${source.replace(/^\//, "")}`;
};

const chunkItems = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const writeBatch = async (
  client: import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient,
  requests: BatchWriteRequest[]
) => {
  let requestItems: Record<string, BatchWriteRequest[]> = {
    [tableName]: requests,
  };

  do {
    const result = await client.send(
      new BatchWriteCommand({
        RequestItems: requestItems,
      })
    );

    requestItems =
      (result.UnprocessedItems as Record<string, BatchWriteRequest[]>) ?? {};
  } while (Object.keys(requestItems).length > 0);
};

const seedProducts = async () => {
  if (!tableName) {
    throw new Error("PRODUCTS_TABLE_NAME or TABLE_NAME is required.");
  }

  if (!awsRegion) {
    throw new Error("AWS_REGION or AWS_DEFAULT_REGION is required.");
  }

  const now = new Date().toISOString();
  const products = readProducts();
  const items: ProductItem[] = products.map((product) => {
    const id = String(product.id);

    return {
      PK: `PRODUCT#${id}`,
      SK: "METADATA",
      id,
      name: product.name,
      brand: product.brand,
      type: product.type,
      price: product.price,
      imageUrl: toImageUrl(product),
      description: product.description,
      createdAt: now,
      updatedAt: now,
    };
  });

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: awsRegion })
  );

  console.log(`Seeding ${items.length} products from ${mockDataPath} into ${tableName}...`);

  for (const chunk of chunkItems(items, 25)) {
    await writeBatch(
      client,
      chunk.map((Item) => ({
        PutRequest: {
          Item,
        },
      }))
    );
  }

  console.log(`Successfully seeded ${items.length} products into ${tableName}.`);
};

seedProducts().catch((error) => {
  console.error(
    `Failed to seed products: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
});

export {};
