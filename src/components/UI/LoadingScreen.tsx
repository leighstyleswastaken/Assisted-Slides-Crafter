import React from 'react';
import { Hammer, Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 text-gray-200">
      <div className="flex flex-col items-center animate-pulse">
        <div className="bg-blue-600 p-4 rounded-2xl mb-6 shadow-2xl shadow-blue-900/50">
           <Hammer size={48} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold font-mono tracking-tight mb-2">Assisted Slides Crafter</h1>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
           <Loader2 className="animate-spin" size={16} />
           <span>Loading Assets...</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;