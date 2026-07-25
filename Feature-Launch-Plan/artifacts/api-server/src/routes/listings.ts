import { Router, Request, Response } from 'express';
import { db, listings } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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

// GET /api/listings
// Get all listings for the logged-in landlord
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = await db.select().from(listings).where(eq(listings.owner_id, userId));
    return res.json({ data });
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
  currency: z.string().default('USD'),
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
