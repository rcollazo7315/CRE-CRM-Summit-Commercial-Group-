import { GoogleGenAI, Type } from "@google/genai";
import { PropertyType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

export const generateListingDescription = async (
  address: string,
  type: PropertyType,
  price: number,
  highlights: string
): Promise<string> => {
  try {
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
    console.error("Error generating description:", error);
    return "Unable to generate description at this time due to technical difficulties.";
  }
};

export const generateOwnerUpdateEmail = async (
  ownerName: string,
  propertyAddress: string,
  updates: string
): Promise<string> => {
  try {
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
    console.error("Error generating email:", error);
    return "Unable to generate draft.";
  }
};

export const generateRegistrationEmails = async (
  agentName: string,
  agentEmail: string,
  licenseNumber: string
): Promise<{ adminEmail: string; userEmail: string }> => {
  try {
    const prompt = `
      Generate the content for two automated emails triggered by a new agent registration on the Summit Commercial Group portal.
      
      Context:
      Agent Name: ${agentName}
      Agent Email: ${agentEmail}
      License Number: ${licenseNumber}
      Admin Email: raphael@sumcg.com
      
      Required Output:
      1. content_admin: A formal email to Raphael requesting approval for the new agent. Include the agent's details.
      2. content_user: A professional welcome email to ${agentName} confirming receipt of their application and noting that it is pending approval.

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
            adminEmail: { type: Type.STRING, description: "The full email body and subject for the admin." },
            userEmail: { type: Type.STRING, description: "The full email body and subject for the user." },
          },
          required: ["adminEmail", "userEmail"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("Error generating registration emails:", error);
    return {
      adminEmail: "System Error: Unable to generate admin notification.",
      userEmail: "System Error: Unable to generate user confirmation."
    };
  }
};