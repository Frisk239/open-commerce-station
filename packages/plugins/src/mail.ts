import type { NoticeMail } from "@ocs/core";

export interface MailTransportConfig {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly username?: string;
  readonly password?: string;
  readonly fromEmail: string;
}

export interface MailTransportAdapter {
  send(mail: NoticeMail): Promise<void>;
}

export class MailTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailTransportError";
  }
}

/**
 * Dev/test transport: never touches a network. Every letter is logged so the
 * browser acceptance can read the composed subject and body from the server
 * log, and sends always succeed.
 */
export class DeterministicMailTransport implements MailTransportAdapter {
  readonly #sent: NoticeMail[] = [];

  get sent(): readonly NoticeMail[] {
    return this.#sent;
  }

  async send(mail: NoticeMail): Promise<void> {
    this.#sent.push(mail);
    console.log(`[notice-mail:${mail.kind}] to=<${mail.toEmail}> subject="${mail.subject}"\n${mail.bodyText}\n`);
  }
}

export { createNodemailerTransport } from "./nodemailer";
