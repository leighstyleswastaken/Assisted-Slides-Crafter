
import React from 'react';
import { Rocket, Brain, Play, Pause, Square, X, Loader2 } from 'lucide-react';
import { AiSettings } from '../../types';

interface Props {
  yolo: {
    isActive: boolean;
    isRunning: boolean;
    isPaused: boolean;
    isStopping: boolean;
    status: string;
    start: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    close: () => void;
  };
  slideCount: number;
  aiSettings: AiSettings;
  isTutorial: boolean;
}

export const YoloOverlay: React.FC<Props> = ({ yolo, slideCount, aiSettings, isTutorial }) => {
  if (!yolo.isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300 p-4">
       <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center text-center relative overflow-hidden">
          
          {(aiSettings?.mockMode || isTutorial) && (
             <div className="absolute -right-12 top-6 bg-blue-500 text-black text-[10px] font-black uppercase tracking-widest px-12 py-1 rotate-45 shadow-xl border-b border-black/20">
                {isTutorial ? 'Tutorial' : 'Simulation'}
             </div>
          )}

          {!yolo.isRunning && yolo.status !== 'Mission Complete' && yolo.status !== 'Aborted' && !yolo.status.startsWith('Error') ? (
             <>
                <button onClick={yolo.close} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/40">
                   <Rocket size={40} className="text-white ml-1" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Autopilot Ready</h2>
                <p className="text-gray-400 text-sm mb-8 px-4">
                   Assisted Slides Crafter will now take control to generate assets, compose layouts, and write copy for <strong>{slideCount} slides</strong>.
                </p>
                <button 
                   onClick={yolo.start}
                   className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-full font-bold flex items-center gap-2 transition-transform active:scale-95 w-full justify-center"
                >
                   <Play size={20} fill="currentColor"/> { (aiSettings?.mockMode || isTutorial) ? 'Run Tutorial Pipeline' : 'Start Generation'}
                </button>
             </>
          ) : !yolo.isRunning ? (
             <>
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                   {yolo.status === 'Mission Complete' ? <Rocket size={32} className="text-green-500" /> : <Square size={32} className="text-red-500" />}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{yolo.status === 'Mission Complete' ? 'Done!' : 'Stopped'}</h2>
                <p className="text-gray-400 text-sm mb-8 px-4">
                   {yolo.status === 'Mission Complete' ? "The pipeline has finished. You can now review and polish your deck." : "The autopilot was stopped."}
                </p>
                <button 
                   onClick={yolo.close}
                   className="px-8 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-bold"
                >
                   Close
                </button>
             </>
          ) : (
             <>
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6 relative">
                   <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                   <Brain size={32} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{(aiSettings?.mockMode || isTutorial) ? 'Simulating...' : yolo.isStopping ? 'Stopping...' : 'Generating...'}</h2>
                <div className="bg-gray-800 rounded-lg p-4 w-full mb-8 font-mono text-xs text-purple-300 border border-gray-700 min-h-[60px] flex items-center justify-center">
                   {yolo.status}
                </div>

                <div className="flex gap-4">
                   {yolo.isPaused ? (
                      <button 
                         onClick={yolo.resume}
                         disabled={yolo.isStopping}
                         className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded font-bold flex items-center gap-2"
                      >
                         <Play size={16} fill="currentColor"/> Resume
                      </button>
                   ) : (
                      <button 
                         onClick={yolo.pause}
                         disabled={yolo.isStopping}
                         className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded font-bold flex items-center gap-2"
                      >
                         <Pause size={16} fill="currentColor"/> Pause
                      </button>
                   )}
                   <button 
                      onClick={yolo.stop}
                      disabled={yolo.isStopping}
                      className="px-6 py-2 bg-gray-800 hover:bg-red-900/50 disabled:bg-gray-800 text-gray-300 hover:text-red-400 disabled:text-gray-500 rounded font-bold flex items-center gap-2"
                   >
                      {yolo.isStopping ? <Loader2 size={16} className="animate-spin"/> : <Square size={16} fill="currentColor"/>} Stop
                   </button>
                </div>
             </>
          )}
       </div>
    </div>
  );
};
