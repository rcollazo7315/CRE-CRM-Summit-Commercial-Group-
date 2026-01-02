
import { PropertyType } from "../types.ts";

const MODEL_NAME = 'gemini-3-flash-preview';

export interface GroundingSource {
  title: string;
  uri: string;
}

// Helper to safely initialize client using Dynamic Import
// This prevents the entire app from crashing on load if the `@google/genai` package is missing or fails to fetch.
const getAiClient = async () => {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please check your environment configuration.");
    }
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to load Google GenAI SDK:", e);
    throw new Error("AI Service Unavailable: SDK failed to load.");
  }
};

export const generateListingDescription = async (
  address: string,
  type: PropertyType,
  price: number,
  highlights: string
): Promise<string> => {
  try {
    const ai = await getAiClient();
    const prompt = `
      Create a professional, compelling commercial real estate listing description for the following property:
      Address: ${address}
      Type: ${type}
      Asking Price: $${price.toLocaleString()}
      Key Highlights: ${highlights}

      Tone: Professional, sophisticated, persuasive.
      Length: Approximately 150 words.
      Format: Plain text, no markdown.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class commercial real estate copywriter. Your goal is to attract high-net-worth investors.",
        temperature: 0.7,
      }
    });

    return response.text || "Description generation unavailable.";
  } catch (error) {
    console.error("Gemini Listing Gen Error:", error);
    return "Unable to generate listing description. AI Service may be unavailable.";
  }
};

export const researchMarketContext = async (query: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const ai = await getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional commercial real estate analyst. Use search results to provide verified, grounded data on cap rates, vacancies, and news. Always cite your data points.",
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || ''
      }));

    return {
      text: response.text || "No insights found.",
      sources
    };
  } catch (error) {
    console.error("Gemini Market Research Error:", error);
    return { 
      text: "Unable to retrieve live market data at this time. Please try again later.", 
      sources: [] 
    };
  }
};

export const analyzeSiteNeighborhood = async (address: string): Promise<{ text: string; sources: GroundingSource[] }> => {
  try {
    const ai = await getAiClient();
    
    // Note: User location omitted for robustness
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the surrounding infrastructure for the commercial property at ${address}. Focus on transit hubs, major retail anchors, and business drivers.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.maps)
      .map((chunk: any) => ({
        title: chunk.maps?.title || 'Map Location',
        uri: chunk.maps?.uri || ''
      }));

    return {
      text: response.text || "Site analysis unavailable.",
      sources
    };
  } catch (error) {
    console.error("Gemini Site Analysis Error:", error);
    return { text: "Unable to analyze site location. Please verify the address and try again.", sources: [] };
  }
};

export const generateOwnerUpdateEmail = async (
  ownerName: string,
  propertyAddress: string,
  updates: string
): Promise<string> => {
  try {
    const ai = await getAiClient();
    const prompt = `
      Draft a professional email to a property owner giving them a weekly update on their asset.
      Owner Name: ${ownerName}
      Property: ${propertyAddress}
      Updates to convey: ${updates}

      Tone: Transparent, confident, concise.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Draft generation unavailable.";
  } catch (error) {
    console.error("Gemini Email Gen Error:", error);
    return "Unable to generate email draft. Please try again.";
  }
};

export const generateRegistrationEmails = async (
  agentName: string,
  agentEmail: string,
  username: string,
  licenseNumber: string
): Promise<{ adminEmail: string; userEmail: string }> => {
  try {
    // Dynamic import for types if needed, though usually types are erased. 
    // We import GoogleGenAI class dynamically in getAiClient.
    const { Type } = await import("@google/genai"); 
    const ai = await getAiClient();
    
    const prompt = `
      Generate the content for two automated emails triggered by a new agent registration on the Summit Commercial Group portal.
      
      Context:
      Agent Name: ${agentName}
      Username: ${username}
      Agent Email: ${agentEmail}
      License Number: ${licenseNumber}
      Admin Email: raphael@sumcg.com
      Date: ${new Date().toLocaleString()}
      
      Required Output:
      1. adminEmail: A formal email to Raphael. 
         - Subject: New Agent Registration Request: ${agentName}
         - Body: Must include the agent's details. Must explicitly include two simulated links/buttons at the bottom: "[APPROVE ACCESS]" and "[DENY ACCESS]".
      2. userEmail: A professional welcome email to ${agentName}.
         - Subject: Application Received - Summit Commercial Group
         - Body: Confirm receipt of application. State clearly that the account is PENDING APPROVAL and they will be notified once the admin reviews their credentials.

      Tone: Professional, corporate, and efficient.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            adminEmail: { type: Type.STRING, description: "The full email content for the admin." },
            userEmail: { type: Type.STRING, description: "The full email content for the user." },
          },
          required: ["adminEmail", "userEmail"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
        adminEmail: result.adminEmail || "Admin notification content unavailable.",
        userEmail: result.userEmail || "User notification content unavailable."
    };
  } catch (error) {
    console.error("Gemini Registration Email Error:", error);
    return {
      adminEmail: "System Error: Unable to generate admin notification due to an AI service interruption.",
      userEmail: "System Error: Unable to generate user confirmation due to an AI service interruption."
    };
  }
};
