# Owner SMTP; Nodemailer sends the three letters

The owner pastes SMTP settings in the Portal. Nodemailer sends the three Notice Mails. This project does not resell a mail host. Marketing mail waits.

**Status:** accepted

**Considered Options:** owner SMTP; a single hosted mail vendor

**Consequences:** Portal has SMTP fields. Failed sends are retried or logged; Redis may queue later. `chanpin/` shows the settings form, not a campaign product.
