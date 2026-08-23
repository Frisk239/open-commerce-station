import { hash } from "bcryptjs";

const password = process.env.OWNER_PASSWORD;

if (!password || password.length < 12) {
  throw new Error("Set a temporary OWNER_PASSWORD of at least 12 characters, run this command, then clear it from the shell.");
}

process.stdout.write(`${await hash(password, 12)}\n`);
