// lib/redis.ts
import { Redis } from "@upstash/redis";

// A integração Upstash do Marketplace da Vercel injeta automaticamente
// UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN nas env vars do projeto.
export const redis = Redis.fromEnv();

// Chaves usadas:
//   trends:latest    -> snapshot da última rodada do cron
//   trends:previous  -> snapshot da rodada anterior (para calcular movimento)
//   trends:history   -> lista capada com contagens por tema (para gráfico futuro)
export const KEYS = {
  latest: "trends:latest",
  previous: "trends:previous",
  history: "trends:history",
} as const;

export const HISTORY_LIMIT = 96; // ~4 dias se o cron rodar de hora em hora
