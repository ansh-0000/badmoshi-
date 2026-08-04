import { db } from './index';
import { listings, users } from './schema';

const LOAD_TEST_OWNER_ID = 'load-test-landlord';
const LOAD_TEST_LISTING_COUNT = 10_000;

async function main() {
  await db.insert(users).values({
    id: LOAD_TEST_OWNER_ID,
    name: 'Load Test Owner',
    email: 'load-test-owner@steadynest.test',
    role: 'landlord',
    city: 'delhi',
  }).onConflictDoNothing();

  for (let start = 0; start < LOAD_TEST_LISTING_COUNT; start += 1_000) {
    const batch = Array.from({ length: Math.min(1_000, LOAD_TEST_LISTING_COUNT - start) }, (_, index) => {
      const sequence = start + index;
      return {
        id: `load-listing-${sequence}`,
        owner_id: LOAD_TEST_OWNER_ID,
        title: `Load test listing ${sequence}`,
        description: 'Performance-only fixture. Never use as launch content.',
        type: 'apartment',
        price: 20000 + (sequence % 10000),
        currency: 'INR',
        lat: 28.4 + ((sequence % 400) / 1000),
        lng: 77 + ((sequence % 400) / 1000),
        status: 'available',
        rating: 0,
        images: [],
      };
    });
    await db.insert(listings).values(batch).onConflictDoNothing();
  }
  console.log(`Load seed ready: ${LOAD_TEST_LISTING_COUNT} performance-only Delhi fixtures.`);
}

main().catch((error) => {
  console.error('Load seed failed:', error);
  process.exitCode = 1;
});
