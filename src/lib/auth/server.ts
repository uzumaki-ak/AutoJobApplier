// [F58] src/lib/auth/server.ts — Auth.js v5 (NextAuth) server config
// Google OAuth for user authentication
// Session stored in DB via Prisma adapter (or JWT for edge compat)

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authLogger } from "@/lib/logger";
import { db } from "@/lib/db/prisma";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  secret: process.env.AUTH_SECRET!,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    /** Persist user in our DB on first sign-in */
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        // Upsert user — create if new, skip if existing
        await db.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
          },
        });

        authLogger.info({ email: user.email, provider: account?.provider }, "User signed in");
        return true;
      } catch (err) {
        authLogger.error({ err, email: user.email }, "Failed to upsert user on sign-in");
        return false;
      }
    },

    /** Attach internal user ID to JWT */
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },

    /** Expose userId in session object */
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
});
