import { GoogleGenAI, SchemaType } from "@google/genai";
import { AGENTS } from "../constants";
import { AgentType } from "../types";

// Helper to get API key safely
const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }
  return apiKey;
};

// 1. THE ROUTER (HSN Coordinator)
// Analyzes the prompt and decides which agent should handle it.
export const routeRequest = async (prompt: string): Promise<AgentType> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Coordinator uses Google Search to clarify context if needed, as per spec.
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }], 
      systemInstruction: AGENTS[AgentType.COORDINATOR].systemInstruction,
      temperature: 0.1, 
    }
  });

  const text = response.text?.trim().toUpperCase() || '';

  // Simple heuristic to extract the category if the model is chatty
  // We look for the exact Enum keys
  const keys = Object.values(AgentType);
  for (const key of keys) {
    if (text.includes(key) && key !== AgentType.COORDINATOR) {
      return key;
    }
  }
  
  // If exact match fails, fallback or specific logic
  // The system instruction says "Return ONLY the category name", so usually exact match works.
  if (keys.includes(text as AgentType)) {
    return text as AgentType;
  }
  
  // Default fallback
  return AgentType.PATIENT_INFO;
};

// 2. THE AGENT EXECUTOR
// Runs the specific agent with its tools and system instructions
export const runAgent = async (
  agentType: AgentType, 
  prompt: string, 
  history: {role: string, parts: {text: string}[]}[]
) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const agentConfig = AGENTS[agentType];

  let modelName = 'gemini-2.5-flash';
  const tools: any[] = [];

  // Configure tools based on Agent Type requirements
  if (
    agentType === AgentType.BILLING || 
    agentType === AgentType.SCHEDULING || 
    agentType === AgentType.PATIENT_INFO ||
    agentType === AgentType.EDUCATION // Education might need search for facts too
  ) {
    tools.push({ googleSearch: {} });
  }

  // Use Pro for complex medical records if preferred, keeping Flash for speed/cost balance in this demo
  if (agentType === AgentType.MEDICAL_RECORDS) {
    modelName = 'gemini-2.5-flash'; 
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
      systemInstruction: agentConfig.systemInstruction,
      tools: tools.length > 0 ? tools : undefined,
    }
  });

  return {
    text: response.text,
    groundingMetadata: response.candidates?.[0]?.groundingMetadata
  };
};

// 3. MEDIA GENERATION (Images)
export const generateMedicalImage = async (prompt: string) => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
         // Default 1:1 aspect ratio
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
  } catch (e) {
    console.error("Image generation error:", e);
  }
  return null;
};

// 4. VIDEO GENERATION (Veo)
export const generateMedicalVideo = async (prompt: string) => {
   const apiKey = getApiKey();
   const ai = new GoogleGenAI({ apiKey });

   try {
     let operation = await ai.models.generateVideos({
       model: 'veo-3.1-fast-generate-preview',
       prompt: prompt,
       config: {
         numberOfVideos: 1,
         resolution: '720p',
         aspectRatio: '16:9'
       }
     });

     // Poll for completion
     while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
        operation = await ai.operations.getVideosOperation({operation: operation});
     }

     const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
     if (videoUri) {
         // Return the fetch URL with key appended
         return `${videoUri}&key=${apiKey}`;
     }
   } catch (error) {
       console.error("Veo Generation Error:", error);
       // Throw to let the UI know, or return null to fail silently
       return null;
   }
   return null;
}
