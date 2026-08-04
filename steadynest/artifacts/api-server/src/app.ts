import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { sosLimiter } from "./routes/sos";

const app: Express = express();

// ── Security Headers (OWASP Best Practice) ───────────────────────────────────
app.use(helmet());

// ── Request Logging ──────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0], // Don't log query params (may contain sensitive data)
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow local IP requests, emulator requests, and dynamic tunnel requests
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://192.168.') || origin.endsWith('ngrok-free.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Set to true during development to resolve handshaking immediately
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ── Stripe Webhook (needs raw body) ──────────────────────────────────────────
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// ── Payload Size Limits (prevent memory overflow attacks) ────────────────────
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ── Global Rate Limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // 200 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
app.use(globalLimiter);

// ── Strict Rate Limiting for Auth & Security ─────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // 20 requests per 15 min per IP for auth
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});
app.use("/api/auth", authLimiter);

app.use("/api/sos", sosLimiter);

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Global Error Handler (sanitized — never expose internals) ────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Log the full error internally
  logger.error({ err }, "Unhandled error");

  // Return sanitized response — no stack traces, no file paths, no DB errors
  const statusCode = err.status ?? err.statusCode ?? 500;
  res.status(statusCode).json({
    error: statusCode >= 500
      ? "An internal error occurred. Please try again later."
      : (err.message ?? "Request failed."),
  });
});

export default app;
