import { authenticateOwner } from "@ocs/data";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  logger: {
    error(error) {
      if (!(error instanceof CredentialsSignin)) console.error("[auth]", error);
    },
  },
  pages: {
    signIn: "/portal/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        return parsed.success ? authenticateOwner(parsed.data.email, parsed.data.password) : null;
      },
    }),
  ],
});
