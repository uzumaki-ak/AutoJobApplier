// [F75] prisma.config.ts — Prisma 7 configuration
// DATABASE_URL lives HERE — not in schema.prisma (Prisma 7 breaking change)
// Docs: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/prisma-config-file

import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
});
