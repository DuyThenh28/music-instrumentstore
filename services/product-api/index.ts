import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

type ProductItem = {
  PK?: string;
  SK?: string;
  id: string;
  name: string;
  brand: string;
  type?: string;
  price: number;
  imageUrl: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
};

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.TABLE_NAME;

const jsonResponse = (
  statusCode: number,
  body: unknown
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const stripTableKeys = (item: ProductItem) => {
  const { PK, SK, createdAt, updatedAt, ...product } = item;

  return product;
};

const getProductId = (path?: string, pathId?: string): string | undefined => {
  if (pathId) {
    return decodeURIComponent(pathId);
  }

  const match = path?.match(/^\/products\/([^/]+)$/);

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!tableName) {
      throw new Error("TABLE_NAME environment variable is not set");
    }

    if (event.httpMethod === "OPTIONS") {
      return jsonResponse(204, {});
    }

    const productId = getProductId(event.path, event.pathParameters?.id);

    // 1. GET requests
    if (event.httpMethod === "GET") {
      if (productId) {
        const result = await dynamoDb.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              PK: `PRODUCT#${productId}`,
              SK: "METADATA",
            },
          })
        );

        if (!result.Item) {
          return jsonResponse(404, { message: "Product not found" });
        }

        return jsonResponse(200, {
          product: stripTableKeys(result.Item as ProductItem),
        });
      }

      const items: ProductItem[] = [];
      let ExclusiveStartKey: Record<string, unknown> | undefined;

      do {
        const result = await dynamoDb.send(
          new ScanCommand({
            TableName: tableName,
            FilterExpression: "begins_with(#pk, :productPrefix)",
            ExpressionAttributeNames: {
              "#pk": "PK",
            },
            ExpressionAttributeValues: {
              ":productPrefix": "PRODUCT#",
            },
            ExclusiveStartKey,
          })
        );

        items.push(...((result.Items ?? []) as ProductItem[]));
        ExclusiveStartKey = result.LastEvaluatedKey;
      } while (ExclusiveStartKey);

      const products = items
        .map((item) => stripTableKeys(item))
        .sort((a, b) => Number(a.id) - Number(b.id));

      return jsonResponse(200, products);
    }

    // 2. POST request (Create Product)
    if (event.httpMethod === "POST") {
      if (!event.body) {
        return jsonResponse(400, { message: "Invalid request: Missing body" });
      }

      const body = JSON.parse(event.body) as ProductItem;
      const { id, name, brand, type, price, imageUrl, description } = body;

      if (!id || !name || !brand || typeof price !== "number" || !imageUrl || !description) {
        return jsonResponse(400, { message: "Missing required fields" });
      }

      const now = new Date().toISOString();
      const newItem: ProductItem = {
        PK: `PRODUCT#${id}`,
        SK: "METADATA",
        id,
        name,
        brand,
        type,
        price,
        imageUrl,
        description,
        createdAt: now,
        updatedAt: now,
      };

      await dynamoDb.send(
        new PutCommand({
          TableName: tableName,
          Item: newItem,
        })
      );

      return jsonResponse(201, stripTableKeys(newItem));
    }

    // 3. PUT request (Update Product)
    if (event.httpMethod === "PUT") {
      if (!productId) {
        return jsonResponse(400, { message: "Missing product ID in path" });
      }

      if (!event.body) {
        return jsonResponse(400, { message: "Invalid request: Missing body" });
      }

      const body = JSON.parse(event.body) as Partial<ProductItem>;
      
      // Get existing product to update
      const existing = await dynamoDb.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: `PRODUCT#${productId}`,
            SK: "METADATA",
          },
        })
      );

      if (!existing.Item) {
        return jsonResponse(404, { message: "Product not found" });
      }

      const now = new Date().toISOString();
      const updatedItem: ProductItem = {
        ...(existing.Item as ProductItem),
        ...body,
        PK: `PRODUCT#${productId}`,
        SK: "METADATA",
        id: productId,
        updatedAt: now,
      };

      await dynamoDb.send(
        new PutCommand({
          TableName: tableName,
          Item: updatedItem,
        })
      );

      return jsonResponse(200, stripTableKeys(updatedItem));
    }

    // 4. DELETE request (Delete Product)
    if (event.httpMethod === "DELETE") {
      if (!productId) {
        return jsonResponse(400, { message: "Missing product ID in path" });
      }

      await dynamoDb.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `PRODUCT#${productId}`,
            SK: "METADATA",
          },
        })
      );

      return jsonResponse(200, { message: "Product deleted successfully" });
    }

    return jsonResponse(405, { message: "Method Not Allowed" });
  } catch (error) {
    console.error("Product API handler failed", {
      error,
      requestId: event.requestContext.requestId,
      path: event.path,
      method: event.httpMethod,
    });

    return jsonResponse(500, { message: "Internal Server Error" });
  }
};
