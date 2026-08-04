import { Router, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenAI, Type } from "@google/genai";
import { and, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db, listings } from "@workspace/db";

import { env, features } from "../config/env";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";

const supportedCities = ["delhi", "new delhi", "gurgaon", "gurugram", "noida", "ghaziabad", "faridabad"];
const rentalTerms = /\b(rent|rental|lease|tenant|landlord|move(?:-| )?in|moving|deposit|agreement|flat|apartment|room|co-?living|house|home|listing|budget|notice|evict(?:ion)?|utility|maintenance|occupancy)\b/i;

const askSchema = z.object({
  question: z.string().trim().min(1).max(700),
  city: z.string().trim().min(1).max(80).optional(),
}).strip();

const translateSchema = z.object({
  text: z.string().trim().min(1).max(500),
  targetLanguage: z.enum([
    "hindi", "tamil", "malayalam", "kannada", "bengali", "gujarati", "marathi",
    "japanese", "thai", "french", "spanish", "german", "indonesian", "vietnamese",
  ]),
}).strip();

const listingIntentSchema = z.object({
  type: z.enum(["apartment", "house", "room", "co-living"]).optional(),
  maxPrice: z.number().int().positive().max(500_000).optional(),
}).strip();

const answerSchema = z.object({
  response: z.string().min(1).max(2_000),
  suggestedActions: z.array(z.string().min(1).max(100)).max(4).default([]),
  propertySearchIntent: listingIntentSchema.optional(),
}).strip();

const translationResultSchema = z.object({
  translated: z.string().min(1).max(2_000),
  transliteration: z.string().max(2_000).nullable().optional(),
}).strip();

type TiraAnswer = z.infer<typeof answerSchema>;
type TiraTranslation = z.infer<typeof translationResultSchema>;

type TiraDependencies = {
  aiEnabled: boolean;
  generateAnswer: (question: string) => Promise<TiraAnswer>;
  generateTranslation: (text: string, targetLanguage: z.infer<typeof translateSchema>["targetLanguage"]) => Promise<TiraTranslation>;
  findListings: (intent: z.infer<typeof listingIntentSchema>) => Promise<unknown[]>;
};

const TIRA_SYSTEM_INSTRUCTION = `
You are Tira, the SteadyNest assistant for Delhi NCR renters and landlords.
Your scope is strictly rental discovery, lease terms, deposits, move-in planning,
tenant-landlord communication, maintenance, and moving logistics in Delhi NCR.
Do not provide travel, tourism, restaurant, shopping, nightlife, medical, legal,
financial, immigration, or emergency advice. Do not invent listing availability,
prices, laws, or outcomes. State when a user should check a signed agreement or
consult a qualified local professional. Reply only with the requested JSON.
`;

async function generateAnswer(question: string): Promise<TiraAnswer> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: question,
    config: {
      systemInstruction: TIRA_SYSTEM_INSTRUCTION,
      temperature: 0.2,
      responseMimeType: "application/json",
      // Deliberately no search/grounding or places tools: those can create
      // unbounded third-party cost and are outside Tira's rental scope.
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          response: { type: Type.STRING },
          suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          propertySearchIntent: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              maxPrice: { type: Type.INTEGER },
            },
          },
        },
        required: ["response", "suggestedActions"],
      },
    },
  });

  if (!result.text) throw new Error("Tira returned no content");
  return answerSchema.parse(JSON.parse(result.text));
}

async function generateTranslation(
  text: string,
  targetLanguage: z.infer<typeof translateSchema>["targetLanguage"],
): Promise<TiraTranslation> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: text,
    config: {
      systemInstruction: `Translate the user's text into ${targetLanguage} accurately and politely. Reply only with the requested JSON.`,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translated: { type: Type.STRING },
          transliteration: { type: Type.STRING, nullable: true },
        },
        required: ["translated"],
      },
    },
  });

  if (!result.text) throw new Error("Translation returned no content");
  return translationResultSchema.parse(JSON.parse(result.text));
}

async function findListings(intent: z.infer<typeof listingIntentSchema>) {
  const conditions = [];
  if (intent.type) conditions.push(eq(listings.type, intent.type));
  if (intent.maxPrice) conditions.push(lte(listings.price, intent.maxPrice));

  return db.select()
    .from(listings)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(5);
}

const productionDependencies: TiraDependencies = {
  aiEnabled: features.tira,
  generateAnswer,
  generateTranslation,
  findListings,
};

/** Per-user ceiling for both Tira prompts and translations. */
export function createTiraLimiter({
  windowMs = 15 * 60 * 1000,
  limit = 10,
}: {
  windowMs?: number;
  limit?: number;
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator: (req) => (req as any).userId as string,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Tira request limit reached. Please try again shortly." },
  });
}

function isSupportedCity(city: string | undefined) {
  if (!city) return true;
  const normalized = city.toLowerCase();
  return supportedCities.some((supported) => normalized.includes(supported));
}

function isRentalScope(question: string) {
  return rentalTerms.test(question);
}

type GuideRouterOptions = Partial<TiraDependencies> & { limiter?: RequestHandler };

export function createGuideRouter({ limiter = createTiraLimiter(), ...overrides }: GuideRouterOptions = {}) {
  const dependencies: TiraDependencies = { ...productionDependencies, ...overrides };
  const router = Router();

  // The limiter follows authentication, so it is keyed by the JWT subject
  // rather than a shared office/emulator IP address.
  router.use(requireAuth, limiter);

  router.post("/ask", async (req, res) => {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Enter a rental question of 700 characters or fewer." });
    }
    if (!isSupportedCity(parsed.data.city)) {
      return res.status(400).json({ success: false, error: "Tira currently supports Delhi NCR rentals only." });
    }
    if (!isRentalScope(parsed.data.question)) {
      return res.json({
        success: true,
        inScope: false,
        response: "Tira is limited to Delhi NCR rentals, leases, and move-in support. I can help you compare a stay, understand a lease clause, or plan your move.",
        suggestedActions: ["Find a stay", "Explain my lease", "Plan my move-in"],
        recommendedStays: [],
      });
    }
    if (!dependencies.aiEnabled) {
      return res.status(503).json({
        success: false,
        error: "Tira is not configured right now. No AI response was generated.",
      });
    }

    try {
      const answer = await dependencies.generateAnswer(parsed.data.question);
      const recommendedStays = answer.propertySearchIntent
        ? await dependencies.findListings(answer.propertySearchIntent)
        : [];
      return res.json({
        success: true,
        inScope: true,
        response: answer.response,
        suggestedActions: answer.suggestedActions,
        recommendedStays,
      });
    } catch (error) {
      logger.error({ err: error, userId: (req as any).userId }, "Tira request failed");
      return res.status(502).json({ success: false, error: "Tira could not answer that right now. Please try again." });
    }
  });

  router.post("/translate", async (req, res) => {
    const parsed = translateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Enter text and choose a supported language." });
    }
    if (!dependencies.aiEnabled) {
      return res.status(503).json({ success: false, error: "Live translation is not configured. No translation was generated." });
    }

    try {
      const translation = await dependencies.generateTranslation(parsed.data.text, parsed.data.targetLanguage);
      return res.json({ success: true, ...translation });
    } catch (error) {
      logger.error({ err: error, userId: (req as any).userId }, "Tira translation failed");
      return res.status(502).json({ success: false, error: "Could not translate that just now. Please try again." });
    }
  });

  return router;
}

export default createGuideRouter();
