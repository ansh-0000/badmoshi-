import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import express from "express";
import jwt from "jsonwebtoken";
import pino from "pino";

import { env } from "../src/config/env.ts";
import { sensitiveLogPaths } from "../src/lib/logger.ts";
import { createSosLimiter, createSosRouter } from "../src/routes/sos.ts";

type TestLoggerEntry = { payload: unknown; message: string };

function makeToken(userId: string) {
  return jwt.sign(
    { sub: userId, role: "tenant", email: `${userId}@example.test` },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "5m" },
  );
}

function makeLogger(entries: TestLoggerEntry[]) {
  const record = (payload: unknown, message: string) => entries.push({ payload, message });
  return { info: record, warn: record, error: record } as any;
}

async function withServer(
  options: Parameters<typeof createSosRouter>[0],
  run: (url: string) => Promise<void>,
  limiter = createSosLimiter({ windowMs: 60_000, limit: 50 }),
) {
  const app = express();
  app.use(express.json());
  app.use("/api/sos", limiter, createSosRouter(options));
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

async function trigger(url: string, token: string | undefined, body: Record<string, unknown>) {
  return fetch(`${url}/api/sos/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("SOS rejects missing and forged authentication", async () => {
  const entries: TestLoggerEntry[] = [];
  const dependencies = {
    loadTrustedContactPhones: async () => ["+919999000001"],
    sendSms: async () => true,
    smsConfigured: false,
    logger: makeLogger(entries),
  };

  await withServer(dependencies, async (url) => {
    const missing = await trigger(url, undefined, { latitude: 28.61, longitude: 77.2 });
    assert.equal(missing.status, 401);

    const forged = jwt.sign({ sub: "tenant-a", role: "tenant" }, "not-the-server-secret");
    const forgedResponse = await trigger(url, forged, { latitude: 28.61, longitude: 77.2 });
    assert.equal(forgedResponse.status, 401);
  });
});

test("SOS ignores body identities and recipients, and logs no phone or coordinate values", async () => {
  const entries: TestLoggerEntry[] = [];
  const loadedFor: string[] = [];
  const deliveredTo: string[] = [];
  const dependencies = {
    loadTrustedContactPhones: async (userId: string) => {
      loadedFor.push(userId);
      return userId === "tenant-a" ? ["+919999000001"] : [];
    },
    sendSms: async (phone: string) => {
      deliveredTo.push(phone);
      return true;
    },
    smsConfigured: true,
    logger: makeLogger(entries),
  };

  await withServer(dependencies, async (url) => {
    const response = await trigger(url, makeToken("tenant-a"), {
      userId: "landlord-b",
      contacts: ["+919999000099"],
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).dispatched, true);
  });

  assert.deepEqual(loadedFor, ["tenant-a"]);
  assert.deepEqual(deliveredTo, ["+919999000001"]);
  const serializedLogs = JSON.stringify(entries);
  assert.equal(serializedLogs.includes("+919999000001"), false);
  assert.equal(serializedLogs.includes("28.6139"), false);
  assert.equal(serializedLogs.includes("77.209"), false);
});

test("SOS cannot use another user's contacts and missing provider configuration never claims dispatch", async () => {
  const entries: TestLoggerEntry[] = [];
  let dispatchCalls = 0;
  const dependencies = {
    loadTrustedContactPhones: async (userId: string) => userId === "tenant-a" ? ["+919999000001"] : [],
    sendSms: async () => {
      dispatchCalls += 1;
      return true;
    },
    smsConfigured: false,
    logger: makeLogger(entries),
  };

  await withServer(dependencies, async (url) => {
    const response = await trigger(url, makeToken("tenant-b"), {
      contacts: ["+919999000001"],
      latitude: 28.61,
      longitude: 77.2,
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.dispatched, false);
    assert.match(body.message, /No messages were sent/);
  });

  assert.equal(dispatchCalls, 0);
});

test("SOS limiter protects the actual mounted route", async () => {
  const entries: TestLoggerEntry[] = [];
  const dependencies = {
    loadTrustedContactPhones: async () => [],
    sendSms: async () => false,
    smsConfigured: false,
    logger: makeLogger(entries),
  };

  await withServer(
    dependencies,
    async (url) => {
      const first = await trigger(url, makeToken("tenant-a"), { latitude: 28.61, longitude: 77.2 });
      const second = await trigger(url, makeToken("tenant-a"), { latitude: 28.61, longitude: 77.2 });
      assert.equal(first.status, 200);
      assert.equal(second.status, 429);
    },
    createSosLimiter({ windowMs: 60_000, limit: 1 }),
  );
});

test("SOS validation rejects malformed coordinates and logger redacts sensitive fields", async () => {
  const entries: TestLoggerEntry[] = [];
  const dependencies = {
    loadTrustedContactPhones: async () => [],
    sendSms: async () => false,
    smsConfigured: false,
    logger: makeLogger(entries),
  };

  await withServer(dependencies, async (url) => {
    const response = await trigger(url, makeToken("tenant-a"), { latitude: 100, longitude: "bad" });
    assert.equal(response.status, 400);
  });

  const records: string[] = [];
  const probe = pino(
    { redact: { paths: sensitiveLogPaths, censor: "[Redacted]" } },
    { write: (record) => records.push(record) },
  );
  probe.info({ phone: "+919999000001", contacts: ["+919999000002"], latitude: 28.61, longitude: 77.2 });

  const log = records.join("");
  assert.equal(log.includes("+919999000001"), false);
  assert.equal(log.includes("+919999000002"), false);
  assert.equal(log.includes("28.61"), false);
  assert.equal(log.includes("77.2"), false);
  assert.match(log, /\[Redacted\]/);
});
