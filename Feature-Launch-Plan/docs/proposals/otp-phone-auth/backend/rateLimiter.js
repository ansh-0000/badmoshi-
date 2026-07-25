// middleware/rateLimiter.js
//
// In-memory sliding-window rate limiter — deliberate MVP choice for a
// single-instance backend (see system design doc, Trade-off Analysis).
// The moment this runs on more than one process (load balancer, multiple
// serverless containers), this stops sharing state correctly and MUST be
// swapped for a Redis-backed limiter. That line is marked below.

const buckets = new Map(); // key -> { count, windowStart }

function makeLimiter({ windowMs, max, keyFn }) {
  return function rateLimiter(req, res, next) {
    const key = keyFn(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart > windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.ceil((windowMs - (now - bucket.windowStart)) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'rate_limited', retryAfterSec });
    }

    bucket.count += 1;
    return next();
  };
}

// --- SWAP TO REDIS HERE once running more than one backend instance ---
// e.g. using `rate-limiter-flexible` with a RedisStore, keyed the same way.

// Max 5 OTP requests per phone number per 10 minutes.
const otpRequestLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyFn: (req) => `otp_request:${req.body?.phone ?? req.ip}`,
});

// Max 20 OTP requests per IP per 10 minutes (catches one device
// cycling through many phone numbers, not just one number being hammered).
const otpRequestIpLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyFn: (req) => `otp_request_ip:${req.ip}`,
});

// Max 5 verify attempts per requestId per 5 minutes — bounds brute-forcing
// a 6-digit code without requiring a CAPTCHA on every single attempt.
const otpVerifyLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  keyFn: (req) => `otp_verify:${req.body?.requestId ?? req.body?.phone ?? req.ip}`,
});

module.exports = { otpRequestLimiter, otpRequestIpLimiter, otpVerifyLimiter };
