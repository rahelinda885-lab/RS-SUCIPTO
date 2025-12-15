import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { Message, AgentType } from './types';
import { routeRequest, runAgent, generateMedicalImage, generateMedicalVideo } from './services/geminiService';
import { AGENTS } from './constants';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.COORDINATOR);
  
  // Track chat history for context (simplified)
  const [chatHistory, setChatHistory] = useState<{role: string, parts: {text: string}[]}[]>([]);

  const handleSendMessage = useCallback(async (text: string) => {
    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    
    // Update raw history for API
    const newHistory = [...chatHistory, { role: 'user', parts: [{ text }] }];
    setChatHistory(newHistory);

    try {
      // 2. ROUTING PHASE
      // Set active agent to Coordinator briefly while deciding
      setActiveAgent(AgentType.COORDINATOR);
      
      const targetAgentType = await routeRequest(text);
      setActiveAgent(targetAgentType);

      // 3. EXECUTION PHASE
      const response = await runAgent(targetAgentType, text, chatHistory);
      const responseText = response.text || "Maaf, saya tidak dapat memproses permintaan ini.";
      
      let attachments: Message['attachments'] = [];

      // 4. CHECK FOR MEDIA REQUESTS (Simulation)
      // If the Education agent was used, check if the response implies creating media
      if (targetAgentType === AgentType.EDUCATION) {
        const lowerRes = responseText.toLowerCase();
        
        // Image Check
        if (lowerRes.includes('gambar') || lowerRes.includes('diagram') || lowerRes.includes('ilustrasi')) {
           // Extract a prompt for image from the text (heuristic)
           const imagePrompt = text + " medical illustration, clean, professional";
           try {
             const base64Image = await generateMedicalImage(imagePrompt);
             if (base64Image) {
               attachments.push({ type: 'image', url: base64Image });
             }
           } catch (e) {
             console.error("Image generation failed", e);
           }
        }
        
        // Video Check (Veo)
        if (lowerRes.includes('video')) {
            // Check if we have API key support for Veo
            if ((window as any).aistudio) {
                 // Try to use aistudio injection if available or fallback to env
                 // Note: In a real app, we'd trigger the UI flow here.
            }
            
            try {
               const videoPrompt = text + ", medical educational video, high quality";
               const videoUrl = await generateMedicalVideo(videoPrompt);
               if (videoUrl) {
                   attachments.push({ type: 'video', url: videoUrl, mimeType: 'video/mp4' });
               }
            } catch (e) {
                console.error("Video generation failed", e);
                // Append error note to message
                // attachments are optional, so we just don't add it
            }
        }
      }

      // 5. Add System Response
      const systemMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        agent: targetAgentType,
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      setMessages(prev => [...prev, systemMsg]);
      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: responseText }] }]);

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: "Terjadi kesalahan saat memproses permintaan Anda. Pastikan API KEY valid.",
        timestamp: new Date(),
        agent: AgentType.COORDINATOR
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }

  }, [chatHistory]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar activeAgent={activeAgent} isProcessing={isProcessing} />
      <ChatInterface 
        messages={messages} 
        isProcessing={isProcessing}
        activeAgent={activeAgent}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}