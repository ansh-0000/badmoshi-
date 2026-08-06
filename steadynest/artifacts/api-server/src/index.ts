import 'dotenv/config';
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupChatGateway } from "./websockets/chatGateway";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const HOST = '0.0.0.0'; // Bind to all interfaces

const server = createServer(app);

// Attach Socket.io gateway
export const io = setupChatGateway(server);
app.set("io", io);

server.listen(port, HOST, () => {
  logger.info({ port, host: HOST }, `[SteadyNest API] Server running at http://${HOST}:${port} with WebSockets enabled`);
});

server.on('error', (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
