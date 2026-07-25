import { Router } from "express";
import { db, swipes, users } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { eq, and, or, ne, notInArray } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /api/match/discover
// Real profiles to swipe on: everyone except yourself and anyone you've
// already swiped (like or pass). Returns only fields that exist on the users
// table — richer profile fields (bio/interests) aren't in the schema yet.
router.get("/discover", requireAuth, async (req, res) => {
  const me = (req as any).userId as string;
  try {
    const swiped = await db
      .select({ id: swipes.target_id })
      .from(swipes)
      .where(eq(swipes.swiper_id, me));
    const excludeIds = [me, ...swiped.map((s) => s.id)];

    const candidates = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        city: users.city,
        avatar_url: users.avatar_url,
      })
      .from(users)
      .where(notInArray(users.id, excludeIds))
      .limit(20);

    return res.json({ success: true, profiles: candidates });
  } catch (err) {
    req.log?.error({ err }, "Error fetching discover profiles");
    return res.status(500).json({ error: "Failed to load profiles" });
  }
});

// POST /api/match/swipe
router.post("/swipe", requireAuth, async (req, res) => {
  const { targetId, action } = req.body; // action: 'like' | 'pass'
  const swiperId = (req as any).userId;

  if (!targetId || !action) {
    return res.status(400).json({ error: "targetId and action are required" });
  }

  try {
    const status = action === 'like' ? 'pending' : 'passed';

    // 1. Record the swipe
    await db.insert(swipes).values({
      id: crypto.randomUUID(),
      swiper_id: swiperId,
      target_id: targetId,
      status
    });

    // 2. If it's a pass, just return
    if (action === 'pass') {
      return res.json({ success: true, match: false });
    }

    // 3. If it's a like, check for a reciprocal 'pending' swipe
    const reciprocal = await db.select().from(swipes).where(
      and(
        eq(swipes.swiper_id, targetId),
        eq(swipes.target_id, swiperId),
        eq(swipes.status, 'pending')
      )
    ).limit(1);

    if (reciprocal.length > 0) {
      // It's a match!
      // Update both to 'matched'
      await db.update(swipes)
        .set({ status: 'matched' })
        .where(
          or(
            and(eq(swipes.swiper_id, swiperId), eq(swipes.target_id, targetId)),
            and(eq(swipes.swiper_id, targetId), eq(swipes.target_id, swiperId))
          )
        );

      // Initialize a new DM thread ID (just combining IDs consistently)
      const chatId = [swiperId, targetId].sort().join('_');

      // Emit to both users via socket.io
      const io = req.app.get('io');
      if (io) {
        // Send to target
        io.to(targetId).emit("match_found", {
          chatId,
          matchedWith: swiperId,
          timestamp: new Date().toISOString()
        });
        
        // Send to swiper
        io.to(swiperId).emit("match_found", {
          chatId,
          matchedWith: targetId,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({ success: true, match: true, chatId });
    }

    // No reciprocal match yet
    return res.json({ success: true, match: false });

  } catch (err) {
    req.log.error({ err }, "Error processing swipe");
    return res.status(500).json({ error: "Failed to process swipe" });
  }
});

export default router;
