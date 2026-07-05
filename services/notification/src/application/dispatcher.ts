import type {
  EmailProvider,
  SmsProvider,
  TemplateRenderer,
  NotificationLogRepository,
} from "../domain/ports";
import { sendOrderPlaced } from "./use-cases/sendOrderPlaced.usecase";
import { sendOrderCancellation } from "./use-cases/sendOrderCancellation.usecase";
import { sendOrderConfirmation } from "./use-cases/sendOrderConfirmation.usecase";

export interface DispatcherDeps {
  emailProvider: EmailProvider;
  smsProvider: SmsProvider;
  templateRenderer: TemplateRenderer;
  logRepository: NotificationLogRepository;
}

const CONSUMER_NAME = "notification-service";

export async function dispatchEvent(
  eventId: string,
  detailType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detail: any,
  deps: DispatcherDeps
): Promise<void> {
  const isNew = await deps.logRepository.markProcessedIfNew(eventId, CONSUMER_NAME);
  if (!isNew) {
    console.log(`[Notification] Event ${eventId} đã được xử lý trước đó, bỏ qua (idempotent).`);
    return;
  }

  switch (detailType) {
    case "OrderPlaced":
      await sendOrderPlaced(detail, deps);
      break;
    case "OrderCancelled":
      await sendOrderCancellation(detail, deps);
      break;
    case "PaymentSucceeded":
      await sendOrderConfirmation(detail, deps);
      break;
    case "OrderUpdated":
      console.log(`[Notification] OrderUpdated (status=${detail.status}) chưa có template riêng, bỏ qua.`);
      break;
    default:
      console.warn(`[Notification] Không rõ loại event: ${detailType}`);
  }
}
