import crypto from "crypto";
import { Router } from "express";
import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { db, messages, users } from "@workspace/db";

import { requireAuth } from "../middlewares/auth";
import { authorizeRoomAccess, type RoomAuthorizer } from "../services/chatAccess";

const roomIdSchema = z.string().min(1).max(200);
const sendMessageSchema = z.object({
  roomId: roomIdSchema,
  text: z.string().min(1).max(500),
  mediaUrl: z.string().max(2_048).nullable().optional(),
}).strip();

type ChatRouterOptions = {
  authorizeRoom?: RoomAuthorizer;
};

async function requireRoomAccess(
  req: any,
  res: any,
  roomId: string,
  authorizeRoom: RoomAuthorizer,
): Promise<boolean> {
  try {
    const access = await authorizeRoom(req.userId as string, roomId);
    if (access) return true;

    res.status(403).json({ success: false, error: "You do not have access to this conversation." });
    return false;
  } catch (error) {
    req.log?.error({ err: error }, "Could not verify chat room access");
    res.status(500).json({ success: false, error: "Could not verify conversation access" });
    return false;
  }
}

export function createChatRouter({ authorizeRoom = authorizeRoomAccess }: ChatRouterOptions = {}) {
  const router = Router();

  // GET /api/chat/threads - List the current user's direct-message threads.
  router.get("/threads", requireAuth, async (req, res) => {
    const me = (req as any).userId as string;

    try {
      const myMessages = await db
        .select({
          id: messages.id,
          chatId: messages.chat_id,
          senderId: messages.sender_id,
          text: messages.text,
          status: messages.status,
          timestamp: messages.timestamp,
        })
        .from(messages)
        // "_" is a single-character LIKE wildcard in Postgres, so escape it.
        .where(or(like(messages.chat_id, `${me}\\_%`), like(messages.chat_id, `%\\_${me}`)))
        .orderBy(desc(messages.timestamp));

      const byChatId = new Map<string, typeof myMessages>();
      for (const message of myMessages) {
        const parts = message.chatId.split("_");
        if (parts.length !== 2 || !parts.includes(me)) continue;
        const thread = byChatId.get(message.chatId) ?? [];
        thread.push(message);
        byChatId.set(message.chatId, thread);
      }

      const otherIds = [...byChatId.keys()].map((chatId) => {
        const [first, second] = chatId.split("_");
        return first === me ? second : first;
      });

      type Participant = { id: string; name: string; role: string | null; avatar_url: string | null };
      const participants: Participant[] = otherIds.length
        ? await db
          .select({ id: users.id, name: users.name, role: users.role, avatar_url: users.avatar_url })
          .from(users)
          .where(or(...otherIds.map((id) => eq(users.id, id))))
        : [];
      const participantById = new Map(participants.map((participant): [string, Participant] => [participant.id, participant]));

      const threads = [...byChatId.entries()].map(([chatId, thread]) => {
        const [first, second] = chatId.split("_");
        const otherId = first === me ? second : first;
        const other = participantById.get(otherId);
        const latest = thread[0];
        const unreadCount = thread.filter((message) => message.senderId !== me && message.status !== "read").length;

        return {
          chatId,
          otherUser: other
            ? { id: other.id, name: other.name, role: other.role, avatarUrl: other.avatar_url }
            : { id: otherId, name: "SteadyNest user", role: null, avatarUrl: null },
          lastMessage: latest?.text ?? "",
          lastTimestamp: latest?.timestamp ?? null,
          unreadCount,
        };
      });

      threads.sort((first, second) => {
        const firstTimestamp = first.lastTimestamp ? new Date(first.lastTimestamp).getTime() : 0;
        const secondTimestamp = second.lastTimestamp ? new Date(second.lastTimestamp).getTime() : 0;
        return secondTimestamp - firstTimestamp;
      });

      return res.json({ success: true, threads });
    } catch (error) {
      (req as any).log?.error({ err: error }, "Error listing chat threads");
      return res.status(500).json({ success: false, error: "Failed to load conversations" });
    }
  });

  router.get("/:roomId/messages", requireAuth, async (req, res) => {
    const roomId = roomIdSchema.safeParse(req.params.roomId);
    if (!roomId.success) {
      return res.status(400).json({ success: false, error: "A valid conversation ID is required" });
    }
    if (!await requireRoomAccess(req, res, roomId.data, authorizeRoom)) return;

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
        .where(eq(messages.chat_id, roomId.data))
        .orderBy(desc(messages.timestamp))
        .limit(50);

      chatMessages.reverse();
      return res.json({ success: true, messages: chatMessages });
    } catch (error) {
      (req as any).log?.error({ err: error }, "Error fetching chat messages");
      return res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
  });

  router.post("/message", requireAuth, async (req, res) => {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "A valid roomId and message are required" });
    }
    if (!await requireRoomAccess(req, res, parsed.data.roomId, authorizeRoom)) return;

    try {
      const newMessage = {
        id: crypto.randomUUID(),
        chat_id: parsed.data.roomId,
        sender_id: (req as any).userId as string,
        text: parsed.data.text,
        media_url: parsed.data.mediaUrl ?? null,
        status: "sent",
        timestamp: new Date(),
      };

      await db.insert(messages).values(newMessage);
      return res.json({ success: true, message: newMessage });
    } catch (error) {
      (req as any).log?.error({ err: error }, "Error saving message");
      return res.status(500).json({ success: false, error: "Failed to save message" });
    }
  });

  router.post("/signed-url", requireAuth, (req, res) => {
    const { filename } = req.body;
    if (typeof filename !== "string" || !filename) {
      return res.status(400).json({ error: "filename is required" });
    }

    // Storage signing is still a development placeholder; no upload occurs here.
    const mockUrl = `https://storage.steadynest.app/uploads/${Date.now()}_${filename}`;
    return res.json({ success: true, uploadUrl: mockUrl, mediaUrl: mockUrl });
  });

  return router;
}

export default createChatRouter();
