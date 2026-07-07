# Avatar + File-Picker Image Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can upload a real avatar image (file picker, not a URL text box), and admins can upload a product's cover image the same way — both backed by S3 presigned uploads, mirroring the existing review-image upload pattern.

**Architecture:** Two independent upload targets share one frontend component. Backend: two new presigned-POST routes in `services/product-api` (`POST /users/profile/avatar-upload-url` for the user's own avatar, `POST /products/{id}/image-upload-url` for admin product images), both modeled directly on the existing `POST /products/{id}/ratings/upload-url` route. The self-service `/users/profile` PUT is changed to merge with the existing DynamoDB record instead of overwriting it, so uploading only an avatar doesn't wipe name/phone/address (and vice versa). Frontend: one reusable `ImagePicker` component (file input + preview + upload-to-S3-via-presigned-POST), used on the profile page and in the admin product modal, each pointed at its own upload route via a prop.

**Tech Stack:** TypeScript, AWS Lambda, `@aws-sdk/client-s3` / `@aws-sdk/s3-presigned-post` (already a dependency), Next.js API routes (proxy pattern already used throughout `frontend/app/api/*`), React 19 client components, Jest + ts-jest + `aws-sdk-client-mock` (already wired up in `services/product-api` from a prior plan).

## Global Constraints

- This is section C of `docs/superpowers/specs/2026-07-07-account-ux-chatbot-upgrade-design.md`.
- Reuse the existing allow-list/size-limit constants already defined in `services/product-api/index.ts`: `REVIEW_IMAGE_ALLOWED_TYPES` (jpeg/png/webp) and `REVIEW_IMAGE_MAX_BYTES` (5MB) — do not redefine new ones for avatars/product images, despite the "REVIEW_IMAGE" naming (renaming them repo-wide is out of scope here).
- S3 key convention (per prior decision): avatars go under `users/{userId}/profile/{uuid}.ext`; product images go under `products/{productId}/{uuid}.ext`.
- `ProductRecord.imageUrl` / `Product.imageUrl` keep their existing shape (a plain string URL) — only the input UX changes for admins, no schema change on the product side.
- **Frontend has no test runner configured anywhere in the repo** (`@playwright/test` is an installed-but-unused devDependency; zero `*.test.ts`/`*.spec.ts` files exist under `frontend/`). This plan does not introduce one — that's a separate decision for the user to make, out of scope here. Frontend tasks are verified via `npx tsc --noEmit` (frontend `tsconfig.json` has `"strict": true`) and `npm run lint --workspace=@music-store/web`, plus an explicit manual browser-verification step, instead of automated tests. Backend tasks (`services/product-api`) do get real Jest tests, following the infra already set up in `services/product-api/jest.config.js`/`tsconfig.json` from a prior plan — no new test tooling needed there, just new test files.
- CDK changes in this plan (`infrastructure/lib/backend-stack.ts`) are verified with `npx tsc --noEmit` / `npx cdk synth` only. **Do not run `cdk deploy`** — deploying is a separate, explicit, human-triggered action outside this plan's scope (it affects live AWS infrastructure).
- `services/product-api/index.js` is a committed esbuild bundle that must be rebuilt after any `index.ts` change in this plan, via: `npx esbuild services/product-api/index.ts --bundle --platform=node --target=node22 --external:@aws-sdk/* --outfile=services/product-api/index.js` (same command the root `build:lambdas` script uses). Jest resolves `.ts` before `.js` already (`moduleFileExtensions` override from the prior plan), so this rebuild doesn't affect test correctness, but keeps the deployable artifact in sync with source.

---

## Task 1: Shared type + avatar presigned-upload backend route

**Files:**
- Modify: `packages/shared-types/index.ts`
- Modify: `services/product-api/index.ts` (add a new route block; exact insertion point given in Step 3 below)
- Modify: `services/product-api/tests/env.setup.ts`
- Create: `services/product-api/tests/avatarUpload.test.ts`
- Modify: `infrastructure/lib/backend-stack.ts`

**Interfaces:**
- Produces: `UserProfile.avatarUrl?: string` field, consumed by Task 2 and by frontend Tasks 6-7.
- Produces: `POST /users/profile/avatar-upload-url` route, consumed by Task 3 (frontend proxy) and Task 7 (profile page wiring).

- [ ] **Step 1: Add `avatarUrl` to the shared `UserProfile` type**

Edit `packages/shared-types/index.ts` — add `avatarUrl?: string;` to the existing `UserProfile` interface:

```ts
export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  avatarUrl?: string;
  role?: "Admin" | "Staff" | "User";
  updatedAt?: string;
}
```

- [ ] **Step 2: Add `BUCKET_NAME` to the test env setup**

Edit `services/product-api/tests/env.setup.ts` to add one line (keep the three existing lines):

```ts
process.env.TABLE_NAME = "test-table";
process.env.USER_POOL_ID = "test-pool";
process.env.AWS_REGION = "ap-southeast-1";
process.env.BUCKET_NAME = "test-bucket";
```

- [ ] **Step 3: Write the failing tests**

Create `services/product-api/tests/avatarUpload.test.ts`:

```ts
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";

jest.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: jest.fn(),
}));

const mockCreatePresignedPost = createPresignedPost as jest.Mock;

function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    resource: "/users/profile/avatar-upload-url",
    httpMethod: "POST",
    path: "/users/profile/avatar-upload-url",
    pathParameters: null,
    body: JSON.stringify({ fileType: "image/jpeg" }),
    requestContext: {
      authorizer: {
        claims: {
          sub: "user-1",
          email: "user1@example.com",
        },
      },
    },
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

beforeEach(() => {
  mockCreatePresignedPost.mockReset();
  mockCreatePresignedPost.mockResolvedValue({
    url: "https://test-bucket.s3.amazonaws.com/",
    fields: { key: "mock-key", "Content-Type": "image/jpeg" },
  });
});

describe("POST /users/profile/avatar-upload-url", () => {
  it("returns 401 when not authenticated", async () => {
    const result = await handler(
      buildEvent({ requestContext: { authorizer: undefined } as any }),
      {} as Context,
      () => {}
    );
    expect(result!.statusCode).toBe(401);
  });

  it("rejects an unsupported file type", async () => {
    const result = await handler(
      buildEvent({ body: JSON.stringify({ fileType: "image/gif" }) }),
      {} as Context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
  });

  it("returns a presigned upload URL keyed under users/{userId}/profile/", async () => {
    const result = await handler(buildEvent(), {} as Context, () => {});

    expect(result!.statusCode).toBe(200);
    const body = JSON.parse(result!.body);
    expect(body.uploadUrl).toBe("https://test-bucket.s3.amazonaws.com/");
    expect(mockCreatePresignedPost).toHaveBeenCalledTimes(1);

    const presignArgs = mockCreatePresignedPost.mock.calls[0][1];
    expect(presignArgs.Key).toMatch(/^users\/user-1\/profile\/.+\.jpg$/);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test --workspace=services/product-api -- avatarUpload`
Expected: FAIL — no route matches `/users/profile/avatar-upload-url` yet, so the handler falls through to the existing 405 response instead of 401/400/200.

- [ ] **Step 5: Add the route to `services/product-api/index.ts`**

Insert this new block immediately after the closing `}` of the existing `if (resource === "/users/profile") { ... }` block (search for that block — it contains the `GET`/`PUT` handlers for `/users/profile` — and add this right after it, before the `// Route: /users/orders` comment):

```ts
    // -------------------------------------------------------------
    // Route: /users/profile/avatar-upload-url (sinh presigned POST để upload ảnh đại diện)
    // -------------------------------------------------------------
    if (resource === "/users/profile/avatar-upload-url" && method === "POST") {
      if (!userId) {
        return jsonResponse(401, { message: "Unauthorized: Chưa đăng nhập" });
      }
      if (!bucketName) {
        return jsonResponse(500, { message: "BUCKET_NAME environment variable is not set" });
      }
      if (!event.body) {
        return jsonResponse(400, { message: "Missing request body" });
      }

      const { fileType } = JSON.parse(event.body);
      const extension = REVIEW_IMAGE_ALLOWED_TYPES[fileType];
      if (!extension) {
        return jsonResponse(400, {
          message: "Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG hoặc WEBP.",
        });
      }

      const key = `users/${userId}/profile/${randomUUID()}.${extension}`;

      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: bucketName,
        Key: key,
        Conditions: [
          ["content-length-range", 1, REVIEW_IMAGE_MAX_BYTES],
          ["eq", "$Content-Type", fileType],
        ],
        Fields: {
          "Content-Type": fileType,
        },
        Expires: 60,
      });

      return jsonResponse(200, {
        uploadUrl: url,
        fields,
        publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        maxSizeBytes: REVIEW_IMAGE_MAX_BYTES,
      });
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test --workspace=services/product-api -- avatarUpload`
Expected: PASS (3 tests). Also run `npm test --workspace=services/product-api` (full suite) to confirm nothing else broke.

- [ ] **Step 7: Add the CDK route**

Edit `infrastructure/lib/backend-stack.ts` — immediately after the existing `/users/profile` PUT method registration (the block that ends with the second `profileResource.addMethod("PUT", ...)` call, right before the `// Route: /users/orders` comment), add:

```ts
    // Route: /users/profile/avatar-upload-url (sinh presigned POST để upload ảnh đại diện)
    const avatarUploadUrlResource = profileResource.addResource("avatar-upload-url");
    avatarUploadUrlResource.addMethod(
      "POST",
      productApiIntegration,
      authorizer ? {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      } : undefined
    );
```

- [ ] **Step 8: Verify the CDK change type-checks**

Run: `cd infrastructure && npx tsc --noEmit`
Expected: no errors, exit code 0. Do not run `cdk deploy` or `cdk synth` against a real account.

- [ ] **Step 9: Rebuild the committed esbuild bundle**

Run: `npx esbuild services/product-api/index.ts --bundle --platform=node --target=node22 --external:@aws-sdk/* --outfile=services/product-api/index.js`
Expected: builds successfully, no errors.

- [ ] **Step 10: Commit**

```bash
git add packages/shared-types/index.ts services/product-api infrastructure/lib/backend-stack.ts
git commit -m "feat(product-api): add avatar presigned-upload route"
```

---

## Task 2: `/users/profile` GET/PUT — persist `avatarUrl` without wiping other fields on partial updates

**Files:**
- Modify: `services/product-api/index.ts` (the `/users/profile` GET/PUT block)
- Create: `services/product-api/tests/userProfile.test.ts`

**Interfaces:**
- Consumes: `UserProfile` type from Task 1 (now includes `avatarUrl?: string`).
- Produces: no new exports — same route, extended response/request shape.

**Why this task exists:** the current self-service `PUT /users/profile` builds its DynamoDB item purely from the request body (`name: body.name || ""`, etc.) with no read-before-write — every save overwrites every field. That's harmless today because the profile form always submits `name`+`phone`+`address` together. Once avatar upload becomes its own action (Task 7 sends `PUT { avatarUrl }` alone, right after the S3 upload completes), a naive `body.avatarUrl || ""` would silently erase `name`/`phone`/`address` on every avatar upload, and a plain profile-form save would erase `avatarUrl`. Fix: read the existing item first and merge, the same pattern already used by the admin `PUT /users/{userId}` handler elsewhere in this file.

- [ ] **Step 1: Write the failing tests**

Create `services/product-api/tests/userProfile.test.ts`:

```ts
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";

const ddbMock = mockClient(DynamoDBDocumentClient);

function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    resource: "/users/profile",
    httpMethod: "PUT",
    path: "/users/profile",
    pathParameters: null,
    body: JSON.stringify({}),
    requestContext: {
      authorizer: {
        claims: {
          sub: "user-1",
          email: "user1@example.com",
        },
      },
    },
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

beforeEach(() => {
  ddbMock.reset();
});

describe("PUT /users/profile", () => {
  it("uploading only an avatar does not wipe out the existing name/phone/address", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: "USER#user-1",
        SK: "PROFILE",
        userId: "user-1",
        email: "user1@example.com",
        name: "Nguyen Van A",
        phone: "0900000000",
        address: "123 Main St",
      },
    });
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(
      buildEvent({ body: JSON.stringify({ avatarUrl: "https://bucket.s3.amazonaws.com/users/user-1/profile/x.jpg" }) }),
      {} as Context,
      () => {}
    );

    expect(result!.statusCode).toBe(200);
    const { profile } = JSON.parse(result!.body);
    expect(profile.name).toBe("Nguyen Van A");
    expect(profile.phone).toBe("0900000000");
    expect(profile.address).toBe("123 Main St");
    expect(profile.avatarUrl).toBe("https://bucket.s3.amazonaws.com/users/user-1/profile/x.jpg");
  });

  it("saving name/phone/address does not wipe out an existing avatarUrl", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        PK: "USER#user-1",
        SK: "PROFILE",
        userId: "user-1",
        email: "user1@example.com",
        name: "Old Name",
        phone: "",
        address: "",
        avatarUrl: "https://bucket.s3.amazonaws.com/users/user-1/profile/existing.jpg",
      },
    });
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(
      buildEvent({ body: JSON.stringify({ name: "New Name", phone: "0911111111", address: "456 Side St" }) }),
      {} as Context,
      () => {}
    );

    expect(result!.statusCode).toBe(200);
    const { profile } = JSON.parse(result!.body);
    expect(profile.name).toBe("New Name");
    expect(profile.avatarUrl).toBe("https://bucket.s3.amazonaws.com/users/user-1/profile/existing.jpg");
  });

  it("GET returns avatarUrl: \"\" in the default profile when none exists yet", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handler(
      buildEvent({ httpMethod: "GET", body: null }),
      {} as Context,
      () => {}
    );

    expect(result!.statusCode).toBe(200);
    const { profile } = JSON.parse(result!.body);
    expect(profile.avatarUrl).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace=services/product-api -- userProfile`
Expected: FAIL — the first two tests fail because `PUT` currently never reads the existing item (no `GetCommand` call expected by the handler before its `PutCommand`, so the merge never happens and fields not in the body come back as `""`); the third fails because the default GET profile object has no `avatarUrl` key.

- [ ] **Step 3: Fix the GET default profile and the PUT merge logic**

Modify `services/product-api/index.ts`'s `if (resource === "/users/profile")` block — replace the whole block with:

```ts
    if (resource === "/users/profile") {
      if (!userId) {
        return jsonResponse(401, { message: "Unauthorized: Chưa đăng nhập" });
      }

      if (method === "GET") {
        const result = await dynamoDb.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              PK: `USER#${userId}`,
              SK: "PROFILE",
            },
          })
        );

        if (!result.Item) {
          // Trả về profile mặc định nếu chưa khởi tạo
          return jsonResponse(200, {
            profile: {
              userId,
              email: email || "",
              name: userName !== "User" ? userName : "",
              phone: "",
              address: "",
              avatarUrl: "",
            },
          });
        }

        return jsonResponse(200, { profile: stripTableKeys(result.Item) });
      }

      if (method === "PUT") {
        if (!event.body) {
          return jsonResponse(400, { message: "Missing body" });
        }

        const body = JSON.parse(event.body);
        const now = new Date().toISOString();

        // Đọc profile hiện có trước khi ghi đè, để một hành động chỉ đổi 1 field (vd. chỉ
        // upload avatar) không xoá mất các field khác chưa gửi kèm trong body lần này.
        const getRes = await dynamoDb.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              PK: `USER#${userId}`,
              SK: "PROFILE",
            },
          })
        );
        const existing = getRes.Item || {};

        const updatedProfile: UserProfile = {
          userId,
          email: email || body.email || existing.email || "",
          name: body.name ?? existing.name ?? "",
          phone: body.phone ?? existing.phone ?? "",
          address: body.address ?? existing.address ?? "",
          avatarUrl: body.avatarUrl ?? existing.avatarUrl ?? "",
          updatedAt: now,
        };

        await dynamoDb.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              PK: `USER#${userId}`,
              SK: "PROFILE",
              ...updatedProfile,
            },
          })
        );

        return jsonResponse(200, { profile: updatedProfile });
      }
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=services/product-api -- userProfile`
Expected: PASS (3 tests). Also run `npm test --workspace=services/product-api` (full suite) to confirm nothing regressed.

- [ ] **Step 5: Rebuild the committed esbuild bundle**

Run: `npx esbuild services/product-api/index.ts --bundle --platform=node --target=node22 --external:@aws-sdk/* --outfile=services/product-api/index.js`

- [ ] **Step 6: Commit**

```bash
git add services/product-api
git commit -m "fix(product-api): merge /users/profile updates instead of overwriting, add avatarUrl"
```

---

## Task 3: Frontend proxy route for avatar upload

**Files:**
- Create: `frontend/app/api/users/profile/avatar-upload-url/route.ts`

**Interfaces:**
- Consumes: `POST /users/profile/avatar-upload-url` backend route from Task 1.
- Produces: `POST /api/users/profile/avatar-upload-url` (Next.js API route), consumed by Task 7 (profile page).

- [ ] **Step 1: Create the proxy route**

This mirrors the existing proxy pattern used by every other route under `frontend/app/api/*` (e.g. `frontend/app/api/products/[id]/ratings/upload-url/route.ts`). Create `frontend/app/api/users/profile/avatar-upload-url/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, "");
    if (!apiGatewayUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_GATEWAY_URL is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const authHeader = req.headers.get("Authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(`${apiGatewayUrl}/users/profile/avatar-upload-url`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || `API Gateway returned status ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST /api/users/profile/avatar-upload-url error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/users/profile/avatar-upload-url/route.ts
git commit -m "feat(frontend): add proxy route for avatar upload URL"
```

---

## Task 4: Backend — product cover-image presigned-upload route (admin/staff only)

**Files:**
- Modify: `services/product-api/index.ts` (add a new route block; insertion point given in Step 3)
- Create: `services/product-api/tests/productImageUpload.test.ts`
- Modify: `infrastructure/lib/backend-stack.ts`

**Interfaces:**
- Produces: `POST /products/{id}/image-upload-url` route, consumed by Task 5 (frontend proxy) and Task 8 (admin product modal wiring).

- [ ] **Step 1: Write the failing tests**

Create `services/product-api/tests/productImageUpload.test.ts`:

```ts
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";

jest.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: jest.fn(),
}));

const mockCreatePresignedPost = createPresignedPost as jest.Mock;

function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    resource: "/products/{id}/image-upload-url",
    httpMethod: "POST",
    path: "/products/24/image-upload-url",
    pathParameters: { id: "24" },
    body: JSON.stringify({ fileType: "image/png" }),
    requestContext: {
      authorizer: {
        claims: {
          sub: "admin-1",
          email: "admin@example.com",
          "cognito:groups": "Admin",
        },
      },
    },
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

beforeEach(() => {
  mockCreatePresignedPost.mockReset();
  mockCreatePresignedPost.mockResolvedValue({
    url: "https://test-bucket.s3.amazonaws.com/",
    fields: { key: "mock-key", "Content-Type": "image/png" },
  });
});

describe("POST /products/{id}/image-upload-url", () => {
  it("returns 403 for a non-admin/staff user", async () => {
    const result = await handler(
      buildEvent({
        requestContext: {
          authorizer: { claims: { sub: "user-1", email: "user1@example.com", "cognito:groups": "" } },
        },
      }),
      {} as Context,
      () => {}
    );
    expect(result!.statusCode).toBe(403);
  });

  it("rejects an unsupported file type", async () => {
    const result = await handler(
      buildEvent({ body: JSON.stringify({ fileType: "image/gif" }) }),
      {} as Context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
  });

  it("returns a presigned upload URL keyed under products/{id}/ for an Admin", async () => {
    const result = await handler(buildEvent(), {} as Context, () => {});

    expect(result!.statusCode).toBe(200);
    const body = JSON.parse(result!.body);
    expect(body.uploadUrl).toBe("https://test-bucket.s3.amazonaws.com/");
    const presignArgs = mockCreatePresignedPost.mock.calls[0][1];
    expect(presignArgs.Key).toMatch(/^products\/24\/.+\.png$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace=services/product-api -- productImageUpload`
Expected: FAIL — no route matches yet.

- [ ] **Step 3: Add the route to `services/product-api/index.ts`**

Insert this new block immediately after the existing `/products/{id}/ratings/upload-url` block (search for that block — it ends with the `return jsonResponse(200, { uploadUrl: url, fields, publicUrl: ..., maxSizeBytes: ... });` for reviews — and add this right after its closing `}`, before the `// Route: /products/{id}/comments` comment):

```ts
    // -------------------------------------------------------------
    // Route: /products/{id}/image-upload-url (sinh presigned POST để admin upload ảnh sản phẩm)
    // -------------------------------------------------------------
    if (resource === "/products/{id}/image-upload-url" && method === "POST") {
      const groups = authorizer?.claims?.["cognito:groups"] || "";
      const isStaff = groups.includes("Admin") || groups.includes("Staff");
      if (!isStaff) {
        return jsonResponse(403, { message: "Forbidden: Bạn không có quyền tải ảnh sản phẩm" });
      }
      if (!bucketName) {
        return jsonResponse(500, { message: "BUCKET_NAME environment variable is not set" });
      }

      const productId = getProductId(event.path, event.pathParameters?.id);
      if (!productId) {
        return jsonResponse(400, { message: "Missing product ID" });
      }

      if (!event.body) {
        return jsonResponse(400, { message: "Missing request body" });
      }

      const { fileType } = JSON.parse(event.body);
      const extension = REVIEW_IMAGE_ALLOWED_TYPES[fileType];
      if (!extension) {
        return jsonResponse(400, {
          message: "Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG hoặc WEBP.",
        });
      }

      const key = `products/${productId}/${randomUUID()}.${extension}`;

      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: bucketName,
        Key: key,
        Conditions: [
          ["content-length-range", 1, REVIEW_IMAGE_MAX_BYTES],
          ["eq", "$Content-Type", fileType],
        ],
        Fields: {
          "Content-Type": fileType,
        },
        Expires: 60,
      });

      return jsonResponse(200, {
        uploadUrl: url,
        fields,
        publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        maxSizeBytes: REVIEW_IMAGE_MAX_BYTES,
      });
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=services/product-api -- productImageUpload`
Expected: PASS (3 tests). Also run the full suite: `npm test --workspace=services/product-api`.

- [ ] **Step 5: Add the CDK route**

Edit `infrastructure/lib/backend-stack.ts` — immediately after the existing `/products/{id}/ratings/upload-url` method registration (right before the `// Route: /products/{id}/comments` comment), add:

```ts
    // Route: /products/{id}/image-upload-url (sinh presigned POST để admin upload ảnh sản phẩm)
    const productImageUploadUrlResource = productResource.addResource("image-upload-url");
    productImageUploadUrlResource.addMethod(
      "POST",
      productApiIntegration,
      authorizer ? {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      } : undefined
    );
```

- [ ] **Step 6: Verify the CDK change type-checks**

Run: `cd infrastructure && npx tsc --noEmit`
Expected: no errors. Do not run `cdk deploy`/`cdk synth` against a real account.

- [ ] **Step 7: Rebuild the committed esbuild bundle**

Run: `npx esbuild services/product-api/index.ts --bundle --platform=node --target=node22 --external:@aws-sdk/* --outfile=services/product-api/index.js`

- [ ] **Step 8: Commit**

```bash
git add services/product-api infrastructure/lib/backend-stack.ts
git commit -m "feat(product-api): add admin product image presigned-upload route"
```

---

## Task 5: Frontend proxy route for product image upload

**Files:**
- Create: `frontend/app/api/products/[id]/image-upload-url/route.ts`

**Interfaces:**
- Consumes: `POST /products/{id}/image-upload-url` backend route from Task 4.
- Produces: `POST /api/products/{id}/image-upload-url`, consumed by Task 8 (admin product modal).

- [ ] **Step 1: Create the proxy route**

Create `frontend/app/api/products/[id]/image-upload-url/route.ts` (mirrors `frontend/app/api/products/[id]/ratings/upload-url/route.ts` exactly, just a different target path):

```ts
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace(/\/$/, "");
    if (!apiGatewayUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_GATEWAY_URL is not configured" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const targetUrl = `${apiGatewayUrl}/products/${encodeURIComponent(id)}/image-upload-url`;
    const body = await req.json();

    const authHeader = req.headers.get("Authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || `API Gateway returned status ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST /api/products/[id]/image-upload-url error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/api/products/[id]/image-upload-url/route.ts"
git commit -m "feat(frontend): add proxy route for product image upload URL"
```

---

## Task 6: Reusable `ImagePicker` frontend component

**Files:**
- Create: `frontend/app/components/common/ImagePicker.tsx`

**Interfaces:**
- Produces: `ImagePicker` React component — props `{ currentImageUrl: string; uploadUrlEndpoint: string; authToken: string; onUploaded: (publicUrl: string) => void; onError: (message: string) => void; shape?: "circle" | "square"; disabled?: boolean }`. Consumed by Task 7 (profile page) and Task 8 (admin product modal).

- [ ] **Step 1: Create the component**

Create `frontend/app/components/common/ImagePicker.tsx`:

```tsx
"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface ImagePickerProps {
  currentImageUrl: string;
  uploadUrlEndpoint: string;
  authToken: string;
  onUploaded: (publicUrl: string) => void;
  onError: (message: string) => void;
  shape?: "circle" | "square";
  disabled?: boolean;
}

export function ImagePicker({
  currentImageUrl,
  uploadUrlEndpoint,
  authToken,
  onUploaded,
  onError,
  shape = "square",
  disabled = false,
}: ImagePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      onError("Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError("Ảnh vượt quá dung lượng cho phép (tối đa 5MB).");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const presignRes = await fetch(uploadUrlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ fileType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignData.error || presignData.message || "Không thể tạo link tải ảnh lên");
      }

      const { uploadUrl, fields, publicUrl } = presignData;
      const formData = new FormData();
      Object.entries(fields as Record<string, string>).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append("file", file);

      const uploadRes = await fetch(uploadUrl, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        throw new Error("Tải ảnh lên thất bại");
      }

      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
    } catch (err) {
      setPreviewUrl(currentImageUrl);
      onError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải ảnh lên");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`w-24 h-24 ${shapeClass} overflow-hidden bg-[#F3EFEA] border border-[#DF9E47]/20 flex items-center justify-center shrink-0`}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Ảnh xem trước"
            width={96}
            height={96}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có ảnh</span>
        )}
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />
      <label
        htmlFor={inputId}
        className={`cursor-pointer text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl border border-[#002B1F] text-[#002B1F] hover:bg-[#002B1F] hover:text-white transition-colors ${
          disabled || isUploading ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {isUploading ? "Đang tải lên..." : "Chọn ảnh"}
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/common/ImagePicker.tsx
git commit -m "feat(frontend): add reusable ImagePicker component"
```

---

## Task 7: Wire `ImagePicker` into the profile page (avatar)

**Files:**
- Modify: `frontend/app/profile/page.tsx`

**Interfaces:**
- Consumes: `ImagePicker` from Task 6; `/api/users/profile/avatar-upload-url` from Task 3; `UserProfile.avatarUrl` from Task 1/2.

- [ ] **Step 1: Import the component and extend the local `UserProfile` type**

In `frontend/app/profile/page.tsx`, add the import near the other component imports (after the `MusicLoading` import):

```ts
import { ImagePicker } from "../components/common/ImagePicker";
```

Modify the local `UserProfile` type (currently at the top of the file, `type UserProfile = { userId, email, name, phone, address }`) to add the new field:

```ts
type UserProfile = {
  userId: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  avatarUrl?: string;
};
```

- [ ] **Step 2: Add an avatar-upload handler**

Add this function next to `handleUpdateProfile` (same component, right after it):

```ts
  const handleAvatarUploaded = async (publicUrl: string) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) throw new Error("No token found");

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });

      if (res.ok) {
        showToast("Cập nhật ảnh đại diện thành công!", "success");
        fetchData();
      } else {
        showToast("Không thể cập nhật ảnh đại diện. Vui lòng thử lại!", "error");
      }
    } catch (err) {
      console.error("Update avatar error:", err);
      showToast("Đã xảy ra lỗi khi lưu ảnh đại diện.", "error");
    }
  };

  const handleAvatarError = (message: string) => {
    showToast(message, "error");
  };
```

- [ ] **Step 3: Replace the initial-letter placeholder with the real picker**

Find the sidebar block that currently renders the initial-letter avatar:

```tsx
              <div className="w-20 h-20 bg-[#F3EFEA] dark:bg-[#031d16] rounded-full flex items-center justify-center text-3xl font-extrabold text-[#002B1F] dark:text-[#80bea6] mx-auto mb-3 border border-[#DF9E47]/20 dark:border-[#fe932c]/20">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
```

Replace it with (this needs the auth token, so fetch it lazily via a small wrapper — the component itself takes `authToken` as a prop, so read it into local state once and pass it down):

```tsx
              <div className="flex justify-center mb-3">
                <ImagePicker
                  currentImageUrl={profile?.avatarUrl || ""}
                  uploadUrlEndpoint="/api/users/profile/avatar-upload-url"
                  authToken={authToken}
                  onUploaded={handleAvatarUploaded}
                  onError={handleAvatarError}
                  shape="circle"
                />
              </div>
```

Since `ImagePicker` needs `authToken` as a prop (not fetched internally, to keep the component free of Amplify-specific auth logic), add a small piece of state to hold it. Near the other `useState` declarations at the top of `ProfileContent`, add:

```ts
  const [authToken, setAuthToken] = useState("");
```

And in `fetchData()` (the existing function that already calls `fetchAuthSession()` and extracts `token` at the top), add one line right after `const token = session.tokens?.idToken?.toString();` to also store it in state:

```ts
      const token = session.tokens?.idToken?.toString();
      if (!token) throw new Error("No session token found");
      setAuthToken(token);
```

- [ ] **Step 4: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual browser verification**

Run: `npm run dev -w @music-store/web` (or `cd frontend && npm run dev`), then in a browser:
1. Log in, go to `/profile`.
2. Click "Chọn ảnh" under the sidebar avatar, pick a JPEG/PNG/WEBP under 5MB.
3. Confirm a preview appears immediately, then after a moment a success toast appears and the avatar persists after a page refresh.
4. Try picking an unsupported file (e.g. a `.gif` or `.pdf`) and confirm an error toast appears instead of a broken upload.
Stop the dev server when done (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/profile/page.tsx
git commit -m "feat(frontend): wire avatar upload into profile page"
```

---

## Task 8: Wire `ImagePicker` into the admin product modal

**Files:**
- Modify: `frontend/app/components/product/ProductModal.tsx`
- Modify: `frontend/app/admin/products/page.tsx`

**Interfaces:**
- Consumes: `ImagePicker` from Task 6; `/api/products/{id}/image-upload-url` from Task 5.

- [ ] **Step 1: Pass an auth token down to `ProductModal`**

In `frontend/app/admin/products/page.tsx`, add a small piece of state and populate it once on mount (near the top of the component, after the existing `useState` declarations):

```ts
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    fetchAuthSession().then((session) => {
      const token = session.tokens?.idToken?.toString();
      if (token) setAuthToken(token);
    });
  }, []);
```

Pass it to the modal in the JSX where `<ProductModal ... />` is rendered:

```tsx
      <ProductModal
        isOpen={isModalOpen}
        editProduct={editProduct}
        formData={formData}
        onChangeField={handleFormDataChange}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
        authToken={authToken}
      />
```

- [ ] **Step 2: Replace the URL text input with `ImagePicker` in `ProductModal.tsx`**

Add the import at the top of `frontend/app/components/product/ProductModal.tsx`:

```ts
import { ImagePicker } from "../common/ImagePicker";
```

Add `authToken` to the props interface:

```ts
interface ProductModalProps {
  isOpen: boolean;
  editProduct: Product | null;
  formData: ProductFormData;
  onChangeField: (field: keyof ProductFormData, value: string | number) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  authToken: string;
}
```

Add it to the destructured props:

```ts
export function ProductModal({
  isOpen,
  editProduct,
  formData,
  onChangeField,
  isSubmitting,
  onSubmit,
  onClose,
  authToken,
}: ProductModalProps) {
```

Replace the existing image URL text field:

```tsx
          <div>
            <label htmlFor="prod-image" className={labelClasses}>Đường dẫn hình ảnh (URL)</label>
            <input
              id="prod-image"
              type="text"
              value={formData.imageUrl}
              onChange={(e) => onChangeField("imageUrl", e.target.value)}
              disabled={isSubmitting}
              placeholder="Ví dụ: /images/yamaha-yas280.jpg hoặc link https://"
              className={inputClasses}
            />
          </div>
```

with:

```tsx
          <div>
            <label className={labelClasses}>Hình ảnh sản phẩm</label>
            <ImagePicker
              currentImageUrl={formData.imageUrl}
              uploadUrlEndpoint={`/api/products/${formData.id}/image-upload-url`}
              authToken={authToken}
              onUploaded={(publicUrl) => onChangeField("imageUrl", publicUrl)}
              onError={(message) => console.error("Product image upload error:", message)}
              disabled={isSubmitting}
            />
          </div>
```

Note: `formData.id` is always set before the modal opens (see `handleOpenAddModal`/`handleOpenEditModal` in `page.tsx`, both set `id` before `setIsModalOpen(true)`), so the upload endpoint always has a valid product ID to key the S3 path with, even for a brand-new product that hasn't been POSTed yet.

- [ ] **Step 3: Type-check and lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev -w @music-store/web`, log in as an Admin/Staff user, go to `/admin/products`:
1. Click "Thêm Sản Phẩm Mới", pick an image via the new picker, confirm the preview appears.
2. Fill in the rest of the required fields and submit — confirm the product is created with the uploaded image showing in the product table/detail page.
3. Edit an existing product and change its image the same way.
Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/components/product/ProductModal.tsx frontend/app/admin/products/page.tsx
git commit -m "feat(frontend): wire product image upload into admin product modal"
```

---

## Self-Review Notes

- **Spec coverage:** Both bullets of spec section C are covered — avatar upload (Tasks 1-3, 6-7) and admin product-image upload (Tasks 4-5-6, 8) both replace URL text entry with a file picker backed by S3 presigned POST, reusing the existing review-image pattern's allow-list/size-limit constants and the same frontend upload sequence (`uploadRatingImages` in `ProductDetailClient.tsx` was the template for `ImagePicker`).
- **Partial-update bug caught and fixed:** Task 2 exists specifically because Task 7 introduces a second, independent way to `PUT /users/profile` (avatar-only) that the original body-only-overwrite implementation would have handled incorrectly — this is called out explicitly rather than silently fixed, since it's a behavior change to an existing endpoint beyond the literal spec bullet.
- **No schema change to `ProductRecord.imageUrl`:** confirmed — Task 8 only changes how the string gets into `formData.imageUrl`, not its type or the `/api/products` payload shape.
- **Type consistency:** `UserProfile.avatarUrl?: string` (Task 1) is used identically in Task 2's merge logic, Task 7's local type mirror, and nowhere else needs to construct a `UserProfile` object from scratch.
- **Known scope decision:** no frontend automated tests are added (see Global Constraints) — Tasks 6-8 rely on `tsc`/`eslint`/manual verification, consistent with the rest of the frontend having no test runner today. If this is unacceptable, introducing a frontend test framework should be its own separate, explicitly-scoped plan rather than folded silently into this one.
