import { provisionOwner } from "../src/index";

const email = process.env.OWNER_EMAIL;
const passwordHash = process.env.OWNER_PASSWORD_HASH;

if (!email || !passwordHash) {
  throw new Error("OWNER_EMAIL and OWNER_PASSWORD_HASH are required for `pnpm db:seed`.");
}

const owner = await provisionOwner(email, passwordHash);
process.stdout.write(`Provisioned Merchant owner ${owner.email}.\n`);
