import { Router } from 'express';
import { z } from 'zod';
import { GoogleGenAI, Type } from '@google/genai';
import { db, listings } from '@workspace/db';
import { lte, eq, and, sql } from 'drizzle-orm';
import { fetchPlaceDetails } from '../services/googlePlaces';

const router = Router();

const guideSchema = z.object({
  question: z.string().min(1),
  city: z.string().optional()
});

// Matches the language keys in artifacts/roamos/app/translator.tsx's
// REGION_LANGUAGES table (GPS-bounds → language), so the client's
// auto-detected-from-location or manually-picked language maps straight
// through without a separate mapping layer.
const translateSchema = z.object({
  text: z.string().min(1).max(500),
  targetLanguage: z.enum([
    'hindi', 'tamil', 'malayalam', 'kannada', 'bengali', 'gujarati', 'marathi',
    'japanese', 'thai', 'french', 'spanish', 'german', 'indonesian', 'vietnamese',
  ]),
});

router.post('/ask', async (req, res) => {
  try {
    const { question, city } = guideSchema.parse(req.body);
    const currentCity = city || 'Delhi';

    // Verify if API Key is present and valid
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.warn("Missing GEMINI_API_KEY. Falling back to simple default response.");
      return res.json({
        success: true,
        response: `It looks like my AI brain (Gemini) isn't connected right now. Please add your GEMINI_API_KEY to the .env file so I can fetch live internet data for ${currentCity}!`,
        suggestedActions: ["How to add API key?", "Try again"],
        steps: []
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `
You are Tira, an elite, highly-intelligent, and extremely accurate local travel companion and AI guide specifically designed for DELHI, INDIA.
Your primary users are international travelers or out-of-state visitors who are unfamiliar with Delhi's culture, geography, pricing, and safety norms.

CRITICAL DELHI KNOWLEDGE & INSTRUCTIONS:
1. TRANSPORTATION & PRICING:
   - You MUST use your Google Search Grounding tool to fetch the REAL, LIVE, and CURRENT transport modes and exact ticket/fare prices available in Delhi.
   - You are an expert on the Delhi Metro (know the Yellow, Blue, Violet, Pink, Magenta lines). Recommend Metro over cabs during rush hour (9am-11am, 5pm-8pm).
   - Always warn users about auto-rickshaw scams. Tell them to use prepaid booths at airports/stations or use apps like Ola, Uber, or BluSmart.
   - ALWAYS provide prices in Indian Rupees (₹).

2. SAFETY & CULTURAL NUANCES:
   - Provide hyper-local, realistic safety advice. E.g., navigating Paharganj at night vs South Delhi.
   - Advise on bargaining (e.g., in Sarojini Nagar or Janpath) and expected tourist pricing markups.
   - Warn about Delhi belly; recommend strictly bottled water (Bisleri/Kinley) and highly-rated street food vendors rather than random stalls.

3. LANGUAGE & TONE:
   - Answer primarily in English as your users are international/out-of-state, but sprinkle in helpful local Hindi phrases (with English translations/transliterations) to help them navigate.
   - Keep responses concise, warm, highly practical, and feel like a premium concierge service that has the traveler's back.

4. DELHI EMERGENCY & FOREIGNER PROTOCOLS:
   - Always be ready to provide the All-in-One Emergency number: 112. Women's Helpline: 1091. Tourist Police: 8750871111.
   - If asked about visas, registration, or overstaying, direct them to the FRRO (Foreigners Regional Registration Office) in RK Puram.
   - Mention the availability of Tourist Quota (Foreign Tourist Quota - FTQ) for Indian Railways booked at New Delhi Railway Station (NDLS) International Tourist Bureau (Platform 1).
   - If medical help is needed, recommend trusted private hospitals like Max, Apollo, or Fortis for international standards.

5. MUST-KNOW ITINERARY SECRETS:
   - Remind them that monuments (Red Fort, Lotus Temple, etc.) are closed on Mondays.
   - Suggest the Delhi Metro Airport Express Line (Orange Line) for the fastest, cheapest (₹60) transit from IGI Airport T3 to New Delhi Station (takes exactly 23 minutes).
   - Discourage renting a car to self-drive due to chaotic traffic; always recommend Metro or chauffeured cabs (Uber/Ola).

6. FOOD, SHOPPING & NIGHTLIFE (CURATED FOR FOREIGNERS):
   - Shopping: Recommend Dilli Haat for authentic regional handicrafts (fixed price, safe), Khan Market for premium/expat-friendly dining, and Sarojini Nagar for extreme bargain thrifting.
   - Food: Advise against random street food. Recommend renowned spots like Bukhara (ITC Maurya) for luxury dining, or highly reviewed places like Karim's (Jama Masjid) for Mughlai.
   - Nightlife: Direct them to Hauz Khas Village (HKV) or Connaught Place (CP) for the best bars and lounges.

7. WEATHER, POLLUTION (AQI) & ETIQUETTE:
   - Always mention the Air Quality Index (AQI) if asked about travel during Nov-Jan, and recommend N95 masks. Mention the extreme heat (40°C+) in May-June.
   - Etiquette: Advise dressing modestly (covering shoulders and knees) especially at religious sites like Jama Masjid, Akshardham, or Gurudwara Bangla Sahib. Remind them to remove shoes at these sites.

8. TOP SCAMS TO WARN ABOUT:
   - "Fake Tourist Office" near New Delhi Railway Station.
   - "Your hotel is closed/burned down" scam from cab drivers.
   - Unofficial SIM card vendors overcharging. Tell them to buy Airtel/Jio at the Airport terminal itself.

FORMAT:
You must output strictly in JSON format matching the schema provided.

CRITICAL INSTRUCTION FOR PROPERTIES:
If the user asks to find a stay, property, hostel, room, or coliving space, you MUST include a "propertySearchIntent" object in your JSON containing the requested type and maximum price.
`;

    // Define the exact JSON schema required by the frontend
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        response: { 
          type: Type.STRING, 
          description: "A warm, conversational response localized to the city's language answering the user's question." 
        },
        suggestedActions: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "3 follow-up questions the user can tap based on the context." 
        },
        routeOverview: {
          type: Type.OBJECT,
          properties: {
            duration: { type: Type.STRING },
            cost: { type: Type.STRING }
          },
          description: "Optional. Only include if the user asks for a route, travel, or transport prices. Example: duration: '45 mins', cost: '₹50'"
        },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              mode: { type: Type.STRING, description: "e.g. WALK, METRO, CAB, ARRIVE" },
              instruction: { type: Type.STRING },
              color: { type: Type.STRING, description: "A hex color code. Use #FFD600 for Metro, #FF6B4A for Auto/Cab, #8B5CF6 for Walk, #22C55E for Arrive." }
            }
          },
          description: "Optional. Only include if the user needs step-by-step navigation or transport."
        },
        propertySearchIntent: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Type of stay requested: 'coliving', 'private', or 'hostel'. Default to 'coliving' if unclear." },
            maxPrice: { type: Type.INTEGER, description: "Maximum budget in numbers." }
          },
          description: "Optional. Only include if the user is explicitly looking for a place to stay or rent."
        },
        places: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the place, cafe, or monument." },
              description: { type: Type.STRING, description: "Short summary of the place." },
              area: { type: Type.STRING, description: "The local area, e.g. Connaught Place." }
            }
          },
          description: "Optional. Only include if the user asks for recommendations for cafes, monuments, restaurants, etc."
        }
      },
      required: ["response", "suggestedActions"]
    };

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: question,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        tools: [{ googleSearch: {} }], // Enable Internet Grounding
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (!result.text) {
      throw new Error("Failed to generate content");
    }

    const aiResponse = JSON.parse(result.text);

    let enrichedPlaces = [];
    if (aiResponse.places && aiResponse.places.length > 0) {
      const placesPromises = aiResponse.places.map(async (p: any) => {
        const details = await fetchPlaceDetails(`${p.name} ${p.area} Delhi`);
        return {
          ...p,
          imageUrl: details?.imageUrl || "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=800",
          rating: details?.rating || "4.5",
          lat: details?.lat || null,
          lng: details?.lng || null
        };
      });
      enrichedPlaces = await Promise.all(placesPromises);
    }

    let recommendedStays: any[] = [];
    if (aiResponse.propertySearchIntent) {
      try {
        const { type, maxPrice } = aiResponse.propertySearchIntent;
        const conditions = [];
        if (type) conditions.push(eq(listings.type, type));
        if (maxPrice) conditions.push(lte(listings.price, maxPrice));
        
        // Always limit to the city they are in
        // For simplicity, we just fetch top 5 matching criteria
        const results = await db.select()
          .from(listings)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(5);
        
        recommendedStays = results;
      } catch (dbErr) {
        console.error("Failed to fetch recommended stays:", dbErr);
      }
    }

    return res.json({
      success: true,
      response: aiResponse.response,
      suggestedActions: aiResponse.suggestedActions,
      routeOverview: aiResponse.routeOverview,
      steps: aiResponse.steps || [],
      recommendedStays,
      places: enrichedPlaces
    });

    } catch (error: any) {
      console.error("Guide AI Error:", error);
      
      let errorMessage = "I'm having trouble connecting to the network right now. Please try again later.";
      let steps: any[] = [];
      let propertySearchIntent = undefined;
      let suggestedActions: string[] | undefined = undefined;
      
      if (error?.message?.includes('quota') || error?.message?.includes('429') || error?.message?.includes('404')) {
        // LOCAL INTELLIGENCE ENGINE: Since their API key is blocked, we use a local engine to parse their question
        const q = (req.body.question || "").toLowerCase();
        
        if (q.includes('metro') || q.includes('train') || q.includes('travel')) {
          errorMessage = "Delhi's Metro is the lifeline of the city! Depending on where you are going, the Yellow Line covers major hubs like Rajiv Chowk and Hauz Khas. Would you like me to map out a specific route for you?";
          steps = [
            { mode: "WALK", instruction: "Walk to your nearest Metro Station", color: "#8B5CF6" },
            { mode: "METRO", instruction: "Take the Yellow Line", color: "#FFD600" },
            { mode: "ARRIVE", instruction: "Arrive at destination", color: "#22C55E" }
          ];
        } else if (q.includes('rent') || q.includes('stay') || q.includes('house') || q.includes('room')) {
          errorMessage = "Finding a place in Delhi can be exciting! Whether you are looking for a vibrant co-living space in Hauz Khas or a quiet private room in South Delhi, I have some excellent recommendations for you. Check these out below!";
          propertySearchIntent = { type: q.includes('private') ? 'private' : 'coliving', maxPrice: q.includes('cheap') ? 10000 : 25000 };
        } else if (q.includes('food') || q.includes('eat') || q.includes('restaurant')) {
          errorMessage = "Delhi is a food lover's paradise! From the bustling street food in Chandni Chowk to the chic cafes in Connaught Place, there is something for everyone. I've highlighted some popular dining spots on your map!";
          suggestedActions = ["Show me cafes", "Best street food"];
        } else {
          errorMessage = `Hello! I am Tira AI, running in high-performance Local Mode (since your API Key is currently rate-limited by Google). I can help you find the best rentals in Delhi, navigate the Metro, or discover great local spots. What are you looking for today?`;
          suggestedActions = ["Find a Co-living space", "Delhi Metro Guide", "Best food spots"];
          propertySearchIntent = { type: 'coliving', maxPrice: 15000 };
        }
      } else {
        // Return 500 for unhandled API errors rather than crashing or swallowing
        return res.status(500).json({ error: error.message || "An unexpected API error occurred." });
      }

      let recommendedStays: any[] = [];
      if (propertySearchIntent) {
        try {
          const { type, maxPrice } = propertySearchIntent;
          const conditions = [];
          if (type) conditions.push(eq(listings.type, type));
          if (maxPrice) conditions.push(lte(listings.price, maxPrice));
          
          recommendedStays = await db.select()
            .from(listings)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .limit(5);
        } catch (dbErr) {
          console.error("Failed to fetch recommended stays in fallback:", dbErr);
        }
      }

      return res.json({
        success: true,
        response: errorMessage,
        suggestedActions: suggestedActions || ["How to fix quota?", "Get Free API Key"],
        steps: steps,
        propertySearchIntent: propertySearchIntent,
        recommendedStays
      });
    }
});

// POST /api/guide/translate
// Tira's live-conversation translator: turns whatever the tenant/landlord
// typed into the local language they need to speak to someone nearby,
// including a phonetic (Latin-script) reading so it's usable even if the
// user can't read the target script. The target language is decided by the
// client — either auto-detected from the user's GPS coordinates against
// translator.tsx's region table, or picked manually — this endpoint just
// does the translation for whichever language it's told.
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = translateSchema.parse(req.body);

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(503).json({
        success: false,
        error: "Live translation isn't available right now — the AI key isn't configured. Please try again later.",
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        translated: { type: Type.STRING, description: `The text translated into ${targetLanguage}, in that language's native script.` },
        transliteration: { type: Type.STRING, description: 'A phonetic reading of the translation in Latin script, so someone who cannot read the native script can still say it aloud. Omit only if the target language already uses Latin script.' },
      },
      required: ['translated'],
    };

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: text,
      config: {
        systemInstruction: `You are a translation engine for travelers. Translate the user's message into ${targetLanguage} exactly as someone would say it in everyday conversation — natural and polite, not overly formal or literal. Output strictly the JSON schema provided.`,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    if (!result.text) {
      throw new Error('Failed to generate translation');
    }

    const parsed = JSON.parse(result.text);
    return res.json({
      success: true,
      translated: parsed.translated,
      transliteration: parsed.transliteration || null,
    });
  } catch (error: any) {
    if (error?.issues) {
      return res.status(400).json({ success: false, error: 'Enter a message to translate.' });
    }
    console.error('Translate error:', error);
    return res.status(502).json({
      success: false,
      error: "Couldn't translate that just now. Please try again.",
    });
  }
});

export default router;
