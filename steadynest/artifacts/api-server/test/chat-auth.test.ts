import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import express from "express";
import jwt from "jsonwebtoken";

import { env } from "../src/config/env.ts";
import { createChatRouter } from "../src/routes/chat.ts";
import { createRoomAuthorizer } from "../src/services/chatAccess.ts";
import { installChatSocketHandlers, verifySocketToken } from "../src/websockets/chatGateway.ts";

const tokenFor = (userId: string) => jwt.sign(
  { sub: userId, role: "tenant" },
  env.JWT_ACCESS_SECRET,
  { expiresIn: "5m" },
);

async function withChatServer(
  authorizeRoom: Parameters<typeof createChatRouter>[0]["authorizeRoom"],
  run: (url: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use("/api/chat", createChatRouter({ authorizeRoom }));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

class FakeSocket {
  id = "socket-1";
  data: Record<string, unknown> = { userId: "tenant-a" };
  handlers = new Map<string, (...args: any[]) => unknown>();
  joined: string[] = [];
  broadcasts: Array<{ roomId: string; event: string; payload: unknown }> = [];

  on(event: string, handler: (...args: any[]) => unknown) {
    this.handlers.set(event, handler);
    return this;
  }

  join(roomId: string) {
    this.joined.push(roomId);
  }

  to(roomId: string) {
    return { emit: (event: string, payload: unknown) => this.broadcasts.push({ roomId, event, payload }) };
  }

  async receive(event: string, ...args: any[]) {
    const handler = this.handlers.get(event);
    assert.ok(handler, `No ${event} handler was installed`);
    return await handler(...args);
  }
}

const silentLogger = { info: () => undefined, warn: () => undefined, error: () => undefined } as any;

test("room authorization requires a reciprocal direct match or group membership", async () => {
  const authorizeRoom = createRoomAuthorizer({
    isGroupMember: async (userId, groupId) => userId === "tenant-a" && groupId === "group-1",
    hasMatchedDirectConversation: async (userId, otherUserId) => (
      userId === "tenant-a" && otherUserId === "tenant-b"
    ),
  });

  assert.equal(await authorizeRoom("tenant-a", "tenant-a_tenant-b"), "direct");
  assert.equal(await authorizeRoom("tenant-c", "tenant-a_tenant-b"), null);
  assert.equal(await authorizeRoom("tenant-a", "tenant-b_tenant-a"), null);
  assert.equal(await authorizeRoom("tenant-a", "group-1"), "group");
  assert.equal(await authorizeRoom("tenant-b", "group-1"), null);
});

test("HTTP chat rejects missing and forged JWTs before room access, then rejects another user's room", async () => {
  const accessCalls: Array<{ userId: string; roomId: string }> = [];
  const authorizeRoom = async (userId: string, roomId: string) => {
    accessCalls.push({ userId, roomId });
    return null;
  };

  await withChatServer(authorizeRoom, async (url) => {
    const missing = await fetch(`${url}/api/chat/tenant-a_tenant-b/messages`);
    assert.equal(missing.status, 401);

    const forged = jwt.sign({ sub: "tenant-a" }, "different-secret");
    const forgedResponse = await fetch(`${url}/api/chat/tenant-a_tenant-b/messages`, {
      headers: { Authorization: `Bearer ${forged}` },
    });
    assert.equal(forgedResponse.status, 401);

    const crossUser = await fetch(`${url}/api/chat/tenant-a_tenant-b/messages`, {
      headers: { Authorization: `Bearer ${tokenFor("tenant-c")}` },
    });
    assert.equal(crossUser.status, 403);

    const crossUserPost = await fetch(`${url}/api/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenFor("tenant-c")}` },
      body: JSON.stringify({ roomId: "tenant-a_tenant-b", text: "I should not be able to send this" }),
    });
    assert.equal(crossUserPost.status, 403);
  });

  assert.deepEqual(accessCalls, [
    { userId: "tenant-c", roomId: "tenant-a_tenant-b" },
    { userId: "tenant-c", roomId: "tenant-a_tenant-b" },
  ]);
});

test("socket token verification rejects client identities that are not signed by this API", () => {
  assert.throws(() => verifySocketToken(undefined), /Authentication required/);
  const forged = jwt.sign({ sub: "landlord-b" }, "different-secret");
  assert.throws(() => verifySocketToken(forged));
  assert.equal(verifySocketToken(tokenFor("tenant-a")), "tenant-a");
});

test("socket handlers enforce membership and derive sender/reader identities from the JWT subject", async () => {
  const deniedSocket = new FakeSocket();
  let deniedAcknowledgement: any;
  installChatSocketHandlers(deniedSocket as any, {
    authorizeRoom: async () => null,
    logger: silentLogger,
  });
  await deniedSocket.receive("join_room", { roomId: "tenant-a_tenant-b" }, (response: any) => {
    deniedAcknowledgement = response;
  });
  await deniedSocket.receive("send_message", {
    chatId: "tenant-a_tenant-b",
    senderId: "landlord-b",
    text: "spoofed sender",
  }, (response: any) => {
    deniedAcknowledgement = response;
  });
  assert.deepEqual(deniedSocket.joined, []);
  assert.deepEqual(deniedSocket.broadcasts, []);
  assert.equal(deniedAcknowledgement.success, false);

  const allowedSocket = new FakeSocket();
  const inserted: any[] = [];
  const fakeDatabase = {
    insert: () => ({
      values: (value: unknown) => {
        inserted.push(value);
        return { onConflictDoNothing: async () => undefined };
      },
    }),
  } as any;
  let acknowledgement: any;
  installChatSocketHandlers(allowedSocket as any, {
    authorizeRoom: async (userId, roomId) => userId === "tenant-a" && roomId === "tenant-a_tenant-b" ? "direct" : null,
    database: fakeDatabase,
    logger: silentLogger,
  });
  await allowedSocket.receive("join_room", { roomId: "tenant-a_tenant-b" }, () => undefined);
  await allowedSocket.receive("send_message", {
    id: "client-message-id",
    chatId: "tenant-a_tenant-b",
    senderId: "landlord-b",
    readerId: "landlord-b",
    text: "server-owned sender",
  }, (response: any) => {
    acknowledgement = response;
  });

  assert.deepEqual(allowedSocket.joined, ["tenant-a_tenant-b"]);
  assert.equal(inserted[0].sender_id, "tenant-a");
  assert.equal((allowedSocket.broadcasts[0].payload as any).senderId, "tenant-a");
  assert.deepEqual(acknowledgement, { success: true, status: "sent", id: "client-message-id" });
});
