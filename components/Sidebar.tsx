import React from 'react';
import { AgentType } from '../types';
import { AGENTS } from '../constants';
import * as Icons from 'lucide-react';

interface SidebarProps {
  activeAgent: AgentType | null;
  isProcessing: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeAgent, isProcessing }) => {
  return (
    <div className="w-80 bg-white border-r border-slate-200 hidden md:flex flex-col h-full shadow-sm z-10">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2 mb-1">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Icons.Activity size={24} />
          </div>
          <h1 className="font-bold text-lg text-slate-800 leading-tight">
            Hospital System<br/>Navigator
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Sistem Agen Terpadu Rumah Sakit
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 ml-1">
          Agen Aktif
        </h2>

        {Object.values(AGENTS).map((agent) => {
          // Dynamic Icon component
          const IconComponent = (Icons as any)[agent.icon] || Icons.HelpCircle;
          const isActive = activeAgent === agent.id;
          const isCoordinator = agent.id === AgentType.COORDINATOR;

          return (
            <div
              key={agent.id}
              className={`
                relative p-4 rounded-xl border transition-all duration-300
                ${isActive 
                  ? 'border-blue-200 bg-blue-50 shadow-md transform scale-102' 
                  : 'border-slate-100 bg-white hover:border-slate-200 text-slate-400 grayscale'}
                ${isCoordinator && !isActive ? 'opacity-70' : 'opacity-100'}
              `}
            >
              {isActive && isProcessing && (
                <div className="absolute top-2 right-2">
                   <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg text-white
                  ${isActive ? agent.color : 'bg-slate-200'}
                `}>
                  <IconComponent size={20} />
                </div>
                <div>
                  <h3 className={`font-semibold text-sm ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {agent.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">
                    {agent.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 text-center">
        Powered by Gemini 2.5 & Veo
      </div>
    </div>
  );
};

export default Sidebar;