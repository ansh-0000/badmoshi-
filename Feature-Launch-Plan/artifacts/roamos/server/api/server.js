const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI, Type } = require('@google/genai');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize the Google Gen AI client
// It automatically picks up process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({});

// System prompt designed to shape the LLM into our local guide persona, Tira.
const TIRA_SYSTEM_PROMPT = `
You are Tira, an incredibly helpful, localized travel guide and concierge AI for the ROAM•OS application.
You possess a deep knowledge of transport, flights, local information, stays, food, and culture.
You are directly connected to the internet using Google Search, so you MUST look up live information (e.g., current metro rates, current flight prices, accurate live data, weather).

Crucial Instructions:
1. Always adapt your language slightly based on the user's location (if provided), or default to standard friendly English with localized nuances (like quoting prices in Rupees for Indian locations).
2. For transport queries, explicitly provide estimated duration and cost (e.g., "30 mins", "₹45").
3. Your responses must be concise, accurate, and extremely helpful. Never say "I am an AI", just act as Tira.
4. Format your output strictly according to the requested JSON schema.
`;

app.post('/api/guide/ask', async (req, res) => {
  try {
    const { question, city } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // DEMO MODE FALLBACK
    // If the user hasn't set up an API key, return a beautiful simulated response 
    // instead of crashing so they can test the UI.
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      console.log('No Gemini API Key found. Returning Demo response.');
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1500));
      
      let mockResponse = {
        response: "I couldn't find a valid API key, so I'm running in Demo Mode! 🚀\n\nIf you asked about a flight to Mumbai, Indigo usually charges around ₹4,500 and takes 2 hours. If you asked about local transport, the Metro is your best bet!",
        suggestedActions: ["How do I add my API key?", "Show me a route example", "What are the metro timings?"],
        routeOverview: null,
        steps: null
      };

      if (question.toLowerCase().includes('flight') || question.toLowerCase().includes('airport')) {
        mockResponse = {
          response: "Flights to Mumbai from here usually take about 2h 15m. Prices for tomorrow are starting at ₹4,200 via Indigo and ₹4,800 via Vistara. Would you like me to find the best time to leave for the airport?",
          suggestedActions: ["Yes, best time to leave?", "What's the baggage allowance?", "Show me train options instead"],
          routeOverview: { duration: "2h 15m", cost: "₹4,200" },
          steps: [
            { mode: "Cab", instruction: "Uber to Airport (Terminal 3)", color: "#132018" },
            { mode: "Flight", instruction: "Indigo 6E-2041 to BOM", color: "#3B82F6" }
          ]
        };
      }

      return res.json(mockResponse);
    }

    // Append context to the user's query
    const userPrompt = `
User Context: The user is currently exploring or located in the city of: ${city || 'Unknown'}.
User Query: ${question}
    `;

    // Call Gemini using the latest SDK pattern, enforcing a JSON schema output
    // so our frontend can reliably parse the response, suggestions, and timeline steps.
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userPrompt,
      config: {
        systemInstruction: TIRA_SYSTEM_PROMPT,
        // Enable Google Search as a tool for live web retrieval
        tools: [{ googleSearch: {} }],
        // Enforce JSON output matching the interface expected by tira.tsx
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            response: {
              type: Type.STRING,
              description: 'The main conversational response to the user.'
            },
            suggestedActions: {
              type: Type.ARRAY,
              description: '2-4 follow-up questions the user can tap to ask next.',
              items: { type: Type.STRING }
            },
            routeOverview: {
              type: Type.OBJECT,
              description: 'Only provide if the query is about a route/journey. Null otherwise.',
              nullable: true,
              properties: {
                duration: { type: Type.STRING, description: 'e.g., "45 mins"' },
                cost: { type: Type.STRING, description: 'e.g., "₹60"' }
              }
            },
            steps: {
              type: Type.ARRAY,
              description: 'Only provide if the query asks for directions/itinerary. A step-by-step timeline.',
              nullable: true,
              items: {
                type: Type.OBJECT,
                properties: {
                  mode: { type: Type.STRING, description: 'e.g., "Metro", "Walk", "Cab"' },
                  instruction: { type: Type.STRING, description: 'e.g., "Take Yellow line to Rajiv Chowk"' },
                  color: { type: Type.STRING, description: 'A hex color matching the transport mode (e.g. #3B82F6 for metro)' }
                }
              }
            }
          },
          required: ['response', 'suggestedActions']
        }
      }
    });

    if (response.text) {
      const parsedData = JSON.parse(response.text);
      return res.json(parsedData);
    } else {
      throw new Error('No text returned from Gemini');
    }

  } catch (error) {
    console.error('Error generating AI response:', error);
    res.status(500).json({ error: 'Failed to generate response. Check API key and network.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Tira AI Server' });
});

app.listen(port, () => {
  console.log(`Tira AI Backend running at http://localhost:${port}`);
});
