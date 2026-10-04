import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rateLimiter } from "../src/lib/rate-limiter";

beforeEach(() => {
  rateLimiter.reset();
});

test("Rate Limiter: allows requests up to the max limit", () => {
  const ip = "192.168.1.100";
  const now = 1_000_000;

  for (let i = 0; i < 6; i++) {
    const res = rateLimiter.check(ip, now + i * 100);
    assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
    assert.equal(res.remaining, 5 - i);
  }
});

test("Rate Limiter: blocks requests exceeding limit and returns reset seconds", () => {
  const ip = "192.168.1.101";
  const now = 1_000_000;

  // Max 6 requests allowed in default config
  for (let i = 0; i < 6; i++) {
    rateLimiter.check(ip, now);
  }

  const blocked = rateLimiter.check(ip, now + 1000);
  assert.equal(blocked.allowed, false, "7th request should be blocked");
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.resetSeconds > 0, "Should report positive resetSeconds");
});

test("Rate Limiter: isolates rate limits between different IP addresses", () => {
  const ipA = "10.0.0.1";
  const ipB = "10.0.0.2";
  const now = 1_000_000;

  // Exhaust ipA
  for (let i = 0; i < 6; i++) {
    rateLimiter.check(ipA, now);
  }

  assert.equal(rateLimiter.check(ipA, now).allowed, false, "ipA should be blocked");
  assert.equal(rateLimiter.check(ipB, now).allowed, true, "ipB should still be allowed");
});

test("Rate Limiter: resets allowed quota after window expires", () => {
  const ip = "10.0.0.3";
  const t0 = 1_000_000;

  for (let i = 0; i < 6; i++) {
    rateLimiter.check(ip, t0);
  }

  assert.equal(rateLimiter.check(ip, t0 + 1000).allowed, false);

  // Advance time past the 60,000ms window
  const tLater = t0 + 61_000;
  const resAfterWindow = rateLimiter.check(ip, tLater);
  assert.equal(resAfterWindow.allowed, true, "Should allow request after window has elapsed");
});
