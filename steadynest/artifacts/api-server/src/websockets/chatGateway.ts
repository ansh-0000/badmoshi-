import crypto from "crypto";
import type { Server as HttpServer } from "http";

import { and, eq, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { z } from "zod";
import { db, messages } from "@workspace/db";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { authorizeRoomAccess, type RoomAuthorizer } from "../services/chatAccess";

const roomIdSchema = z.string().min(1).max(200);
const joinRoomSchema = z.object({ roomId: roomIdSchema }).strip();
const sendMessageSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  chatId: roomIdSchema,
  text: z.string().min(1).max(500),
  mediaUrl: z.string().max(2_048).nullable().optional(),
}).strip();
const typingSchema = z.object({ chatId: roomIdSchema }).strip();
const readReceiptSchema = z.object({
  chatId: roomIdSchema,
  messageIds: z.array(z.string().min(1).max(128)).min(1).max(50),
}).strip();

type SocketAck = (response: { success: boolean; error?: string; status?: string; id?: string }) => void;
type GatewayDependencies = {
  authorizeRoom: RoomAuthorizer;
  database: typeof db;
  logger: Pick<typeof logger, "info" | "warn" | "error">;
};

const productionDependencies: GatewayDependencies = {
  authorizeRoom: authorizeRoomAccess,
  database: db,
  logger,
};

function reply(callback: unknown, response: Parameters<SocketAck>[0]) {
  if (typeof callback === "function") (callback as SocketAck)(response);
}

function authenticatedUserId(socket: Socket): string {
  const userId = socket.data.userId;
  if (typeof userId !== "string" || !userId) throw new Error("Socket is not authenticated");
  return userId;
}

/** Verifies a handshake token and returns its immutable server-side subject. */
export function verifySocketToken(token: unknown): string {
  if (typeof token !== "string" || !token) throw new Error("Authentication required");

  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof payload === "string" || typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Invalid authentication token");
  }
  return payload.sub;
}

async function canAccessRoom(
  socket: Socket,
  roomId: string,
  dependencies: GatewayDependencies,
): Promise<boolean> {
  const access = await dependencies.authorizeRoom(authenticatedUserId(socket), roomId);
  return access !== null;
}

/** Exported for transport-free authorization tests. */
export function installChatSocketHandlers(
  socket: Socket,
  overrides: Partial<GatewayDependencies> = {},
) {
  const dependencies: GatewayDependencies = { ...productionDependencies, ...overrides };

  const joinRoom = async (rawData: unknown, callback?: unknown) => {
    const parsed = joinRoomSchema.safeParse(
      typeof rawData === "string" ? { roomId: rawData } : rawData,
    );
    if (!parsed.success) return reply(callback, { success: false, error: "A valid conversation ID is required" });

    try {
      if (!await canAccessRoom(socket, parsed.data.roomId, dependencies)) {
        return reply(callback, { success: false, error: "You do not have access to this conversation." });
      }
      socket.join(parsed.data.roomId);
      return reply(callback, { success: true });
    } catch (error) {
      dependencies.logger.error({ err: error }, "Could not authorize socket room join");
      return reply(callback, { success: false, error: "Could not verify conversation access" });
    }
  };

  socket.on("join_room", joinRoom);
  // Accept the legacy event name, but apply exactly the same authorization.
  socket.on("join_group", joinRoom);

  socket.on("send_message", async (rawData, callback) => {
    const parsed = sendMessageSchema.safeParse(rawData);
    if (!parsed.success) return reply(callback, { success: false, error: "A valid message is required" });

    try {
      if (!await canAccessRoom(socket, parsed.data.chatId, dependencies)) {
        return reply(callback, { success: false, error: "You do not have access to this conversation." });
      }

      const userId = authenticatedUserId(socket);
      const messageId = parsed.data.id ?? crypto.randomUUID();
      const outgoing = {
        id: messageId,
        chatId: parsed.data.chatId,
        senderId: userId,
        text: parsed.data.text,
        mediaUrl: parsed.data.mediaUrl ?? null,
        status: "sent",
        timestamp: new Date().toISOString(),
      };

      await dependencies.database.insert(messages).values({
        id: outgoing.id,
        chat_id: outgoing.chatId,
        sender_id: outgoing.senderId,
        text: outgoing.text,
        media_url: outgoing.mediaUrl,
        status: outgoing.status,
      }).onConflictDoNothing({ target: messages.id });

      socket.to(outgoing.chatId).emit("receive_message", outgoing);
      return reply(callback, { success: true, status: "sent", id: outgoing.id });
    } catch (error) {
      dependencies.logger.error({ err: error }, "Error processing socket chat message");
      return reply(callback, { success: false, error: "Could not send message" });
    }
  });

  const sendTyping = async (rawData: unknown, typing: boolean) => {
    const parsed = typingSchema.safeParse(rawData);
    if (!parsed.success) return;

    try {
      if (!await canAccessRoom(socket, parsed.data.chatId, dependencies)) return;
      socket.to(parsed.data.chatId).emit("user_typing", {
        userId: authenticatedUserId(socket),
        typing,
      });
    } catch (error) {
      dependencies.logger.error({ err: error }, "Could not authorize socket typing event");
    }
  };
  socket.on("typing_start", (data) => void sendTyping(data, true));
  socket.on("typing_stop", (data) => void sendTyping(data, false));

  socket.on("message_read", async (rawData) => {
    const parsed = readReceiptSchema.safeParse(rawData);
    if (!parsed.success) return;

    try {
      if (!await canAccessRoom(socket, parsed.data.chatId, dependencies)) return;
      const userId = authenticatedUserId(socket);
      await dependencies.database
        .update(messages)
        .set({ status: "read" })
        .where(and(eq(messages.chat_id, parsed.data.chatId), inArray(messages.id, parsed.data.messageIds)));
      socket.to(parsed.data.chatId).emit("messages_read_receipt", {
        messageIds: parsed.data.messageIds,
        readerId: userId,
      });
    } catch (error) {
      dependencies.logger.error({ err: error }, "Error processing socket read receipt");
    }
  });
}

export function setupChatGateway(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");
      socket.data.userId = verifySocketToken(token);
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const userId = authenticatedUserId(socket);
    socket.join(userId);
    logger.info({ socketId: socket.id, userId }, "Authenticated websocket connected");
    installChatSocketHandlers(socket);
  });

  return io;
}
