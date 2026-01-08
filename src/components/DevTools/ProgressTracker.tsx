
import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, X } from 'lucide-react';

interface FeatureItem {
  id: string;
  label: string;
  done: boolean;
}

const DEFAULT_FEATURES: FeatureItem[] = [
  { id: 'f1', label: 'Global State & Autosave (IDB)', done: true },
  { id: 'f2', label: 'Stage Gating & LockGuards', done: true },
  { id: 'f3', label: 'Branding & Outline Agents', done: true },
  { id: 'f4', label: 'Global Text/Bg Color Sync', done: true },
  { id: 'f5', label: 'Triple-Mode BG Removal', done: true },
  { id: 'f6', label: '3x3 Cardinal Grid Architect', done: true },
  { id: 'f7', label: 'Zone Scale/Align/Fit Controls', done: true },
  { id: 'f8', label: 'Text AutoFit Engine', done: true },
  { id: 'f9', label: 'Hi-Fi PDF & PPTX Export', done: true },
  { id: 'f10', label: 'YOLO Automation Mode', done: true },
  { id: 'f11', label: 'Global Undo/Redo History', done: true },
  { id: 'f12', label: 'AI Creative Director Loop', done: true },
  { id: 'f13', label: 'Offline PWA Support', done: true },
  { id: 'f14', label: 'Font Pack Generator', done: true },
  { id: 'f15', label: 'JSON Project Restore', done: true },
  { id: 'f16', label: 'Graceful YOLO Cancel', done: true },
  { id: 'f17', label: 'Optimized Storage Calc', done: true },
];

const ProgressTracker: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [features, setFeatures] = useState<FeatureItem[]>(() => {
    const saved = localStorage.getItem('deckforge_progress_v3');
    if (saved) {
      const parsed = JSON.parse(saved) as FeatureItem[];
      // Merge defaults with saved state to catch new features
      return DEFAULT_FEATURES.map(df => {
        const existing = parsed.find(p => p.id === df.id);
        return existing ? existing : df;
      });
    }
    return DEFAULT_FEATURES;
  });

  useEffect(() => {
    localStorage.setItem('deckforge_progress_v3', JSON.stringify(features));
  }, [features]);

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, done: !f.done } : f));
  };

  const progress = Math.round((features.filter(f => f.done).length / features.length) * 100);

  return (
    <div className="fixed bottom-0 right-0 w-80 bg-gray-900 border-l border-t border-gray-700 shadow-2xl h-96 flex flex-col z-50 animate-in slide-in-from-bottom duration-300">
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-200">Feature Audit</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
      </div>
      
      <div className="p-3 bg-gray-800/50 border-b border-gray-700">
        <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
          <span>Capacities Verified</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-950">
        {features.map(f => (
          <div 
            key={f.id} 
            className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-gray-800 transition-colors ${f.done ? 'opacity-50' : 'opacity-100'}`}
            onClick={() => toggleFeature(f.id)}
          >
            <div className={`mt-0.5 ${f.done ? 'text-blue-500' : 'text-gray-700'}`}>
               {f.done ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
            <span className={`text-xs ${f.done ? 'line-through text-gray-500' : 'text-gray-300'}`}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressTracker;
