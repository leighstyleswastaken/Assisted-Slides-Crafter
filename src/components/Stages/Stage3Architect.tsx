
import React, { useState, useEffect, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useRunDoc } from '../../context/RunDocContext';
import { Stage, StageStatus, Asset, ZoneId, Zone, TextLayout, Branding } from '../../types';
import { suggestLayout, suggestLayoutStrategy } from '../../services/geminiService';
import { 
  ArrowRight, LayoutGrid, Layout, Image as ImageIcon, Unlock, 
  Wand2, Loader2, Sparkles, Trash2, Layers, Move, Scaling, 
  Maximize, Minimize, StretchHorizontal, Square, Type, ChevronRight, Scan
} from 'lucide-react';
import LockGuard from '../UI/LockGuard';

// --- Types ---
const ITEM_TYPE_ASSET = 'ASSET';

// --- Sub-Components ---

const DraggableAsset: React.FC<{ asset: Asset }> = ({ asset }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE_ASSET,
    item: { id: asset.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag as unknown as React.LegacyRef<HTMLDivElement>} 
      className={`relative aspect-square rounded overflow-hidden cursor-grab active:cursor-grabbing border border-gray-700 bg-gray-900 group ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      title={asset.prompt}
    >
      <img 
        src={asset.uri} 
        alt="asset" 
        className="w-full h-full object-cover" 
        loading="lazy"
        decoding="async"
      />
      {asset.transparent && (
         <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 border border-black shadow" title="Transparent"></div>
      )}
    </div>
  );
};

const CanvasZone: React.FC<{ 
  zoneId: ZoneId; 
  label?: string; 
  zoneData?: Zone;
  assets: Asset[];
  onDrop: (assetId: string) => void;
  onClear: (zoneId: ZoneId) => void;
  onCycleAlignment: (zoneId: ZoneId) => void;
  onToggleScale: (zoneId: ZoneId) => void;
  onToggleFit: (zoneId: ZoneId) => void;
  onToggleOverflow: (zoneId: ZoneId) => void;
  className?: string;
}> = ({ zoneId, label, zoneData, assets, onDrop, onClear, onCycleAlignment, onToggleScale, onToggleFit, onToggleOverflow, className }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE_ASSET,
    drop: (item: { id: string }) => onDrop(item.id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [onDrop]);

  const asset = assets.find(a => a.id === zoneData?.asset_id);
  const alignment = zoneData?.alignment || 'center center';
  const scale = zoneData?.scale || 1;
  const fit = zoneData?.content_fit || 'contain';
  const allowOverflow = zoneData?.allow_overflow || false;

  return (
    <div 
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      className={`relative border border-dashed transition-all duration-200 flex items-center justify-center group
        ${allowOverflow ? 'overflow-visible z-20' : 'overflow-hidden z-10'}
        ${isOver ? 'bg-blue-500/20 border-blue-400' : 'border-gray-800/20 hover:border-gray-600'}
        ${className}
      `}
    >
      {asset ? (
        <>
          <img 
            src={asset.uri} 
            alt={zoneId} 
            className="w-full h-full pointer-events-none drop-shadow-md" 
            style={{ 
                objectFit: fit as any,
                objectPosition: alignment,
                transform: `scale(${scale})`,
                transformOrigin: alignment 
            }} 
            loading="lazy"
            decoding="async"
          />
          <div className="absolute top-1 right-1 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto">
             <div className="flex bg-gray-900/95 border border-gray-700 rounded p-0.5 shadow-2xl">
               <button onClick={(e) => { e.stopPropagation(); onToggleFit(zoneId); }} className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-700" title="Toggle Fit">
                  {fit === 'cover' ? <Maximize size={12} /> : fit === 'fill' ? <StretchHorizontal size={12} /> : <Minimize size={12} />}
               </button>
               <button onClick={(e) => { e.stopPropagation(); onCycleAlignment(zoneId); }} className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-700" title="Cycle Alignment">
                  <Move size={12} />
               </button>
               <button onClick={(e) => { e.stopPropagation(); onToggleScale(zoneId); }} className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-700" title="Toggle Scale">
                  <Scaling size={12} />
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); onToggleOverflow(zoneId); }} 
                  className={`p-1 rounded hover:bg-gray-700 ${allowOverflow ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`} 
                  title={allowOverflow ? "Disable Overflow" : "Allow Overflow"}
                >
                  <Scan size={12} />
               </button>
               <button onClick={(e) => { e.stopPropagation(); onClear(zoneId); }} className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-gray-800" title="Clear Zone">
                  <Trash2 size={12} />
               </button>
             </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const SlideCanvas: React.FC<{
  zones: Record<string, Zone>;
  assets: Asset[];
  branding: Branding;
  onZoneUpdate: (zoneId: ZoneId, assetId: string) => void;
  onApplyToInner: (zoneId: ZoneId, assetId: string, alignment?: string) => void;
  onCycleAlignment: (zoneId: ZoneId) => void;
  onToggleScale: (zoneId: ZoneId) => void;
  onToggleFit: (zoneId: ZoneId) => void;
  onToggleOverflow: (zoneId: ZoneId) => void;
}> = ({ zones, assets, branding, onZoneUpdate, onApplyToInner, onCycleAlignment, onToggleScale, onToggleFit, onToggleOverflow }) => {
  const bgZone = zones['background'];
  const bgAsset = assets.find(a => a.id === bgZone?.asset_id);
  const bgFit = bgZone?.content_fit || 'cover';

  const [{ isOverBg }, dropBg] = useDrop(() => ({
    accept: ITEM_TYPE_ASSET,
    drop: (item: { id: string }) => onZoneUpdate('background', item.id),
    collect: (monitor) => ({ isOverBg: !!monitor.isOver() }),
  }), [onZoneUpdate]);

  return (
    <div className="flex-1 bg-gray-950 flex flex-col items-center p-8 overflow-y-auto relative">
      <div 
         ref={dropBg as unknown as React.LegacyRef<HTMLDivElement>}
         className={`w-full max-w-5xl h-16 mb-6 rounded-lg border-2 border-dashed flex items-center justify-between px-6 transition-all shadow-inner ${isOverBg ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-gray-800 bg-gray-900/50 text-gray-500'}`}
      >
         <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
            <ImageIcon size={18} className={bgAsset ? 'text-blue-400' : ''} /> 
            <span>Slide Background</span>
            {bgAsset && (
              <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-gray-800 rounded border border-gray-700">
                <img src={bgAsset.uri} className="w-8 h-8 rounded object-cover" />
                <span className="text-[10px] text-gray-400 font-mono">#{bgAsset.id.slice(-4)}</span>
              </div>
            )}
         </div>

         {bgAsset && (
            <div className="flex items-center gap-3">
                <div className="bg-gray-800 p-1 rounded-md flex gap-1 border border-gray-700 shadow-sm">
                   <button onClick={() => onToggleFit('background')} className={`px-2.5 py-1.5 text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors ${bgFit === 'contain' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                      <Square size={12}/> Box
                   </button>
                   <button onClick={() => onToggleFit('background')} className={`px-2.5 py-1.5 text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors ${bgFit === 'fill' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                      <StretchHorizontal size={12}/> Space
                   </button>
                   <button onClick={() => onToggleFit('background')} className={`px-2.5 py-1.5 text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors ${bgFit === 'cover' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                      <Maximize size={12}/> Crop
                   </button>
                </div>
                <div className="w-px h-6 bg-gray-800 mx-1"></div>
                <button onClick={() => onApplyToInner('background', bgAsset.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95"><Layers size={14} /> Apply to All Slides</button>
                <button onClick={() => onZoneUpdate('background', '')} className="p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={20}/></button>
            </div>
         )}
      </div>

      <div 
        className="relative w-full max-w-5xl aspect-video shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden rounded-sm group/canvas ring-1 ring-gray-800"
        style={{ backgroundColor: branding.background_color || '#ffffff' }}
      >
        {bgAsset && (
            <img 
                src={bgAsset.uri} 
                className="absolute inset-0 w-full h-full z-0" 
                style={{ objectFit: bgFit === 'fill' ? 'fill' : (bgFit || 'cover') }} 
                alt="bg"
                loading="lazy"
                decoding="async"
            />
        )}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 z-10 pointer-events-none">
          {['nw','n','ne','w','c','e','sw','s','se'].map(z => (
             <CanvasZone 
               key={z} 
               zoneId={z as ZoneId} 
               label={z.toUpperCase()} 
               zoneData={zones[z]} 
               assets={assets} 
               onDrop={(id) => onZoneUpdate(z as ZoneId, id)} 
               onClear={(zid) => onZoneUpdate(zid, '')} 
               onCycleAlignment={onCycleAlignment}
               onToggleScale={onToggleScale}
               onToggleFit={onToggleFit}
               onToggleOverflow={onToggleOverflow}
               className="pointer-events-auto"
             />
          ))}
        </div>
      </div>
    </div>
  );
};

const Stage3Architect: React.FC = () => {
  const { state, dispatch } = useRunDoc();
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestingAll, setIsSuggestingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'layout'>('assets');

  useEffect(() => {
    if (!activeSlideId && state.slides.length > 0) setActiveSlideId(state.slides[0].slide_id);
  }, [state.slides, activeSlideId]);

  const activeSlide = state.slides.find(s => s.slide_id === activeSlideId);
  const activeVariant = activeSlide?.variants.find(v => v.variant_id === activeSlide.active_variant_id);
  const isApproved = state.stage_status[Stage.Architect] === StageStatus.Approved;

  const handleZoneUpdate = useCallback((zoneId: ZoneId, assetId: string) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({ type: 'UPDATE_ZONE', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, zoneId, assetId } });
  }, [activeSlideId, activeVariant, dispatch]);

  const handleApplyToInner = useCallback((zoneId: ZoneId, assetId: string, alignment?: string) => {
    dispatch({ type: 'APPLY_ZONE_TO_INNER', payload: { zoneId, assetId, alignment } });
  }, [dispatch]);

  const handleCycleAlignment = useCallback((zoneId: ZoneId) => {
    if (!activeSlideId || !activeVariant) return;
    const currentZone = activeVariant.zones[zoneId];
    if (!currentZone) return;

    // Sequence: TL, TC, TR, CL, CC, CR, BL, BC, BR
    const al = [
      'top left', 'top center', 'top right', 
      'center left', 'center center', 'center right', 
      'bottom left', 'bottom center', 'bottom right'
    ];
    
    const idx = (al.indexOf(currentZone.alignment || 'center center') + 1) % al.length;
    dispatch({ type: 'UPDATE_ZONE_STYLE', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, zoneId, alignment: al[idx] } });
  }, [activeSlideId, activeVariant, dispatch]);

  const handleToggleScale = useCallback((zoneId: ZoneId) => {
    if (!activeSlideId || !activeVariant) return;
    const currentZone = activeVariant.zones[zoneId];
    if (!currentZone) return;
    const nextScale = currentZone.scale === 1 ? 0.5 : currentZone.scale === 0.5 ? 1.5 : 1;
    dispatch({ type: 'UPDATE_ZONE_STYLE', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, zoneId, scale: nextScale } });
  }, [activeSlideId, activeVariant, dispatch]);

  const handleToggleFit = useCallback((zoneId: ZoneId) => {
    if (!activeSlideId || !activeVariant) return;
    const currentZone = activeVariant.zones[zoneId];
    if (!currentZone) return;
    const fits: any[] = ['contain', 'fill', 'cover'];
    const nextIdx = (fits.indexOf(currentZone.content_fit || 'contain') + 1) % fits.length;
    dispatch({ type: 'UPDATE_ZONE_STYLE', payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, zoneId, fit: fits[nextIdx] } });
  }, [activeSlideId, activeVariant, dispatch]);

  const handleToggleOverflow = useCallback((zoneId: ZoneId) => {
    if (!activeSlideId || !activeVariant) return;
    const currentZone = activeVariant.zones[zoneId];
    if (!currentZone) return;
    dispatch({ 
        type: 'UPDATE_ZONE_STYLE', 
        payload: { 
            slideId: activeSlideId, 
            variantId: activeVariant.variant_id, 
            zoneId, 
            allow_overflow: !currentZone.allow_overflow 
        } 
    });
  }, [activeSlideId, activeVariant, dispatch]);

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

  const handleLayoutChange = (layout: TextLayout) => {
    if (!activeSlideId || !activeVariant) return;
    dispatch({
      type: 'UPDATE_TEXT_LAYOUT',
      payload: { slideId: activeSlideId, variantId: activeVariant.variant_id, layout }
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <span className="text-amber-500">03</span> Architect
          </h2>
          <p className="text-sm text-gray-400 mt-1">Compose visual layouts. Assign assets to grid zones.</p>
        </div>
        <div className="flex items-center gap-4">
          {!isApproved && (
            <button 
              onClick={handleSuggestAll} 
              disabled={isSuggestingAll} 
              className="px-4 py-2 bg-gray-800 hover:bg-purple-900/30 hover:text-purple-300 text-gray-300 rounded font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 border border-transparent hover:border-purple-500/30"
            >
              {isSuggestingAll ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Auto-Layout All
            </button>
          )}
          {isApproved ? (
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-gray-900 border border-green-900/50 text-green-400 rounded-full text-xs font-mono font-bold flex items-center gap-2">
                <span>LOCKED & APPROVED</span>
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
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-all flex items-center gap-2 shadow-lg"
            >
              Approve Layouts <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar: Slides */}
        <aside className="w-64 border-r border-gray-800 bg-gray-900/30 flex flex-col">
          <div className="p-4 border-b border-gray-800 text-amber-400 font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2"><Layout size={16} /> Slides</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {state.outline.map((item, index) => {
              const slide = state.slides.find(s => s.slide_id === item.slide_id);
              const assetCount = slide ? Object.keys(slide.variants[0].zones).filter(k => !!slide.variants[0].zones[k].asset_id).length : 0;
              return (
                <button 
                  key={item.slide_id} 
                  onClick={() => setActiveSlideId(item.slide_id)} 
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
        </aside>

        {/* Center: Canvas Area */}
        {activeSlide && activeVariant ? (
          <main className="flex-1 flex flex-col bg-gray-950 relative">
             <div className="p-2 border-b border-gray-800 bg-gray-900 flex justify-between items-center px-4">
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
                    {isSuggesting ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} Suggest This Slide
                  </button>
                )}
             </div>
             <LockGuard stage={Stage.Architect} className="flex-1 flex flex-col">
                <SlideCanvas 
                  zones={activeVariant.zones} 
                  assets={state.asset_library} 
                  branding={state.branding}
                  onZoneUpdate={handleZoneUpdate} 
                  onApplyToInner={handleApplyToInner} 
                  onCycleAlignment={handleCycleAlignment}
                  onToggleScale={handleToggleScale}
                  onToggleFit={handleToggleFit} 
                  onToggleOverflow={handleToggleOverflow}
                />
             </LockGuard>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <Layout size={48} className="mb-4 opacity-20 block mx-auto" />
            <p>Select a slide to start designing.</p>
          </div>
        )}

        {/* Right Sidebar: Library & Structure */}
        <aside className="w-80 border-l border-gray-800 bg-gray-900/30 flex flex-col">
          <div className="flex border-b border-gray-800 bg-gray-900/50">
             <button 
                onClick={() => setActiveTab('assets')} 
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'assets' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50 shadow-[inset_0_-4px_10px_rgba(59,130,246,0.1)]' : 'text-gray-500 hover:text-white'}`}
             >
                <ImageIcon size={14}/> Library
             </button>
             <button 
                onClick={() => setActiveTab('layout')} 
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'layout' ? 'text-amber-400 border-b-2 border-blue-400 bg-gray-800/50 shadow-[inset_0_-4px_10px_rgba(245,158,11,0.1)]' : 'text-gray-500 hover:text-white'}`}
             >
                <Type size={14}/> Bones
             </button>
          </div>

          <div className="flex-1 overflow-y-auto">
             {activeTab === 'assets' ? (
                <div className="p-4 grid grid-cols-2 gap-3 content-start animate-in fade-in duration-300">
                   {state.asset_library.filter(a => a.keep).length > 0 ? (
                      state.asset_library.filter(a => a.keep).map(asset => <DraggableAsset key={asset.id} asset={asset} />)
                   ) : (
                      <div className="col-span-2 text-center py-20 opacity-30 px-6">
                        <ImageIcon size={48} className="mx-auto mb-4" />
                        <p className="text-xs italic leading-relaxed">No curated assets found. Go back to Art Dept to generate more.</p>
                      </div>
                   )}
                </div>
             ) : (
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
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Stage3Architect;
