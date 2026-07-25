import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "../lib/logger";
import { db, messages, users, groupMembers, swipes } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import crypto from "crypto";

export function setupChatGateway(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Track connected users: userId -> socketId
  const connectedUsers = new Map<string, string>();

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "New client connected to websocket");

    socket.on("authenticate", (data) => {
      // In production, verify JWT token here
      const userId = data.userId;
      if (userId) {
        connectedUsers.set(userId, socket.id);
        socket.join(userId); // Join personal room for DM delivery
        logger.info({ userId, socketId: socket.id }, "User authenticated on socket");
      }
    });

    socket.on("join_group", (groupId) => {
      socket.join(groupId);
      logger.info({ socketId: socket.id, groupId }, "User joined group room");
    });

    socket.on("send_message", async (data, callback) => {
      try {
        const { id, chatId, senderId, text, mediaUrl } = data;
        
        // 1. Persist to DB (SQLite via Drizzle)
        // Wait, if it fails, we still want to continue with offline queue logic
        try {
          await db.insert(messages).values({
            id: id || crypto.randomUUID(),
            chat_id: chatId,
            sender_id: senderId,
            text,
            media_url: mediaUrl,
            status: "sent",
          }).onConflictDoNothing({ target: messages.id });
        } catch (dbErr) {
          logger.error({ err: dbErr }, "Failed to insert message into DB");
        }

        // 2. Broadcast to room (chatId can be groupId or recipient userId)
        // If it's a DM, broadcast to the recipient's personal room
        socket.to(chatId).emit("receive_message", {
          id: id,
          chatId,
          senderId,
          text,
          mediaUrl,
          status: "delivered", // Mark delivered immediately for connected clients
          timestamp: new Date().toISOString()
        });

        // 3. Acknowledge back to sender (Sent status)
        if (callback) {
          callback({ success: true, status: "sent", id });
        }
      } catch (err) {
        logger.error({ err }, "Error processing send_message event");
        if (callback) callback({ success: false });
      }
    });

    socket.on("typing_start", (data) => {
      socket.to(data.chatId).emit("user_typing", { userId: data.senderId, typing: true });
    });

    socket.on("typing_stop", (data) => {
      socket.to(data.chatId).emit("user_typing", { userId: data.senderId, typing: false });
    });

    socket.on("message_read", async (data) => {
      // data: { messageIds: string[], chatId: string, readerId: string }
      try {
        // Update DB
        for (const msgId of data.messageIds) {
          await db.update(messages)
            .set({ status: 'read' })
            .where(eq(messages.id, msgId));
        }
        // Broadcast read receipt
        socket.to(data.chatId).emit("messages_read_receipt", {
          messageIds: data.messageIds,
          readerId: data.readerId
        });
      } catch (err) {
        logger.error({ err }, "Error updating read receipts");
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Client disconnected");
      // Find and remove from connectedUsers
      for (const [userId, sid] of connectedUsers.entries()) {
        if (sid === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });

  return io;
}
