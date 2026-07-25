import { db } from "./index";
import { users, listings } from "./schema";

const PASSWORD_HASH = "$argon2id$v=19$m=65536,p=4,t=3$YWWtgiDShWED21SWnkH7lg$mNhO7rqgix+ZL1BBZVWzgFVcl01SUJ1pcBr4YmqRfJs"; // password123

async function main() {
  console.log("Seeding Database...");

  // Seed users
  const landlordId = "landlord-1";
  const tenantId = "tenant-1";

  await db.insert(users).values([
    {
      id: landlordId,
      name: "Demo Landlord",
      email: "landlord@steadynest.com",
      password: PASSWORD_HASH,
      role: "landlord",
    },
    {
      id: tenantId,
      name: "Demo Tenant",
      email: "tenant@steadynest.com",
      password: PASSWORD_HASH,
      role: "tenant",
    },
    // Demo accounts used by the app UI. Stable ids u_001–u_003 — do not change,
    // other seed/data references assume them. All share password "password123"
    // (argon2 hash above); there is no plaintext password anywhere.
    {
      id: "u_001",
      name: "Priya Mehra",
      email: "priya@roamos.in",
      password: PASSWORD_HASH,
      role: "tenant",
      phone: "+91 98765 43210",
      city: "delhi",
    },
    {
      id: "u_002",
      name: "Rahul Sharma",
      email: "rahul@roamos.in",
      password: PASSWORD_HASH,
      role: "landlord",
      phone: "+91 98765 43211",
      city: "mumbai",
    },
    {
      id: "u_003",
      name: "Aarav Patel",
      email: "aarav@roamos.in",
      password: PASSWORD_HASH,
      role: "landlord",
      phone: "+91 91234 56789",
      city: "bengaluru",
    },
  ]).onConflictDoNothing();

  // Seed 10000 listings around Delhi and Mumbai
  const bulkListings = [];
  for(let i=0; i<10000; i++) {
    bulkListings.push({
      id: `listing-bulk-${i}`,
      owner_id: landlordId,
      title: `Automated Listing ${i}`,
      description: "Auto generated.",
      type: "apartment",
      price: 20000 + Math.floor(Math.random() * 10000),
      // Delhi lat/lng box roughly
      lat: 28.4 + (Math.random() * 0.4),
      lng: 77.0 + (Math.random() * 0.4),
      status: "available",
    });
  }

  // Insert in chunks of 1000
  for (let i = 0; i < bulkListings.length; i += 1000) {
    const chunk = bulkListings.slice(i, i + 1000);
    await db.insert(listings).values(chunk).onConflictDoNothing();
  }

  console.log("Seeding Complete!");
}

main().catch(console.error);
