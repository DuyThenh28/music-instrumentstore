import type { SQSEvent } from "aws-lambda";
import { SesEmailProvider } from "../infrastructure/providers/email/sesEmailProvider";
import { SnsSmsProvider } from "../infrastructure/providers/sms/snsSmsProvider";
import { DynamoNotificationLogRepository } from "../infrastructure/repository/notificationLogRepository";
import { sendCampaignMessage, type CampaignMessagePayload } from "../application/use-cases/sendCampaignMessage.usecase";
import { env } from "../config/env";

const emailProvider = new SesEmailProvider(env.sesFromEmail);
const smsProvider = new SnsSmsProvider();
const logRepository = env.tableName ? new DynamoNotificationLogRepository(env.tableName) : undefined;

export async function handleCampaignSqsEvent(event: SQSEvent): Promise<void> {
  console.log(`[Campaign Sender] Processing batch of ${event.Records.length} messages...`);

  for (const record of event.Records) {
    const payload = JSON.parse(record.body) as CampaignMessagePayload;
    const recipientKey = payload.recipient?.email || payload.recipient?.phone || record.messageId;
    const eventId = `${payload.campaignId}:${recipientKey}`;

    try {
      if (logRepository) {
        const isNew = await logRepository.markProcessedIfNew(eventId, "campaign-sender");
        if (!isNew) {
          console.log(`[Campaign Sender] ${eventId} đã gửi trước đó, bỏ qua (idempotent).`);
          continue;
        }
      }
      await sendCampaignMessage(payload, { emailProvider, smsProvider });
    } catch (err) {
      console.error(`[Campaign Sender] Failed to process record ${record.messageId}`, err);
      throw err; // ném lại để SQS retry / DLQ
    }
  }
}
