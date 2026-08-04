import { Router, Request, Response } from 'express';
import { db, listings } from '@workspace/db';
import { count, desc, eq, sql } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const ownedListingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/listings/nearby
// Find listings within a specific radius (in km) using Haversine formula
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = '5' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const targetLat = parseFloat(lat as string);
    const targetLng = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);
    const radiusMeters = radiusKm * 1000;

    const results = await db.select().from(listings).where(
      sql`ST_DWithin(
        ST_SetSRID(ST_MakePoint(${listings.lng}, ${listings.lat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${targetLng}, ${targetLat}), 4326)::geography,
        ${radiusMeters}
      )`
    );

    return res.json({ listings: results });
  } catch (err: any) {
    console.error('Listings nearby error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/listings/summary
// Server-computed portfolio figures for listings owned by the caller. Keeping
// this separate from the paginated list avoids loading a landlord's entire
// portfolio into a mobile dashboard.
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const [summary] = await db
      .select({
        propertyCount: count(listings.id),
        availableCount: sql<number>`count(*) filter (where ${listings.status} = 'available')`,
        potentialMonthlyRent: sql<number>`coalesce(sum(${listings.price}), 0)`,
      })
      .from(listings)
      .where(eq(listings.owner_id, userId));

    return res.json({
      data: {
        propertyCount: Number(summary?.propertyCount ?? 0),
        availableCount: Number(summary?.availableCount ?? 0),
        potentialMonthlyRent: Number(summary?.potentialMonthlyRent ?? 0),
      },
    });
  } catch {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/listings
// Get a bounded page of listings owned by the authenticated caller. `ownerId`
// is intentionally not a query parameter: ownership always comes from JWT.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const parsed = ownedListingsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid pagination parameters.' });
    }
    const { limit, offset } = parsed.data;
    const [total] = await db.select({ count: count() }).from(listings).where(eq(listings.owner_id, userId));
    const data = await db
      .select()
      .from(listings)
      .where(eq(listings.owner_id, userId))
      .orderBy(desc(listings.created_at))
      .limit(limit)
      .offset(offset);
    return res.json({ data, total: Number(total?.count ?? 0) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/listings/:id
// Get a single listing by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await db.select().from(listings).where(eq(listings.id, id as string));
    if (data.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    return res.json({ data: data[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const createListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  type: z.enum(['apartment', 'house', 'room', 'co-living']),
  price: z.number().positive("Rent must be positive"),
  security_deposit: z.number().nonnegative("Security deposit cannot be negative").optional(),
  currency: z.literal('INR').default('INR'),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  available_from: z.string().optional().transform(str => str ? new Date(str) : new Date()),
  images: z.array(z.string().url()).optional()
});

// POST /api/listings
// Create a new listing (Landlord only)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const parsedData = createListingSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.status(400).json({ error: 'Validation Error', details: parsedData.error.format() });
    }

    const listingData = parsedData.data;

    const [newListing] = await db.insert(listings).values({
      id: uuidv4(),
      owner_id: userId,
      title: listingData.title,
      description: listingData.description,
      type: listingData.type,
      price: listingData.price,
      security_deposit: listingData.security_deposit,
      currency: listingData.currency,
      address: listingData.address,
      lat: listingData.lat,
      lng: listingData.lng,
      available_from: listingData.available_from,
      images: listingData.images,
      status: 'available',
    }).returning();

    return res.status(201).json({ data: newListing });
  } catch (err: any) {
    console.error('Create listing error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
