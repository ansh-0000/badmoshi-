import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import express from "express";
import jwt from "jsonwebtoken";

import { env } from "../src/config/env.ts";
import { createGuideRouter, createTiraLimiter } from "../src/routes/guide.ts";

const tokenFor = (userId: string) => jwt.sign(
  { sub: userId, role: "tenant" },
  env.JWT_ACCESS_SECRET,
  { expiresIn: "5m" },
);

async function withTiraServer(
  options: Parameters<typeof createGuideRouter>[0],
  run: (url: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use("/api/guide", createGuideRouter(options));
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

async function ask(url: string, token: string | undefined, question: string, city?: string) {
  return fetch(`${url}/api/guide/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ question, city }),
  });
}

test("Tira requires a valid JWT before accepting prompts or translations", async () => {
  await withTiraServer({ aiEnabled: false }, async (url) => {
    assert.equal((await ask(url, undefined, "Help me understand my lease")).status, 401);
    const forged = jwt.sign({ sub: "tenant-a" }, "different-secret");
    assert.equal((await ask(url, forged, "Help me understand my lease")).status, 401);

    const translation = await fetch(`${url}/api/guide/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Rent is due tomorrow", targetLanguage: "hindi" }),
    });
    assert.equal(translation.status, 401);
  });
});

test("Tira rejects non-rental scope without invoking an AI provider", async () => {
  let generated = 0;
  await withTiraServer({
    aiEnabled: true,
    generateAnswer: async () => {
      generated += 1;
      return { response: "should not be returned", suggestedActions: [] };
    },
  }, async (url) => {
    const response = await ask(url, tokenFor("tenant-a"), "What is the best restaurant in Delhi?");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.inScope, false);
    assert.match(body.response, /rentals, leases, and move-in/i);

    const nonNcr = await ask(url, tokenFor("tenant-b"), "Help me find a room", "Mumbai");
    assert.equal(nonNcr.status, 400);
  });
  assert.equal(generated, 0);
});

test("Tira applies the authenticated per-user limiter at the mounted route", async () => {
  let generated = 0;
  await withTiraServer({
    aiEnabled: true,
    limiter: createTiraLimiter({ windowMs: 60_000, limit: 1 }),
    generateAnswer: async () => {
      generated += 1;
      return { response: "Lease answer", suggestedActions: ["Review another clause"] };
    },
    findListings: async () => [],
  }, async (url) => {
    const token = tokenFor("tenant-a");
    const first = await ask(url, token, "Can you explain my lease deposit?");
    const second = await ask(url, token, "Can you explain my lease notice period?");
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
  });
  assert.equal(generated, 1);
});

test("Tira reports disabled AI truthfully without making a paid call", async () => {
  let generated = 0;
  await withTiraServer({
    aiEnabled: false,
    generateAnswer: async () => {
      generated += 1;
      return { response: "should not be returned", suggestedActions: [] };
    },
  }, async (url) => {
    const response = await ask(url, tokenFor("tenant-a"), "Find me a room under 25000");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /No AI response was generated/);
  });
  assert.equal(generated, 0);
});
