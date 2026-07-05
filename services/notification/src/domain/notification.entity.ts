export type NotificationType =
  | "OrderPlaced"
  | "OrderUpdated"
  | "OrderCancelled"
  | "PaymentSucceeded";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SmsMessage {
  to: string;
  body: string;
}
