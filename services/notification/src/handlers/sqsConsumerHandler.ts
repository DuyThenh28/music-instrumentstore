import type { SQSEvent } from "aws-lambda";
import { SesEmailProvider } from "../infrastructure/providers/email/sesEmailProvider";
import { SnsSmsProvider } from "../infrastructure/providers/sms/snsSmsProvider";
import { HandlebarsTemplateRenderer } from "../infrastructure/templates/templateRenderer";
import { DynamoNotificationLogRepository } from "../infrastructure/repository/notificationLogRepository";
import { dispatchEvent, type DispatcherDeps } from "../application/dispatcher";
import { env } from "../config/env";

let deps: DispatcherDeps | undefined;

function getDeps(): DispatcherDeps {
  if (!deps) {
    if (!env.tableName) {
      throw new Error("TABLE_NAME env var is required for notification idempotency log");
    }
    deps = {
      emailProvider: new SesEmailProvider(env.sesFromEmail),
      smsProvider: new SnsSmsProvider(),
      templateRenderer: new HandlebarsTemplateRenderer(),
      logRepository: new DynamoNotificationLogRepository(env.tableName),
    };
  }
  return deps;
}

export async function handleSqsEvent(event: SQSEvent): Promise<void> {
  console.log(`[Notification Service] Processing SQS batch of ${event.Records.length} records...`);

  for (const record of event.Records) {
    const payload = JSON.parse(record.body);
    const detailType: string = payload["detail-type"] || "Unknown";
    const detail = payload.detail || payload;
    const eventId: string = detail.eventId || record.messageId;

    try {
      await dispatchEvent(eventId, detailType, detail, getDeps());
    } catch (err) {
      console.error(`[Notification Service] Failed to process record ${record.messageId} (${detailType})`, err);
      throw err; // ném lại để SQS retry / DLQ theo cấu hình maxReceiveCount
    }
  }
}
