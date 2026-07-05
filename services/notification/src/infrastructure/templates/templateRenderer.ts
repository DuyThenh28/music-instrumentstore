import Handlebars from "handlebars";
import type { RenderedEmail, TemplateRenderer } from "../../domain/ports";
import { emailTemplates, smsTemplates } from "./templateSource";

export class HandlebarsTemplateRenderer implements TemplateRenderer {
  renderEmail(templateName: string, data: Record<string, unknown>): RenderedEmail {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Unknown email template: ${templateName}`);
    }
    return {
      subject: Handlebars.compile(template.subject)(data),
      html: Handlebars.compile(template.html)(data),
      text: Handlebars.compile(template.text)(data),
    };
  }

  renderSms(templateName: string, data: Record<string, unknown>): string {
    const template = smsTemplates[templateName];
    if (!template) {
      throw new Error(`Unknown sms template: ${templateName}`);
    }
    return Handlebars.compile(template)(data);
  }
}
