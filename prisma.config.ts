import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  experimental: {
    adapter: true,
  },
  async adapter() {
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "Set DATABASE_URL (and optionally DIRECT_URL) in your environment or .env file before running Prisma CLI.",
      );
    }
    return new PrismaPg({ connectionString: url });
  },
});
