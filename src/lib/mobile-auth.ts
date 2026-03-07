// src/lib/mobile-auth.ts
// Called from inside route handlers (Node.js context) — Prisma works fine here.
// Priority: 1) session cookie (browser/extension)  2) x-api-key header (Android)

import { auth } from "@/lib/auth/server"
import { db } from "@/lib/db/prisma"
import { headers } from "next/headers"

export async function getUserId(): Promise<string | null> {
  // 1. Session cookie — works for browser and Chrome extension
  try {
    const session = await auth()
    if (session?.user?.id) return session.user.id
  } catch { /* fall through */ }

  // 2. Mobile API key — works for Android app
  const headersList = await headers()
  const apiKey      = headersList.get("x-api-key")
  const validApiKey = process.env.MOBILE_API_KEY

  if (!apiKey || !validApiKey || apiKey !== validApiKey) return null

  // Key matches — find the user (single-user personal tool)
  const user = await db.user.findFirst({
    select:  { id: true },
    orderBy: { createdAt: "asc" },
  })
  return user?.id ?? null
}
