
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { Slide, Asset, Branding, BoxTransform, TextAlign, VerticalAlign, ZoneId, TextLayout } from '../../types';
import { LAYOUT_PRESETS } from '../../constants';
import { AutoFitReadOnly, AutoFitEditable } from './AutoFitComponents';
import { Maximize, Minimize, StretchHorizontal, Trash2, Move } from 'lucide-react';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const ITEM_TYPE_ASSET = 'ASSET';

interface SlideSurfaceProps {
  slide: Slide;
  assets: Asset[];
  branding: Branding;
  mode: 'preview' | 'edit-text' | 'edit-assets';
  activeField?: string | null;
  onFieldActivate?: (field: string) => void;
  onTextUpdate?: (field: string, value: string) => void;
  onTransformUpdate?: (field: string, t: BoxTransform) => void;
  onFontSizeMeasured?: (field: string, size: number) => void;
  onZoneUpdate?: (zoneId: ZoneId, assetId: string) => void;
  onZoneStyleToggle?: (zoneId: ZoneId, type: 'fit' | 'scale' | 'align') => void;
  polish?: { noise: boolean; vignette: boolean; };
}

const DropZone: React.FC<{ 
  zoneId: ZoneId; 
  asset?: Asset; 
  zoneData?: any; 
  isArchitect: boolean;
  onDrop: (assetId: string) => void;
  onStyleToggle: (type: 'fit' | 'scale' | 'align') => void;
  onClear: () => void;
}> = ({ zoneId, asset, zoneData, isArchitect, onDrop, onStyleToggle, onClear }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE_ASSET,
    drop: (item: { id: string }) => onDrop(item.id),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }), [onDrop]);

  const fit = zoneData?.content_fit || 'contain';
  const scale = zoneData?.scale || 1;
  const alignment = zoneData?.alignment || 'center center';
  const allowOverflow = zoneData?.allow_overflow || false;

  return (
    <div 
      ref={isArchitect ? (drop as unknown as React.LegacyRef<HTMLDivElement>) : null}
      className={`relative w-full h-full flex items-center justify-center transition-all 
        ${allowOverflow ? 'overflow-visible z-20' : 'overflow-hidden z-10'}
        ${isArchitect ? 'border border-dashed border-gray-400/10' : ''} 
        ${isOver ? 'bg-blue-500/20 border-blue-400/50' : ''}
      `}
    >
      {asset ? (
        <>
          <img 
            src={asset.uri} 
            className="w-full h-full pointer-events-none drop-shadow-md" 
            style={{ 
              objectFit: fit as any, 
              objectPosition: alignment, 
              transform: `scale(${scale})`, 
              transformOrigin: alignment 
            }} 
            alt={zoneId}
            loading="lazy"
            decoding="async"
          />
          {isArchitect && (
            <div className="absolute top-2 right-2 flex bg-gray-900/90 border border-gray-700 rounded p-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
               <button onClick={() => onStyleToggle('fit')} className="p-1 text-gray-400 hover:text-white">
                  {fit === 'cover' ? <Maximize size={14}/> : fit === 'fill' ? <StretchHorizontal size={14}/> : <Minimize size={14}/>}
               </button>
               <button onClick={onClear} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14}/></button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export const SlideSurface: React.FC<SlideSurfaceProps> = (props) => {
  const { slide, assets, branding, mode, activeField, onFieldActivate, onTextUpdate, onTransformUpdate, onFontSizeMeasured, onZoneUpdate, onZoneStyleToggle, polish } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const variant = slide.variants.find(v => v.variant_id === slide.active_variant_id);

  // Interaction State
  const [dragInfo, setDragInfo] = useState<{ field: string; type: 'move' | 'resize'; handle?: string; startX: number; startY: number; startT: BoxTransform } | null>(null);
  const [liveTransform, setLiveTransform] = useState<BoxTransform | null>(null);

  // Refs to avoid stale closures during high-frequency events
  const onTransformUpdateRef = useRef(onTransformUpdate);
  const scaleRef = useRef(scale);

  useEffect(() => {
    onTransformUpdateRef.current = onTransformUpdate;
  }, [onTransformUpdate]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) setScale(containerRef.current.clientWidth / BASE_WIDTH);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const [{ isOverBg }, dropBg] = useDrop(() => ({
    accept: ITEM_TYPE_ASSET,
    drop: (item: { id: string }) => onZoneUpdate?.('background', item.id),
    collect: (monitor) => ({ isOverBg: !!monitor.isOver() }),
  }), [onZoneUpdate]);

  const layoutFields = useMemo(() => LAYOUT_PRESETS[variant?.text_layout || TextLayout.HeadlineBody] || {}, [variant?.text_layout]);
  const transforms = useMemo(() => {
    const merged: Record<string, BoxTransform> = {};
    if (!variant) return merged;
    Object.keys(layoutFields).forEach(key => { merged[key] = variant.text_transform?.[key] || layoutFields[key]; });
    return merged;
  }, [layoutFields, variant]);

  // --- Interaction Logic ---

  const handleMouseDown = (e: React.MouseEvent, field: string, type: 'move' | 'resize', handle?: string) => {
    if (mode !== 'edit-text') return;
    
    e.stopPropagation();
    e.preventDefault(); 
    onFieldActivate?.(field);
    
    const startT = { ...transforms[field] };
    
    setDragInfo({
      field,
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startT
    });
    setLiveTransform(startT);
  };

  useEffect(() => {
    if (!dragInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const currentScale = scaleRef.current;
      if (!currentScale || currentScale === 0) return;

      // Calculate Delta in Percentage relative to Base Dimensions
      const dx = (e.clientX - dragInfo.startX) / (BASE_WIDTH * currentScale) * 100;
      const dy = (e.clientY - dragInfo.startY) / (BASE_HEIGHT * currentScale) * 100;

      const newT = { ...dragInfo.startT };

      if (dragInfo.type === 'move') {
        newT.x += dx;
        newT.y += dy;
      } else if (dragInfo.type === 'resize' && dragInfo.handle) {
        if (dragInfo.handle.includes('e')) newT.w += dx;
        if (dragInfo.handle.includes('s')) newT.h += dy;
        if (dragInfo.handle.includes('w')) {
          newT.x += dx;
          newT.w -= dx;
        }
        if (dragInfo.handle.includes('n')) {
          newT.y += dy;
          newT.h -= dy;
        }
      }

      // Constrain Size (Min 5%)
      newT.w = Math.max(5, newT.w);
      newT.h = Math.max(5, newT.h);
      
      setLiveTransform(newT);
    };

    const handleMouseUp = () => {
      setLiveTransform(current => {
          if (current) {
              if (onTransformUpdateRef.current) {
                  onTransformUpdateRef.current(dragInfo.field, current);
              }
          }
          return null; 
      });
      
      setDragInfo(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo]);

  if (!variant) return null;

  const bgZone = variant.zones['background'];
  const bgAsset = assets.find(a => a.id === bgZone?.asset_id);
  const isArchitect = mode === 'edit-assets';

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full aspect-video ${isArchitect && isOverBg ? 'ring-4 ring-blue-500 ring-inset' : ''}`}
      style={{ backgroundColor: branding.background_color || '#ffffff' }}
    >
      <div 
        ref={isArchitect ? (dropBg as unknown as React.LegacyRef<HTMLDivElement>) : null}
        className="absolute top-0 left-0 origin-top-left" 
        style={{ width: `${BASE_WIDTH}px`, height: `${BASE_HEIGHT}px`, transform: `scale(${scale})` }}
      >
        {/* 1. Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            {bgAsset && (
            <img 
                src={bgAsset.uri} 
                className="absolute inset-0 w-full h-full" 
                style={{ 
                objectFit: bgZone?.content_fit === 'fill' ? 'fill' : (bgZone?.content_fit === 'contain' ? 'contain' : 'cover'),
                objectPosition: bgZone?.alignment || 'center center'
                }} 
                alt="bg"
                loading="lazy"
                decoding="async"
            />
            )}
        </div>

        {/* 2. Asset Grid Layer */}
        <div className={`absolute inset-0 grid grid-cols-3 grid-rows-3 z-10 overflow-hidden ${isArchitect ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {['nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'].map((zId) => {
            const gridArea = { 'nw': '1/1/2/2', 'n': '1/2/2/3', 'ne': '1/3/2/4', 'w': '2/1/3/2', 'c': '2/2/3/3', 'e': '2/3/3/4', 'sw': '3/1/4/2', 's': '3/2/4/3', 'se': '3/3/4/4' }[zId];
            const zoneData = variant.zones[zId];
            const asset = assets.find(a => a.id === zoneData?.asset_id);
            
            return (
              <div key={zId} className="group" style={{ gridArea }}>
                <DropZone 
                  zoneId={zId as ZoneId} 
                  asset={asset} 
                  zoneData={zoneData} 
                  isArchitect={isArchitect}
                  onDrop={(aId) => onZoneUpdate?.(zId as ZoneId, aId)}
                  onStyleToggle={(type) => onZoneStyleToggle?.(zId as ZoneId, type)}
                  onClear={() => onZoneUpdate?.(zId as ZoneId, '')}
                />
              </div>
            );
          })}
        </div>

        {/* 3. Text Overlay Layer */}
        <div className={`absolute inset-0 z-20 ${mode === 'edit-text' ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {Object.entries(transforms).map(([field, transform]) => {
            const isEditing = mode === 'edit-text' && activeField === field;
            const isDragging = dragInfo?.field === field;
            
            // Prioritize live transform during drag for smooth visuals
            const t = (isDragging && liveTransform) ? liveTransform : (transform as BoxTransform);
            
            const bold = variant.text_bold?.[field] ?? false;
            const italic = variant.text_italic?.[field] ?? false;

            return (
              <div 
                key={field} 
                className={`absolute transition-all ${mode === 'edit-text' ? 'group/field hover:ring-1 hover:ring-blue-400/50' : ''} ${isEditing ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''} ${isDragging ? 'z-[100] cursor-grabbing shadow-2xl' : 'z-50'}`}
                style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%`, boxSizing: 'border-box' }}
                onClick={(e) => { e.stopPropagation(); if (mode === 'edit-text') onFieldActivate?.(field); }}
              >
                {/* Drag Handle (Top Bar) */}
                {isEditing && (
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, field, 'move')}
                    className="absolute -top-6 left-0 right-0 h-6 bg-blue-600 rounded-t-md flex items-center justify-center gap-2 cursor-move shadow-sm z-[60] group/handle select-none"
                    title="Drag to move"
                  >
                    <Move size={12} className="text-white" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">{field.replace('_', ' ')}</span>
                  </div>
                )}

                {/* Resize Handles */}
                {isEditing && (
                  <>
                    <div onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'nw')} className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
                    <div onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'ne')} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
                    <div onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'sw')} className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
                    <div onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'se')} className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
                  </>
                )}

                {isEditing ? (
                  <AutoFitEditable text={variant.text_content[field] || ''} onChange={(val) => onTextUpdate?.(field, val)} fontFamily={variant.text_font_family?.[field] || branding.fonts[0] || 'Inter'} color={branding.text_color || '#000000'} textAlign={variant.text_alignment?.[field] || 'left'} verticalAlign={variant.text_vertical_alignment?.[field] || 'middle'} maxSize={field === 'headline' || field === 'quote' ? 120 : 60} bold={bold} italic={italic} onMeasured={(size) => onFontSizeMeasured?.(field, size)} />
                ) : (
                  <AutoFitReadOnly text={variant.text_content[field] || ''} fontFamily={variant.text_font_family?.[field] || branding.fonts[0] || 'Inter'} color={branding.text_color || '#000000'} textAlign={variant.text_alignment?.[field] || 'left'} verticalAlign={variant.text_vertical_alignment?.[field] || 'middle'} maxSize={field === 'headline' || field === 'quote' ? 120 : 60} bold={bold} italic={italic} onMeasured={(size) => onFontSizeMeasured?.(field, size)} />
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Polish Effects */}
        {polish?.noise && <div className="absolute inset-0 z-30 pointer-events-none opacity-[0.15] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>}
        {polish?.vignette && <div className="absolute inset-0 z-30 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.3)_100%)]"></div>}
      </div>
    </div>
  );
};
