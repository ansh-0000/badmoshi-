import { z } from "zod";

// ── Auth Schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email().transform((v: string) => v.toLowerCase().trim()),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email().transform((v: string) => v.toLowerCase().trim()),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  role: z.enum(["tenant", "landlord"]),
  phone: z.string().max(20).optional(),
  city: z.string().max(50).optional(),
});

// ── Phone / OTP Schemas ───────────────────────────────────────────────────────
// India-only for the geofenced launch: E.164 +91 followed by 10 digits.
const indiaPhone = z
  .string()
  .trim()
  .regex(/^\+91\d{10}$/, "Enter a valid Indian mobile number (+91XXXXXXXXXX).");

export const otpRequestSchema = z.object({
  phone: indiaPhone,
});

export const otpVerifySchema = z.object({
  phone: indiaPhone,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const roleSchema = z.object({
  role: z.enum(["tenant", "landlord"]),
});

// ── Landlord Schemas ──────────────────────────────────────────────────────────

export const ownerIdQuerySchema = z.object({
  ownerId: z.string().min(1).max(50).optional(),
});

export const inquiryReplySchema = z.object({
  message: z.string().min(1, "Reply message is required").max(2000).optional(),
});

export const inquiryIdParamSchema = z.object({
  id: z.string().min(1).max(50),
});

// ── Chat Schemas ──────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(500),
  roomId: z.string().min(1).max(50),
});

// ── Payment / Card Schemas ────────────────────────────────────────────────────

export const saveCardSchema = z.object({
  // Only accept last4 + network + token — NEVER raw card numbers
  last4: z.string().length(4).regex(/^\d{4}$/, "Must be 4 digits"),
  network: z.enum(["visa", "mastercard", "rupay", "amex"]),
  token: z.string().min(1).max(500),
  label: z.string().max(50).optional(),
});

// ── Stay / Budget Search ──────────────────────────────────────────────────────

export const budgetSearchSchema = z.object({
  minPrice: z.coerce.number().min(0).max(500000).optional(),
  maxPrice: z.coerce.number().min(0).max(500000).optional(),
  type: z.enum(["all", "private", "coliving", "hostel"]).optional(),
  city: z.string().max(50).optional(),
});

// ── Route Planner ─────────────────────────────────────────────────────────────

export const routePlanSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  waypoints: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })).max(5).optional(),
  budget: z.coerce.number().min(0).max(50000).optional(),
});

// ── Helper: validate and extract ──────────────────────────────────────────────

export function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as z.infer<T> };
  }
  const messages = result.error.issues.map((i: any) => i.message).join("; ");
  return { success: false, error: messages };
}
