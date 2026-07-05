import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { EmailProvider } from "../../../domain/ports";
import type { EmailMessage } from "../../../domain/notification.entity";

export class SesEmailProvider implements EmailProvider {
  constructor(
    private readonly fromEmail: string,
    private readonly client: SESv2Client = new SESv2Client({})
  ) {}

  async send(message: EmailMessage): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.fromEmail,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: message.html, Charset: "UTF-8" },
              Text: { Data: message.text, Charset: "UTF-8" },
            },
          },
        },
      })
    );
  }
}
