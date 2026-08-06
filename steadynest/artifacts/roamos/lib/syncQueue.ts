import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export interface QueuedMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  timestamp: string;
  retryCount: number;
}

// The offline outbox is a native-only concern. On web, expo-sqlite's WASM build
// requires SharedArrayBuffer (cross-origin isolation), which isn't available in
// every host — so we skip it there and the queue degrades to a no-op rather than
// crashing the whole app at startup.
const db: SQLite.SQLiteDatabase | null =
  Platform.OS === 'web' ? null : SQLite.openDatabaseSync('messages_outbox.db');

db?.execSync(`
  CREATE TABLE IF NOT EXISTS message_outbox (
    id TEXT PRIMARY KEY,
    roomId TEXT,
    payload TEXT,
    status TEXT,
    createdAt TEXT
  );
`);

export async function enqueueMessage(msg: Omit<QueuedMessage, 'retryCount'>): Promise<void> {
  if (!db) return;
  try {
    const payload = JSON.stringify({ ...msg, retryCount: 0 });
    db.runSync(
      'INSERT OR REPLACE INTO message_outbox (id, roomId, payload, status, createdAt) VALUES (?, ?, ?, ?, ?)',
      [msg.id, msg.chatId, payload, 'PENDING', new Date().toISOString()]
    );
  } catch (err) {
    console.error('Failed to enqueue message in SQLite', err);
  }
}

export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  if (!db) return [];
  try {
    const rows = db.getAllSync('SELECT payload FROM message_outbox WHERE status = ?', ['PENDING']);
    return rows.map((row: any) => JSON.parse(row.payload));
  } catch (err) {
    console.error('Failed to get queued messages from SQLite', err);
    return [];
  }
}

export async function removeQueuedMessage(id: string): Promise<void> {
  if (!db) return;
  try {
    db.runSync('DELETE FROM message_outbox WHERE id = ?', [id]);
  } catch (err) {
    console.error('Failed to remove queued message from SQLite', err);
  }
}

export async function incrementRetry(id: string): Promise<void> {
  if (!db) return;
  try {
    const row: any = db.getFirstSync('SELECT payload FROM message_outbox WHERE id = ?', [id]);
    if (row) {
      const msg = JSON.parse(row.payload);
      msg.retryCount += 1;
      db.runSync('UPDATE message_outbox SET payload = ? WHERE id = ?', [JSON.stringify(msg), id]);
    }
  } catch (err) {
    console.error('Failed to increment retry count in SQLite', err);
  }
}
