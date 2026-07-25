import { db } from "./src/index";
import { sql } from "drizzle-orm";

async function runBenchmark() {
  console.log("Running Radius Query Benchmark...");
  
  // Hauz Khas Coordinates
  const targetLng = 77.2001;
  const targetLat = 28.5494;
  const radiusMeters = 5000;

  // Warmup query to establish connection pool and V8 JIT
  await db.execute(sql`
    SELECT id FROM listings 
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, 
      ST_SetSRID(ST_MakePoint(${targetLng}, ${targetLat}), 4326)::geography, 
      ${radiusMeters}
    )
    LIMIT 1
  `);

  const start = performance.now();
  
  try {
    const result = await db.execute(sql`
      SELECT id, title, price 
      FROM listings 
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, 
        ST_SetSRID(ST_MakePoint(${targetLng}, ${targetLat}), 4326)::geography, 
        ${radiusMeters}
      )
    `);
    
    const explainResult = await db.execute(sql`
      EXPLAIN ANALYZE SELECT id, title, price 
      FROM listings 
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, 
        ST_SetSRID(ST_MakePoint(${targetLng}, ${targetLat}), 4326)::geography, 
        ${radiusMeters}
      )
    `);
    
    const end = performance.now();
    const duration = end - start;
    
    console.log(`Query executed in: ${duration.toFixed(2)} ms`);
    console.log(`Results found: ${result.rows.length}`);
    console.log("\n--- Query Plan ---");
    explainResult.rows.forEach(row => console.log(row['QUERY PLAN']));
    console.log("------------------\n");
    
    if (duration < 50) {
      console.log("✅ Benchmark PASSED: Under 50ms");
    } else {
      console.log("❌ Benchmark FAILED: Over 50ms");
    }
  } catch (err) {
    console.error("Benchmark failed due to error:", err);
  }
  
  process.exit(0);
}

runBenchmark();
