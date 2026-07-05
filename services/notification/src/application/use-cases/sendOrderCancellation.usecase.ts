import type { DispatcherDeps } from "../dispatcher";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendOrderCancellation(detail: any, deps: DispatcherDeps): Promise<void> {
  const email = detail.email;
  const phone = detail.customer?.phone;
  const data = {
    orderId: detail.orderId,
    reason: detail.reason || "Không có lý do cụ thể",
  };

  if (email) {
    const rendered = deps.templateRenderer.renderEmail("order-cancelled", data);
    await deps.emailProvider.send({ to: email, ...rendered });
  }

  if (phone) {
    const body = deps.templateRenderer.renderSms("order-cancelled", data);
    await deps.smsProvider.send({ to: phone, body });
  }

  if (!email && !phone) {
    console.warn(`[Notification] OrderCancelled cho đơn ${detail.orderId} thiếu cả email lẫn phone, bỏ qua gửi.`);
  }
}
