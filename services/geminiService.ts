import { GoogleGenAI } from "@google/genai";
import { PropertyType } from "../types.ts";

const MODEL = 'gemini-3-flash-preview';

export const generateListingDescription = async (
  address: string,
  type: PropertyType,
  price: number,
  highlights: string
): Promise<string> => {
  try {
    // Fix: Initialize GoogleGenAI inside the function to ensure up-to-date API key access
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a professional 150-word commercial listing description for:
      Address: ${address}
      Type: ${type}
      Price: $${price.toLocaleString()}
      Highlights: ${highlights}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert commercial real estate copywriter.",
        temperature: 0.7,
      }
    });

    return response.text || "Description unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating description. Please try again.";
  }
};

export const generateOwnerUpdateEmail = async (
  ownerName: string,
  propertyAddress: string,
  updates: string
): Promise<string> => {
  try {
    // Fix: Initialize GoogleGenAI inside the function call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Draft a concise update email to ${ownerName} regarding ${propertyAddress}: ${updates}`;
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });
    return response.text || "Draft unavailable.";
  } catch (error) {
    return "Error generating draft.";
  }
};