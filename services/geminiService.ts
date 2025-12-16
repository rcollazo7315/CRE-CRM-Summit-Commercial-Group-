
import { GoogleGenAI, Type } from "@google/genai";
import { PropertyType } from "../types";

const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore
  }
  return '';
};

// Lazy initialization to prevent startup crashes
let aiInstance: GoogleGenAI | null = null;

const getAi = (): GoogleGenAI => {
  if (!aiInstance) {
    const key = getApiKey();
    // Provide a dummy key if missing to allow instantiation, 
    // requests will fail gracefully later instead of crashing app on load
    aiInstance = new GoogleGenAI({ apiKey: key || 'dummy-key-for-init' });
  }
  return aiInstance;
};

const MODEL_NAME = 'gemini-2.5-flash';

export const generateListingDescription = async (
  address: string,
  type: PropertyType,
  price: number,
  highlights: string
): Promise<string> => {
  try {
    const ai = getAi();
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
    return "Unable to generate description. Please check API configuration.";
  }
};

export const generateOwnerUpdateEmail = async (
  ownerName: string,
  propertyAddress: string,
  updates: string
): Promise<string> => {
  try {
    const ai = getAi();
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
  username: string,
  licenseNumber: string
): Promise<{ adminEmail: string; userEmail: string }> => {
  try {
    const ai = getAi();
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
    return result;
  } catch (error) {
    console.error("Error generating registration emails:", error);
    return {
      adminEmail: "System Error: Unable to generate admin notification.",
      userEmail: "System Error: Unable to generate user confirmation."
    };
  }
};
