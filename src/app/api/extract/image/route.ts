import { NextRequest, NextResponse } from "next/server"
import { EmptyExtractionError, extractJobFromImage } from "@/lib/ai/gemini"
import { logger } from "@/lib/logger"
import { getAuthenticatedUserId } from "@/lib/auth/mobile"
import { isImageKitConfigured, uploadImageToImageKit } from "@/lib/imagekit"

const extractLogger = logger.child({ module: "api/extract/image" })

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { imageBase64, mimeType = "image/jpeg" } = body

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: "imageBase64 is required" }, { status: 400 })
    }

    // 4MB base64 limit
    if (imageBase64.length > 5_600_000) {
      return NextResponse.json({ success: false, error: "Image too large (max 4MB)" }, { status: 413 })
    }

    extractLogger.info({ userId }, "Extracting job from image")

    let imageUpload: { url: string; fileId: string } | null = null
    if (isImageKitConfigured()) {
      try {
        const uploaded = await uploadImageToImageKit({
          base64: imageBase64,
          mimeType,
          folder: process.env.IMAGEKIT_FOLDER ?? "/job-screenshots",
          tags: ["job-screenshot", userId],
        })
        imageUpload = { url: uploaded.url, fileId: uploaded.fileId }
      } catch (err) {
        extractLogger.warn({ err }, "ImageKit upload failed â€” continuing without storage")
      }
    }

    const jobData = await extractJobFromImage(imageBase64, mimeType)

    return NextResponse.json({
      success: true,
      data: {
        ...jobData,
        imageUrl: imageUpload?.url ?? null,
        imageFileId: imageUpload?.fileId ?? null,
      },
    })
  } catch (err) {
    if (err instanceof EmptyExtractionError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 422 })
    }
    extractLogger.error({ err }, "POST /api/extract/image failed")
    return NextResponse.json({ success: false, error: "Extraction failed" }, { status: 500 })
  }
}
