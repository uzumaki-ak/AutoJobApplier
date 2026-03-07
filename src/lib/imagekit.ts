// ImageKit upload helper (server-side only)

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

export type ImageKitUploadResult = {
  fileId: string;
  name: string;
  url: string;
  filePath: string;
  thumbnailUrl?: string;
};

export function isImageKitConfigured(): boolean {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT);
}

type UploadImageArgs = {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileName?: string;
  folder?: string;
  tags?: string[];
};

function getFileExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

export async function uploadImageToImageKit({
  base64,
  mimeType,
  fileName,
  folder,
  tags,
}: UploadImageArgs): Promise<ImageKitUploadResult> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!privateKey || !urlEndpoint) {
    throw new Error("ImageKit is not configured (missing env vars).");
  }

  const auth = Buffer.from(`${privateKey}:`).toString("base64");
  const safeFileName =
    fileName ?? `job-screenshot-${Date.now()}.${getFileExtension(mimeType)}`;
  const dataUri = `data:${mimeType};base64,${base64}`;

  const form = new FormData();
  form.append("file", dataUri);
  form.append("fileName", safeFileName);
  form.append("useUniqueFileName", "true");
  form.append("folder", folder ?? "/job-screenshots");
  if (tags && tags.length > 0) {
    form.append("tags", tags.join(","));
  }

  const response = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ImageKit upload failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as ImageKitUploadResult;
  return json;
}
