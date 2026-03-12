import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractJobFromText } from "@/lib/ai/gemini";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";
import { logger } from "@/lib/logger";

const extractUrlLogger = logger.child({ module: "api/extract/url" });

const Schema = z.object({
  url: z.string().min(1),
});

type JobPostingCandidate = {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  employmentType?: string;
  skills?: string[];
};

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).toString();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function stripHtmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  return regex.exec(html)?.[1]?.trim() ?? "";
}

function extractTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
}

function flattenJsonLd(input: unknown): Record<string, unknown>[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap((item) => flattenJsonLd(item));
  if (typeof input !== "object") return [];

  const record = input as Record<string, unknown>;
  const graph = record["@graph"];

  return [record, ...flattenJsonLd(graph)];
}

function coerceString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function collectStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item));
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) => collectStrings(item));
  }
  return [];
}

function extractJobPostingCandidate(html: string): JobPostingCandidate | null {
  const matches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw.replace(/<!--|-->/g, "").trim()) as unknown;
      const nodes = flattenJsonLd(parsed);
      const jobPosting = nodes.find((node) => {
        const type = node["@type"];
        if (Array.isArray(type)) {
          return type.some((entry) => typeof entry === "string" && entry.toLowerCase() === "jobposting");
        }
        return typeof type === "string" && type.toLowerCase() === "jobposting";
      });

      if (!jobPosting) continue;

      const hiringOrganization = jobPosting.hiringOrganization as Record<string, unknown> | undefined;
      const jobLocation = jobPosting.jobLocation as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
      const firstLocation = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
      const address = firstLocation?.address as Record<string, unknown> | undefined;

      const skills = [
        ...collectStrings(jobPosting.skills),
        ...collectStrings(jobPosting.qualifications),
      ];

      return {
        title: coerceString(jobPosting.title),
        company: coerceString(hiringOrganization?.name),
        location:
          coerceString(address?.addressLocality) ??
          coerceString(address?.addressRegion) ??
          coerceString(firstLocation?.name),
        description: coerceString(jobPosting.description),
        employmentType: coerceString(jobPosting.employmentType),
        skills: Array.from(new Set(skills)).slice(0, 12),
      };
    } catch {
      continue;
    }
  }

  return null;
}

function buildExtractionText(opts: {
  url: string;
  html: string;
  structured: JobPostingCandidate | null;
}) {
  const title = decodeHtmlEntities(extractTitle(opts.html));
  const metaTitle = decodeHtmlEntities(extractMetaContent(opts.html, "og:title"));
  const metaDescription = decodeHtmlEntities(
    extractMetaContent(opts.html, "description") || extractMetaContent(opts.html, "og:description")
  );
  const bodyText = stripHtmlToText(opts.html).slice(0, 12000);

  const structuredBlock = opts.structured
    ? [
        opts.structured.title ? `Structured title: ${opts.structured.title}` : "",
        opts.structured.company ? `Structured company: ${opts.structured.company}` : "",
        opts.structured.location ? `Structured location: ${opts.structured.location}` : "",
        opts.structured.employmentType ? `Employment type: ${opts.structured.employmentType}` : "",
        opts.structured.skills?.length ? `Structured skills: ${opts.structured.skills.join(", ")}` : "",
        opts.structured.description ? `Structured description:\n${stripHtmlToText(opts.structured.description)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return [
    `Source URL: ${opts.url}`,
    title ? `Page title: ${title}` : "",
    metaTitle ? `Meta title: ${metaTitle}` : "",
    metaDescription ? `Meta description: ${metaDescription}` : "",
    structuredBlock,
    `Page text:\n${bodyText}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function looksBlocked(html: string, text: string) {
  const lowerHtml = html.toLowerCase();
  const lowerText = text.toLowerCase();
  return (
    text.length < 200 &&
    (
      lowerHtml.includes("enable javascript") ||
      lowerHtml.includes("captcha") ||
      lowerHtml.includes("access denied") ||
      lowerHtml.includes("cloudflare") ||
      lowerText.includes("sign in") ||
      lowerText.includes("log in")
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(parsed.data.url);
    } catch {
      return NextResponse.json({ success: false, error: "Enter a valid public job URL." }, { status: 400 });
    }

    extractUrlLogger.info({ userId, url: normalizedUrl }, "Extracting job from URL");

    const response = await fetch(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not fetch that page (${response.status}). Use a public job URL or paste the job text manually.`,
        },
        { status: 422 }
      );
    }

    const html = await response.text();
    if (!html.trim()) {
      return NextResponse.json(
        { success: false, error: "That page returned no readable content. Paste the job text manually." },
        { status: 422 }
      );
    }

    const structured = extractJobPostingCandidate(html);
    const extractionText = buildExtractionText({ url: normalizedUrl, html, structured });

    if (looksBlocked(html, extractionText)) {
      return NextResponse.json(
        {
          success: false,
          error: "That site blocked server-side extraction. Use screenshot mode or paste the job text manually.",
        },
        { status: 422 }
      );
    }

    const extracted = await extractJobFromText(extractionText);

    return NextResponse.json({
      success: true,
      data: {
        ...extracted,
        company: extracted.company || structured?.company || "",
        role: extracted.role || structured?.title || "",
        location: extracted.location || structured?.location || null,
        jobDescription: extracted.jobDescription || structured?.description || extractionText.slice(0, 4000),
        skills: extracted.skills.length > 0 ? extracted.skills : structured?.skills ?? [],
      },
    });
  } catch (err) {
    extractUrlLogger.error({ err }, "POST /api/extract/url failed");
    return NextResponse.json(
      {
        success: false,
        error: "URL extraction failed. Try another public job page, or use screenshot/text paste instead.",
      },
      { status: 500 }
    );
  }
}
