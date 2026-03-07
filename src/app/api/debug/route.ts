import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { getUserId } from "@/lib/mobile-auth"

export async function GET() {
  const h = await headers()
  const userId = await getUserId()
  return NextResponse.json({
    receivedKey: h.get("x-api-key"),
    envKey: process.env.MOBILE_API_KEY,
    match: h.get("x-api-key") === process.env.MOBILE_API_KEY,
    userId,
  })
}