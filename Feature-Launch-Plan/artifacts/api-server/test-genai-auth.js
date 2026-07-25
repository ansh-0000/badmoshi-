const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: 'AIzaSyFakeKeyThatLooksLikeApiKey1234567890' });
ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: 'Hello',
}).then(res => console.log('Success')).catch(err => console.log('Error:', err.message));
