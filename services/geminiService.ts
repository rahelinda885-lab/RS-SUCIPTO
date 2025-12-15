import { GoogleGenAI, SchemaType } from "@google/genai";
import { AGENTS } from "../constants";
import { AgentType } from "../types";

// Helper to get API key safely
const getApiKey = (): string => {
  if (typeof process !== 'undefined' && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

// 1. THE ROUTER (HSN Coordinator)
// Analyzes the prompt and decides which agent should handle it.
export const routeRequest = async (prompt: string): Promise<AgentType> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  // Use Flash for fast routing
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: `
        You are the Routing Logic for the Hospital System Navigator.
        Analyze the user's input and categorize it into EXACTLY ONE of the following categories:
        - MEDICAL_RECORDS (for medical history, test results, diagnosis files)
        - BILLING (for invoices, insurance, costs)
        - PATIENT_INFO (for registration, personal details, admin forms)
        - SCHEDULING (for appointments, doctors availability)
        - EDUCATION (for learning about conditions, videos, diagrams)
        
        If it is unclear, default to PATIENT_INFO.
        Return ONLY the category name as a plain string. Do not add markdown or explanation.
      `,
      temperature: 0.1, // Low temperature for deterministic routing
    }
  });

  const text = response.text?.trim().toUpperCase();

  // Validate output
  if (Object.values(AgentType).includes(text as AgentType)) {
    return text as AgentType;
  }
  
  // Fallback
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
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const agentConfig = AGENTS[agentType];

  let modelName = 'gemini-2.5-flash';
  const tools: any[] = [];

  // Configure tools based on Agent Type
  if (agentType === AgentType.BILLING || agentType === AgentType.SCHEDULING || agentType === AgentType.PATIENT_INFO) {
    tools.push({ googleSearch: {} });
  }

  // Use a stronger model for complex medical/education reasoning if needed
  if (agentType === AgentType.MEDICAL_RECORDS || agentType === AgentType.EDUCATION) {
    modelName = 'gemini-2.5-flash'; // Keeping flash for speed, but could upgrade to pro
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
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
        // No specific config needed for basic generation, 1:1 default
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
      }
  }
  return null;
};

// 4. VIDEO GENERATION (Veo)
// Note: Requires Paid Key. We will wrap this carefully in the UI.
export const generateMedicalVideo = async (prompt: string) => {
   // Check for window.aistudio key injection or process.env
   // For Veo, we typically need the user to select a key if not provided via env in a paid context.
   // Assuming process.env.API_KEY is valid for Veo for this demo.
   
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
       throw error;
   }
   return null;
}
