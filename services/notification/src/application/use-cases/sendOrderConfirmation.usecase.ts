import type { DispatcherDeps } from "../dispatcher";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendOrderConfirmation(detail: any, deps: DispatcherDeps): Promise<void> {
  const orderId = detail.metadata?.orderId || detail.id;
  const email = detail.email;

  if (!email) {
    console.warn(`[Notification] PaymentSucceeded cho đơn ${orderId} thiếu email khách hàng, bỏ qua gửi.`);
    return;
  }

  const rendered = deps.templateRenderer.renderEmail("order-confirmation", {
    orderId,
    amount: Number(detail.amount || 0).toLocaleString("vi-VN"),
  });
  await deps.emailProvider.send({ to: email, ...rendered });
}
