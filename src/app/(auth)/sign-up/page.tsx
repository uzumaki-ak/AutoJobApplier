// [F06] src/app/(auth)/sign-up/page.tsx — Sign up (same as sign-in with Google OAuth)

import { redirect } from "next/navigation";

// Google OAuth handles sign-up automatically — redirect to sign-in
export default function SignUpPage() {
  redirect("/sign-in");
}
