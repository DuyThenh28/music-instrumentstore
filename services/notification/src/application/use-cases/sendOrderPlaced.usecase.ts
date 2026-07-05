import type { DispatcherDeps } from "../dispatcher";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendOrderPlaced(detail: any, deps: DispatcherDeps): Promise<void> {
  const email = detail.email;
  if (!email) {
    console.warn(`[Notification] OrderPlaced cho đơn ${detail.orderId} thiếu email khách hàng, bỏ qua gửi.`);
    return;
  }

  const rendered = deps.templateRenderer.renderEmail("order-placed", {
    orderId: detail.orderId,
    amount: Number(detail.totalPrice || 0).toLocaleString("vi-VN"),
  });
  await deps.emailProvider.send({ to: email, ...rendered });
}
