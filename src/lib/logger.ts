// [F66] src/lib/logger.ts - Pino logger singleton
// Structured JSON logging for terminal debugging
// Usage: logger.info({ userId }, "Generated email")
//        logger.error({ err, userId }, "Failed to generate")

import pino from "pino";

// Raw JSON logs in all environments to avoid worker-thread transport issues in Next.js
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // Redact sensitive fields - never log tokens or passwords
  redact: {
    paths: [
      "*.gmailAccessToken",
      "*.gmailRefreshToken",
      "*.password",
      "*.token",
      "*.secret",
      "authorization",
    ],
    censor: "[REDACTED]",
  },
  base: {
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child loggers for each module - easier filtering
export const dbLogger = logger.child({ module: "db" });
export const aiLogger = logger.child({ module: "ai" });
export const gmailLogger = logger.child({ module: "gmail" });
export const authLogger = logger.child({ module: "auth" });
export const cronLogger = logger.child({ module: "cron" });
