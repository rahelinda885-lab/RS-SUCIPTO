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
  
  // Track chat history for context
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
      setActiveAgent(AgentType.COORDINATOR);
      const targetAgentType = await routeRequest(text);
      setActiveAgent(targetAgentType);

      // 3. EXECUTION PHASE
      const response = await runAgent(targetAgentType, text, chatHistory);
      let responseText = response.text || "Maaf, saya tidak dapat memproses permintaan ini.";
      
      const attachments: Message['attachments'] = [];

      // 4. PARSE TAGS FOR MEDIA GENERATION
      // Regex to find [GENERATE_IMAGE: ...]
      const imgRegex = /\[GENERATE_IMAGE:\s*(.*?)\]/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(responseText)) !== null) {
        const prompt = imgMatch[1];
        try {
          const base64Image = await generateMedicalImage(prompt);
          if (base64Image) {
            attachments.push({ type: 'image', url: base64Image });
          }
        } catch (e) {
          console.error("Failed to generate image", e);
        }
      }
      responseText = responseText.replace(imgRegex, ''); // Clean tags from text

      // Regex to find [GENERATE_VIDEO: ...]
      const vidRegex = /\[GENERATE_VIDEO:\s*(.*?)\]/g;
      let vidMatch;
      while ((vidMatch = vidRegex.exec(responseText)) !== null) {
        const prompt = vidMatch[1];
        try {
          const videoUrl = await generateMedicalVideo(prompt);
          if (videoUrl) {
            attachments.push({ type: 'video', url: videoUrl, mimeType: 'video/mp4' });
          }
        } catch (e) {
           console.error("Failed to generate video", e);
        }
      }
      responseText = responseText.replace(vidRegex, ''); // Clean tags

      // Regex to find [GENERATE_DOCUMENT: ...]
      const docRegex = /\[GENERATE_DOCUMENT:\s*(.*?)\]/g;
      let docMatch;
      while ((docMatch = docRegex.exec(responseText)) !== null) {
        const title = docMatch[1];
        attachments.push({ 
          type: 'document', 
          title: title,
          // In a real app, we would generate a PDF blob here. 
          // For now, we assume the content is in the chat.
        });
      }
      responseText = responseText.replace(docRegex, ''); // Clean tags

      // 5. Add System Response
      const systemMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText.trim(),
        agent: targetAgentType,
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined
      };
      
      setMessages(prev => [...prev, systemMsg]);
      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: response.text || responseText }] }]); // Keep original text in history context

    } catch (error: any) {
      console.error(error);
      let errorMessage = "Terjadi kesalahan saat memproses permintaan Anda.";
      
      if (error.message && (error.message.includes("API Key") || error.message.includes("API_KEY"))) {
        errorMessage = "Error: API Key tidak ditemukan. Pastikan Anda telah mengatur environment variable API_KEY dengan benar.";
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: errorMessage,
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