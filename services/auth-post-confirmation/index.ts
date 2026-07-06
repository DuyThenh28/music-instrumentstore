import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

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
    const name = event.request.userAttributes.name || "";
    const phone = event.request.userAttributes.phone_number || "";
    const now = new Date().toISOString();

    await ddbDocClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
          userId,
          email,
          name,
          phone,
          address: "",
          updatedAt: now,
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
