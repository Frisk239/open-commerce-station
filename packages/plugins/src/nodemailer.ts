import type { NoticeMail } from "@ocs/core";
import type { MailTransportAdapter, MailTransportConfig } from "./mail";
import { MailTransportError } from "./mail";

interface NodemailerLike {
  createTransport(options: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  }): {
    sendMail(options: {
      from: string;
      to: string;
      subject: string;
      text: string;
    }): Promise<unknown>;
  };
}

let nodemailerModule: NodemailerLike | null = null;

async function loadNodemailer(): Promise<NodemailerLike> {
  if (nodemailerModule) return nodemailerModule;
  try {
    nodemailerModule = (await import("nodemailer")) as unknown as NodemailerLike;
    return nodemailerModule;
  } catch {
    throw new MailTransportError("The nodemailer dependency is not installed in this deployment.");
  }
}

/**
 * Production SMTP transport (ADR 0033). The transport reads the owner's
 * configuration from the Portal-stored MailConfig; secrets never enter the
 * browser.
 */
export function createNodemailerTransport(config: MailTransportConfig): MailTransportAdapter {
  return {
    async send(mail: NoticeMail): Promise<void> {
      const nodemailer = await loadNodemailer();
      const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        ...(config.username && config.password ? { auth: { user: config.username, pass: config.password } } : {}),
      });
      try {
        await transport.sendMail({
          from: config.fromEmail,
          to: mail.toEmail,
          subject: mail.subject,
          text: mail.bodyText,
        });
      } catch (error) {
        throw new MailTransportError(error instanceof Error ? `SMTP send failed: ${error.message}` : "SMTP send failed.");
      }
    },
  };
}
