
import React, { useState, useRef, useEffect } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, Action, StageStatus } from '../../types';
import { SlideSurface } from '../Renderer/SlideSurface';
import { FileDown, Loader2, Printer, Presentation, Bot, Sparkles, AlertTriangle, ExternalLink, Info, CheckCircle2, Unlock, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { generatePPTX } from '../../services/pptxService';
import { generatePDF } from '../../services/pdfService';
import { runReviewLoop, ReviewSuggestion } from '../../services/reviewerService';
import ConfirmModal from '../UI/ConfirmModal';
import { StageScaffold } from '../Layout/StageScaffold';
import { STAGE_NAMES } from '../../constants';

interface SelectableSuggestion {
  data: ReviewSuggestion;
  selected: boolean;
}

const Stage5Publisher: React.FC = () => {
  const { state, dispatch, addNotification } = useRunDoc();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPPTX, setIsExportingPPTX] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improveStatus, setImproveStatus] = useState<string>("");
  
  // Anti-Churn: Track the timestamp of the last successful review
  const [lastAnalysed, setLastAnalysed] = useState<string | null>(null);
  const applyingFixes = useRef(false);
  
  // State for Reviewer Suggestions (Wrapped with selection state)
  const [pendingSuggestions, setPendingSuggestions] = useState<SelectableSuggestion[]>([]);
  
  const [polish, setPolish] = useState({ noise: false, vignette: false });
  const [showFinaliseConfirm, setShowFinaliseConfirm] = useState<string[] | null>(null);

  const isApproved = state.stage_status[Stage.Publisher] === StageStatus.Approved;
  const isDraft = !isApproved;

  // Effect: When we apply AI fixes, we consider the RESULTING state as "Analysed" (Clean)
  // so the user isn't prompted to re-run AI on the AI's own work immediately.
  useEffect(() => {
    if (applyingFixes.current) {
       setLastAnalysed(state.last_modified);
       applyingFixes.current = false;
    }
  }, [state.last_modified]);

  const getExportFilename = (ext: string) => {
     return `${state.project_id}${isDraft ? '_draft' : ''}_Deck.${ext}`;
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try { await generatePDF(state, getExportFilename('pdf')); } catch (e) { console.error(e); } finally { setIsExportingPDF(false); }
  };

  const handleExportPPTX = async () => {
    setIsExportingPPTX(true);
    try { await generatePPTX(state, getExportFilename('pptx')); } catch (e) { console.error(e); } finally { setIsExportingPPTX(false); }
  };

  const handleRunImprovement = async () => {
    setIsImproving(true);
    setImproveStatus("Warming up...");
    const currentSnapshotTime = state.last_modified;
    
    try {
      const model = state.ai_settings.mockMode ? 'mock-gemini' : state.ai_settings?.textModel;
      
      // Pass a progress callback to receive granular updates
      const suggestions = await runReviewLoop(state, model, (msg) => {
         setImproveStatus(msg);
      });
      
      if (suggestions.length === 0) {
         addNotification("The Reviewer found no critical issues to fix.", "success");
      } else {
         // Map raw suggestions to selectable state, defaulting to checked
         setPendingSuggestions(suggestions.map(s => ({ data: s, selected: true })));
      }
      
      // Mark this version as analysed so we don't re-run unless changes happen
      setLastAnalysed(currentSnapshotTime);
    } catch (e) { 
       console.error(e); 
       addNotification("Creative Director encountered an error. Please try again.", "error");
    } finally { 
       setIsImproving(false); 
       setImproveStatus("");
    }
  };

  const handleApplySuggestions = () => {
     const selected = pendingSuggestions.filter(s => s.selected);
     if (selected.length === 0) return;
     
     const actions = selected.map(s => s.data.action);
     applyingFixes.current = true; // Flag for the useEffect to catch the update
     dispatch({ type: 'BATCH_ACTIONS', payload: actions });
     setPendingSuggestions([]);
  };

  const toggleSuggestion = (index: number) => {
    setPendingSuggestions(prev => prev.map((s, i) => i === index ? { ...s, selected: !s.selected } : s));
  };

  const handleFontSizeMeasured = (slideId: string, variantId: string, field: string, size: number) => {
    const slide = state.slides.find(s => s.slide_id === slideId);
    const variant = slide?.variants.find(v => v.variant_id === variantId);
    if (variant?.text_font_size?.[field] === size) return;
    
    dispatch({
      type: 'UPDATE_TEXT_FONT_SIZE',
      payload: { slideId, variantId, field, size }
    });
  };

  const handleFinalizeClick = () => {
     // Check for open stages
     const openStages = [1, 2, 3, 4].filter(s => state.stage_status[s as number] !== StageStatus.Approved);
     if (openStages.length > 0) {
        const names = openStages.map(s => STAGE_NAMES[s as Stage]);
        setShowFinaliseConfirm(names);
     } else {
        dispatch({ type: 'APPROVE_PROJECT' });
     }
  };

  const confirmForceFinalise = () => {
     dispatch({ type: 'APPROVE_PROJECT' });
     setShowFinaliseConfirm(null);
  };

  const selectedCount = pendingSuggestions.filter(s => s.selected).length;
  const isUpToDate = state.last_modified === lastAnalysed;

  return (
    <StageScaffold
      title="Publisher"
      step="05"
      description="Final review and high-fidelity export."
      actions={
        <>
          {showFinaliseConfirm && (
             <ConfirmModal 
                title="Unfinished Business"
                message={`The following stages are still open: ${showFinaliseConfirm.join(', ')}. Do you want to close them automatically and finalise the project?`}
                confirmLabel="Close All & Finalise"
                onConfirm={confirmForceFinalise}
                onCancel={() => setShowFinaliseConfirm(null)}
             />
          )}

          {!isApproved ? (
             <>
               <button 
                  onClick={handleRunImprovement} 
                  disabled={isImproving || pendingSuggestions.length > 0 || isUpToDate} 
                  className={`px-4 py-2.5 rounded font-bold transition-all flex items-center gap-2 shadow-lg border border-transparent ${
                     isUpToDate 
                     ? 'bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed' 
                     : 'bg-gray-800 hover:bg-purple-900/30 text-gray-300 hover:border-purple-500/30'
                  }`}
                  title={isUpToDate ? "No changes detected since last review" : "Run AI Creative Director"}
               >
                  {isImproving ? <Loader2 className="animate-spin" size={20} /> : isUpToDate ? <CheckCircle2 size={20} /> : <Bot size={20} />} 
                  {isImproving ? improveStatus || 'Analysing...' : isUpToDate ? 'Reviewed' : 'Auto-Improve'}
               </button>
               <button onClick={handleFinalizeClick} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-all flex items-center gap-2 shadow-lg">
                  <CheckCircle2 size={20} /> Finalise Project
               </button>
             </>
          ) : (
            <div className="flex items-center gap-2">
               <div className="px-4 py-2 bg-gray-900 border border-green-900/50 text-green-400 rounded-full text-xs font-mono font-bold flex items-center gap-2">
                  <CheckCircle2 size={14}/> PROJECT CLOSED
               </div>
               <button 
                  onClick={() => dispatch({ type: 'UNLOCK_STAGE', payload: Stage.Publisher })}
                  className="p-2 text-gray-500 hover:text-white transition-colors"
                  title="Unlock to make changes"
               >
                  <Unlock size={16} />
               </button>
            </div>
          )}
          
          <div className="w-px h-8 bg-gray-800 mx-2"></div>

          <button onClick={handleExportPPTX} disabled={isExportingPPTX} className="px-4 py-2.5 bg-gray-800 hover:bg-orange-700 hover:text-white text-gray-300 rounded font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50">
            {isExportingPPTX ? <Loader2 className="animate-spin" size={20} /> : <Presentation size={20} />} PPTX
          </button>
          <button onClick={handleExportPDF} disabled={isExportingPDF} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-900/20 disabled:opacity-50">
            {isExportingPDF ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />} PDF
          </button>
        </>
      }
      sidebar={
        <div className="p-6 flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded p-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Printer size={16} /> Deck Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Slides</span><span className="text-white font-mono">{state.slides.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Assets</span><span className="text-white font-mono">{state.asset_library.filter(a => a.keep).length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-mono ${isDraft ? 'text-yellow-500' : 'text-green-400'}`}>{isDraft ? 'DRAFT' : 'FINAL'}</span></div>
            </div>
          </div>

          <div className="bg-amber-900/10 border border-amber-500/30 rounded-lg p-4">
            <h3 className="text-[10px] font-bold text-amber-500 uppercase mb-2 flex items-center gap-2"><AlertTriangle size={14} /> PPTX Font Parity</h3>
            <p className="text-[11px] text-amber-200/70 leading-relaxed mb-3">
              PowerPoint requires fonts to be installed locally. For 1:1 parity, install these Google Fonts:
            </p>
            <div className="space-y-1 mb-4">
              {state.branding.fonts.map(f => (
                <div key={f} className="flex items-center justify-between bg-gray-950 px-2 py-1.5 rounded border border-gray-800">
                  <span className="text-[10px] font-bold text-white font-mono">{f}</span>
                  <a href={`https://fonts.google.com/specimen/${f.replace(/\s+/g, '+')}`} target="_blank" rel="noreferrer" className="text-amber-500 hover:text-white transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className={`bg-gray-900 border border-gray-800 rounded p-4 ${isApproved ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Sparkles size={16} /> Final Polish</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-300 group-hover:text-white">Film Grain</span>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded accent-red-600 cursor-pointer" 
                  checked={polish.noise} 
                  onChange={() => setPolish(p => ({...p, noise: !p.noise}))} 
                  disabled={isApproved}
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-300 group-hover:text-white">Vignette</span>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded accent-red-600 cursor-pointer" 
                  checked={polish.vignette} 
                  onChange={() => setPolish(p => ({...p, vignette: !p.vignette}))} 
                  disabled={isApproved}
                />
              </label>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto bg-gray-950 p-8 flex justify-center">
        <div className="space-y-8 w-full max-w-[1122px] pb-32">
          {state.slides.map((slide, index) => (
            <div key={slide.slide_id} className="relative group shadow-2xl canonical-slide">
              <SlideSurface 
                slide={slide} 
                assets={state.asset_library} 
                branding={state.branding} 
                mode="preview" 
                polish={polish}
                onFontSizeMeasured={(field, size) => handleFontSizeMeasured(slide.slide_id, slide.active_variant_id, field, size)}
              />
              <div className="absolute top-4 -left-12 text-gray-600 font-mono text-xl font-bold opacity-50 no-print">{String(index + 1).padStart(2, '0')}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Review Modal */}
      {pendingSuggestions.length > 0 && (
         <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-purple-500/50 rounded-xl p-6 max-w-lg w-full shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
               <div className="flex items-center gap-3 mb-4 text-white border-b border-gray-800 pb-4">
                  <Sparkles className="text-purple-400" size={24}/>
                  <div>
                     <h3 className="text-lg font-bold">Creative Director Review</h3>
                     <p className="text-xs text-gray-400">Review and select polish items to apply.</p>
                  </div>
               </div>
               
               <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto pr-2">
                  {pendingSuggestions.map((item, i) => (
                     <div 
                        key={i} 
                        onClick={() => toggleSuggestion(i)}
                        className={`flex gap-3 p-3 rounded border cursor-pointer transition-all duration-200 group ${
                           item.selected 
                           ? 'bg-gray-900 border-purple-500/40 shadow-inner' 
                           : 'bg-gray-950 border-gray-800 opacity-60 hover:opacity-80 hover:border-gray-700'
                        }`}
                     >
                        <div className={`pt-1 transition-colors ${item.selected ? 'text-purple-400' : 'text-gray-600'}`}>
                           {item.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                              <span className={`text-xs font-mono mb-1 ${item.selected ? 'text-gray-500' : 'text-gray-700'}`}>
                                 Suggestion {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className={`text-[9px] px-1.5 rounded uppercase font-bold tracking-wider ${item.selected ? 'bg-purple-900/30 text-purple-300' : 'bg-gray-800 text-gray-600'}`}>
                                 {item.data.action.type.replace('UPDATE_', '').replace('_', ' ')}
                              </span>
                           </div>
                           <p className={`text-sm leading-relaxed ${item.selected ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
                              {item.data.description}
                           </p>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <button onClick={() => setPendingSuggestions([])} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors">Discard All</button>
                  <button 
                     onClick={handleApplySuggestions}
                     disabled={selectedCount === 0}
                     className="px-6 py-2 rounded text-white text-sm font-bold shadow-lg transition-all bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none flex items-center gap-2"
                  >
                     <Sparkles size={14}/> 
                     {selectedCount === 0 ? 'Select Fixes' : `Apply ${selectedCount} Fixes`}
                  </button>
               </div>
            </div>
         </div>
      )}
    </StageScaffold>
  );
};

export default Stage5Publisher;
