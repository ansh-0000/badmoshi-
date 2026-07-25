import { Router } from 'express';
import { db, messages, users } from '@workspace/db';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../middlewares/auth';
import crypto from 'crypto';

const router = Router();

// GET /api/chat/:roomId/messages - Fetch previous messages for a chat room (group or DM)
router.get('/:roomId/messages', requireAuth, async (req, res) => {
  const roomId = req.params.roomId as string;
  
  try {
    const chatMessages = await db
      .select({
        id: messages.id,
        chatId: messages.chat_id,
        senderId: messages.sender_id,
        text: messages.text,
        mediaUrl: messages.media_url,
        status: messages.status,
        timestamp: messages.timestamp,
      })
      .from(messages)
      .where(eq(messages.chat_id, roomId))
      .orderBy(desc(messages.timestamp))
      .limit(50); // Get latest 50

    // Reverse to chronological order
    chatMessages.reverse();

    return res.json({ success: true, messages: chatMessages });
  } catch (err) {
    (req as any).log?.error({ err }, "Error fetching chat messages");
    return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/message - Send a new message to a chat room
router.post('/message', requireAuth, async (req, res) => {
  const { roomId, text, mediaUrl } = req.body;
  
  if (!roomId || !text) {
    return res.status(400).json({ error: "roomId and text are required" });
  }

  try {
    const newMsg = {
      id: crypto.randomUUID(),
      chat_id: roomId,
      sender_id: (req as any).userId!,
      text,
      media_url: mediaUrl || null,
      status: 'sent',
      timestamp: new Date()
    };

    await db.insert(messages).values(newMsg);

    return res.json({ success: true, message: newMsg });
  } catch (err) {
    (req as any).log?.error({ err }, "Error saving message");
    return res.status(500).json({ success: false, error: 'Failed to save message' });
  }
});

router.post('/signed-url', requireAuth, (req, res) => {
  const { filename, fileType } = req.body;
  if (!filename) return res.status(400).json({ error: "filename is required" });
  
  // Mock generation of a secure signed URL for S3/GCP
  const mockUrl = `https://storage.steadynest.app/uploads/${Date.now()}_${filename}`;
  
  return res.json({
    success: true,
    uploadUrl: mockUrl, // Client would PUT file here
    mediaUrl: mockUrl   // Client will use this in the send_message event
  });
});

export default router;
