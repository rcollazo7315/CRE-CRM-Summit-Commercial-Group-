
import { PropertyType } from "../types.ts";

// Ensure API Key is available
const API_KEY = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

export interface GroundingSource {
  title: string;
  uri: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * Helper to perform the raw fetch call to Gemini API
 */
const callGeminiApi = async (payload: any) => {
  if (!API_KEY) {
    // Graceful fallback if key is missing in dev
    console.warn("AI Configuration Error: API_KEY is missing.");
    throw new Error("AI Service not configured (Missing API Key).");
  }

  try {
    const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", errorData);
      
      if (response.status === 429) throw new Error("System is busy. Please try again in a moment.");
      if (response.status === 400) throw new Error("Request rejected by AI service. " + (errorData.error?.message || ""));
      throw new Error(`AI Connection Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    // Handle network level errors (offline, blocked, etc)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Network error: Unable to connect to Google Gemini. Please check your internet connection.");
    }
    throw error;
  }
};

/**
 * Main conversational interface for the AI Assistant
 */
export const chatWithAi = async (
  currentMessage: string, 
  history: { role: 'user' | 'model'; text: string }[], 
  systemContext: string
): Promise<string> => {
  
  // Format history for Gemini API
  const contents: ChatMessage[] = history.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  // Add new message
  contents.push({
    role: 'user',
    parts: [{ text: currentMessage }]
  });

  const payload = {
    contents,
    system_instruction: {
      parts: [{ text: systemContext }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    }
  };

  try {
    const data = await callGeminiApi(payload);
    
    if (data.candidates && data.candidates.length > 0) {
      const responseText = data.candidates[0].content.parts[0].text;
      return responseText;
    } else if (data.promptFeedback?.blockReason) {
      return "I cannot respond to this query due to safety guidelines.";
    } else {
      return "I didn't receive a response from the AI. Please try again.";
    }
  } catch (error: any) {
    console.error("Chat service failure:", error);
    throw error;
  }
};

/**
 * Uses Google Search Grounding via REST
 */
export const researchMarketContext = async (query: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: query }]
    }],
    tools: [{ google_search: {} }], // REST API uses snake_case for tools
    system_instruction: {
      parts: [{ text: "You are a professional commercial real estate analyst. Use search results to provide verified, grounded data on cap rates, vacancies, and news. Always cite your data points." }]
    }
  };

  try {
    const data = await callGeminiApi(payload);
    const candidate = data.candidates?.[0];
    
    if (!candidate) return { text: "No insights found.", sources: [] };

    const text = candidate.content.parts.map((p: any) => p.text).join(' ') || "Analysis complete.";
    
    // Extract grounding metadata from REST response structure
    const groundingChunks = candidate.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || ''
      }));

    return { text, sources };
  } catch (error) {
    console.error("Market research error:", error);
    return { text: "Market research unavailable at this moment.", sources: [] };
  }
};

/**
 * Generates listing description
 */
export const generateListingDescription = async (
  address: string,
  type: PropertyType,
  price: number,
  highlights: string
): Promise<string> => {
  const prompt = `Draft an institutional-quality commercial real estate listing for ${address} (${type}). 
                 Asking Price: $${price.toLocaleString()}. 
                 Context: ${highlights}`;

  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    system_instruction: {
      parts: [{ text: "You are a senior CRE broker at a top-tier firm. Use sophisticated, high-end terminology. Focus on investment yield and strategic location." }]
    },
    generationConfig: {
      temperature: 0.8
    }
  };

  try {
    const data = await callGeminiApi(payload);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate description.";
  } catch (error) {
    return "Description generation currently unavailable.";
  }
};

/**
 * Site Neighborhood Analysis (Maps)
 */
export const analyzeSiteNeighborhood = async (address: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: `Analyze the surrounding infrastructure for the commercial property at ${address}. Focus on transit hubs, major retail anchors, and business drivers.` }]
    }],
    tools: [{ google_search: {} }], // Fallback to search if maps tool specific syntax isn't available
  };

  try {
    const data = await callGeminiApi(payload);
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "Analysis unavailable.";
    
    // Simple source extraction
    const sources: GroundingSource[] = []; 
    if (candidate?.groundingMetadata?.groundingChunks) {
       candidate.groundingMetadata.groundingChunks.forEach((chunk: any) => {
         if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
       });
    }

    return { text, sources };
  } catch (error) {
    console.error("Site analysis error:", error);
    return { text: "Unable to analyze site location.", sources: [] };
  }
};

export const generateRegistrationEmails = async (
  agentName: string,
  agentEmail: string,
  username: string,
  licenseNumber: string
): Promise<{ adminEmail: string; userEmail: string }> => {
  const prompt = `
    Generate JSON for two automated emails triggered by a new agent registration.
    Context: Agent ${agentName}, Username ${username}, Email ${agentEmail}, License ${licenseNumber}.
    
    Return ONLY a raw JSON object (no markdown formatting) with keys:
    - adminEmail: Email body for admin notification
    - userEmail: Email body for user welcome
  `;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const data = await callGeminiApi(payload);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Email generation failed:", error);
    return {
      adminEmail: "Error generating content.",
      userEmail: "Error generating content."
    };
  }
};
