import type { APIGatewayProxyResult, SQSEvent } from "aws-lambda";
import { handleSqsEvent } from "./src/handlers/sqsConsumerHandler";
import { handleApiEvent } from "./src/handlers/apiHandler";
import { handleCampaignSqsEvent } from "./src/handlers/campaignConsumerHandler";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: any): Promise<APIGatewayProxyResult | void> => {
  if (event.Records && Array.isArray(event.Records)) {
    return handleSqsEvent(event);
  }
  return handleApiEvent(event);
};

// Lambda riêng (CampaignSenderFunction) trỏ vào entrypoint này, tiêu thụ Campaign Queue để cách ly
// throughput gửi hàng loạt khỏi luồng thông báo giao dịch (OTP-adjacent/hủy đơn/xác nhận đơn).
export const campaignHandler = async (event: SQSEvent): Promise<void> => handleCampaignSqsEvent(event);
