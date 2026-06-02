// lib/redis.ts
import { Redis } from "@upstash/redis";

function pick(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

const url = pick(
  "UPSTASH_REDIS_REST_URL",
  "KV_REST_API_URL",
  "STORAGE_KV_REST_API_URL",
  "STORAGE_UPSTASH_REDIS_REST_URL",
  "STORAGE_REST_API_URL",
  "STORAGE_URL"
);

const token = pick(
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_TOKEN",
  "STORAGE_KV_REST_API_TOKEN",
  "STORAGE_UPSTASH_REDIS_REST_TOKEN",
  "STORAGE_REST_API_TOKEN",
  "STORAGE_TOKEN"
);

if (!url || !token) {
  console.error("Redis: credenciais não encontradas. Variáveis disponíveis:",
    Object.keys(process.env).filter((k) => /REDIS|KV|STORAGE|UPSTASH/i.test(k)));
}

export const redis = new Redis({ url: url as string, token: token as string });

export const KEYS = {
  clients: "clients:all",          // array de clientes (config)
  hotLatest: "trends:x:latest",    // snapshot atual do Hot Trends
  hotPrevious: "trends:x:previous", // snapshot anterior (p/ movimento de ranking)
} as const;
