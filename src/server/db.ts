import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Silences a pg deprecation warning: `sslmode=require/prefer/verify-ca` will
// change meaning in pg v9, but for now they behave like `verify-full`. We make
// that explicit so the warning doesn't fire on every cold start.
function normalizeSslMode(url: string): string {
  return url.replace(/(\?|&)sslmode=(require|prefer|verify-ca)\b/g, "$1sslmode=verify-full");
}

function createClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. See .env.example for required vars.");
  }
  const adapter = new PrismaPg({ connectionString: normalizeSslMode(raw) });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (!global.__prisma) {
    global.__prisma = createClient();
  }
  return global.__prisma;
}

// Lazy proxy: defers client construction (and DATABASE_URL check) until first use.
// Lets `next build` succeed without a connection string when no route actually queries the DB.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
