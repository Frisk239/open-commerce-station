import type { StationFlavor } from "@ocs/core";
import { drainNoticeMails, readMailTransportConfig } from "@ocs/data";
import { createNodemailerTransport, DeterministicMailTransport } from "@ocs/plugins";

export function mailTransportMode(): "deterministic" | "smtp" {
  if (process.env.OCS_MAIL_ADAPTER === "deterministic" && process.env.NODE_ENV !== "production") return "deterministic";
  return "smtp";
}

/**
 * Flush pending Notice Mail for one flavor through the configured transport.
 * Without SMTP configuration the letters stay queued in the outbox, visible
 * and retryable from the Portal; the deterministic adapter (dev only) logs
 * them instead of sending.
 */
export async function flushNoticeMails(flavor: StationFlavor): Promise<void> {
  try {
    let transport;
    if (mailTransportMode() === "deterministic") {
      transport = new DeterministicMailTransport();
    } else {
      const config = await readMailTransportConfig(flavor);
      if (!config) return;
      transport = createNodemailerTransport(config);
    }
    await drainNoticeMails(flavor, async (mail) => transport.send(mail));
  } catch {
    // Drain failures land in the outbox as failed letters; never break the page.
  }
}
