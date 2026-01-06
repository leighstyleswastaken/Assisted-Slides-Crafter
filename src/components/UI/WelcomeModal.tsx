
import React, { useRef, useState, useCallback } from 'react';
import { Hammer, ArrowRight, Brain, Palette, Layout, PenTool, Printer, X, GraduationCap, Upload, Loader2, AlertTriangle, FileJson } from 'lucide-react';
import { TEMPLATES } from '../../templates';
import { useRunDoc } from '../../context/RunDocContext';
import { validateRunDoc } from '../../services/validationService';
import { saveProject } from '../../services/persistenceService';

interface Props {
  onClose: () => void;
}

const WelcomeModal: React.FC<Props> = ({ onClose }) => {
  const { dispatch } = useRunDoc();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleStartTutorial = () => {
    const tutorial = TEMPLATES.find(t => t.id === 'tutorial_mode');
    if (tutorial) {
      dispatch({ type: 'REHYDRATE', payload: tutorial.data as any });
      onClose();
    }
  };

  const processFile = (file: File) => {
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        setImportError("Invalid file type. Please upload a .json file.");
        return;
    }

    setIsParsing(true);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const jsonContent = event.target?.result as string;
            if (!jsonContent) throw new Error("File is empty");
            
            const json = JSON.parse(jsonContent);
            const { valid, errors } = validateRunDoc(json);

            if (!valid) {
                setImportError(`Structure invalid: ${errors[0]}`);
                setIsParsing(false);
                return;
            }

            await saveProject(json);
            dispatch({ type: 'REHYDRATE', payload: json });
            onClose();
        } catch (err) {
            console.error(err);
            setImportError("Failed to parse JSON. File might be corrupted.");
            setIsParsing(false);
        }
    };
    reader.onerror = () => {
        setImportError("Error reading file.");
        setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 z-20">
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X size={24} /></button>
           </div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                 <div className="bg-white text-blue-900 p-2 rounded-lg shadow-xl"><Hammer size={24} /></div>
                 <h1 className="text-4xl font-black text-white tracking-tight">Assisted Slides Crafter</h1>
              </div>
              <p className="text-blue-100 text-xl max-w-lg leading-relaxed font-medium">
                 The AI-powered "Glass Box" slide engine. Curation over automation.
              </p>
           </div>
           <div className="absolute -bottom-12 -right-12 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto grid md:grid-cols-2 gap-8 bg-gray-900/50">
           
           <div className="space-y-6">
              <h3 className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                <Layout size={14}/> Core Features
              </h3>
              <ul className="space-y-4">
                 {[
                    { icon: <Brain size={18}/>, title: "Strategist", text: "AI-driven branding and outline." },
                    { icon: <Palette size={18}/>, title: "Art Dept", text: "Visual kit with background removal." },
                    { icon: <Layout size={18}/>, title: "Architect", text: "3x3 cardinal grid layout engine." },
                    { icon: <PenTool size={18}/>, title: "Copywriter", text: "Context-aware text AutoFit." }
                 ].map((item, idx) => (
                    <li key={idx} className="flex gap-3 items-start group">
                       <div className="p-2 rounded-lg bg-gray-800 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all border border-gray-700 group-hover:border-blue-400">
                          {item.icon}
                       </div>
                       <div>
                          <h4 className="text-white font-bold text-sm">{item.title}</h4>
                          <p className="text-xs text-gray-500 leading-snug">{item.text}</p>
                       </div>
                    </li>
                 ))}
              </ul>
           </div>

           <div className="flex flex-col gap-4 justify-center">
              <div className="p-6 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex flex-col gap-4 shadow-inner ring-1 ring-blue-500/10">
                 <div className="flex items-center gap-3">
                    <GraduationCap size={32} className="text-blue-400"/>
                    <div>
                       <h3 className="text-white font-bold text-lg">New here?</h3>
                       <p className="text-blue-200/70 text-xs">Learn the protocol in 2 minutes.</p>
                    </div>
                 </div>
                 <button 
                   onClick={handleStartTutorial}
                   className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-xl hover:shadow-blue-900/40 flex items-center justify-center gap-2 group transform active:scale-95"
                 >
                    Start Guided Tutorial <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>

              <div className="w-full h-px bg-gray-800"></div>

              <div 
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group ${
                   isDragging 
                   ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
                   : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'
                }`}
              >
                 {isParsing ? (
                    <Loader2 className="animate-spin text-blue-400" size={24}/>
                 ) : (
                    <div className="p-2 bg-gray-800 rounded-full border border-gray-700 group-hover:border-gray-600 group-hover:text-white text-gray-400 transition-colors">
                       <FileJson size={20} />
                    </div>
                 )}
                 <div className="text-center">
                    <span className={`text-sm font-bold block ${isDragging ? 'text-blue-400' : 'text-gray-300'}`}>
                       {isParsing ? 'Restoring Project...' : isDragging ? 'Drop to Load' : 'Load Project from JSON'}
                    </span>
                    {!isParsing && <span className="text-[10px] text-gray-500">Drag & Drop or Click to Browse</span>}
                 </div>
              </div>

              <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".json"
              />
              {importError && (
                  <div className="text-red-400 text-xs text-center flex items-center justify-center gap-1 bg-red-900/20 p-2 rounded border border-red-900/50 animate-in fade-in">
                      <AlertTriangle size={12}/> {importError}
                  </div>
              )}

              <button 
                onClick={onClose}
                className="w-full py-3 text-gray-500 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1"
              >
                 Skip to Workspace
              </button>
           </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-center items-center gap-6">
           <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Version 2.5 Pro Pipeline</span>
        </div>

      </div>
    </div>
  );
};

export default WelcomeModal;
