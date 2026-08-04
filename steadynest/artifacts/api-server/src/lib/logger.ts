import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const sensitiveLogPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "req.body.phone",
  "req.body.contacts",
  "req.body.contacts.*",
  "req.body.latitude",
  "req.body.longitude",
  "phone",
  "contacts",
  "contacts.*",
  "latitude",
  "longitude",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: { paths: sensitiveLogPaths, censor: "[Redacted]" },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
