
import React, { useState } from 'react';
import { Sidebar, Monitor, Settings } from 'lucide-react';

interface StageScaffoldProps {
  title: string;
  step: string;
  description: string;
  actions: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  mobileTabs?: {
    sidebar?: string;
    canvas?: string;
    rightPanel?: string;
  };
}

export const StageScaffold: React.FC<StageScaffoldProps> = ({ 
  title, step, description, actions, sidebar, children, rightPanel, mobileTabs 
}) => {
  const [activeTab, setActiveTab] = useState<'sidebar' | 'canvas' | 'right'>('canvas');

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200">
      {/* Header - Fixed Height 88px */}
      <div className="h-[88px] border-b border-gray-800 flex justify-between items-center px-4 md:px-6 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40 shrink-0 gap-2">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold font-mono text-white flex items-center gap-2 truncate">
            <span className="text-blue-500">{step}</span> {title}
          </h2>
          <p className="text-[10px] md:text-sm text-gray-400 mt-1 truncate">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      </div>

      {/* Main Responsive Area */}
      <div className="flex-1 overflow-hidden flex flex-col xl:flex-row relative">
        
        {/* Left Sidebar - Tabbed on < xl */}
        <aside className={`
          w-full xl:w-80 border-r border-gray-800 bg-gray-900/30 flex-col shrink-0
          ${activeTab === 'sidebar' ? 'flex' : 'hidden xl:flex'}
        `}>
          {sidebar}
        </aside>

        {/* Center Canvas Area - Tabbed on < xl */}
        <main className={`
          flex-1 bg-gray-950 flex-col relative overflow-hidden
          ${activeTab === 'canvas' ? 'flex' : 'hidden xl:flex'}
        `}>
          {children}
        </main>

        {/* Optional Right Panel - Tabbed on < xl */}
        {rightPanel && (
          <aside className={`
            w-full xl:w-80 border-l border-gray-800 bg-gray-900/10 flex-col shrink-0
            ${activeTab === 'right' ? 'flex' : 'hidden xl:flex'}
          `}>
            {rightPanel}
          </aside>
        )}

      </div>

      {/* Mobile/Tablet Bottom Navigation Bar (Visible only below xl) */}
      <div className="xl:hidden h-14 bg-gray-900 border-t border-gray-800 flex items-center justify-around shrink-0 z-50">
         <button 
            onClick={() => setActiveTab('sidebar')}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'sidebar' ? 'text-blue-400 bg-gray-800/50' : 'text-gray-500'}`}
         >
            <Sidebar size={18} />
            <span className="text-[10px] font-bold uppercase">{mobileTabs?.sidebar || 'Tools'}</span>
         </button>
         
         <button 
            onClick={() => setActiveTab('canvas')}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'canvas' ? 'text-blue-400 bg-gray-800/50' : 'text-gray-500'}`}
         >
            <Monitor size={18} />
            <span className="text-[10px] font-bold uppercase">{mobileTabs?.canvas || 'Canvas'}</span>
         </button>

         {rightPanel && (
            <button 
               onClick={() => setActiveTab('right')}
               className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'right' ? 'text-blue-400 bg-gray-800/50' : 'text-gray-500'}`}
            >
               <Settings size={18} />
               <span className="text-[10px] font-bold uppercase">{mobileTabs?.rightPanel || 'Properties'}</span>
            </button>
         )}
      </div>
    </div>
  );
};
