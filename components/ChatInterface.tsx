import React, { useRef, useEffect } from 'react';
import { Message, AgentType } from '../types';
import { AGENTS } from '../constants';
import * as Icons from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  messages: Message[];
  isProcessing: boolean;
  activeAgent: AgentType;
  onSendMessage: (text: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isProcessing, 
  activeAgent, 
  onSendMessage 
}) => {
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      {/* Header Mobile */}
      <div className="md:hidden bg-white border-b p-4 flex items-center gap-2 shadow-sm">
        <Icons.Activity className="text-blue-600" />
        <span className="font-bold">HSN</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <Icons.Stethoscope size={64} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium">Selamat datang di Hospital System Navigator</p>
            <p className="text-sm">Silakan masukkan permintaan Anda untuk memulai.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const agent = msg.agent && AGENTS[msg.agent];
          const IconComponent = agent ? (Icons as any)[agent.icon] : Icons.User;

          return (
            <div 
              key={msg.id} 
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`
                flex max-w-[90%] md:max-w-[75%] gap-4
                ${isUser ? 'flex-row-reverse' : 'flex-row'}
              `}>
                {/* Avatar */}
                <div className={`
                  w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm
                  ${isUser ? 'bg-slate-700 text-white' : (agent?.color || 'bg-blue-600') + ' text-white'}
                `}>
                  <IconComponent size={isUser ? 18 : 20} />
                </div>

                {/* Bubble */}
                <div className={`
                  flex flex-col
                  ${isUser ? 'items-end' : 'items-start'}
                `}>
                  <div className={`
                    rounded-2xl p-4 shadow-sm text-sm md:text-base
                    ${isUser 
                      ? 'bg-slate-800 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}
                  `}>
                    {!isUser && agent && (
                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                        {agent.name}
                        {msg.agent === AgentType.COORDINATOR && (
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">ROUTER</span>
                        )}
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className={`markdown-body ${isUser ? 'text-white' : 'text-slate-800'}`}>
                      <ReactMarkdown 
                         components={{
                             ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2" {...props} />,
                             ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2" {...props} />,
                             h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
                             h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
                             h3: ({node, ...props}) => <h3 className="text-md font-bold my-1" {...props} />,
                             a: ({node, ...props}) => <a className="text-blue-500 underline" target="_blank" {...props} />,
                             blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-300 pl-4 italic my-2" {...props} />
                         }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Attachments (Images/Videos) */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden border border-slate-200">
                            {att.type === 'image' && att.url && (
                              <img src={att.url} alt="Generated" className="w-full h-auto max-h-80 object-cover" />
                            )}
                            {att.type === 'video' && att.url && (
                              <video controls className="w-full h-auto max-h-80 bg-black">
                                <source src={att.url} type={att.mimeType || "video/mp4"} />
                                Your browser does not support the video tag.
                              </video>
                            )}
                            {att.type === 'document' && (
                              <div className="p-4 bg-slate-50 flex items-center gap-2">
                                <Icons.FileText className="text-slate-500" />
                                <span className="font-mono text-xs">{att.title || 'Document'}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <span className="text-xs text-slate-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isProcessing && (
           <div className="flex w-full justify-start">
             <div className="flex max-w-[80%] gap-4">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-slate-200 animate-pulse`}>
                 <Icons.Loader2 className="animate-spin text-slate-500" />
               </div>
               <div className="flex flex-col gap-2">
                 <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm w-48 h-12 flex items-center gap-2">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                 </div>
                 <span className="text-xs text-slate-400 animate-pulse">
                   {AGENTS[activeAgent]?.name || 'System'} is thinking...
                 </span>
               </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik permintaan Anda (misal: 'Saya butuh surat keterangan sakit' atau 'Jelaskan tagihan saya')..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2 rounded-lg transition-colors flex items-center justify-center aspect-square"
          >
            {isProcessing ? <Icons.Loader2 className="animate-spin" size={20} /> : <Icons.Send size={20} />}
          </button>
        </form>
        <div className="text-center mt-2 text-[10px] text-slate-400">
           Sistem ini menggunakan AI. Selalu verifikasi informasi medis dengan profesional.
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;