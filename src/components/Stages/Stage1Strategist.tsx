
import React, { useState, useEffect, useRef } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, OutlineItem, Branding } from '../../types';
import { generateBranding, generateOutline, validateBranding } from '../../services/geminiService';
import { Sparkles, ArrowDown, ArrowUp, Trash2, Plus, GripVertical, FileText, Palette, List, Loader2, Unlock, Rocket, Tag, Eye, Pencil, Check, X, ShieldAlert, Type, ChevronDown, GraduationCap, ChevronRight, PenTool, BarChart, Database, Upload, Clock } from 'lucide-react';
import LockGuard from '../UI/LockGuard';
import ConfirmModal from '../UI/ConfirmModal';
import { POPULAR_FONTS, PRESENTATION_TYPES, BRAND_KITS } from '../../constants';
import { loadGoogleFonts } from '../../utils/fontUtils';
import { extractPaletteFromImage } from '../../utils/colorUtils';

const Stage1Strategist: React.FC = () => {
  const { state, dispatch, yolo, addNotification } = useRunDoc();
  const [isGeneratingBranding, setIsGeneratingBranding] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [outlineLength, setOutlineLength] = useState<'short' | 'medium' | 'long'>('medium');
  
  // Editing State
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [localBranding, setLocalBranding] = useState<Branding>(state.branding);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync Local State
  useEffect(() => {
     if (!isEditingBranding) {
        setLocalBranding(state.branding);
     }
  }, [state.branding, isEditingBranding]);

  // Load preview fonts when editing
  useEffect(() => {
     if (isEditingBranding) {
        loadGoogleFonts(POPULAR_FONTS);
     }
  }, [isEditingBranding]);

  // Helper to get active model or mock string
  const getTextModel = () => state.ai_settings?.mockMode ? 'mock-gemini' : state.ai_settings?.textModel;

  // -- Handlers --

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({
      type: 'UPDATE_SOURCE',
      payload: { type: 'text', content: e.target.value }
    });
  };

  const handleGenerateBranding = async () => {
    if (!state.source_material.content) return;
    setIsGeneratingBranding(true);
    try {
      const result = await generateBranding(state.source_material.content, getTextModel());
      dispatch({ type: 'UPDATE_BRANDING', payload: result });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingBranding(false);
    }
  };
  
  const handleSaveBranding = async () => {
     setIsValidating(true);
     setValidationError(null);
     try {
        const validation = await validateBranding(localBranding, getTextModel());
        if (validation.safe) {
           dispatch({ type: 'UPDATE_BRANDING', payload: localBranding });
           setIsEditingBranding(false);
        } else {
           setValidationError(validation.reason || "Content flagged as unsafe or inappropriate.");
        }
     } catch (e) {
        console.error(e);
        // Fallback: If AI fails, prompt user via modal
        setShowValidationWarning(true);
     } finally {
        setIsValidating(false);
     }
  };

  const confirmForceSave = () => {
     dispatch({ type: 'UPDATE_BRANDING', payload: localBranding });
     setIsEditingBranding(false);
     setShowValidationWarning(false);
  };

  const handleGenerateOutline = async () => {
    if (!state.source_material.content) return;
    setIsGeneratingOutline(true);
    try {
      const result = await generateOutline(
          state.source_material.content, 
          state.branding, 
          getTextModel(), 
          state.presentation_type,
          outlineLength
      );
      dispatch({ type: 'UPDATE_OUTLINE', payload: result });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleYolo = () => {
    yolo.open();
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newOutline = [...state.outline];
    if (direction === 'up' && index > 0) {
      [newOutline[index], newOutline[index - 1]] = [newOutline[index - 1], newOutline[index]];
    } else if (direction === 'down' && index < newOutline.length - 1) {
      [newOutline[index], newOutline[index + 1]] = [newOutline[index + 1], newOutline[index]];
    }
    dispatch({ type: 'UPDATE_OUTLINE', payload: newOutline });
  };

  const deleteSlide = (index: number) => {
    const newOutline = state.outline.filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_OUTLINE', payload: newOutline });
  };

  const addSlide = () => {
    const newSlide: OutlineItem = {
      slide_id: `manual_${Date.now()}`,
      title: "New Slide",
      intent: "Placeholder",
      suggest_text_layout: "headline_body" as any
    };
    dispatch({ type: 'UPDATE_OUTLINE', payload: [...state.outline, newSlide] });
  };

  // -- Magic Palette --
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     const reader = new FileReader();
     reader.onload = async (ev) => {
        if (ev.target?.result) {
           const src = ev.target.result as string;
           try {
              const palette = await extractPaletteFromImage(src, 5);
              updateLocal('palette', palette);
              // Auto-set text/bg color contrast logic
              updateLocal('background_color', palette[0]); // Most frequent color as BG
              // Text color usually contrasting
              updateLocal('text_color', palette[1] || '#FFFFFF');
              addNotification("Palette extracted from image!", "success");
           } catch (err) {
              console.error(err);
              addNotification("Failed to extract palette.", "error");
           }
        }
     };
     reader.readAsDataURL(file);
  };

  const applyBrandKit = (kitId: string) => {
     const kit = BRAND_KITS.find(k => k.id === kitId);
     if (kit) {
        setLocalBranding(prev => ({
           ...prev,
           palette: kit.palette,
           fonts: kit.fonts,
           text_color: kit.text_color,
           background_color: kit.background_color,
           tone: kit.tone
        }));
     }
  };

  // -- Edit Mode Helpers --
  const updateLocal = (field: keyof Branding, value: any) => {
     setLocalBranding(prev => ({ ...prev, [field]: value }));
  };
  
  const isApproved = state.stage_status[Stage.Strategist] === StageStatus.Approved;
  const currentPresType = PRESENTATION_TYPES.find(p => p.id === state.presentation_type) || PRESENTATION_TYPES[0];

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200 relative">
      
      {showValidationWarning && (
         <ConfirmModal 
            title="Validation Service Unreachable"
            message="We couldn't verify the branding content with AI. Save anyway?"
            confirmLabel="Save Forcefully"
            onConfirm={confirmForceSave}
            onCancel={() => setShowValidationWarning(false)}
         />
      )}

      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-mono text-white flex items-center gap-2">
            <span className="text-blue-500">01</span> Strategist
          </h2>
          <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-[200px] md:max-w-none truncate">Ingest content, define identity, structure the narrative.</p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          
          {!isApproved && state.outline.length > 0 && (
             <button
               onClick={handleYolo}
               className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20 text-xs"
               title="Auto-generate everything with defaults"
             >
               <Rocket size={14} /> <span className="hidden md:inline">YOLO Mode</span>
             </button>
          )}

          {isApproved ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 md:px-4 md:py-2 bg-gray-900 border border-green-900/50 text-green-400 rounded-full text-xs font-mono font-bold flex items-center gap-2">
                <span className="hidden md:inline">LOCKED & APPROVED</span>
                <span className="md:hidden">LOCKED</span>
              </div>
              <button 
                onClick={() => dispatch({ type: 'UNLOCK_STAGE', payload: Stage.Strategist })}
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Unlock Stage"
              >
                <Unlock size={16} />
              </button>
            </div>
          ) : (
             <button
               onClick={() => dispatch({ type: 'APPROVE_STAGE', payload: Stage.Strategist })}
               disabled={state.outline.length === 0 || isEditingBranding}
               className={`px-4 py-2 md:px-6 md:py-2.5 rounded font-bold transition-all flex items-center gap-2 shadow-lg text-xs md:text-sm ${
                 state.outline.length === 0 || isEditingBranding
                 ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                 : 'bg-green-600 hover:bg-green-500 text-white hover:shadow-green-900/20'
               }`}
             >
               Approve <span className="hidden md:inline">Stage</span> <ArrowDown size={16} />
             </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row">
        
        {/* Left Col: Input */}
        <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col bg-gray-900/30 relative min-h-[300px]">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2 text-blue-400 font-mono text-sm font-bold uppercase tracking-wider">
            <FileText size={16} /> Source Material
          </div>
          <LockGuard stage={Stage.Strategist} className="flex-1 flex flex-col relative">
            <textarea
              className="flex-1 w-full bg-transparent p-6 text-gray-300 focus:outline-none resize-none font-mono text-sm leading-relaxed"
              placeholder="Paste your rough notes, document, or blog post here..."
              value={state.source_material.content}
              onChange={handleSourceChange}
              disabled={isApproved}
            />
          </LockGuard>
        </div>

        {/* Middle Col: Branding & Actions */}
        <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col bg-gray-900/10 min-h-[400px]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between text-purple-400 font-mono text-sm font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2"><Palette size={16} /> Brand Identity</div>
            <div className="flex items-center gap-2">
               {isEditingBranding ? (
                  <>
                     <button onClick={() => setIsEditingBranding(false)} disabled={isValidating} className="p-1 hover:text-red-400 transition-colors"><X size={16}/></button>
                     <button onClick={handleSaveBranding} disabled={isValidating} className="p-1 hover:text-green-400 transition-colors">
                        {isValidating ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>}
                     </button>
                  </>
               ) : !isApproved && state.revisions.branding > 0 ? (
                  <button onClick={() => setIsEditingBranding(true)} className="p-1 hover:text-white transition-colors"><Pencil size={14}/></button>
               ) : null}
               
               {!isApproved && !isEditingBranding && (
                 <button 
                   onClick={handleGenerateBranding}
                   disabled={!state.source_material.content || isGeneratingBranding}
                   className="text-xs bg-purple-900/30 hover:bg-purple-800/50 text-purple-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                 >
                   {isGeneratingBranding ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                 </button>
               )}
            </div>
          </div>
          
          <LockGuard stage={Stage.Strategist} className="p-6 space-y-8 overflow-y-auto flex-1 relative">
             {validationError && (
                 <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-xs mb-4 flex items-start gap-2">
                     <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                     <p>{validationError}</p>
                 </div>
             )}

             {state.revisions.branding > 0 || isEditingBranding ? (
                isEditingBranding ? (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      
                      {/* Brand Kit Selector */}
                      <div className="space-y-2 pb-4 border-b border-gray-800">
                         <label className="text-xs font-bold text-gray-500 uppercase block">Quick Brand Kit</label>
                         <div className="grid grid-cols-2 gap-2">
                            {BRAND_KITS.map(kit => (
                               <button 
                                 key={kit.id}
                                 onClick={() => applyBrandKit(kit.id)}
                                 className="text-left p-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs"
                               >
                                  <span className="block font-bold text-gray-200">{kit.name}</span>
                                  <div className="flex gap-1 mt-1">
                                     {kit.palette.slice(0,3).map(c => <div key={c} className="w-2 h-2 rounded-full" style={{background: c}}></div>)}
                                  </div>
                               </button>
                            ))}
                         </div>
                      </div>

                      {/* Magic Palette */}
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500 uppercase block">Magic Palette</label>
                         <button 
                           onClick={() => logoInputRef.current?.click()}
                           className="w-full py-2 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 text-blue-300 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                         >
                            <Upload size={14}/> Extract from Logo/Image
                         </button>
                         <input ref={logoInputRef} type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                         
                         {/* Display Local Palette */}
                         <div className="flex flex-wrap gap-2 mt-2">
                            {localBranding.palette.map((c, i) => (
                               <div key={i} className="w-8 h-8 rounded border border-gray-700" style={{background: c}} title={c}></div>
                            ))}
                         </div>
                      </div>

                      {/* Simplified Edit Mode Placeholder - full form would go here */}
                      <div className="text-xs text-gray-500 italic mt-4 pt-4 border-t border-gray-800">
                         Editing Tone, Fonts, and Colors manually enabled above. Save to apply.
                      </div>
                   </div>
                ) : (
                   <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block group-hover:text-purple-400 transition-colors">Tone & Voice</label>
                         <div className="text-xl font-serif text-white leading-tight">{state.branding.tone}</div>
                      </div>
                      
                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-3 block group-hover:text-purple-400 transition-colors">Visual Identity</label>
                         <div className="flex flex-wrap gap-2">
                           {state.branding.keywords?.map((k, i) => (
                             <span key={`k-${i}`} className="px-2 py-1 bg-blue-900/30 text-blue-300 border border-blue-500/30 rounded text-xs">{k}</span>
                           ))}
                           {state.branding.visual_features?.map((k, i) => (
                             <span key={`v-${i}`} className="px-2 py-1 bg-purple-900/30 text-purple-300 border border-purple-500/30 rounded text-xs">{k}</span>
                           ))}
                         </div>
                      </div>

                      {/* NEW: Data & Insights Section */}
                      {(state.branding.key_facts?.length || 0) > 0 && (
                         <div className="group">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-3 block group-hover:text-purple-400 transition-colors flex items-center gap-2"><Database size={12}/> Key Facts & Data</label>
                            <ul className="space-y-1">
                               {state.branding.key_facts?.map((fact, i) => (
                                  <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                     <span className="text-purple-500 mt-0.5">•</span> {fact}
                                  </li>
                               ))}
                            </ul>
                         </div>
                      )}

                      {(state.branding.data_visualizations?.length || 0) > 0 && (
                         <div className="group">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-3 block group-hover:text-purple-400 transition-colors flex items-center gap-2"><BarChart size={12}/> Suggested Charts</label>
                            <div className="flex flex-wrap gap-2">
                               {state.branding.data_visualizations?.map((viz, i) => (
                                  <div key={i} className="p-2 bg-gray-800 rounded border border-gray-700 text-[10px] text-gray-400 flex items-center gap-2">
                                     <BarChart size={10} className="text-blue-400"/>
                                     {viz}
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-3 block group-hover:text-purple-400 transition-colors">Palette</label>
                         <div className="flex flex-wrap gap-3">
                           {state.branding.palette.map((color, i) => (
                             <div key={i} className="flex flex-col items-center gap-1">
                               <div className="w-12 h-12 rounded-lg shadow-lg border border-white/10 transition-transform hover:scale-110" style={{ backgroundColor: color }} />
                               <span className="text-[10px] font-mono text-gray-500 uppercase">{color}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-3 block group-hover:text-purple-400 transition-colors">Typography</label>
                         <div className="flex flex-col gap-2">
                           {state.branding.fonts.map((font, i) => (
                             <div key={i} className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700">
                               <span className="text-white text-lg" style={{ fontFamily: font }}>{font}</span>
                               <span className="text-[10px] text-gray-500 font-mono">Aa Bb Cc</span>
                             </div>
                           ))}
                         </div>
                      </div>
                   </div>
                )
             ) : (
               <div className="flex flex-col items-center justify-center h-64 text-gray-600 text-center px-6">
                 <Sparkles className="mb-4 opacity-20" size={48} />
                 <p className="text-sm">Enter source text and generate branding to begin the strategic analysis.</p>
                 <div className="mt-4 pt-4 border-t border-gray-800 w-full flex justify-center">
                    <button 
                       onClick={() => setIsEditingBranding(true)}
                       className="text-xs text-gray-500 hover:text-white underline decoration-dashed flex items-center gap-1 transition-colors"
                    >
                       <PenTool size={10} />
                       Or configure manually
                    </button>
                 </div>
               </div>
             )}
          </LockGuard>
        </div>

        {/* Right Col: Outline */}
        <div className="w-full lg:w-1/3 flex flex-col bg-gray-950 min-h-[400px]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between text-amber-400 font-mono text-sm font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2"><List size={16} /> Outline</div>
            {!isApproved && (
              <div className="flex gap-2">
                 <button 
                  onClick={addSlide}
                  className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                  title="Add empty slide"
                 >
                   <Plus size={14} />
                 </button>
                 <button 
                  onClick={handleGenerateOutline}
                  disabled={!state.branding.tone || isGeneratingOutline}
                  className="text-xs bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 px-3 py-1 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingOutline ? <Loader2 className="animate-spin" size={14}/> : 'Generate'}
                </button>
              </div>
            )}
          </div>

          <LockGuard stage={Stage.Strategist} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900/20 relative">
             
             {/* Presentation Type Configuration */}
             {!isApproved && (
               <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 mb-4 space-y-4">
                  <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                        <GraduationCap size={12}/> Narrative Driver
                     </label>
                     <div className="relative group/type-select">
                        <select
                           value={state.presentation_type || 'pitch'}
                           onChange={(e) => dispatch({ type: 'UPDATE_PRESENTATION_TYPE', payload: e.target.value })}
                           className="w-full bg-gray-950 border border-gray-700 text-white text-xs p-2 rounded appearance-none focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                           {PRESENTATION_TYPES.map(type => (
                              <option key={type.id} value={type.id}>{type.icon} {type.label}</option>
                           ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" />
                     </div>
                     <p className="text-[10px] text-gray-500 mt-2 leading-tight">
                        {currentPresType.desc}
                     </p>
                  </div>

                  <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                        <Clock size={12}/> Length
                     </label>
                     <div className="flex bg-gray-950 border border-gray-700 rounded p-1">
                        {(['short', 'medium', 'long'] as const).map(l => (
                           <button
                              key={l}
                              onClick={() => setOutlineLength(l)}
                              className={`flex-1 text-[10px] py-1 rounded uppercase font-bold transition-colors ${outlineLength === l ? 'bg-amber-900/50 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
                           >
                              {l}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
             )}

             {state.outline.length > 0 ? (
               state.outline.map((slide, index) => (
                 <div key={slide.slide_id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors group relative animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex gap-3">
                       <div className="text-gray-600 font-mono text-xs pt-1 w-6">{String(index + 1).padStart(2, '0')}</div>
                       <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-200 truncate pr-8">{slide.title}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{slide.intent}</p>
                          <div className="mt-3 flex gap-2">
                             <span className="text-[10px] px-2 py-0.5 bg-gray-800 rounded text-gray-400 border border-gray-700">
                               {slide.suggest_text_layout?.replace('_', ' ')}
                             </span>
                          </div>
                       </div>
                    </div>

                    {!isApproved && (
                      <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 rounded border border-gray-800 shadow-xl">
                        <button onClick={() => moveSlide(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"><ArrowUp size={12}/></button>
                        <button onClick={() => moveSlide(index, 'down')} disabled={index === state.outline.length - 1} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"><ArrowDown size={12}/></button>
                        <button onClick={() => deleteSlide(index)} className="p-1.5 text-red-400 hover:bg-red-900/30 border-t border-gray-800"><Trash2 size={12}/></button>
                      </div>
                    )}
                 </div>
               ))
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4 min-h-[200px]">
                  <div className="w-16 h-20 border-2 border-dashed border-gray-800 rounded flex items-center justify-center">
                    <List size={24} className="opacity-20"/>
                  </div>
                  <p className="text-xs max-w-[200px] text-center">No slides yet. Generate an outline based on your branding and source text.</p>
                </div>
             )}
          </LockGuard>
        </div>

      </div>
    </div>
  );
};

export default Stage1Strategist;
