import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth';
import { db, listings } from '@workspace/db';
import { eq } from 'drizzle-orm';

const router = Router();

// POST /api/calls/mask
// Mocks provisioning a Twilio masked number for secure tenant-landlord communication
router.post('/mask', requireAuth, async (req: Request, res: Response) => {
  try {
    const { listingId } = req.body;
    const userId = (req as any).userId;

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    // Ensure the listing exists
    const targetListing = await db.select().from(listings).where(eq(listings.id, listingId));
    if (targetListing.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const landlordId = targetListing[0].owner_id;

    // TODO: In production, integrate Twilio Proxy API here:
    // 1. Create a proxy session between tenant's verified phone number and landlord's phone number
    // 2. Fetch the proxy number (e.g. +18001234567)
    
    // For Phase 4 mock:
    const mockProxyNumber = "+1-800-STEADY";
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Proxy session valid for 1 hour

    console.log(`[Twilio Mock] Provisioned proxy ${mockProxyNumber} between ${userId} and ${landlordId}`);

    return res.json({
      proxyNumber: mockProxyNumber,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('Calls mask error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
