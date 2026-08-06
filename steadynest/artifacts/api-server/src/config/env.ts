import { z } from "zod";

// ── Environment validation ────────────────────────────────────────────────────
// Every environment variable the server reads is declared here and validated at
// boot. Nothing else in the codebase should touch `process.env` directly.
//
// The reason this file exists: the settings it replaces all had silent
// fallbacks. `JWT_ACCESS_SECRET || "access_secret_dev"` starts perfectly well
// with no secret configured and signs tokens anyone holding this repo can
// forge; `STRIPE_WEBHOOK_SECRET || "whsec_test_mock"` verifies webhook
// signatures against a value printed in the source. A misconfigured deploy
// looked identical to a correct one. Failing loudly at boot is the whole point,
// so prefer adding a variable here over reintroducing a default.

const PLACEHOLDERS = new Set([
  "your_gemini_api_key_here",
  "access_secret_dev",
  "refresh_secret_dev",
  "sk_test_mock",
  "whsec_test_mock",
  "changeme",
  "todo",
  "",
]);

/** Rejects the literal placeholder values that used to ship as fallbacks. */
const notPlaceholder = (label: string) =>
  z.string().refine((v) => !PLACEHOLDERS.has(v.trim().toLowerCase()), {
    message: `${label} is still set to a placeholder/dev-default value. Set a real one.`,
  });

/**
 * Secrets used to sign tokens. 32 chars is the floor for an HMAC-SHA256 key
 * that isn't trivially brute-forceable; the old 17-character "access_secret_dev"
 * would not have survived an offline attack.
 */
const signingSecret = (label: string) =>
  notPlaceholder(label).pipe(
    z.string().min(32, `${label} must be at least 32 characters`),
  );

const optionalKey = (label: string) => notPlaceholder(label).optional();

const baseSchema = z.object({
  // ── Core ──
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce
    .number()
    .int("PORT must be a whole number")
    .min(1, "PORT must be between 1 and 65535")
    .max(65535, "PORT must be between 1 and 65535")
    .default(8080),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  // ── Database ──
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => /^postgres(ql)?:\/\//.test(v), {
      message: "DATABASE_URL must be a postgres:// or postgresql:// URL",
    }),

  // ── Auth ──
  // Access and refresh secrets must differ: if they are equal, a refresh token
  // validates as an access token and the 15-minute access expiry means nothing.
  JWT_ACCESS_SECRET: signingSecret("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: signingSecret("JWT_REFRESH_SECRET"),

  // ── AI (Tira) ──
  GEMINI_API_KEY: optionalKey("GEMINI_API_KEY"),

  // ── SMS: OTP delivery (MSG91) and SOS dispatch (Twilio) ──
  MSG91_AUTH_KEY: optionalKey("MSG91_AUTH_KEY"),
  MSG91_SENDER_ID: z.string().default("STEADY"),
  MSG91_ROUTE: z.string().default("4"),
  TWILIO_ACCOUNT_SID: optionalKey("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: optionalKey("TWILIO_AUTH_TOKEN"),
  TWILIO_FROM_NUMBER: optionalKey("TWILIO_FROM_NUMBER"),

  // ── Maps / Places ──
  GOOGLE_PLACES_API_KEY: optionalKey("GOOGLE_PLACES_API_KEY"),
  GOOGLE_MAPS_API_KEY: optionalKey("GOOGLE_MAPS_API_KEY"),

  // ── Payments ──
  STRIPE_SECRET_KEY: optionalKey("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optionalKey("STRIPE_WEBHOOK_SECRET"),

  // ── Misc ──
  APP_URL: z.string().url("APP_URL must be a full URL").default("http://localhost:8081"),
});

const envSchema = baseSchema
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    path: ["JWT_REFRESH_SECRET"],
    message:
      "JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET, otherwise a refresh token is accepted as an access token",
  })
  // Keys that are optional in development become mandatory in production: a
  // production server that silently degrades to the local OTP console logger or
  // an unverified Stripe webhook is worse than one that refuses to start.
  .superRefine((e, ctx) => {
    if (e.NODE_ENV !== "production") return;
    const requiredInProd: Array<[keyof typeof e, string]> = [
      ["GEMINI_API_KEY", "Tira AI cannot answer without it"],
      ["MSG91_AUTH_KEY", "phone OTP cannot be delivered without it"],
      ["STRIPE_SECRET_KEY", "payments cannot be taken without it"],
      ["STRIPE_WEBHOOK_SECRET", "payment webhooks would go unverified without it"],
    ];
    for (const [key, why] of requiredInProd) {
      if (!e[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key as string],
          message: `${String(key)} is required when NODE_ENV=production - ${why}`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const name = i.path.join(".") || "(root)";
      return `  - ${name}: ${i.message}`;
    })
    .join("\n");
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Written to stderr directly rather than through pino: the logger itself
    // reads LOG_LEVEL from the env we have just failed to validate, and a
    // config error must be readable even if logging is misconfigured.
    process.stderr.write(
      [
        "",
        "FATAL: SteadyNest API refused to start - invalid environment configuration.",
        "",
        formatIssues(parsed.error),
        "",
        "Set these in artifacts/api-server/.env (see .env.example for the full list).",
        "",
      ].join("\n") + "\n",
    );
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

/** True when a feature's keys are present; use instead of re-checking env vars. */
export const features = {
  tira: Boolean(env.GEMINI_API_KEY),
  otpSms: Boolean(env.MSG91_AUTH_KEY),
  sosSms: Boolean(
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER,
  ),
  payments: Boolean(env.STRIPE_SECRET_KEY),
  places: Boolean(env.GOOGLE_PLACES_API_KEY ?? env.GOOGLE_MAPS_API_KEY),
} as const;
