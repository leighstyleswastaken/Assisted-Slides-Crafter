
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { Slide, Asset, Branding, BoxTransform, ZoneId, TextLayout, ImageEffect } from '../../types';
import { LAYOUT_PRESETS } from '../../constants';
import { AutoFitReadOnly, AutoFitEditable } from './AutoFitComponents';
import { ShapeMaskLayer } from './ShapeMaskLayer';
import { GradientMesh } from './GradientMesh';
import { GlassCard } from './GlassCard';
import { getContrastColor } from '../../utils/colorUtils';
import { TransformableElement } from './TransformableElement';
import { Plus } from 'lucide-react';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const ITEM_TYPE_ASSET = 'ASSET';

interface SlideSurfaceProps {
  slide: Slide;
  assets: Asset[];
  branding: Branding;
  mode: 'preview' | 'edit-text' | 'edit-assets';
  id?: string; // NEW: Allow ID injection
  activeField?: string | null;
  activeZoneId?: string | null;
  onFieldActivate?: (field: string) => void;
  onTextUpdate?: (field: string, value: string) => void;
  onTransformUpdate?: (field: string, t: BoxTransform) => void;
  onFontSizeMeasured?: (field: string, size: number) => void;
  onZoneUpdate?: (zoneId: ZoneId, assetId: string) => void;
  onZoneStyleToggle?: (zoneId: ZoneId, type: 'fit' | 'scale' | 'align') => void;
  onZoneClick?: (zoneId: ZoneId) => void;
  polish?: { noise: boolean; vignette: boolean; };
}

const DropZone: React.FC<{ 
  zoneId: ZoneId; 
  asset?: Asset; 
  zoneData?: any; 
  isArchitect: boolean;
  isActive: boolean;
  onDrop: (assetId: string) => void;
  onClick: () => void;
  branding: Branding;
}> = ({ zoneId, asset, zoneData, isArchitect, isActive, onDrop, onClick, branding }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE_ASSET,
    drop: (item: { id: string }) => onDrop(item.id),
    collect: (monitor) => ({ 
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop()
    }),
  }), [onDrop]);

  const fit = zoneData?.content_fit || 'contain';
  const scale = zoneData?.scale || 1;
  const alignment = zoneData?.alignment || 'center center';
  const allowOverflow = zoneData?.allow_overflow || false;
  
  // Image Effects
  const effect = zoneData?.image_effect as ImageEffect;
  const filterStyle = [
     effect?.grayscale ? 'grayscale(100%)' : '',
     effect?.blur ? `blur(${effect.blur}px)` : '',
  ].filter(Boolean).join(' ');

  const duotoneStyle = effect?.duotone ? {
     mixBlendMode: 'multiply' as const,
     opacity: 0.8
  } : {};

  // Premium Shadow Logic
  const shadowMap = {
     'subtle': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
     'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
     'dramatic': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  };
  const boxShadow = effect?.shadow && effect.shadow !== 'none' ? shadowMap[effect.shadow] : 'none';

  // CSS Animation Logic
  let animationClass = '';
  if (effect?.motion === 'pan') animationClass = 'animate-subtle-pan';
  if (effect?.motion === 'zoom') animationClass = 'animate-subtle-zoom';

  return (
    <div 
      ref={isArchitect ? (drop as unknown as React.LegacyRef<HTMLDivElement>) : null}
      onClick={(e) => {
         if (!isArchitect) return;
         e.stopPropagation();
         onClick();
      }}
      className={`relative w-full h-full flex items-center justify-center transition-all 
        ${allowOverflow ? 'overflow-visible z-20' : 'overflow-hidden z-10'}
        ${isArchitect ? 'cursor-pointer' : ''}
        ${isArchitect && !asset ? 'border border-dashed border-gray-700/50 hover:bg-white/5' : ''} 
        ${isOver ? 'bg-blue-500/20 border-blue-400/50' : ''}
        ${isActive ? 'ring-4 ring-blue-500 z-50' : ''}
        ${canDrop && !asset ? 'animate-pulse bg-blue-500/5' : ''}
      `}
    >
      {isArchitect && !asset && (
         <div className={`pointer-events-none flex flex-col items-center justify-center text-gray-500 ${isOver ? 'text-blue-200' : ''}`}>
            <Plus size={32} strokeWidth={1} />
            <span className="text-[20px] font-mono font-bold uppercase opacity-50">{zoneId}</span>
         </div>
      )}

      {asset ? (
        <div 
           className="relative w-full h-full" 
           style={{ 
              boxShadow: fit !== 'cover' ? boxShadow : 'none', // Only apply box shadow if not full bleed cover
              transform: `scale(${scale})`, 
              transformOrigin: alignment
           }}
        >
           {/* Add style tag for keyframes if motion is active (simplest way to inject without global CSS) */}
           {effect?.motion && (
              <style>
                 {`
                    @keyframes subtle-pan { 0% { transform: translateX(0%); } 50% { transform: translateX(-2%); } 100% { transform: translateX(0%); } }
                    @keyframes subtle-zoom { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                    .animate-subtle-pan { animation: subtle-pan 20s ease-in-out infinite; }
                    .animate-subtle-zoom { animation: subtle-zoom 20s ease-in-out infinite; }
                 `}
              </style>
           )}

           <img 
            src={asset.uri} 
            className={`w-full h-full pointer-events-none drop-shadow-md ${animationClass}`}
            style={{ 
              objectFit: fit as any, 
              objectPosition: alignment,
              filter: filterStyle,
              ...duotoneStyle
            }} 
            alt={zoneId}
            loading="lazy"
            decoding="async"
          />
          {/* Duotone Overlay Layer */}
          {effect?.duotone && (
             <div 
                className={`absolute inset-0 pointer-events-none mix-blend-screen ${animationClass}`}
                style={{
                   background: `linear-gradient(to bottom right, ${branding.palette[0] || '#000'}, ${branding.palette[1] || '#fff'})`,
                }}
             />
          )}
        </div>
      ) : null}
    </div>
  );
};

export const SlideSurface: React.FC<SlideSurfaceProps> = React.memo((props) => {
  const { slide, assets, branding, mode, id, activeField, activeZoneId, onFieldActivate, onTextUpdate, onTransformUpdate, onFontSizeMeasured, onZoneUpdate, onZoneClick, polish } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const variant = slide.variants.find(v => v.variant_id === slide.active_variant_id);

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
    drop: (item: { id: string }, monitor) => {
        if (monitor.didDrop()) return; // IMPORTANT: Prevent background drop if child zone handled it
        onZoneUpdate?.('background', item.id);
    },
    collect: (monitor) => ({ isOverBg: !!monitor.isOver({ shallow: true }) }), // shallow ensures we only light up if hovering background directly
  }), [onZoneUpdate]);

  const layoutFields = useMemo(() => LAYOUT_PRESETS[variant?.text_layout || TextLayout.HeadlineBody] || {}, [variant?.text_layout]);
  const transforms = useMemo(() => {
    const merged: Record<string, BoxTransform> = {};
    if (!variant) return merged;
    Object.keys(layoutFields).forEach(key => { merged[key] = variant.text_transform?.[key] || layoutFields[key]; });
    return merged;
  }, [layoutFields, variant]);

  if (!variant) return null;

  const bgZone = variant.zones['background'];
  const bgAsset = assets.find(a => a.id === bgZone?.asset_id);
  const peekAsset = bgZone?.peek_asset_id ? assets.find(a => a.id === bgZone.peek_asset_id) : null;
  const isArchitect = mode === 'edit-assets';

  // Smart Contrast Color
  const baseTextColor = branding.text_color || '#000000';
  const bgColorHex = branding.background_color || '#ffffff';
  
  const smartTextColor = (bgZone?.asset_id || bgZone?.gradient) 
      ? getContrastColor(bgColorHex)
      : baseTextColor;

  return (
    <div 
      id={id}
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
        
        {/* Layer 1A: Base Peek Background (shows through shape) */}
        {peekAsset && (
          <div className="absolute inset-0 z-0">
            <img 
              src={peekAsset.uri} 
              className="w-full h-full object-cover"
              alt="peek background"
            />
          </div>
        )}

        {/* Layer 1B: Gradient Mesh OR Shape Mask OR Standard Background */}
        {bgAsset && bgZone?.shape_mask && bgZone.shape_mask.type !== 'none' ? (
           <ShapeMaskLayer 
              asset={bgAsset}
              peekAsset={peekAsset || null}
              shapeMask={bgZone.shape_mask}
              width={BASE_WIDTH}
              height={BASE_HEIGHT}
           />
        ) : (
           <div className="absolute inset-0 z-0 overflow-hidden">
              {/* Render Gradient if exists */}
              {bgZone?.gradient && (
                 <GradientMesh config={bgZone.gradient} width={BASE_WIDTH} height={BASE_HEIGHT} />
              )}

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
        )}

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
                  isActive={activeZoneId === zId}
                  onDrop={(aId) => onZoneUpdate?.(zId as ZoneId, aId)}
                  onClick={() => onZoneClick?.(zId as ZoneId)}
                  branding={branding}
                />
              </div>
            );
          })}
        </div>

        {/* 3. Text Overlay Layer */}
        <div className={`absolute inset-0 z-20 ${mode === 'edit-text' ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {Object.entries(transforms).map(([field, rawTransform]) => {
            const transform = rawTransform as BoxTransform;
            const isEditing = mode === 'edit-text' && activeField === field;
            
            const bold = variant.text_bold?.[field] ?? false;
            const italic = variant.text_italic?.[field] ?? false;
            const useGlass = variant.text_glass ?? false;
            const storedFontSize = variant.text_font_size?.[field];
            
            const displayColor = useGlass ? branding.text_color : smartTextColor;

            const textComponent = isEditing ? (
                <AutoFitEditable 
                  text={variant.text_content[field] || ''} 
                  onChange={(val) => onTextUpdate?.(field, val)} 
                  fontFamily={variant.text_font_family?.[field] || branding.fonts[0] || 'Inter'} 
                  color={displayColor} 
                  textAlign={variant.text_alignment?.[field] || 'left'} 
                  verticalAlign={variant.text_vertical_alignment?.[field] || 'middle'} 
                  maxSize={field === 'headline' || field === 'quote' ? 120 : 60} 
                  bold={bold} 
                  italic={italic} 
                  onMeasured={(size) => onFontSizeMeasured?.(field, size)}
                  initialFontSize={storedFontSize}
                />
            ) : (
                <AutoFitReadOnly 
                  text={variant.text_content[field] || ''} 
                  fontFamily={variant.text_font_family?.[field] || branding.fonts[0] || 'Inter'} 
                  color={displayColor} 
                  textAlign={variant.text_alignment?.[field] || 'left'} 
                  verticalAlign={variant.text_vertical_alignment?.[field] || 'middle'} 
                  maxSize={field === 'headline' || field === 'quote' ? 120 : 60} 
                  bold={bold} 
                  italic={italic} 
                  onMeasured={(size) => onFontSizeMeasured?.(field, size)} 
                  initialFontSize={storedFontSize}
                />
            );

            // If edit mode is active, wrap in TransformableElement
            if (mode === 'edit-text') {
                return (
                    <TransformableElement
                        key={field}
                        field={field}
                        transform={transform}
                        baseWidth={BASE_WIDTH}
                        baseHeight={BASE_HEIGHT}
                        scale={scale}
                        isActive={isEditing}
                        onActivate={() => onFieldActivate?.(field)}
                        onUpdate={(f, t) => onTransformUpdate?.(f, t)}
                    >
                        {useGlass ? <GlassCard className="w-full h-full">{textComponent}</GlassCard> : textComponent}
                    </TransformableElement>
                );
            }

            // Static view (Preview/Architect/Art)
            return (
              <div 
                key={field} 
                className="absolute z-50"
                style={{ left: `${transform.x}%`, top: `${transform.y}%`, width: `${transform.w}%`, height: `${transform.h}%`, boxSizing: 'border-box' }}
              >
                {useGlass ? <GlassCard className="w-full h-full">{textComponent}</GlassCard> : textComponent}
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
}, (prevProps, nextProps) => {
  return (
    prevProps.slide.slide_id === nextProps.slide.slide_id &&
    prevProps.activeField === nextProps.activeField &&
    prevProps.activeZoneId === nextProps.activeZoneId && // Added Check
    prevProps.mode === nextProps.mode &&
    prevProps.id === nextProps.id && // Added ID Check
    JSON.stringify(prevProps.slide.variants) === JSON.stringify(nextProps.slide.variants) &&
    JSON.stringify(prevProps.branding) === JSON.stringify(nextProps.branding) &&
    JSON.stringify(prevProps.polish) === JSON.stringify(nextProps.polish)
  );
});
