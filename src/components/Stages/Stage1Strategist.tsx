import React, { useState, useEffect } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, OutlineItem, Branding } from '../../types';
import { generateBranding, generateOutline, validateBranding } from '../../services/geminiService';
import { Sparkles, ArrowDown, ArrowUp, Trash2, Plus, GripVertical, FileText, Palette, List, Loader2, Unlock, Rocket, Tag, Eye, Pencil, Check, X, ShieldAlert, Type, ChevronDown, GraduationCap, ChevronRight } from 'lucide-react';
import LockGuard from '../UI/LockGuard';
import ConfirmModal from '../UI/ConfirmModal';
import { POPULAR_FONTS, PRESENTATION_TYPES } from '../../constants';
import { loadGoogleFonts } from '../../utils/fontUtils';

const Stage1Strategist: React.FC = () => {
  const { state, dispatch, yolo } = useRunDoc();
  const [isGeneratingBranding, setIsGeneratingBranding] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  
  // Editing State
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [localBranding, setLocalBranding] = useState<Branding>(state.branding);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
      const result = await generateOutline(state.source_material.content, state.branding, getTextModel(), state.presentation_type);
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

  // -- Edit Mode Helpers --
  const updateLocal = (field: keyof Branding, value: any) => {
     setLocalBranding(prev => ({ ...prev, [field]: value }));
  };
  
  const addListIdx = (field: 'keywords' | 'visual_features' | 'palette' | 'fonts', item: string) => {
     if (!item) return;
     const list = localBranding[field] || [];
     updateLocal(field, [...list, item]);
  };
  
  const removeListIdx = (field: 'keywords' | 'visual_features' | 'palette' | 'fonts', idx: number) => {
     const list = localBranding[field] || [];
     updateLocal(field, list.filter((_, i) => i !== idx));
  };
  
  const handlePaletteChange = (idx: number, hex: string) => {
     const list = [...localBranding.palette];
     list[idx] = hex;
     updateLocal('palette', list);
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
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <span className="text-blue-500">01</span> Strategist
          </h2>
          <p className="text-sm text-gray-400 mt-1">Ingest content, define identity, structure the narrative.</p>
        </div>
        
        <div className="flex items-center gap-4">
          
          {!isApproved && state.outline.length > 0 && (
             <button
               onClick={handleYolo}
               className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20 text-xs"
               title="Auto-generate everything with defaults"
             >
               <Rocket size={14} /> YOLO Mode
             </button>
          )}

          {isApproved ? (
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-gray-900 border border-green-900/50 text-green-400 rounded-full text-xs font-mono font-bold flex items-center gap-2">
                <span>LOCKED & APPROVED</span>
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
               className={`px-6 py-2.5 rounded font-bold transition-all flex items-center gap-2 shadow-lg ${
                 state.outline.length === 0 || isEditingBranding
                 ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                 : 'bg-green-600 hover:bg-green-500 text-white hover:shadow-green-900/20'
               }`}
             >
               Approve Stage <ArrowDown size={16} />
             </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Col: Input */}
        <div className="w-full md:w-1/3 border-r border-gray-800 flex flex-col bg-gray-900/30 relative">
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
        <div className="w-full md:w-1/3 border-r border-gray-800 flex flex-col bg-gray-900/10">
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

             {state.revisions.branding > 0 ? (
                isEditingBranding ? (
                   <div className="space-y-6 animate-in fade-in duration-300">
                      {/* ... (Branding Edit Form - Unchanged) ... */}
                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tone & Voice</label>
                         <textarea 
                           className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-sm"
                           rows={2}
                           value={localBranding.tone}
                           onChange={(e) => updateLocal('tone', e.target.value)}
                         />
                      </div>

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Palette</label>
                         <div className="space-y-2">
                           {localBranding.palette.map((color, i) => (
                             <div key={i} className="flex items-center gap-2">
                               <input 
                                 type="color" 
                                 value={color} 
                                 onChange={(e) => handlePaletteChange(i, e.target.value)}
                                 className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                               />
                               <input 
                                 type="text" 
                                 value={color}
                                 onChange={(e) => handlePaletteChange(i, e.target.value)}
                                 className="bg-gray-800 text-gray-300 text-xs p-1.5 rounded border border-gray-700 w-20 font-mono"
                               />
                               <button onClick={() => removeListIdx('palette', i)} className="text-gray-500 hover:text-red-400"><Trash2 size={14}/></button>
                             </div>
                           ))}
                           <button onClick={() => addListIdx('palette', '#000000')} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 mt-2"><Plus size={12}/> Add Color</button>
                         </div>
                      </div>

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Primary Text Color</label>
                         <div className="flex items-center gap-2">
                             <input 
                               type="color" 
                               value={localBranding.text_color || '#ffffff'} 
                               onChange={(e) => updateLocal('text_color', e.target.value)}
                               className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                             />
                             <input 
                               type="text" 
                               value={localBranding.text_color || '#ffffff'} 
                               onChange={(e) => updateLocal('text_color', e.target.value)}
                               className="bg-gray-800 text-gray-300 text-xs p-1.5 rounded border border-gray-700 w-20 font-mono"
                             />
                         </div>
                      </div>

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Default Background Color</label>
                         <div className="flex items-center gap-2">
                             <input 
                               type="color" 
                               value={localBranding.background_color || '#030712'} 
                               onChange={(e) => updateLocal('background_color', e.target.value)}
                               className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                             />
                             <input 
                               type="text" 
                               value={localBranding.background_color || '#030712'} 
                               onChange={(e) => updateLocal('background_color', e.target.value)}
                               className="bg-gray-800 text-gray-300 text-xs p-1.5 rounded border border-gray-700 w-20 font-mono"
                             />
                         </div>
                      </div>

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Keywords (Max 20 chars)</label>
                         <div className="flex flex-wrap gap-2 mb-2">
                            {(localBranding.keywords || []).map((kw, i) => (
                               <div key={i} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 flex items-center gap-1">
                                  {kw}
                                  <button onClick={() => removeListIdx('keywords', i)} className="hover:text-red-400"><X size={10}/></button>
                               </div>
                            ))}
                         </div>
                         <input 
                            type="text" 
                            placeholder="Add keyword + Enter" 
                            className="bg-gray-800 text-gray-300 text-xs p-2 rounded w-full border border-gray-700"
                            maxLength={20}
                            onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                  addListIdx('keywords', e.currentTarget.value);
                                  e.currentTarget.value = '';
                               }
                            }}
                         />
                      </div>

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Visual Features</label>
                         <div className="flex flex-wrap gap-2 mb-2">
                            {(localBranding.visual_features || []).map((vf, i) => (
                               <div key={i} className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded text-xs text-purple-200 flex items-center gap-1">
                                  {vf}
                                  <button onClick={() => removeListIdx('visual_features', i)} className="hover:text-red-400"><X size={10}/></button>
                               </div>
                            ))}
                         </div>
                         <input 
                            type="text" 
                            placeholder="Add feature + Enter" 
                            className="bg-gray-800 text-gray-300 text-xs p-2 rounded w-full border border-gray-700"
                            onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                  addListIdx('visual_features', e.currentTarget.value);
                                  e.currentTarget.value = '';
                               }
                            }}
                         />
                      </div>

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Director's Notes</label>
                         <textarea 
                           className="w-full bg-gray-800 text-white p-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-xs leading-relaxed"
                           rows={4}
                           value={localBranding.style_notes}
                           onChange={(e) => updateLocal('style_notes', e.target.value)}
                         />
                      </div>
                      
                       <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Fonts (Google Fonts)</label>
                         <div className="space-y-3">
                           {localBranding.fonts.map((font, i) => (
                             <div key={i} className="flex items-center gap-2">
                               <div className="relative flex-1 group/combo">
                                  <input 
                                    type="text" 
                                    value={font}
                                    onChange={(e) => {
                                       const list = [...localBranding.fonts];
                                       list[i] = e.target.value;
                                       updateLocal('fonts', list);
                                    }}
                                    className="bg-gray-800 text-gray-300 text-sm p-2 rounded border border-gray-700 w-full"
                                    style={{ fontFamily: font }}
                                    placeholder="Type font name..."
                                  />
                                  <div className="absolute right-1 top-1.5 text-gray-500 pointer-events-none group-hover/combo:text-white">
                                     <ChevronDown size={16}/>
                                  </div>
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-xl max-h-48 overflow-y-auto z-50 hidden group-hover/combo:block">
                                     {POPULAR_FONTS.map(pf => (
                                        <button 
                                          key={pf}
                                          onClick={() => {
                                             const list = [...localBranding.fonts];
                                             list[i] = pf;
                                             updateLocal('fonts', list);
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                                          style={{ fontFamily: pf }}
                                        >
                                           {pf}
                                        </button>
                                     ))}
                                  </div>
                               </div>
                               <button onClick={() => removeListIdx('fonts', i)} className="text-gray-500 hover:text-red-400"><Trash2 size={14}/></button>
                             </div>
                           ))}
                           <button onClick={() => addListIdx('fonts', 'Inter')} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 mt-2"><Plus size={12}/> Add Font</button>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block group-hover:text-purple-400 transition-colors">Tone & Voice</label>
                         <div className="text-xl font-serif text-white leading-tight">{state.branding.tone}</div>
                      </div>

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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-3 block group-hover:text-purple-400 transition-colors">Text Color</label>
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded border border-gray-700" style={{ backgroundColor: state.branding.text_color || '#ffffff' }}></div>
                               <span className="text-xs font-mono text-gray-300">{state.branding.text_color || '#ffffff'}</span>
                           </div>
                        </div>

                        <div className="group">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-3 block group-hover:text-purple-400 transition-colors">Back Color</label>
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded border border-gray-700 shadow-inner" style={{ backgroundColor: state.branding.background_color || '#030712' }}></div>
                               <span className="text-xs font-mono text-gray-300">{state.branding.background_color || '#030712'}</span>
                           </div>
                        </div>
                      </div>
                      
                      {state.branding.keywords && state.branding.keywords.length > 0 && (
                        <div className="group">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><Tag size={12}/> Keywords</label>
                           <div className="flex flex-wrap gap-2">
                              {state.branding.keywords.map((kw, i) => (
                                 <span key={i} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">{kw}</span>
                              ))}
                           </div>
                        </div>
                      )}
                      
                      {state.branding.visual_features && state.branding.visual_features.length > 0 && (
                        <div className="group">
                           <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><Eye size={12}/> Visual Features</label>
                           <div className="flex flex-wrap gap-2">
                              {state.branding.visual_features.map((vf, i) => (
                                 <span key={i} className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 rounded text-xs text-purple-200">{vf}</span>
                              ))}
                           </div>
                        </div>
                      )}

                      <div className="group">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block group-hover:text-purple-400 transition-colors">Typography</label>
                         <div className="space-y-1">
                           {state.branding.fonts.map((font, i) => (
                              <div key={i} className="text-gray-200 text-xl border-l-2 border-gray-700 pl-3 py-1" style={{fontFamily: font}}>{font}</div>
                           ))}
                         </div>
                      </div>

                      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                         <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Director's Notes</label>
                         <p className="text-sm text-gray-400 italic">"{state.branding.style_notes}"</p>
                      </div>
                   </div>
                )
             ) : (
               <div className="flex flex-col items-center justify-center h-64 text-gray-600 text-center px-6">
                 <Sparkles className="mb-4 opacity-20" size={48} />
                 <p className="text-sm">Enter source text and generate branding to begin the strategic analysis.</p>
               </div>
             )}
          </LockGuard>
        </div>

        {/* Right Col: Outline */}
        <div className="w-full md:w-1/3 flex flex-col bg-gray-950">
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
               <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 mb-4">
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