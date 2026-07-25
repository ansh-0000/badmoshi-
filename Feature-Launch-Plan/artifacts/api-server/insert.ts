import { db } from '@workspace/db';
import { users } from '@workspace/db/schema';

async function main() {
  try {
    await db.insert(users).values({
      id: 'u_001',
      email: 'u001@example.com',
      name: 'Test User',
      role: 'tenant',
    }).onConflictDoNothing();
    console.log("User inserted!");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
