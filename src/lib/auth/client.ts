// [F59] src/lib/auth/client.ts — Auth.js client-side exports
// Re-export client hooks for use in components

export { signIn, signOut, useSession } from "next-auth/react";
export { SessionProvider } from "next-auth/react";
