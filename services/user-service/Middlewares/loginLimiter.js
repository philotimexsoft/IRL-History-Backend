const rateLimit = require("express-rate-limit");

// Limit: 5 requests per 10 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    message: "Too many login attempts. Please try again after 10 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = { loginLimiter };