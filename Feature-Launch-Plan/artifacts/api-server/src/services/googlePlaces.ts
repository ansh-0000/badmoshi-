export interface GooglePlaceResult {
  name: string;
  rating: number | null;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
}

export async function fetchPlaceDetails(query: string): Promise<GooglePlaceResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;

  try {
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const response = await fetch(textSearchUrl);
    if (!response.ok) return null;
    
    const data = await response.json() as any;
    const results = data.results;
    
    if (!results || results.length === 0) return null;
    
    const place = results[0];
    const name = place.name;
    const rating = place.rating || null;
    const lat = place.geometry?.location?.lat || null;
    const lng = place.geometry?.location?.lng || null;
    
    let imageUrl = null;
    if (place.photos && place.photos.length > 0) {
      const photoRef = place.photos[0].photo_reference;
      imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`;
    }

    return { name, rating, lat, lng, imageUrl };
  } catch (error) {
    console.error('Google Places API error:', error);
    return null;
  }
}
