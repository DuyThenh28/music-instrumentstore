# Username Display Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nobody ever sees a blank/"undefined" name, and no user is ever silently missing from the admin user list — fixed at read/write time, no data migration required.

**Architecture:** Add a shared `UserProfile` TypeScript type used by the three places that currently duplicate the profile shape (`services/auth-post-confirmation`, `services/product-api`, `scripts/backfill-profiles.ts`). Fix the post-confirmation trigger and the backfill script to fall back `name` to the email's local part instead of an empty string. Fix the admin `GET /users` endpoint to merge Cognito `ListUsers` with the DynamoDB `PROFILE` scan so a user missing a `PROFILE` record still appears (synthesized), instead of disappearing.

**Tech Stack:** TypeScript, AWS Lambda (`aws-lambda` types), `@aws-sdk/client-dynamodb` / `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-cognito-identity-provider`, Jest + ts-jest + `aws-sdk-client-mock` (new test infra for two services that currently have none).

## Global Constraints

- This is section A of `docs/superpowers/specs/2026-07-07-account-ux-chatbot-upgrade-design.md` — no new "username/handle" field, purely fixing the existing `name` display.
- Runtime fix only — no DynamoDB data migration and no requirement to re-run `backfill:profiles` in any environment.
- `services/*` Lambda packages have no per-service `tsconfig.json` today except `services/notification`; any service gaining Jest tests in this plan gets one, mirroring `services/notification/tsconfig.json`.
- `services/*` are bundled via esbuild in the root `build:lambdas` script, which does **not** type-check — Jest/ts-jest is the only place TypeScript errors in these files get caught, so tests must actually import and exercise the changed code.

---

## Task 1: Shared `UserProfile` type

**Files:**
- Modify: `packages/shared-types/index.ts`

**Interfaces:**
- Produces: `UserProfile` interface — `{ userId: string; email: string; name: string; phone: string; address: string; role?: "Admin" | "Staff" | "User"; updatedAt?: string }`, imported by Tasks 2, 3, and 4 as `import type { UserProfile } from "@music-store/shared-types";`.

- [ ] **Step 1: Add the `UserProfile` type**

Edit `packages/shared-types/index.ts` to:

```ts
export interface SharedProductSummary {
  id: string;
  name: string;
  price: number;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  role?: "Admin" | "Staff" | "User";
  updatedAt?: string;
}
```

- [ ] **Step 2: Verify it parses as valid TypeScript**

Run: `npx tsc --noEmit --strict --skipLibCheck packages/shared-types/index.ts`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/index.ts
git commit -m "feat(shared-types): add UserProfile type"
```

---

## Task 2: `auth-post-confirmation` — fallback name to email prefix + tests

**Files:**
- Create: `services/auth-post-confirmation/tsconfig.json`
- Create: `services/auth-post-confirmation/jest.config.js`
- Create: `services/auth-post-confirmation/tests/env.setup.ts`
- Create: `services/auth-post-confirmation/tests/index.test.ts`
- Modify: `services/auth-post-confirmation/index.ts`
- Modify: `services/auth-post-confirmation/package.json`

**Interfaces:**
- Consumes: `UserProfile` from Task 1 (`@music-store/shared-types`).
- Produces: no new exports — same `handler` export, just fixed fallback behavior later tasks don't depend on.

- [ ] **Step 1: Add test/build tooling to `package.json`**

Edit `services/auth-post-confirmation/package.json`:

```json
{
  "name": "@music-store/auth-post-confirmation",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "build": "echo \"built via root build:lambdas (esbuild)\"",
    "test": "jest"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.1075.0",
    "@aws-sdk/lib-dynamodb": "^3.1075.0",
    "@music-store/shared-types": "0.1.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.152",
    "@types/jest": "^29.5.14",
    "aws-sdk-client-mock": "^4.1.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "~5.3.3"
  }
}
```

- [ ] **Step 2: Add `tsconfig.json`**

Create `services/auth-post-confirmation/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["index.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Add `jest.config.js`**

Create `services/auth-post-confirmation/jest.config.js`:

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/env.setup.ts"],
};
```

- [ ] **Step 4: Add env setup (module-scope env vars must exist before `index.ts` is imported)**

Create `services/auth-post-confirmation/tests/env.setup.ts`:

```ts
process.env.TABLE_NAME = "test-table";
```

- [ ] **Step 5: Install new devDependencies**

Run: `npm install --workspace=services/auth-post-confirmation -D jest ts-jest @types/jest aws-sdk-client-mock typescript`
Expected: exits 0, `services/auth-post-confirmation` gains entries in the lockfile.

- [ ] **Step 6: Write the failing tests**

Create `services/auth-post-confirmation/tests/index.test.ts`:

```ts
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { PostConfirmationConfirmSignUpTriggerEvent, Context } from "aws-lambda";
import { handler } from "../index";

const ddbMock = mockClient(DynamoDBDocumentClient);

function buildEvent(
  name: string,
  email: string
): PostConfirmationConfirmSignUpTriggerEvent {
  return {
    version: "1",
    region: "ap-southeast-1",
    userPoolId: "pool-1",
    userName: "user-1",
    triggerSource: "PostConfirmation_ConfirmSignUp",
    callerContext: { awsSdkVersion: "", clientId: "" },
    request: {
      userAttributes: {
        sub: "user-1",
        email,
        name,
        phone_number: "",
      },
    },
    response: {},
  } as unknown as PostConfirmationConfirmSignUpTriggerEvent;
}

beforeEach(() => {
  ddbMock.reset();
  ddbMock.on(PutCommand).resolves({});
});

describe("auth-post-confirmation handler", () => {
  it("falls back name to the email's local part when Cognito name attribute is empty", async () => {
    await handler(buildEvent("", "jane.doe@example.com"), {} as Context, () => {});

    const putCall = ddbMock.commandCalls(PutCommand)[0];
    expect(putCall.args[0].input.Item?.name).toBe("jane.doe");
  });

  it("keeps the Cognito name attribute when present", async () => {
    await handler(buildEvent("Jane Doe", "jane@example.com"), {} as Context, () => {});

    const putCall = ddbMock.commandCalls(PutCommand)[0];
    expect(putCall.args[0].input.Item?.name).toBe("Jane Doe");
  });
});
```

- [ ] **Step 7: Run tests to verify the first one fails**

Run: `npm test --workspace=services/auth-post-confirmation`
Expected: FAIL — first test expects `"jane.doe"` but receives `""` (current code has no fallback).

- [ ] **Step 8: Fix the fallback in `index.ts`**

Modify `services/auth-post-confirmation/index.ts`:

```ts
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { UserProfile } from "@music-store/shared-types";

const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const tableName = process.env.TABLE_NAME || "";

// Cognito Post-Confirmation trigger: tạo sẵn bản ghi PROFILE trong DynamoDB ngay khi
// user xác nhận đăng ký xong, để tránh tình trạng tên hiển thị rỗng/undefined ở những
// nơi đọc profile trước khi user tự vào /profile để lưu thông tin lần đầu.
export const handler: PostConfirmationTriggerHandler = async (event) => {
  try {
    const userId = event.request.userAttributes.sub;
    const email = event.request.userAttributes.email || "";
    // Nếu Cognito không có attribute `name` (vd. một luồng signup tương lai không yêu
    // cầu nhập tên), dùng phần trước @ của email thay vì lưu chuỗi rỗng vĩnh viễn.
    const name = event.request.userAttributes.name || email.split("@")[0] || "";
    const phone = event.request.userAttributes.phone_number || "";
    const now = new Date().toISOString();

    const profile: UserProfile = {
      userId,
      email,
      name,
      phone,
      address: "",
      updatedAt: now,
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
          ...profile,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
  } catch (error) {
    // Không throw: nếu chặn ở đây thì user sẽ không đăng ký được, trong khi việc
    // tạo profile chỉ là tiện ích, không phải điều kiện bắt buộc để xác nhận tài khoản.
    console.error("Failed to create profile on post-confirmation:", error);
  }

  return event;
};
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test --workspace=services/auth-post-confirmation`
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add services/auth-post-confirmation
git commit -m "fix(auth-post-confirmation): fallback name to email prefix, add tests"
```

---

## Task 3: Admin `GET /users` — merge Cognito users so nobody goes missing

**Files:**
- Create: `services/product-api/tsconfig.json`
- Create: `services/product-api/jest.config.js`
- Create: `services/product-api/tests/env.setup.ts`
- Create: `services/product-api/tests/adminUsers.test.ts`
- Modify: `services/product-api/index.ts:1127-1171`
- Modify: `services/product-api/package.json`

**Interfaces:**
- Consumes: `UserProfile` from Task 1 (`@music-store/shared-types`); existing `cognitoClient`, `userPoolId`, `listGroupUserIds`, `stripTableKeys`, `jsonResponse`, `dynamoDb`, `tableName` module-scope values already in `index.ts`.
- Produces: new module-scope helper `listAllCognitoUsers(): Promise<Array<{ userId: string; email: string; name: string }>>` — internal to this file, not consumed elsewhere.

- [ ] **Step 1: Add test/build tooling to `package.json`**

Edit `services/product-api/package.json`:

```json
{
  "name": "@music-store/product-api",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "build": "echo \"product-api has no build step yet\"",
    "test": "jest"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.1075.0",
    "@aws-sdk/lib-dynamodb": "^3.1075.0",
    "@aws-sdk/client-eventbridge": "^3.1075.0",
    "@aws-sdk/client-s3": "^3.1075.0",
    "@aws-sdk/s3-presigned-post": "^3.1075.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.1075.0",
    "@music-store/shared-types": "0.1.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.152",
    "@types/jest": "^29.5.14",
    "aws-sdk-client-mock": "^4.1.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "~5.3.3"
  }
}
```

- [ ] **Step 2: Add `tsconfig.json`**

Create `services/product-api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["index.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Add `jest.config.js`**

Create `services/product-api/jest.config.js`:

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/env.setup.ts"],
};
```

- [ ] **Step 4: Add env setup**

Create `services/product-api/tests/env.setup.ts`:

```ts
process.env.TABLE_NAME = "test-table";
process.env.USER_POOL_ID = "test-pool";
process.env.AWS_REGION = "ap-southeast-1";
```

- [ ] **Step 5: Install new devDependencies**

Run: `npm install --workspace=services/product-api -D jest ts-jest @types/jest aws-sdk-client-mock typescript`
Expected: exits 0.

- [ ] **Step 6: Write the failing tests**

Create `services/product-api/tests/adminUsers.test.ts`:

```ts
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../index";

const ddbMock = mockClient(DynamoDBDocumentClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

function buildAdminListEvent(): APIGatewayProxyEvent {
  return {
    resource: "/users",
    httpMethod: "GET",
    path: "/users",
    pathParameters: null,
    body: null,
    requestContext: {
      authorizer: {
        claims: {
          sub: "admin-1",
          email: "admin@example.com",
          name: "Admin User",
          "cognito:groups": "Admin",
        },
      },
    },
  } as unknown as APIGatewayProxyEvent;
}

beforeEach(() => {
  ddbMock.reset();
  cognitoMock.reset();
  cognitoMock.on(ListUsersInGroupCommand).resolves({ Users: [] });
});

describe("GET /users (admin list)", () => {
  it("includes a Cognito user that has no DynamoDB PROFILE item yet, with name falling back to the email prefix", async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });
    cognitoMock.on(ListUsersCommand).resolves({
      Users: [
        {
          Attributes: [
            { Name: "sub", Value: "user-without-profile" },
            { Name: "email", Value: "noprofile@example.com" },
            { Name: "name", Value: "" },
          ],
        },
      ],
    });

    const result = await handler(buildAdminListEvent(), {} as Context, () => {});
    const body = JSON.parse(result!.body);

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      userId: "user-without-profile",
      name: "noprofile",
      role: "User",
    });
  });

  it("prefers the existing DynamoDB PROFILE over the synthesized Cognito fallback", async () => {
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          PK: "USER#user-1",
          SK: "PROFILE",
          userId: "user-1",
          email: "user1@example.com",
          name: "Real Name",
        },
      ],
    });
    cognitoMock.on(ListUsersCommand).resolves({
      Users: [
        {
          Attributes: [
            { Name: "sub", Value: "user-1" },
            { Name: "email", Value: "user1@example.com" },
            { Name: "name", Value: "" },
          ],
        },
      ],
    });

    const result = await handler(buildAdminListEvent(), {} as Context, () => {});
    const body = JSON.parse(result!.body);

    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Real Name");
  });
});
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `npm test --workspace=services/product-api`
Expected: FAIL — first test expects 1 item, current handler returns 0 (the Cognito-only user is missing entirely).

- [ ] **Step 8: Add `listAllCognitoUsers` helper**

Modify `services/product-api/index.ts`, immediately after the existing `listGroupUserIds` function (after line 78):

```ts
// Toàn bộ user trong Cognito User Pool (không chỉ user đã có PROFILE trong DynamoDB) —
// dùng để merge vào danh sách admin, tránh trường hợp user bị "biến mất" khỏi trang
// quản trị chỉ vì chưa từng có bản ghi PROFILE (vd. backfill chưa chạy ở môi trường này).
const listAllCognitoUsers = async (): Promise<
  Array<{ userId: string; email: string; name: string }>
> => {
  const users: Array<{ userId: string; email: string; name: string }> = [];
  if (!userPoolId) return users;

  let paginationToken: string | undefined;
  do {
    const result = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        PaginationToken: paginationToken,
      })
    );
    for (const user of result.Users ?? []) {
      const sub = user.Attributes?.find((attr) => attr.Name === "sub")?.Value;
      if (!sub) continue;
      const email = user.Attributes?.find((attr) => attr.Name === "email")?.Value || "";
      const name = user.Attributes?.find((attr) => attr.Name === "name")?.Value || "";
      users.push({ userId: sub, email, name });
    }
    paginationToken = result.PaginationToken;
  } while (paginationToken);

  return users;
};
```

- [ ] **Step 9: Merge Cognito users into the admin list response**

Modify `services/product-api/index.ts:1134-1171` (the `if (resource === "/users" && method === "GET")` block) — replace it with:

```ts
      if (resource === "/users" && method === "GET") {
        const items: any[] = [];
        let ExclusiveStartKey: Record<string, unknown> | undefined;

        do {
          const result = await dynamoDb.send(
            new ScanCommand({
              TableName: tableName,
              FilterExpression: "SK = :profileSk",
              ExpressionAttributeValues: {
                ":profileSk": "PROFILE",
              },
              ExclusiveStartKey,
            })
          );

          items.push(...(result.Items ?? []));
          ExclusiveStartKey = result.LastEvaluatedKey;
        } while (ExclusiveStartKey);

        // Quyền thật do Cognito Group quyết định, không phải field `role` lưu trong DynamoDB
        // (field này có thể lệch nếu bị đổi tay hoặc tạo từ trước khi có cơ chế đồng bộ).
        const [adminIds, staffIds, cognitoUsers] = await Promise.all([
          listGroupUserIds("Admin"),
          listGroupUserIds("Staff"),
          listAllCognitoUsers(),
        ]);

        const profilesByUserId = new Map<string, any>();
        for (const item of items) {
          const profile = stripTableKeys(item);
          profilesByUserId.set(profile.userId, profile);
        }

        // Bất kỳ user Cognito nào chưa có PROFILE trong DynamoDB (vd. backfill chưa chạy
        // ở môi trường này) vẫn phải xuất hiện trong danh sách, thay vì biến mất hoàn toàn.
        for (const cognitoUser of cognitoUsers) {
          if (!profilesByUserId.has(cognitoUser.userId)) {
            profilesByUserId.set(cognitoUser.userId, {
              userId: cognitoUser.userId,
              email: cognitoUser.email,
              name: cognitoUser.name || cognitoUser.email.split("@")[0] || "User",
              phone: "",
              address: "",
            });
          }
        }

        const profiles = Array.from(profilesByUserId.values()).map((profile) => {
          profile.role = adminIds.has(profile.userId)
            ? "Admin"
            : staffIds.has(profile.userId)
            ? "Staff"
            : "User";
          return profile;
        });
        return jsonResponse(200, profiles);
      }
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm test --workspace=services/product-api`
Expected: PASS (2 tests).

- [ ] **Step 11: Commit**

```bash
git add services/product-api
git commit -m "fix(product-api): merge Cognito users into admin list so nobody goes missing"
```

---

## Task 4: `backfill-profiles.ts` — same fallback for consistency

**Files:**
- Modify: `scripts/backfill-profiles.ts:98-103`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone script, no shared-types import needed since it builds a plain object literal, not a typed `UserProfile`).

- [ ] **Step 1: Apply the same email-prefix fallback**

Modify `scripts/backfill-profiles.ts`, inside the `PutCommand` `Item` (around line 94-103):

```ts
      const now = new Date().toISOString();
      const email = getAttr(user.Attributes, "email");
      const name = getAttr(user.Attributes, "name") || email.split("@")[0] || "";

      try {
        await ddbDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              PK: `USER#${userId}`,
              SK: "PROFILE",
              userId,
              email,
              name,
              phone: getAttr(user.Attributes, "phone_number"),
              address: "",
              updatedAt: now,
            },
            ConditionExpression: "attribute_not_exists(PK)",
          })
        );
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit --esModuleInterop --skipLibCheck --target es2020 --module commonjs scripts/backfill-profiles.ts`
Expected: no output, exit code 0. (This only checks types — it does not execute `main()`, so no real AWS calls happen.)

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-profiles.ts
git commit -m "fix(scripts): fallback name to email prefix in profile backfill"
```

---

## Self-Review Notes

- **Spec coverage:** Both gaps from spec section A are covered — Task 2 fixes the empty-string fallback in the post-confirmation trigger, Task 3 fixes the admin list disappearing-user bug. Task 4 extends the same fallback to the third duplicated location the spec calls out. Task 1 provides the shared type the spec asks for.
- **No data migration:** confirmed no task runs `backfill:profiles` or writes a one-off migration — Task 3's merge happens at read time on every request.
- **Type consistency:** `UserProfile` fields (`userId, email, name, phone, address, role?, updatedAt?`) match what Task 2 constructs and what Task 3's synthesized fallback profiles shape (`userId, email, name, phone, address`, `role` added afterward) — consistent across tasks.
