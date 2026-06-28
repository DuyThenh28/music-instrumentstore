# AWS Serverless Migration Notes

## DynamoDB Single-Table Schema

Use one DynamoDB table for the MVP. The table already uses:

| Key | Type | Purpose |
| --- | --- | --- |
| `PK` | string | Entity partition key |
| `SK` | string | Entity sort key |

### Product Item

| Attribute | Example |
| --- | --- |
| `PK` | `PRODUCT#1` |
| `SK` | `METADATA` |
| `id` | `1` |
| `name` | `Yamaha YAS-280` |
| `brand` | `Yamaha` |
| `type` | `Alto Saxophone` |
| `price` | `35800000` |
| `imageUrl` | `https://bucket.s3.ap-southeast-1.amazonaws.com/images/yamaha-yas280.jpg` |
| `description` | Product summary |
| `createdAt` | ISO timestamp |
| `updatedAt` | ISO timestamp |

### Order Item

| Attribute | Example |
| --- | --- |
| `PK` | `ORDER#ord_1719320000000_abcd12` |
| `SK` | `METADATA` |
| `id` | `ord_1719320000000_abcd12` |
| `customer` | `{ "name": "...", "phone": "...", "address": "..." }` |
| `items` | Cart line items |
| `totalItems` | `2` |
| `totalPrice` | `71600000` |
| `paymentMethod` | `COD` |
| `status` | `PENDING` |
| `createdAt` | ISO timestamp |
| `updatedAt` | ISO timestamp |

This keeps the MVP simple. Add GSIs later only when you need access patterns such as "orders by user" or "products by category".

## API Gateway Configuration

REST API routes:

| Route | Lambda | Notes |
| --- | --- | --- |
| `GET /products` | `services/product-api` | Lists products |
| `GET /products/{id}` | `services/product-api` | Reads one product |
| `POST /orders` | `services/order-api` | Creates an order |

Enable CORS for `GET`, `POST`, and `OPTIONS`, and allow `Content-Type` plus `Authorization`. In production, replace `*` with the Amplify app domain.

## Required Environment Variables

Seed script:

| Name | Purpose |
| --- | --- |
| `TABLE_NAME` or `PRODUCTS_TABLE_NAME` | DynamoDB table |
| `AWS_REGION` or `AWS_DEFAULT_REGION` | AWS SDK region |
| `PRODUCT_IMAGE_BASE_URL` | S3 image base URL, for example `https://bucket.s3.ap-southeast-1.amazonaws.com` |
| `MOCK_DATA_PATH` | Optional path to product JSON. Defaults to `scripts/mock-data.json`, then `scripts/product-catalog.json` |

Frontend:

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API Gateway base URL with no trailing slash |

Amplify Hosting:

1. Set `NEXT_PUBLIC_API_URL` in the Amplify app environment variables.
2. Use the root `amplify.yml`.
3. Keep the app root as `frontend` for the monorepo build.
