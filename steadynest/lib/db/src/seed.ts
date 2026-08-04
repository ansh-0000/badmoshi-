import { db } from './index';
import { listings, users } from './schema';

const PLACEHOLDER_IMAGE = 'https://placehold.co/1200x800?text=SteadyNest+placeholder+-+no+approved+photography';

const launchLandlords = [
  { id: 'launch-landlord-1', name: 'Aditi Khanna', email: 'aditi.khanna@steadynest.test', role: 'landlord' as const, city: 'delhi' },
  { id: 'launch-landlord-2', name: 'Nikhil Batra', email: 'nikhil.batra@steadynest.test', role: 'landlord' as const, city: 'gurgaon' },
  { id: 'launch-landlord-3', name: 'Zoya Merchant', email: 'zoya.merchant@steadynest.test', role: 'landlord' as const, city: 'noida' },
];

// Every address is deliberately approximate. These are fictional demo rentals,
// not a claim that a specific home is available or that photography is approved.
const launchListings = [
  { id: 'launch-saket-2bhk', owner_id: 'launch-landlord-1', title: 'Sunlit 2BHK near Saket Metro', description: 'Quiet two-bedroom home with a balcony and a short walk to everyday essentials.', type: 'apartment', price: 36000, address: 'Approx. near Saket Metro, New Delhi', lat: 28.5245, lng: 77.2066, rating: 4.6 },
  { id: 'launch-hauz-khas-room', owner_id: 'launch-landlord-1', title: 'Furnished room by Hauz Khas Village', description: 'Private room in a shared three-bedroom flat with a calm work corner.', type: 'room', price: 19000, address: 'Approx. near Hauz Khas Village, New Delhi', lat: 28.5494, lng: 77.2001, rating: 4.3 },
  { id: 'launch-malviya-studio', owner_id: 'launch-landlord-1', title: 'Compact studio in Malviya Nagar', description: 'Independent studio suited to one tenant, with daylight and a practical kitchenette.', type: 'apartment', price: 22000, address: 'Approx. near Malviya Nagar Market, New Delhi', lat: 28.5355, lng: 77.2104, rating: 4.1 },
  { id: 'launch-vasant-kunj-3bhk', owner_id: 'launch-landlord-1', title: 'Family 3BHK in Vasant Kunj', description: 'Spacious rental with three bedrooms, lift access and a resident parking space.', type: 'apartment', price: 52000, address: 'Approx. near Vasant Kunj, New Delhi', lat: 28.5252, lng: 77.1565, rating: 4.7 },
  { id: 'launch-dwarka-coliving', owner_id: 'launch-landlord-1', title: 'Women’s co-living in Dwarka Sector 12', description: 'Managed shared accommodation with furnished rooms and common study space.', type: 'co-living', price: 14500, address: 'Approx. near Dwarka Sector 12 Metro, New Delhi', lat: 28.5921, lng: 77.046, rating: 4.2 },
  { id: 'launch-rohini-house', owner_id: 'launch-landlord-1', title: 'Ground-floor home in Rohini Sector 9', description: 'Two-bedroom ground-floor home with independent entry and a small front sit-out.', type: 'house', price: 28000, address: 'Approx. near Rohini Sector 9, New Delhi', lat: 28.7141, lng: 77.1169, rating: 4.4 },
  { id: 'launch-lajpat-1bhk', owner_id: 'launch-landlord-1', title: 'One-bedroom near Lajpat Nagar', description: 'Well-connected one-bedroom rental with separate living area and storage.', type: 'apartment', price: 26000, address: 'Approx. near Lajpat Nagar Central Market, New Delhi', lat: 28.5677, lng: 77.243, rating: 4.0 },
  { id: 'launch-mayur-vihar-room', owner_id: 'launch-landlord-1', title: 'Metro-side room in Mayur Vihar', description: 'Bright furnished room in a resident-occupied flat, suitable for a working tenant.', type: 'room', price: 13500, address: 'Approx. near Mayur Vihar Phase 1 Metro, Delhi', lat: 28.608, lng: 77.295, rating: 4.2 },
  { id: 'launch-karol-bagh-2bhk', owner_id: 'launch-landlord-1', title: 'Renovated 2BHK in Karol Bagh', description: 'Recently refreshed two-bedroom home near local markets and public transport.', type: 'apartment', price: 34000, address: 'Approx. near Karol Bagh, New Delhi', lat: 28.6519, lng: 77.1909, rating: 4.5 },
  { id: 'launch-rajouri-house', owner_id: 'launch-landlord-1', title: 'Independent first floor in Rajouri Garden', description: 'Three-bedroom first-floor rental with a separate entrance and airy living room.', type: 'house', price: 46000, address: 'Approx. near Rajouri Garden Metro, New Delhi', lat: 28.6429, lng: 77.122, rating: 4.4 },
  { id: 'launch-gurgaon-29-room', owner_id: 'launch-landlord-2', title: 'Furnished room in Gurgaon Sector 29', description: 'Shared flat room close to offices, with an equipped kitchen and weekly cleaning.', type: 'room', price: 18500, address: 'Approx. near Sector 29, Gurgaon', lat: 28.4684, lng: 77.0701, rating: 4.1 },
  { id: 'launch-gurgaon-56-2bhk', owner_id: 'launch-landlord-2', title: 'Garden-facing 2BHK in Gurgaon Sector 56', description: 'Two-bedroom home with a balcony, lift and nearby daily-needs stores.', type: 'apartment', price: 41000, address: 'Approx. near Sector 56, Gurgaon', lat: 28.4248, lng: 77.1026, rating: 4.6 },
  { id: 'launch-noida-62-coliving', owner_id: 'launch-landlord-3', title: 'Professionals’ co-living in Noida Sector 62', description: 'Furnished co-living room with shared lounge and an easy office commute.', type: 'co-living', price: 16000, address: 'Approx. near Sector 62, Noida', lat: 28.627, lng: 77.3659, rating: 4.3 },
  { id: 'launch-noida-137-3bhk', owner_id: 'launch-landlord-3', title: 'Three-bedroom apartment in Noida Sector 137', description: 'Spacious apartment with a family-sized kitchen and community green views.', type: 'apartment', price: 39000, address: 'Approx. near Sector 137, Noida', lat: 28.5085, lng: 77.41, rating: 4.5 },
  { id: 'launch-faridabad-2bhk', owner_id: 'launch-landlord-3', title: 'Value 2BHK in Faridabad Sector 15', description: 'Two-bedroom rental with independent utility space and convenient road access.', type: 'apartment', price: 21000, address: 'Approx. near Sector 15, Faridabad', lat: 28.4083, lng: 77.3177, rating: 4.0 },
].map((listing) => ({
  ...listing,
  currency: 'INR',
  security_deposit: listing.price,
  status: 'available',
  available_from: new Date('2026-08-15T00:00:00Z'),
  images: [PLACEHOLDER_IMAGE],
}));

async function main() {
  await db.insert(users).values(launchLandlords).onConflictDoNothing();
  await db.insert(listings).values(launchListings).onConflictDoNothing();
  console.log(`Launch seed ready: ${launchListings.length} Delhi-NCR rental listings.`);
}

main().catch((error) => {
  console.error('Launch seed failed:', error);
  process.exitCode = 1;
});
