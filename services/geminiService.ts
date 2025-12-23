import { GoogleGenAI, Type } from "@google/genai";
import { PropertyType } from "../types.ts";

export interface GroundingSource {
  title: string;
  uri: string;
}

/**
 * Uses Google Search Grounding to research market conditions
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
        systemInstruction: "You are a professional commercial real estate analyst. Use search results to provide verified, grounded data on cap rates, vacancies, and news.",
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
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
 * Model: gemini-2.5-flash
 */
export const analyzeSiteNeighborhood = async (address: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Perform a detailed neighborhood and amenity analysis for the property at: ${address}. Identify transit hubs, major retail anchors, traffic drivers, and logistics infrastructure.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter(chunk => chunk.maps)
      .map(chunk => ({
        title: chunk.maps?.title || 'Location Found',
        uri: chunk.maps?.uri || ''
      }));

    return {
      text: response.text || "Site analysis unavailable.",
      sources
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Unable to reach Google Maps for site analysis.", sources: [] };
  }
};

export const generateListingDescription = async (
  address: string,
  type: PropertyType,
  price: number,
  highlights: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a professional listing description for ${address} (${type}) asking $${price.toLocaleString()}. Highlights: ${highlights}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert CRE copywriter.",
        temperature: 0.7,
      }
    });
    return response.text || "Description generation failed.";
  } catch (error) {
    return "Description unavailable.";
  }
};