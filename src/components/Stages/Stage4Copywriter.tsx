import React, { useState, useEffect, useCallback } from 'react';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, TextLayout, TextAlign, VerticalAlign, BoxTransform } from '../../types';
import { generateSlideCopy } from '../../services/geminiService';
import { 
  ArrowRight, Unlock, Layers, Loader2, Sparkles, 
  AlignCenter, AlignLeft, AlignRight, 
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Type, Sliders, Bold, Italic, CloudOff, Wand2
} from 'lucide-react';
import LockGuard from '../UI/LockGuard';
import { StageScaffold } from '../Layout/StageScaffold';
import { SlideSurface } from '../Renderer/SlideSurface';
import { POPULAR_FONTS } from '../../constants';

const Stage4Copywriter: React.FC = () => {
  const { state, dispatch } = useRunDoc();
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  useEffect(() => {
    if (!activeSlideId && state.slides.length > 0) setActiveSlideId(state.slides[0].slide_id);
  }, [state.slides, activeSlideId]);

  const activeSlide = state.slides.find(s => s.slide_id === activeSlideId);
  const activeVariant = activeSlide?.variants.find(v => v.variant_id === activeSlide.active_variant_id);
  const isApproved = state.stage_status[Stage.Copywriter] === StageStatus.Approved;
  const isMock = state.ai_settings.mockMode || state.project_id === 'tutorial_mode';

  const handleTextUpdate = (field: string, value: string) => {
    if (!activeSlideId || !activeSlide) return;
    dispatch({
      type: 'UPDATE_TEXT_CONTENT',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field, value }
    });
  };

  const handleTransformUpdate = useCallback((field: string, transform: BoxTransform) => {
    if (!activeSlideId || !activeSlide) return;
    dispatch({
      type: 'UPDATE_TEXT_TRANSFORM',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field, transform }
    });
  }, [activeSlideId, activeSlide, dispatch]);

  const handleAlignmentUpdate = (field: string, alignment: TextAlign) => {
    if (!activeSlideId || !activeSlide) return;
    dispatch({
      type: 'UPDATE_TEXT_ALIGNMENT',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field, alignment }
    });
  };

  const handleVerticalAlignmentUpdate = (field: string, alignment: VerticalAlign) => {
    if (!activeSlideId || !activeSlide) return;
    dispatch({
      type: 'UPDATE_TEXT_VERTICAL_ALIGNMENT',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field, alignment }
    });
  };

  const handleFontUpdate = (field: string, font: string) => {
    if (!activeSlideId || !activeSlide) return;
    dispatch({
      type: 'UPDATE_TEXT_FONT',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field, font }
    });
  };

  const handleFontSizeUpdate = useCallback((field: string, size: number) => {
    if (!activeSlideId || !activeSlide) return;
    if (activeVariant?.text_font_size?.[field] === size) return;
    dispatch({
      type: 'UPDATE_TEXT_FONT_SIZE',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field, size }
    });
  }, [activeSlideId, activeSlide, activeVariant, dispatch]);

  const handleToggleBold = (field: string) => {
    if (!activeSlideId || !activeSlide) return;
    dispatch({
      type: 'TOGGLE_TEXT_BOLD',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field }
    });
  };

  const handleToggleItalic = (field: string) => {
    if (!activeSlideId || !activeSlide) return;
    dispatch({
      type: 'TOGGLE_TEXT_ITALIC',
      payload: { slideId: activeSlideId, variantId: activeSlide.active_variant_id, field }
    });
  };

  const handleGenerateCopy = async () => {
    if (!activeSlideId || !activeSlide || !activeVariant) return;
    const outlineItem = state.outline.find(o => o.slide_id === activeSlideId);
    if (!outlineItem) return;

    setIsGenerating(true);
    try {
      const model = isMock ? 'mock-gemini' : state.ai_settings.textModel;
      const copy = await generateSlideCopy(outlineItem, activeVariant.text_layout, state.branding, state.source_material.content, model);
      Object.entries(copy).forEach(([field, value]) => handleTextUpdate(field, value));
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const handleGenerateAll = async () => {
     setIsGeneratingAll(true);
     try {
        const model = isMock ? 'mock-gemini' : state.ai_settings.textModel;
        for (const slide of state.slides) {
           const outlineItem = state.outline.find(o => o.slide_id === slide.slide_id);
           if (!outlineItem) continue;
           const v = slide.variants.find(varnt => varnt.variant_id === slide.active_variant_id);
           if (!v) continue;
           const copy = await generateSlideCopy(outlineItem, v.text_layout, state.branding, state.source_material.content, model);
           Object.entries(copy).forEach(([field, value]) => {
              dispatch({
                 type: 'UPDATE_TEXT_CONTENT',
                 payload: { slideId: slide.slide_id, variantId: slide.active_variant_id, field, value }
              });
           });
        }
     } catch (e) { console.error(e); } finally { setIsGeneratingAll(false); }
  };

  return (
    <StageScaffold
      title="Copywriter"
      step="04"
      description="Refine messaging and fit text to layout."
      actions={
        isApproved ? (
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-gray-900 border border-green-900/50 text-green-400 rounded-full text-xs font-mono font-bold">LOCKED & APPROVED</div>
            <button onClick={() => dispatch({ type: 'UNLOCK_STAGE', payload: Stage.Copywriter })} className="p-2 text-gray-500 hover:text-white"><Unlock size={16} /></button>
          </div>
        ) : (
          <>
            <button 
               onClick={handleGenerateAll} 
               disabled={isGeneratingAll} 
               className="px-4 py-2 bg-gray-800 hover:bg-pink-900/30 text-pink-300 border border-pink-900/30 rounded font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
               {isGeneratingAll ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>}
               {isMock ? 'Simulate All Copy' : 'Generate All Copy'}
            </button>
            <button onClick={() => dispatch({ type: 'APPROVE_STAGE', payload: Stage.Copywriter })} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-all flex items-center gap-2 shadow-lg">Approve Copy <ArrowRight size={16} /></button>
          </>
        )
      }
      sidebar={
        <>
          <div className="p-4 border-b border-gray-800 text-pink-400 font-mono text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Layers size={16} /> Slides</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {state.slides.map((slide, index) => {
              const outlineItem = state.outline.find(o => o.slide_id === slide.slide_id);
              return (
                <button
                  key={slide.slide_id}
                  onClick={() => { setActiveSlideId(slide.slide_id); setActiveField(null); }}
                  className={`w-full text-left p-3 rounded flex items-center gap-3 transition-colors ${activeSlideId === slide.slide_id ? 'bg-pink-900/20 border border-pink-500/30 text-pink-100' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                  <span className="font-mono text-xs opacity-50">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm truncate font-medium block">{outlineItem?.title || slide.slide_id}</span>
                </button>
              );
            })}
          </div>
        </>
      }
      rightPanel={
        <div className="flex flex-col h-full bg-gray-900/10">
          <div className="p-4 border-b border-gray-800 text-gray-400 font-mono text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} /> Properties
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {!activeField ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 text-center px-4">
                <Type size={40} className="mb-4 opacity-20" />
                <p className="text-sm">Select a text field on the slide to edit its properties.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Field: <span className="text-pink-400">{activeField}</span></h4>
                  
                  {/* Formatting Controls */}
                  <div className="space-y-3 mb-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Emphasis</label>
                    <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleBold(activeField)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border transition-all ${activeVariant?.text_bold?.[activeField] ? 'bg-pink-600 border-pink-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                        >
                          <Bold size={16}/> <span className="text-[10px] font-bold">Bold</span>
                        </button>
                        <button
                          onClick={() => handleToggleItalic(activeField)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border transition-all ${activeVariant?.text_italic?.[activeField] ? 'bg-pink-600 border-pink-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                        >
                          <Italic size={16}/> <span className="text-[10px] font-bold">Italic</span>
                        </button>
                    </div>
                  </div>

                  {/* Horizontal Alignment */}
                  <div className="space-y-3 mb-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Alignment</label>
                    <div className="flex gap-1 bg-gray-950 p-1 rounded-md border border-gray-800">
                      {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleAlignmentUpdate(activeField, align)}
                          className={`flex-1 flex justify-center py-2 rounded transition-colors ${activeVariant?.text_alignment?.[activeField] === align ? 'bg-pink-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}
                        >
                          {align === 'left' ? <AlignLeft size={16}/> : align === 'center' ? <AlignCenter size={16}/> : <AlignRight size={16}/>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vertical Alignment */}
                  <div className="space-y-3 mb-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Vertical Align</label>
                    <div className="flex gap-1 bg-gray-950 p-1 rounded-md border border-gray-800">
                      {(['top', 'middle', 'bottom'] as VerticalAlign[]).map((align) => (
                        <button
                          key={align}
                          onClick={() => handleVerticalAlignmentUpdate(activeField, align)}
                          className={`flex-1 flex justify-center py-2 rounded transition-colors ${activeVariant?.text_vertical_alignment?.[activeField] === align ? 'bg-pink-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}
                        >
                          {align === 'top' ? <AlignStartVertical size={16}/> : align === 'middle' ? <AlignCenterVertical size={16}/> : <AlignEndVertical size={16}/>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Font Family</label>
                    <div className="space-y-2">
                      <select
                        value={activeVariant?.text_font_family?.[activeField] || state.branding.fonts[0] || 'Inter'}
                        onChange={(e) => handleFontUpdate(activeField, e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-gray-300 focus:outline-none focus:border-pink-500"
                      >
                        {state.branding.fonts.map(font => <option key={font} value={font}>{font} (Brand)</option>)}
                        <option disabled>──────</option>
                        {POPULAR_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-pink-900/10 border border-pink-500/20 rounded-lg">
                   <p className="text-[10px] text-pink-300 leading-relaxed italic">"Use bold for impact and italics for secondary nuance. Balanced typography is key."</p>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col bg-gray-950">
        <div className="p-2 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 px-3 font-mono uppercase">Editing Content</span>
          </div>
          {!isApproved && (
            <button onClick={handleGenerateCopy} disabled={isGenerating} className="flex items-center gap-2 text-xs bg-pink-600 hover:bg-pink-500 text-white px-3 py-1.5 rounded transition-colors shadow-lg">
              {isGenerating ? <Loader2 className="animate-spin" size={14} /> : isMock ? <CloudOff size={14} /> : <Sparkles size={14} />} 
              {isMock ? 'Simulate Rewrite' : 'AI Rewrite'}
            </button>
          )}
        </div>

        <div className="flex-1 p-8 flex items-center justify-center overflow-hidden" onClick={() => setActiveField(null)}>
          <LockGuard stage={Stage.Copywriter} className="w-full max-w-5xl shadow-2xl bg-white">
            {activeSlide && (
              <SlideSurface 
                slide={activeSlide} 
                assets={state.asset_library} 
                branding={state.branding} 
                mode="edit-text"
                activeField={activeField}
                onFieldActivate={setActiveField}
                onTextUpdate={handleTextUpdate}
                onTransformUpdate={handleTransformUpdate}
                onFontSizeMeasured={handleFontSizeUpdate}
              />
            )}
          </LockGuard>
        </div>
      </div>
    </StageScaffold>
  );
};

export default Stage4Copywriter;