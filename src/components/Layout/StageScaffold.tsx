
import React from 'react';

interface StageScaffoldProps {
  title: string;
  step: string;
  description: string;
  actions: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export const StageScaffold: React.FC<StageScaffoldProps> = ({ 
  title, step, description, actions, sidebar, children, rightPanel 
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200">
      {/* Header - Fixed Height 88px */}
      <div className="h-[88px] border-b border-gray-800 flex justify-between items-center px-6 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <span className="text-blue-500">{step}</span> {title}
          </h2>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-4">{actions}</div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Fixed Width 320px */}
        <aside className="w-80 border-r border-gray-800 bg-gray-900/30 flex flex-col shrink-0">
          {sidebar}
        </aside>

        {/* Center Canvas Area */}
        <main className="flex-1 bg-gray-950 flex flex-col relative overflow-hidden">
          {children}
        </main>

        {/* Optional Right Panel - Fixed Width 320px */}
        {rightPanel && (
          <aside className="w-80 border-l border-gray-800 bg-gray-900/10 flex flex-col shrink-0">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
};
