// Tiny in-memory rate limiter (single-process). Good enough to slow OTP
// guessing and login brute force on this MVP; use Redis / a gateway in
// production or behind multiple replicas.

const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 60 * 1000).unref();

function rateLimit({ windowMs = 10 * 60 * 1000, max = 30, keyFn } = {}) {
  return (req, res, next) => {
    try {
      const key = `${keyFn ? keyFn(req) : ""}|${req.ip}|${req.path}`;
      const now = Date.now();
      let b = buckets.get(key);
      if (!b || b.resetAt <= now) {
        b = { count: 0, resetAt: now + windowMs };
        buckets.set(key, b);
      }
      b.count += 1;
      if (b.count > max) {
        return res.status(429).json({ success: false, error: "Too many attempts — slow down and retry shortly." });
      }
      next();
    } catch {
      next();
    }
  };
}

module.exports = { rateLimit };
