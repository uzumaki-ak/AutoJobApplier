import { auth } from "@/lib/auth/server"
import { headers } from "next/headers"
import { db } from "@/lib/db/prisma"

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id

  const headersList = await headers()
  const apiKey   = headersList.get("x-api-key")
  const validKey = process.env.MOBILE_API_KEY
  if (!apiKey || !validKey || apiKey !== validKey) return null

  const user = await db.user.findFirst({ select: { id: true } })
  return user?.id ?? null
}