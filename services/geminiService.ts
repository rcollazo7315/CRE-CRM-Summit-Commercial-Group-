
import { GoogleGenAI, Type } from "@google/genai";
import { PropertyType } from "../types.ts";

export interface GroundingSource {
  title: string;
  uri: string;
}

/**
 * Uses Google Search Grounding to research market conditions
 * Best for: cap rates, local market trends, vacancy news.
 * Model: gemini-3-flash-preview
 */
export const researchMarketContext = async (query: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional commercial real estate analyst. Use search results to provide verified, grounded data on cap rates, vacancies, and news. Always cite your data points.",
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || ''
      }));

    return {
      text: response.text || "No insights found.",
      sources
    };
  } catch (error) {
    console.error("Search Grounding Error:", error);
    return { text: "Live market data unavailable at the moment.", sources: [] };
  }
};

/**
 * Uses Google Maps Grounding to analyze neighborhood proximity
 * Best for: identifying transit, retail anchors, and logistics infrastructure.
 * Model: gemini-2.5-flash
 */
export const analyzeSiteNeighborhood = async (address: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Get user location for better proximity results if available
    let locationConfig = {};
    try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        locationConfig = {
            toolConfig: {
                retrievalConfig: {
                    latLng: {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }
                }
            }
        };
    } catch (e) {
        console.warn("Location permission denied or unavailable, proceeding with default site analysis.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the surrounding infrastructure for the commercial property at ${address}. Focus on transit hubs, major retail anchors, and business drivers.`,
      config: {
        tools: [{ googleMaps: {} }],
        ...locationConfig
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter(chunk => chunk.maps)
      .map(chunk => ({
        title: chunk.maps?.title || 'Map Location',
        uri: chunk.maps?.uri || ''
      }));

    return {
      text: response.text || "Site analysis unavailable.",
      sources
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Unable to reach Google Maps for site intelligence.", sources: [] };
  }
};

/**
 * Generates a professional CRE listing description
 */
export const generateListingDescription = async (
  address: string,
  type: PropertyType,
  price: number,
  highlights: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Draft an institutional-quality commercial real estate listing for ${address} (${type}). 
                   Asking Price: $${price.toLocaleString()}. 
                   Context: ${highlights}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a senior CRE broker at a top-tier firm. Use sophisticated, high-end terminology. Focus on investment yield and strategic location.",
        temperature: 0.8,
      }
    });
    return response.text || "Description generation failed.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Description generation currently unavailable.";
  }
};
