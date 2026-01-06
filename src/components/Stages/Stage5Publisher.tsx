
import React, { useState, useRef, useEffect } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, Action, StageStatus, Asset, AssetKind } from '../../types';
import { SlideSurface } from '../Renderer/SlideSurface';
import { FileDown, Loader2, Presentation, Bot, CheckCircle2, Unlock, Bug, Gauge } from 'lucide-react';
import { generatePPTX } from '../../services/pptxService';
import { generatePDF } from '../../services/pdfService';
import { runReviewLoop, ReviewSuggestion } from '../../services/reviewerService';
import { generateAssetImage } from '../../services/geminiService';
import { removeBackgroundAI, removeBackgroundColorKey, compressImage } from '../../services/imageProcessingService';
import ConfirmModal from '../UI/ConfirmModal';
import { StageScaffold } from '../Layout/StageScaffold';
import { STAGE_NAMES } from '../../constants';

// Sub-components
import ReviewModal from './Publisher/ReviewModal';
import PublisherSidebar from './Publisher/PublisherSidebar';

interface SelectableSuggestion {
  data: ReviewSuggestion;
  selected: boolean;
}

const Stage5Publisher: React.FC = () => {
  const { state, dispatch, addNotification } = useRunDoc();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPPTX, setIsExportingPPTX] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const [, setImproveStatus] = useState<string>("");
  
  // Timer State
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  
  // Anti-Churn: Track the timestamp of the last successful review
  const [lastAnalysed, setLastAnalysed] = useState<string | null>(null);
  const applyingFixes = useRef(false);
  
  // State for Reviewer Suggestions (Wrapped with selection state)
  const [pendingSuggestions, setPendingSuggestions] = useState<SelectableSuggestion[]>([]);
  
  // State for Debugging failed JSON
  const [failedResponseLog, setFailedResponseLog] = useState<string>("");
  
  const [polish, setPolish] = useState({ noise: false, vignette: false });
  const [showFinaliseConfirm, setShowFinaliseConfirm] = useState<string[] | null>(null);
  
  // Explicitly allow overriding the model for review to Ensure 'Pro' quality
  const [useProModel, setUseProModel] = useState(true);
  const [concurrency, setConcurrency] = useState(1);

  const isApproved = state.stage_status[Stage.Publisher] === StageStatus.Approved;
  const isDraft = !isApproved;

  // Effect: When we apply AI fixes, we consider the RESULTING state as "Analysed" (Clean)
  useEffect(() => {
    if (applyingFixes.current && !isApplyingFixes) {
       setLastAnalysed(state.last_modified);
       applyingFixes.current = false;
    }
  }, [state.last_modified, isApplyingFixes]);

  // Timer Effect
  useEffect(() => {
    if (isImproving) {
      setElapsedTime(0);
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isImproving]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  const handleDownloadDebugLog = () => {
     const blob = new Blob([failedResponseLog], { type: 'text/plain' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `asc_debug_log_${Date.now()}.txt`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  const handleRunImprovement = async () => {
    setIsImproving(true);
    setImproveStatus("Warming up...");
    setFailedResponseLog(""); // Clear previous logs
    const currentSnapshotTime = state.last_modified;
    
    try {
      let model = state.ai_settings?.textModel;
      
      if (state.ai_settings.mockMode) {
         model = 'mock-gemini';
      } else if (useProModel) {
         model = 'gemini-3-pro-preview';
      }
      
      const suggestions = await runReviewLoop(
         state, 
         model, 
         concurrency, 
         (msg) => setImproveStatus(msg),
         (rawLog) => setFailedResponseLog(prev => prev + "\n\n" + rawLog)
      );
      
      if (suggestions.length === 0) {
         addNotification("The Reviewer found no critical issues to fix.", "success");
      } else {
         setPendingSuggestions(suggestions.map(s => ({ data: s, selected: true })));
      }
      
      setLastAnalysed(currentSnapshotTime);
    } catch (e) { 
       console.error(e); 
       addNotification("Creative Director encountered an error. Please try again.", "error");
    } finally { 
       setIsImproving(false); 
       setImproveStatus("");
    }
  };

  const handleApplySuggestions = async () => {
     const selected = pendingSuggestions.filter(s => s.selected);
     if (selected.length === 0) return;
     
     setIsApplyingFixes(true);
     applyingFixes.current = true; // Flag for after-effect sync

     try {
       const simpleActions: Action[] = [];
       const generatorRequests: any[] = [];

       selected.forEach(s => {
          if (s.data.action.type === 'REQUEST_NEW_ASSET') {
             generatorRequests.push(s.data.action);
          } else {
             simpleActions.push(s.data.action);
          }
       });

       if (simpleActions.length > 0) {
          dispatch({ type: 'BATCH_ACTIONS', payload: simpleActions });
          
          simpleActions.forEach(action => {
             const type = (action as any).type;
             const payload = (action as any).payload;
             
             dispatch({
                type: 'LOG_EVENT',
                payload: {
                   type: 'reviewer_fix',
                   detail: { 
                      action: type, 
                      slideId: payload.slideId, 
                      field: payload.field || payload.zoneId,
                      value: payload.value || payload.alignment 
                   },
                   timestamp: new Date().toISOString()
                }
             });
          });
       }

       const imageModel = state.ai_settings.mockMode ? 'mock-gemini' : state.ai_settings.imageModel;
       
       for (const req of generatorRequests) {
          const { slideId, variantId, zoneId, visualPrompt, kind } = req.payload;
          
          try {
             const base64 = await generateAssetImage(visualPrompt, kind, imageModel);
             let processedUri = await compressImage(base64, 0.8, 'image/webp');
             let isTransparent = false;

             if (kind === AssetKind.Stamp) {
                try {
                   const noBgUri = await removeBackgroundAI(base64);
                   processedUri = noBgUri;
                   isTransparent = true;
                } catch (e) {
                   console.warn("AI removal failed during review gen, falling back to Color Key", e);
                   try {
                      const colorKeyUri = await removeBackgroundColorKey(base64);
                      processedUri = colorKeyUri;
                      isTransparent = true;
                   } catch (e2) {
                      console.error("All BG removal failed for review asset", e2);
                   }
                }
             }

             const newAssetId = `asset_review_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
             const newAsset: Asset = {
                id: newAssetId,
                kind: kind,
                mime: isTransparent ? 'image/png' : 'image/webp' as any,
                uri: processedUri,
                original_uri: processedUri,
                transparent: isTransparent,
                keep: true,
                status: 'completed',
                prompt: visualPrompt,
                linked_slide_id: slideId,
                tags: [kind, 'reviewer_generated']
             };
             
             dispatch({ type: 'ADD_ASSETS', payload: [newAsset] });

             dispatch({ 
                type: 'UPDATE_ZONE', 
                payload: { slideId, variantId, zoneId, assetId: newAssetId }
             });
             
             dispatch({
                type: 'LOG_EVENT',
                payload: {
                   type: 'reviewer_commission',
                   detail: { slideId, kind, prompt: visualPrompt, assetId: newAssetId },
                   timestamp: new Date().toISOString()
                }
             });

          } catch (genError) {
             console.error("Failed to generate requested asset", genError);
             addNotification(`Failed to generate asset for Slide ${slideId}`, "error");
          }
       }

     } catch (e) {
        console.error("Failed applying suggestions", e);
     } finally {
        setIsApplyingFixes(false);
        setPendingSuggestions([]);
     }
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
             <div className="flex items-center gap-2">
               {/* Controls Container */}
               <div className="flex items-center gap-2 mr-2 bg-gray-900/50 p-1 rounded-lg border border-gray-800">
                  {/* Pro Model Toggle */}
                  <div className="flex items-center gap-1.5 px-2 border-r border-gray-800" title="Use Gemini 3 Pro for deeper reasoning">
                      <input 
                        type="checkbox" 
                        id="usePro"
                        checked={useProModel} 
                        onChange={(e) => setUseProModel(e.target.checked)}
                        className="w-3.5 h-3.5 accent-purple-500 cursor-pointer"
                      />
                      <label htmlFor="usePro" className="text-[10px] text-gray-400 font-bold uppercase cursor-pointer select-none">Pro</label>
                  </div>

                  {/* Speed Selector */}
                  <div className="flex items-center gap-1.5 px-1" title="Parallel Requests (Higher is faster but uses more quota)">
                      <Gauge size={14} className="text-gray-500"/>
                      <select 
                        value={concurrency}
                        onChange={(e) => setConcurrency(Number(e.target.value))}
                        className="bg-transparent text-[10px] font-bold text-gray-300 focus:outline-none uppercase cursor-pointer"
                      >
                        <option value={1}>Seq</option>
                        <option value={2}>2x</option>
                        <option value={4}>4x</option>
                      </select>
                  </div>
               </div>

               {/* Failed Logs Download (Testing) */}
               {failedResponseLog && (
                  <button 
                     onClick={handleDownloadDebugLog}
                     className="px-2 py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded flex items-center justify-center mr-2 transition-colors"
                     title="Download Raw Debug Logs"
                  >
                     <Bug size={20} />
                  </button>
               )}

               <button 
                  onClick={handleRunImprovement} 
                  disabled={isImproving || isApplyingFixes || pendingSuggestions.length > 0 || isUpToDate} 
                  className={`px-4 py-2.5 rounded font-bold transition-all flex items-center gap-2 shadow-lg border border-transparent min-w-[160px] justify-center ${
                     isUpToDate 
                     ? 'bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed' 
                     : 'bg-gray-800 hover:bg-purple-900/30 text-gray-300 hover:border-purple-500/30'
                  }`}
                  title={isUpToDate ? "No changes detected since last review" : `Run AI Creative Director`}
               >
                  {isImproving ? <Loader2 className="animate-spin" size={20} /> : isUpToDate ? <CheckCircle2 size={20} /> : <Bot size={20} />} 
                  {isImproving ? (
                    <span className="flex items-center gap-2">
                       <span className="font-mono text-xs">{formatTime(elapsedTime)}</span>
                    </span>
                  ) : isUpToDate ? 'Reviewed' : 'Auto-Improve'}
               </button>
               <button onClick={handleFinalizeClick} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-all flex items-center gap-2 shadow-lg">
                  <CheckCircle2 size={20} /> Finalise Project
               </button>
             </div>
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
        <PublisherSidebar 
          state={state} 
          isDraft={isDraft} 
          isApproved={isApproved} 
          polish={polish} 
          setPolish={setPolish} 
        />
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
      
      {pendingSuggestions.length > 0 && (
         <ReviewModal 
            suggestions={pendingSuggestions}
            assets={state.asset_library}
            isApplying={isApplyingFixes}
            onToggle={toggleSuggestion}
            onApply={handleApplySuggestions}
            onDiscard={() => setPendingSuggestions([])}
         />
      )}
    </StageScaffold>
  );
};

export default Stage5Publisher;
