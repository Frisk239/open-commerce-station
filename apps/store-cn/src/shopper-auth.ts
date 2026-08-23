import { authenticateShopper } from "@ocs/data";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentials = z.object({ email: z.string().trim().email().max(320), password: z.string().min(12).max(128) });
export const { handlers: shopperHandlers, signIn: shopperSignIn, signOut: shopperSignOut, auth: shopperAuth } = NextAuth({
  pages: { signIn: "/account/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  cookies: { sessionToken: { name: "ocs.shopper.cn", options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" } } },
  providers: [Credentials({ credentials: { email: { type: "email" }, password: { type: "password" } }, async authorize(input) { const parsed = credentials.safeParse(input); return parsed.success ? authenticateShopper("cn", parsed.data.email, parsed.data.password) : null; } })],
});
