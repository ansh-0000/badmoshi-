export const CITIES = [
  { id: 'delhi', name: 'New Delhi', coords: '28.6139°N  77.2090°E', timezone: 'IST +5:30' },
  { id: 'mumbai', name: 'Mumbai', coords: '19.0760°N  72.8777°E', timezone: 'IST +5:30' },
  { id: 'goa', name: 'Panaji, Goa', coords: '15.2993°N  74.1240°E', timezone: 'IST +5:30' },
  { id: 'bengaluru', name: 'Bengaluru', coords: '12.9716°N  77.5946°E', timezone: 'IST +5:30' },
  { id: 'jaipur', name: 'Jaipur', coords: '26.9124°N  75.7873°E', timezone: 'IST +5:30' },
  { id: 'udaipur', name: 'Udaipur', coords: '24.5854°N  73.7125°E', timezone: 'IST +5:30' },
  { id: 'manali', name: 'Manali', coords: '32.2396°N  77.1887°E', timezone: 'IST +5:30' },
  { id: 'gurugram', name: 'Gurugram', coords: '28.4595°N  77.0266°E', timezone: 'IST +5:30' },
];

export const CHECKLIST_ITEMS = [
  { id: 'sim', title: 'Get local SIM card', subtitle: 'Airtel or Jio — buy at airport', icon: 'smartphone' },
  { id: 'cash', title: 'Withdraw cash', subtitle: 'ATMs near railway stations', icon: 'credit-card' },
  { id: 'stay', title: 'Check into your stay', subtitle: 'Confirm landlord arrival', icon: 'home' },
  { id: 'food', title: 'First meal nearby', subtitle: 'See Eat & Drink tab', icon: 'coffee' },
  { id: 'transport', title: 'Download Ola or Rapido', subtitle: 'Skip the auto-rickshaw haggle', icon: 'navigation' },
  { id: 'water', title: 'Buy sealed water & electrolytes', subtitle: 'Stick to Bisleri / Kinley', icon: 'droplet' },
];

export interface Stay {
  id: string;
  name: string;
  location: string;
  type: 'private' | 'coliving' | 'hostel';
  price: number;
  rating: number;
  remoteWorkScore: number;
  autopay: boolean;
  verified: boolean;
  image: string;
  landlord: string;
}

export const STAYS: Stay[] = [
  {
    id: 's1',
    name: 'The Loft — Hauz Khas',
    location: 'Hauz Khas Village, Delhi',
    type: 'coliving',
    price: 22000,
    rating: 4.8,
    remoteWorkScore: 9.2,
    autopay: true,
    verified: true,
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format',
    landlord: 'Priya Mehra',
  },
  {
    id: 's2',
    name: 'Colaba Studios',
    location: 'Colaba, Mumbai',
    type: 'private',
    price: 35000,
    rating: 4.6,
    remoteWorkScore: 8.5,
    autopay: true,
    verified: true,
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format',
    landlord: 'Rahul Sharma',
  },
  {
    id: 's3',
    name: 'Anjuna Collective',
    location: 'Anjuna Beach, Goa',
    type: 'coliving',
    price: 18000,
    rating: 4.9,
    remoteWorkScore: 7.8,
    autopay: false,
    verified: true,
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&auto=format',
    landlord: "Sebastian D'Cruz",
  },
  {
    id: 's4',
    name: 'Indiranagar House',
    location: 'Indiranagar, Bengaluru',
    type: 'private',
    price: 28000,
    rating: 4.7,
    remoteWorkScore: 9.5,
    autopay: true,
    verified: false,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format',
    landlord: 'Aditya Rao',
  },
  {
    id: 's5',
    name: 'Pink City Hostel',
    location: 'Old City, Jaipur',
    type: 'hostel',
    price: 8000,
    rating: 4.5,
    remoteWorkScore: 6.5,
    autopay: false,
    verified: true,
    image: 'https://images.unsplash.com/photo-1543968996-ee822b8176ba?w=600&auto=format',
    landlord: 'Sunita Agarwal',
  },
  {
    id: 's6',
    name: 'Udaipur Lake View',
    location: 'Fateh Sagar, Udaipur',
    type: 'private',
    price: 19000,
    rating: 4.9,
    remoteWorkScore: 7.2,
    autopay: true,
    verified: true,
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600&auto=format',
    landlord: 'Meenakshi Rajput',
  },
];

export interface FoodPlace {
  id: string;
  name: string;
  location: string;
  cuisine: string;
  type: 'cafe' | 'restaurant' | 'bar';
  openAt: 'day' | 'night' | 'both';
  rating: number;
  priceLevel: 1 | 2 | 3;
  image: string;
  latitude: number;
  longitude: number;
}

export const FOOD_PLACES: FoodPlace[] = [
  {
    id: 'f1',
    name: 'Blue Tokai Coffee',
    location: 'Hauz Khas, Delhi',
    cuisine: 'Specialty Coffee',
    type: 'cafe',
    openAt: 'day',
    rating: 4.9,
    priceLevel: 2,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format',
    latitude: 28.5535,
    longitude: 77.1934,
  },
  {
    id: 'f2',
    name: "Karim's",
    location: 'Gali Kababian, Old Delhi',
    cuisine: 'Mughlai',
    type: 'restaurant',
    openAt: 'both',
    rating: 4.8,
    priceLevel: 1,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format',
    latitude: 28.6506,
    longitude: 77.2334,
  },
  {
    id: 'f3',
    name: 'Social — Hauz Khas',
    location: 'Hauz Khas Village, Delhi',
    cuisine: 'Fusion Bar Bites',
    type: 'bar',
    openAt: 'night',
    rating: 4.4,
    priceLevel: 2,
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600&auto=format',
    latitude: 28.5539,
    longitude: 77.1942,
  },
  {
    id: 'f4',
    name: 'Chai Point',
    location: 'Indiranagar, Bengaluru',
    cuisine: 'Indian Street Food',
    type: 'cafe',
    openAt: 'day',
    rating: 4.6,
    priceLevel: 1,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&auto=format',
    latitude: 28.6149,
    longitude: 77.2100,
  },
  {
    id: 'f5',
    name: 'The Bombay Canteen',
    location: 'Lower Parel, Mumbai',
    cuisine: 'Modern Indian',
    type: 'restaurant',
    openAt: 'both',
    rating: 4.8,
    priceLevel: 3,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format',
    latitude: 28.6250,
    longitude: 77.2050,
  },
  {
    id: 'f6',
    name: 'Thalassa',
    location: 'Vagator, Goa',
    cuisine: 'Mediterranean',
    type: 'bar',
    openAt: 'night',
    rating: 4.8,
    priceLevel: 3,
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&auto=format',
    latitude: 28.5355,
    longitude: 77.2505,
  },
  {
    id: 'f7',
    name: 'Gunpowder',
    location: 'Hauz Khas Village, Delhi',
    cuisine: 'South Indian',
    type: 'restaurant',
    openAt: 'both',
    rating: 4.7,
    priceLevel: 2,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format',
    latitude: 28.6493,
    longitude: 77.2323,
  },
  {
    id: 'f8',
    name: 'Koramangala Kitchen',
    location: 'Koramangala, Bengaluru',
    cuisine: 'North Indian',
    type: 'restaurant',
    openAt: 'day',
    rating: 4.5,
    priceLevel: 1,
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format',
    latitude: 28.5250,
    longitude: 77.2150,
  },
];

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientId?: string;
}

export interface Translation {
  id: string;
  english: string;
  hindi: string;
  tamil: string;
  transliteration: string;
}

export const TRANSLATIONS: Translation[] = [
  { id: 't1', english: 'How much does this cost?', hindi: 'Yeh kitne ka hai?', tamil: 'Indha vilai yenna?', transliteration: 'Yeh kit-nay ka hai?' },
  { id: 't2', english: 'Where is the nearest ATM?', hindi: 'Sabse nazdik ATM kahan hai?', tamil: 'Arukinil ATM enga irukku?', transliteration: 'Sab-say naz-deek ATM ka-han hai?' },
  { id: 't3', english: 'Please take me to this address', hindi: 'Mujhe is pate par le chalein', tamil: 'Intha muyalvathilum ennai kondu selungal', transliteration: 'Mu-jhay is pa-tay par lay cha-lein' },
  { id: 't4', english: 'Do you have vegetarian options?', hindi: 'Kya aapke paas veg khana hai?', tamil: 'Unga kitta veg unavu irukka?', transliteration: 'Kya aap-kay paas veg kha-na hai?' },
  { id: 't5', english: 'Is this area safe at night?', hindi: 'Kya yeh ilaka raat mein surakshit hai?', tamil: 'Indha idham iravu paadhugaappaaga irukka?', transliteration: 'Kya yeh i-la-ka raat mein su-rakh-shit hai?' },
  { id: 't6', english: 'I need a doctor', hindi: 'Mujhe doctor chahiye', tamil: 'Enakku doctor vendum', transliteration: 'Mu-jhay doc-tor cha-hi-yay' },
  { id: 't7', english: 'Can I have the bill please?', hindi: 'Bill de dijiye', tamil: 'Bill kudunga please', transliteration: 'Bill day dee-ji-yay' },
  { id: 't8', english: 'This is delicious!', hindi: 'Bahut swaadisht hai!', tamil: 'Romba tasty-ah irukku!', transliteration: 'Ba-hut swaa-disht hai!' },
];

export const NEARBY_PLACES = [
  { id: 'n1', name: 'Chai Stall', type: 'food', distance: 0.2, angle: 45, active: true },
  { id: 'n2', name: 'Central Bank ATM', type: 'atm', distance: 0.5, angle: 130, active: true },
  { id: 'n3', name: 'The Loft Co-living', type: 'stay', distance: 0.8, angle: 220, active: true },
  { id: 'n4', name: 'Metro Station', type: 'transport', distance: 1.1, angle: 305, active: false },
  { id: 'n5', name: 'Dilli Haat', type: 'explore', distance: 1.6, angle: 70, active: true },
  { id: 'n6', name: 'Pharmacy', type: 'health', distance: 0.3, angle: 165, active: true },
  { id: 'n7', name: 'Café Lota', type: 'food', distance: 2.1, angle: 340, active: false },
];
