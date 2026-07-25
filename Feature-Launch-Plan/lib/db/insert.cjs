const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://steady_user:steady_password@localhost:5432/steady_nest?schema=public"
  });
  
  await client.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount integer NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        stripe_session_id text,
        created_at timestamp NOT NULL DEFAULT NOW()
      );
    `);
    console.log("transactions table created!");
  } catch(e) {
    console.error("Error inserting user:", e);
  }
  
  await client.end();
}

main();
