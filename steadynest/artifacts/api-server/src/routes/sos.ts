import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { trustedContacts } from "@workspace/db/schema";

import { env, features } from "../config/env";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";

const sosTriggerSchema = z.object({
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
}).strip();

type SosLogger = Pick<typeof logger, "info" | "warn" | "error">;

type SosDependencies = {
  loadTrustedContactPhones: (userId: string) => Promise<string[]>;
  sendSms: (to: string, body: string) => Promise<boolean>;
  smsConfigured: boolean;
  logger: SosLogger;
};

type SosDependencyOverrides = Partial<SosDependencies>;

async function sendTwilioSms(to: string, body: string): Promise<boolean> {
  if (!features.sosSms) return false;

  try {
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: env.TWILIO_FROM_NUMBER!,
          Body: body,
        }).toString(),
      },
    );

    return response.ok;
  } catch (error) {
    logger.error({ err: error }, "SOS SMS provider request failed");
    return false;
  }
}

async function loadTrustedContactPhones(userId: string): Promise<string[]> {
  const contacts = await db
    .select({ phone: trustedContacts.phone })
    .from(trustedContacts)
    .where(eq(trustedContacts.user_id, userId))
    .orderBy(asc(trustedContacts.priority));

  return contacts.map((contact) => contact.phone);
}

const productionDependencies: SosDependencies = {
  loadTrustedContactPhones,
  sendSms: sendTwilioSms,
  smsConfigured: features.sosSms,
  logger,
};

/** Rate-limit the route actually mounted at /api/sos/trigger. */
export function createSosLimiter({
  windowMs = 60 * 60 * 1000,
  limit = 5,
}: {
  windowMs?: number;
  limit?: number;
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many SOS attempts. Please try again later." },
  });
}

export const sosLimiter = createSosLimiter();

/**
 * SOS is intentionally authenticated. The token subject chooses the trusted
 * contacts; request-body recipients are stripped and can never become an SMS
 * target. The factory keeps the authorization and dispatch behaviour testable
 * without a live database, Twilio account, or SMS send.
 */
export function createSosRouter(overrides: SosDependencyOverrides = {}) {
  const dependencies: SosDependencies = { ...productionDependencies, ...overrides };
  const router = Router();

  router.post("/trigger", requireAuth, async (req, res) => {
    const parsed = sosTriggerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Valid GPS coordinates are required" });
    }

    const userId = (req as any).userId as string;
    const { latitude, longitude } = parsed.data;

    let contacts: string[];
    try {
      contacts = await dependencies.loadTrustedContactPhones(userId);
    } catch (error) {
      dependencies.logger.error({ err: error, userId }, "Could not load SOS trusted contacts");
      return res.status(500).json({ success: false, error: "Could not prepare SOS contacts" });
    }

    dependencies.logger.info(
      {
        event: "sos_trigger_received",
        userId,
        trustedContactCount: contacts.length,
        smsConfigured: dependencies.smsConfigured,
      },
      "SOS trigger received",
    );

    if (!dependencies.smsConfigured) {
      return res.json({
        success: true,
        dispatched: false,
        message: "Automatic SOS delivery is not configured. No messages were sent.",
        timestamp: new Date().toISOString(),
      });
    }

    if (contacts.length === 0) {
      return res.json({
        success: true,
        dispatched: false,
        message: "No trusted contacts are configured. No messages were sent.",
        timestamp: new Date().toISOString(),
      });
    }

    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const body = `EMERGENCY SOS: I need help. My live location: ${mapsLink}`;
    const dispatchResults = await Promise.allSettled(contacts.map((phone) => dependencies.sendSms(phone, body)));
    const dispatched = dispatchResults.every(
      (result) => result.status === "fulfilled" && result.value,
    );

    if (!dispatched) {
      dependencies.logger.warn(
        { event: "sos_dispatch_incomplete", userId, trustedContactCount: contacts.length },
        "SOS dispatch was not confirmed for every trusted contact",
      );
    }

    return res.json({
      success: true,
      dispatched,
      message: dispatched
        ? "SOS alert accepted by the configured SMS provider for every trusted contact."
        : "SOS delivery was not confirmed. No delivery status should be assumed.",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

export default createSosRouter();
