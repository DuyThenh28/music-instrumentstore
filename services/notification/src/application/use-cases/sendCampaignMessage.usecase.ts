import type { EmailProvider, SmsProvider } from "../../domain/ports";

export interface CampaignMessagePayload {
  campaignId: string;
  title: string;
  message: string;
  channel: "EMAIL" | "SMS" | "BOTH";
  recipient: { email?: string; phone?: string };
}

export interface CampaignSenderDeps {
  emailProvider: EmailProvider;
  smsProvider: SmsProvider;
}

export async function sendCampaignMessage(payload: CampaignMessagePayload, deps: CampaignSenderDeps): Promise<void> {
  const { title, message, channel, recipient } = payload;

  if ((channel === "EMAIL" || channel === "BOTH") && recipient.email) {
    await deps.emailProvider.send({
      to: recipient.email,
      subject: title,
      html: `<p>${message}</p>`,
      text: message,
    });
  }

  if ((channel === "SMS" || channel === "BOTH") && recipient.phone) {
    await deps.smsProvider.send({ to: recipient.phone, body: `${title}: ${message}` });
  }
}
