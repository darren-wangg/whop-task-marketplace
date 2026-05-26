import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (Next.js convention), then fall back to .env.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// Migrations & db push read this URL; `prisma generate` does not need it.
// Leave undefined when missing so generate works in CI before secrets are wired.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  ...(url ? { datasource: { url } } : {}),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
