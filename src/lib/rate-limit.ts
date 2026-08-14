import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getUpstashRedisUrl, getUpstashRedisToken } from "@/lib/env";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export type RateLimitRoute = "feedback";

const noopResult: RateLimitResult = {
  success: true,
  limit: 0,
  remaining: 0,
  reset: 0,
};

function createNoopLimiter(): (identifier: string) => Promise<RateLimitResult> {
  return async () => noopResult;
}

export function getFeedbackRateLimiter(): (
  identifier: string
) => Promise<RateLimitResult> {
  let url: string;
  let token: string;
  try {
    url = getUpstashRedisUrl();
    token = getUpstashRedisToken();
  } catch {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN ausente. Rate limiting deshabilitado para \"feedback\"."
      );
    }
    return createNoopLimiter();
  }

  if (!url.startsWith("https://")) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL inválida (debe ser https://). Rate limiting deshabilitado para \"feedback\"."
      );
    }
    return createNoopLimiter();
  }

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 d"),
    analytics: true,
    prefix: "rl:feedback",
  });

  return async (identifier: string): Promise<RateLimitResult> => {
    try {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (err) {
      // FAIL-CLOSED: si Redis está configurado pero falla, se rechaza la petición.
      console.error(
        `[rate-limit] Redis failure on "feedback" for "${identifier}":`,
        err
      );
      return { success: false, limit: 0, remaining: 0, reset: 0 };
    }
  };
}
