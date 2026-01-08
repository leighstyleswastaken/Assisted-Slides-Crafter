
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, ZoneId, Zone, TextLayout, GradientConfig, ImageEffect } from '../../types';
import { suggestLayout, suggestLayoutStrategy } from '../../services/geminiService';
import { 
  ArrowRight, LayoutGrid, Layout, Image as ImageIcon, Unlock, 
  Wand2, Loader2, Sparkles, Type, ChevronRight, Palette, X, Layers, MousePointerClick
} from 'lucide-react';
import LockGuard from '../UI/LockGuard';
import { StageScaffold } from '../Layout/StageScaffold';
import { usePinch } from '@use-gesture/react';
import { SlideSurface } from '../Renderer/SlideSurface';
import { DraggableAsset } from './Architect/DraggableAsset';
import { StyleControlPanel } from './Architect/StyleControlPanel';

const ITEM_TYPE_ASSET = 'ASSET';

const Stage3Architect: React.FC = () => {
  const { state, dispatch } = useRunDoc();
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestingAll, setIsSuggestingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'layout' | 'style'>('assets');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // Click-to-Assign State
  const [selectedLibraryAssetId, setSelectedLibraryAssetId] = useState<string | null>(null);

  const pinchRef = useRef<HTMLDivElement>(null);

  // Gesture binding for zoom
  usePinch(({ offset: [d] }) => {
    setZoomScale(Math.max(0.5, Math.min(2, 1 + d / 200)));
  }, { target: pinchRef });

  useEffect(() => {
    if (!activeSlideId && state.slides.length > 0) setActiveSlideId(state.slides[0].slide_id);
  }, [state.slides, activeSlideId]);

  const activeSlide = state.slides.find(s => s.slide_id === activeSlideId);
  const activeVariant = activeSlide?.variants.find(v => v.variant_id === activeSlide.active_variant_id);
  const isApproved = state.stage_status[Stage.Architect] === StageStatus.Approved;

  const handleZoneUpdate = useCallback((zoneId: ZoneId, assetId: string) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({ type: 'UPDATE_ZONE', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, zoneId, assetId } });
    setSelectedLibraryAssetId(null); // Clear selection after assignment
  }, [activeSlideId, activeVariant, dispatch]);

  const handlePeekUpdate = useCallback((assetId: string) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({ type: 'UPDATE_SHAPE_MASK', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, mask: {}, peekAssetId: assetId } });
    setSelectedLibraryAssetId(null);
  }, [activeSlideId, activeVariant, dispatch]);

  const handleLayoutChange = (layout: TextLayout) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({
      type: 'UPDATE_TEXT_LAYOUT',
      payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, layout }
    });
  };

  const handleToggleFit = useCallback((zoneId: ZoneId) => {
    if (!activeSlideId || !activeVariant) return;
    const currentZone = activeVariant.zones[zoneId];
    if (!currentZone) return;
    const fits: any[] = ['contain', 'fill', 'cover'];
    const nextIdx = (fits.indexOf(currentZone.content_fit || 'contain') + 1) % fits.length;
    dispatch({ type: 'UPDATE_ZONE_STYLE', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, zoneId, fit: fits[nextIdx] } });
  }, [activeSlideId, activeVariant, dispatch]);

  const handleUpdateZoneStyle = useCallback((zoneId: ZoneId, updates: { fit?: string, alignment?: string, scale?: number }) => {
     if (!activeSlideId || !activeVariant) return;
     dispatch({ 
        type: 'UPDATE_ZONE_STYLE', 
        payload: { 
           slideId: activeSlideId, 
           variantId: activeVariant.variant_id, 
           zoneId, 
           ...updates 
        } as any 
     });
  }, [activeSlideId, activeVariant, dispatch]);

  const handleShapeUpdate = (updates: Partial<Zone['shape_mask']>) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({ 
       type: 'UPDATE_SHAPE_MASK', 
       payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, mask: updates } 
    });
  };

  const handleGradientUpdate = (gradient: GradientConfig) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({
       type: 'UPDATE_BACKGROUND_GRADIENT',
       payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, gradient }
    });
  };

  const handleToggleGlass = (enabled: boolean) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({ type: 'TOGGLE_TEXT_GLASS', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, enabled } });
  };

  const handleEffectUpdate = (effect: Partial<ImageEffect>) => {
     if (!activeSlideId || !activeVariant || !activeZone) return;
     const currentEffect = activeVariant.zones[activeZone]?.image_effect || {};
     dispatch({
        type: 'UPDATE_ZONE_EFFECT',
        payload: { 
           slideId: activeSlideId, 
           variantId: activeVariant.variant_id, 
           zoneId: activeZone as ZoneId, 
           effect: { ...currentEffect, ...effect } 
        }
     });
  };

  const handleSuggestLayout = async () => {
    if (!activeSlideId || !activeVariant) return;
    const outlineItem = state.outline.find(o => o.slide_id === activeSlideId);
    if (!outlineItem) return;
    setIsSuggesting(true);
    try {
      const result = await suggestLayout(state.asset_library.filter(a => a.keep), outlineItem.intent, state.ai_settings.textModel);
      dispatch({ type: 'REPLACE_ZONES', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, zones: result.zones } });
    } catch (e) { console.error(e); } finally { setIsSuggesting(false); }
  };

  const handleSuggestAll = async () => {
    setIsSuggestingAll(true);
    try {
      const result = await suggestLayoutStrategy(state.outline, state.asset_library.filter(a => a.keep), state.ai_settings.textModel);
      const updates = result.assignments.map(a => ({ slideId: a.slide_id, variantId: 'v1', zones: a.zones }));
      dispatch({ type: 'APPLY_LAYOUT_STRATEGY', payload: updates });
    } catch (e) { console.error(e); } finally { setIsSuggestingAll(false); }
  };

  const handleCanvasDrop = (itemId: string) => {
     if (activeTab === 'style') {
        handlePeekUpdate(itemId);
     } else {
        handleZoneUpdate('background', itemId);
     }
  };

  const handleClearZone = (zoneId: ZoneId) => {
     handleZoneUpdate(zoneId, '');
  };

  const [{ isOverBg }, dropBg] = useDrop(() => ({
    accept: ITEM_TYPE_ASSET,
    drop: (item: { id: string }) => handleCanvasDrop(item.id),
    collect: (monitor) => ({ isOverBg: !!monitor.isOver() }),
  }), [handleCanvasDrop]);

  // Click handler for Background Zone
  const handleBgClick = () => {
     if (selectedLibraryAssetId) {
        if (activeTab === 'style') {
           handlePeekUpdate(selectedLibraryAssetId);
        } else {
           handleZoneUpdate('background', selectedLibraryAssetId);
        }
     } else {
        setActiveZone('background'); 
        setActiveTab('style');
     }
  };

  // Click handler for Grid Zones
  const handleZoneClick = (z: ZoneId) => {
     if (selectedLibraryAssetId) {
        handleZoneUpdate(z, selectedLibraryAssetId);
     } else {
        setActiveZone(z);
        // Automatically switch to style tab for quick edits
        setActiveTab('style');
     }
  };

  return (
    <StageScaffold
      title="Architect"
      step="03"
      description="Compose visual layouts. Assign assets to grid zones."
      mobileTabs={{ sidebar: 'Slides', rightPanel: 'Inspector' }}
      actions={
        <>
          {!isApproved && (
            <button 
              onClick={handleSuggestAll} 
              disabled={isSuggestingAll} 
              className="px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm bg-gray-800 hover:bg-purple-900/30 hover:text-purple-300 text-gray-300 rounded font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 border border-transparent hover:border-purple-500/30"
            >
              {isSuggestingAll ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} 
              <span className="hidden md:inline">Auto-Layout All</span><span className="md:hidden">Auto</span>
            </button>
          )}
          {isApproved ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-900 border border-green-900/50 text-green-400 rounded-full text-[10px] md:text-xs font-mono font-bold flex items-center gap-2">
                <span className="hidden md:inline">LOCKED & APPROVED</span><span className="md:hidden">LOCKED</span>
              </div>
              <button 
                onClick={() => dispatch({ type: 'UNLOCK_STAGE', payload: Stage.Architect })} 
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Unlock Stage"
              >
                <Unlock size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => dispatch({ type: 'APPROVE_STAGE', payload: Stage.Architect })} 
              className="px-4 py-2 md:px-6 md:py-2.5 text-xs md:text-sm bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-all flex items-center gap-2 shadow-lg"
            >
              Approve <span className="hidden md:inline">Layouts</span> <ArrowRight size={16} />
            </button>
          )}
        </>
      }
      sidebar={
        <>
          <div className="p-4 border-b border-gray-800 text-amber-400 font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2"><Layout size={16} /> Slides</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {state.outline.map((item, index) => {
              const slide = state.slides.find(s => s.slide_id === item.slide_id);
              const assetCount = slide ? Object.keys(slide.variants[0].zones).filter(k => !!slide.variants[0].zones[k].asset_id).length : 0;
              return (
                <button 
                  key={item.slide_id} 
                  onClick={() => { setActiveSlideId(item.slide_id); setActiveZone(null); }} 
                  title={item.title}
                  className={`w-full text-left p-3 rounded flex items-center gap-3 transition-colors ${activeSlideId === item.slide_id ? 'bg-amber-900/20 border border-amber-500/30 text-amber-100' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                  <span className="font-mono text-xs opacity-50">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <span className="text-sm truncate font-medium block">{item.title}</span>
                    <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                      {assetCount > 0 ? <ImageIcon size={10} /> : null} {assetCount} {assetCount === 1 ? 'Asset' : 'Assets'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      }
      rightPanel={
        <div className="flex flex-col h-full bg-gray-900/10">
          <div className="flex border-b border-gray-800 bg-gray-900/50">
             <button 
                onClick={() => setActiveTab('assets')} 
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'assets' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-white'}`}
             >
                <ImageIcon size={14}/> Library
             </button>
             <button 
                onClick={() => setActiveTab('layout')} 
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'layout' ? 'text-amber-400 border-b-2 border-amber-400 bg-gray-800/50' : 'text-gray-500 hover:text-white'}`}
             >
                <Type size={14}/> Bones
             </button>
             <button 
                onClick={() => setActiveTab('style')} 
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'style' ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/50' : 'text-gray-500 hover:text-white'}`}
             >
                <Palette size={14}/> Inspector
             </button>
          </div>

          <div className="flex-1 overflow-y-auto">
             {activeTab === 'assets' && (
                <div className="p-4 flex flex-col gap-3 h-full">
                   {selectedLibraryAssetId && (
                      <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded text-[10px] text-blue-200 flex items-center gap-2 animate-in fade-in">
                         <MousePointerClick size={12}/>
                         Asset Selected. Click any zone or background to apply.
                         <button onClick={() => setSelectedLibraryAssetId(null)} className="ml-auto hover:text-white"><X size={12}/></button>
                      </div>
                   )}
                   <div className="grid grid-cols-2 gap-3 content-start">
                      {state.asset_library.filter(a => a.keep).length > 0 ? (
                          state.asset_library.filter(a => a.keep).map(asset => (
                             <DraggableAsset 
                                key={asset.id} 
                                asset={asset} 
                                isSelected={selectedLibraryAssetId === asset.id}
                                onSelect={() => setSelectedLibraryAssetId(prev => prev === asset.id ? null : asset.id)}
                             />
                          ))
                      ) : (
                          <div className="col-span-2 text-center py-20 opacity-30 px-6">
                            <ImageIcon size={48} className="mx-auto mb-4" />
                            <p className="text-xs italic leading-relaxed">No curated assets found. Go back to Art Dept to generate more.</p>
                          </div>
                      )}
                   </div>
                </div>
             )}
             
             {activeTab === 'layout' && (
                <div className="p-4 space-y-6 animate-in fade-in duration-300">
                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Type size={14} /> Text Skeleton</label>
                      <div className="grid gap-2">
                         {Object.values(TextLayout).map(layout => (
                            <button
                               key={layout}
                               onClick={() => handleLayoutChange(layout)}
                               className={`w-full text-left p-3 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-between group ${activeVariant?.text_layout === layout ? 'bg-amber-900/20 border-amber-500/50 text-amber-100 shadow-xl' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'}`}
                            >
                               {layout.replace('_', ' ').toUpperCase()}
                               <ChevronRight size={14} className={`transition-transform ${activeVariant?.text_layout === layout ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                            </button>
                         ))}
                      </div>
                   </div>
                </div>
             )}

             {activeTab === 'style' && activeVariant && (
                <StyleControlPanel 
                   bgZone={activeVariant.zones.background || { asset_id: '' }} 
                   textGlass={activeVariant.text_glass || false}
                   activeZoneId={activeZone as ZoneId}
                   activeZoneData={activeZone ? activeVariant.zones[activeZone] : undefined}
                   onUpdateShape={handleShapeUpdate}
                   onUpdateGradient={handleGradientUpdate}
                   onToggleGlass={handleToggleGlass}
                   onUpdateEffect={handleEffectUpdate}
                   onUpdateZoneStyle={handleUpdateZoneStyle}
                   onClearZone={handleClearZone}
                   palette={state.branding.palette}
                />
             )}
          </div>
        </div>
      }
    >
      {activeSlide && activeVariant ? (
          <div className="flex-1 flex flex-col bg-gray-950 relative h-full">
             
             {/* Floating Mobile Asset Drawer Toggle */}
             <div className="xl:hidden absolute bottom-4 right-4 z-50">
               <button 
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-95"
                  title="Open Assets"
               >
                  <ImageIcon size={24} />
               </button>
             </div>

             {/* Mobile Asset Drawer Bottom Sheet */}
             {isMobileDrawerOpen && (
                <div className="absolute inset-x-0 bottom-0 top-1/4 z-[60] bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
                   <div className="flex justify-between items-center p-4 border-b border-gray-800">
                      <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2"><ImageIcon size={16}/> Asset Library</h3>
                      <button onClick={() => setIsMobileDrawerOpen(false)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white">
                         <X size={16}/>
                      </button>
                   </div>
                   <div className="p-2 bg-blue-900/20 text-blue-200 text-xs text-center border-b border-blue-500/20">
                      Tap to select, then tap a zone. Or drag and drop.
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
                      <div className="grid grid-cols-3 gap-3">
                         {state.asset_library.filter(a => a.keep).map(asset => (
                            <DraggableAsset 
                               key={asset.id} 
                               asset={asset} 
                               isSelected={selectedLibraryAssetId === asset.id}
                               onSelect={() => {
                                  setSelectedLibraryAssetId(prev => prev === asset.id ? null : asset.id);
                                  // Close drawer if selecting, let user click zone
                                  if (selectedLibraryAssetId !== asset.id) setIsMobileDrawerOpen(false);
                               }}
                            />
                         ))}
                      </div>
                   </div>
                </div>
             )}

             <div className="p-2 border-b border-gray-800 bg-gray-900 flex justify-between items-center px-4 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 font-mono uppercase tracking-widest flex items-center gap-2">
                    <LayoutGrid size={14}/> {activeVariant.label}
                  </span>
                </div>
                {!isApproved && (
                  <button 
                    onClick={handleSuggestLayout} 
                    disabled={isSuggesting} 
                    className="flex items-center gap-2 text-xs bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white px-3 py-1.5 rounded transition-all border border-amber-600/30 shadow-lg shadow-amber-900/10"
                  >
                    {isSuggesting ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} 
                    <span className="hidden sm:inline">Suggest This Slide</span>
                    <span className="sm:hidden">Suggest</span>
                  </button>
                )}
             </div>
             
             <LockGuard stage={Stage.Architect} className="flex-1 flex flex-col overflow-hidden items-center justify-center p-8">
                
                {/* Dedicated Background Drop Zone Bar */}
                <div 
                   ref={dropBg as unknown as React.LegacyRef<HTMLDivElement>}
                   onClick={handleBgClick}
                   className={`
                      w-full max-w-5xl h-10 mb-2 rounded border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all
                      ${isOverBg || (selectedLibraryAssetId && activeTab !== 'style') ? 'bg-purple-900/40 border-purple-500 text-purple-200 animate-pulse scale-[1.01]' : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}
                      ${activeZone === 'background' ? 'ring-2 ring-blue-500' : ''}
                   `}
                >
                   <Layers size={14}/> 
                   {isOverBg ? 'Drop Background Here' : selectedLibraryAssetId ? 'Click to Apply Background' : 'Background Layer'}
                </div>

                <div ref={pinchRef} className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden" style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center', transition: 'transform 0.1s ease-out' }}>
                  
                  {/* Canvas Container */}
                  <div 
                     className="relative w-full aspect-video flex items-center justify-center"
                     onClick={() => setActiveZone(null)}
                  >
                     <SlideSurface 
                       slide={activeSlide} 
                       assets={state.asset_library} 
                       branding={state.branding} 
                       mode="edit-assets"
                       activeField={null}
                       onZoneUpdate={handleZoneUpdate}
                       onZoneStyleToggle={handleToggleFit} 
                       activeZoneId={activeZone}
                       onZoneClick={handleZoneClick}
                     />
                  </div>

                </div>
             </LockGuard>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <Layout size={48} className="mb-4 opacity-20 block mx-auto" />
            <p>Select a slide to start designing.</p>
          </div>
        )}
    </StageScaffold>
  );
};

export default Stage3Architect;
