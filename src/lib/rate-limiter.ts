/**
 * In-memory rate limiter for abuse protection on the analysis endpoint.
 *
 * NOTE ON DEPLOYMENT ARCHITECTURE:
 * This is an in-memory implementation suited for hackathon and single-instance deployments.
 * In a distributed, multi-region, or serverless autoscaling environment with ephemeral cold starts,
 * each instance maintains its own memory pool. For production multi-node scaling, an external
 * fast store such as Redis/Upstash would be used.
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxTrackedIps: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000, // 1 minute window
  maxRequests: 6, // 6 requests per minute per IP (generous for human reasoning, limits quota drains)
  maxTrackedIps: 5_000, // Bound maximum entries to avoid memory leaks
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  check(ip: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.config.windowMs;
    const timestamps = (this.requests.get(ip) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.config.maxRequests) {
      const oldestInWindow = timestamps[0] ?? now;
      const resetSeconds = Math.max(1, Math.ceil((oldestInWindow + this.config.windowMs - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetSeconds,
      };
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);

    // Housekeeping: prevent unbounded growth
    if (this.requests.size > this.config.maxTrackedIps) {
      this.prune(now);
    }

    const resetSeconds = Math.ceil(this.config.windowMs / 1000);
    return {
      allowed: true,
      remaining: Math.max(0, this.config.maxRequests - timestamps.length),
      resetSeconds,
    };
  }

  private prune(now: number): void {
    const windowStart = now - this.config.windowMs;
    for (const [key, timestamps] of this.requests.entries()) {
      const active = timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, active);
      }
    }
  }

  reset(): void {
    this.requests.clear();
  }
}

export const rateLimiter = new InMemoryRateLimiter();
