
import React from 'react';
import { Palette, Ghost, Shapes, Film, Maximize, Minimize, StretchHorizontal, Move, Scaling, ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight, Circle, Layers, Scan, Frame, Trash2 } from 'lucide-react';
import { Zone, ZoneId, ShapeType, GradientType, GradientConfig, ImageEffect } from '../../../types';

interface StylePanelProps {
  bgZone: Zone;
  textGlass: boolean;
  activeZoneId?: ZoneId | null;
  activeZoneData?: Zone;
  onUpdateShape: (updates: Partial<Zone['shape_mask']>) => void;
  onUpdateGradient: (gradient: GradientConfig) => void;
  onToggleGlass: (enabled: boolean) => void;
  onUpdateEffect: (effect: Partial<ImageEffect>) => void;
  onUpdateZoneStyle: (zoneId: ZoneId, updates: { fit?: 'cover'|'contain'|'fill', alignment?: string, scale?: number, allow_overflow?: boolean }) => void;
  onClearZone: (zoneId: ZoneId) => void;
  palette: string[];
}

export const StyleControlPanel: React.FC<StylePanelProps> = ({ 
   bgZone, textGlass, activeZoneId, activeZoneData, 
   onUpdateShape, onUpdateGradient, onToggleGlass, onUpdateEffect, onUpdateZoneStyle, onClearZone, palette 
}) => {
  const shapeMask = bgZone.shape_mask || { type: ShapeType.None, intensity: 50, flip: false, opacity: 0, color: '' };
  
  // Gradients
  const applyPreset = (colors: string[]) => {
     onUpdateGradient({ type: GradientType.Mesh, colors, intensity: 80 });
  };

  const clearGradient = () => {
     onUpdateGradient({ type: GradientType.Solid, colors: [palette[0] || '#000000'] });
  };

  // Helper for alignment buttons
  const alignGrid = [
     { icon: <ArrowUpLeft size={12}/>, val: '0% 0%' },
     { icon: <ArrowUp size={12}/>, val: '50% 0%' },
     { icon: <ArrowUpRight size={12}/>, val: '100% 0%' },
     { icon: <ArrowLeft size={12}/>, val: '0% 50%' },
     { icon: <Circle size={8}/>, val: '50% 50%' },
     { icon: <ArrowRight size={12}/>, val: '100% 50%' },
     { icon: <ArrowDownLeft size={12}/>, val: '0% 100%' },
     { icon: <ArrowDown size={12}/>, val: '50% 100%' },
     { icon: <ArrowDownRight size={12}/>, val: '100% 100%' },
  ];

  const isActiveElement = activeZoneId && activeZoneId !== 'background' && activeZoneData;

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-300">
      
      {/* GROUP 1: CANVAS BACKGROUND */}
      <div className="space-y-4">
         <div className="flex items-center justify-between pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
                <Layers size={14} className="text-gray-500"/>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Background Layer</span>
            </div>
            {bgZone.asset_id && (
                <button onClick={() => onClearZone('background')} className="text-red-400 hover:text-red-300 p-1 bg-red-900/20 rounded hover:bg-red-900/40 transition-colors" title="Remove Background Image">
                    <Trash2 size={14} />
                </button>
            )}
         </div>

         {/* Atmosphere */}
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-600 uppercase flex items-center gap-2">Atmosphere</label>
            <div className="grid grid-cols-4 gap-2">
               <button onClick={clearGradient} className="aspect-square rounded border border-gray-700 bg-gray-800 flex items-center justify-center text-[9px] text-gray-400 hover:text-white hover:border-gray-500 transition-colors">Solid</button>
               <button onClick={() => applyPreset(['#4f46e5', '#ec4899', '#000000'])} className="aspect-square rounded border border-transparent hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #4f46e5, #ec4899)' }} title="Aurora"></button>
               <button onClick={() => applyPreset(['#0f172a', '#1e293b', '#334155'])} className="aspect-square rounded border border-transparent hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #0f172a, #334155)' }} title="Deep Space"></button>
               <button onClick={() => applyPreset(['#f59e0b', '#ef4444', '#7c2d12'])} className="aspect-square rounded border border-transparent hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg, #f59e0b, #7c2d12)' }} title="Sunset"></button>
            </div>
         </div>

         {/* Shape Mask */}
         <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-600 uppercase flex items-center gap-2">Shape Mask</label>
            <div className="grid grid-cols-5 gap-1">
               {[
                  { type: ShapeType.None, icon: '▭' },
                  { type: ShapeType.Wave, icon: '〰' },
                  { type: ShapeType.Blob, icon: '●' },
                  { type: ShapeType.Diagonal, icon: '⟋' },
                  { type: ShapeType.Arc, icon: '⌒' },
               ].map(shape => (
                  <button
                     key={shape.type}
                     onClick={() => onUpdateShape({ type: shape.type })}
                     className={`p-2 rounded border flex items-center justify-center transition-all ${
                        shapeMask.type === shape.type 
                        ? 'bg-purple-900/30 border-purple-500 text-purple-300' 
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                     }`}
                  >
                     <span className="text-lg font-bold">{shape.icon}</span>
                  </button>
               ))}
            </div>
            
            {shapeMask.type !== ShapeType.None && (
               <div className="flex gap-2 pt-2">
                  <input 
                     type="range"
                     min="20" 
                     max="100"
                     value={shapeMask.intensity ?? 50}
                     onChange={(e) => onUpdateShape({ intensity: Number(e.target.value) })}
                     className="flex-1 accent-purple-500"
                  />
                  <button 
                     onClick={() => onUpdateShape({ flip: !shapeMask.flip })}
                     className="px-2 py-0.5 bg-gray-800 rounded text-[9px] text-gray-400 border border-gray-700"
                  >
                     Flip
                  </button>
               </div>
            )}
         </div>

         {/* Background Fit (Only if no shape mask usually, but user might want to adjust image inside mask) */}
         <div className="space-y-2">
             <label className="text-[10px] font-bold text-gray-600 uppercase flex items-center gap-2">Image Fit</label>
             <div className="flex bg-gray-900 p-1 rounded border border-gray-800">
                {['cover', 'contain', 'fill'].map(fit => (
                    <button 
                        key={fit}
                        onClick={() => onUpdateZoneStyle('background', { fit: fit as any })}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition-colors ${
                            bgZone.content_fit === fit ? 'bg-purple-900/50 text-purple-200' : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        {fit}
                    </button>
                ))}
            </div>
         </div>
      </div>

      {/* GROUP 2: ACTIVE ELEMENT */}
      {isActiveElement ? (
         <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
               <div className="flex items-center gap-2">
                  <Move size={14} className="text-blue-400"/>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Selected: {activeZoneId.toUpperCase()}</span>
               </div>
               {activeZoneData.asset_id && (
                   <button onClick={() => onClearZone(activeZoneId)} className="text-red-400 hover:text-red-300 p-1 bg-red-900/20 rounded hover:bg-red-900/40 transition-colors" title="Remove Asset">
                       <Trash2 size={14} />
                   </button>
               )}
            </div>

            {/* Transform Controls */}
            <div className="flex gap-4">
               {/* Alignment Matrix */}
               <div className="grid grid-cols-3 gap-1 p-1 bg-gray-900 rounded border border-gray-800 h-24 w-24 shrink-0">
                  {alignGrid.map((btn, i) => (
                     <button 
                        key={i}
                        onClick={() => onUpdateZoneStyle(activeZoneId, { alignment: btn.val })}
                        className={`flex items-center justify-center rounded transition-colors ${
                           activeZoneData.alignment === btn.val ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-500'
                        }`}
                        title={btn.val}
                     >
                        {btn.icon}
                     </button>
                  ))}
               </div>

               <div className="flex-1 flex flex-col gap-3 justify-between">
                  {/* Fit Toggles */}
                  <div className="flex bg-gray-900 p-1 rounded border border-gray-800">
                     <button 
                        onClick={() => onUpdateZoneStyle(activeZoneId, { fit: 'contain' })}
                        className={`flex-1 py-1 rounded flex justify-center ${activeZoneData.content_fit === 'contain' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        title="Contain"
                     >
                        <Minimize size={12}/>
                     </button>
                     <button 
                        onClick={() => onUpdateZoneStyle(activeZoneId, { fit: 'cover' })}
                        className={`flex-1 py-1 rounded flex justify-center ${activeZoneData.content_fit === 'cover' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        title="Cover"
                     >
                        <Maximize size={12}/>
                     </button>
                     <button 
                        onClick={() => onUpdateZoneStyle(activeZoneId, { fit: 'fill' })}
                        className={`flex-1 py-1 rounded flex justify-center ${activeZoneData.content_fit === 'fill' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        title="Stretch"
                     >
                        <StretchHorizontal size={12}/>
                     </button>
                  </div>

                  {/* Overflow Toggle */}
                  <div 
                     onClick={() => onUpdateZoneStyle(activeZoneId, { allow_overflow: !activeZoneData.allow_overflow })}
                     className={`flex items-center justify-between px-2 py-1.5 rounded border cursor-pointer transition-colors ${activeZoneData.allow_overflow ? 'bg-blue-900/20 border-blue-500/50 text-blue-300' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}
                  >
                     <span className="text-[9px] font-bold uppercase">Overflow</span>
                     {activeZoneData.allow_overflow ? <Scan size={12}/> : <Frame size={12}/>}
                  </div>

                  {/* Scale Slider */}
                  <div className="flex items-center gap-2">
                     <Scaling size={12} className="text-gray-500"/>
                     <input 
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.1"
                        value={activeZoneData.scale || 1}
                        onChange={(e) => onUpdateZoneStyle(activeZoneId, { scale: Number(e.target.value) })}
                        className="flex-1 accent-blue-500 h-1.5"
                     />
                     <span className="text-[9px] font-mono w-6 text-right">{activeZoneData.scale?.toFixed(1)}x</span>
                  </div>
               </div>
            </div>

            {/* Visual Effects */}
            <div className="space-y-2 pt-2 border-t border-gray-800/50">
               <label className="text-[10px] font-bold text-gray-600 uppercase">Visual Effects</label>
               <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-800">
                     <span className="text-[10px] text-gray-400">Grayscale</span>
                     <input 
                        type="checkbox" 
                        checked={activeZoneData.image_effect?.grayscale || false}
                        onChange={(e) => onUpdateEffect({ grayscale: e.target.checked })}
                        className="accent-blue-500"
                     />
                  </div>
                  <div className="flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-800">
                     <span className="text-[10px] text-gray-400">Brand Tint</span>
                     <input 
                        type="checkbox" 
                        checked={activeZoneData.image_effect?.duotone || false}
                        onChange={(e) => onUpdateEffect({ duotone: e.target.checked })}
                        className="accent-blue-500"
                     />
                  </div>
               </div>

               {/* Shadow Intensity */}
               <div className="grid grid-cols-4 gap-1">
                  {['none', 'subtle', 'medium', 'dramatic'].map(s => (
                     <button
                        key={s}
                        onClick={() => onUpdateEffect({ shadow: s as any })}
                        className={`py-1 text-[9px] font-bold uppercase rounded border transition-all ${
                           (activeZoneData.image_effect?.shadow || 'none') === s
                           ? 'bg-amber-900/30 border-amber-500 text-amber-300'
                           : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                        }`}
                        title={s === 'none' ? 'No Shadow' : `${s} Shadow`}
                     >
                        {s === 'dramatic' ? 'Bold' : s}
                     </button>
                  ))}
               </div>
            </div>
         </div>
      ) : (
         <div className="p-4 rounded border border-dashed border-gray-800 text-center flex flex-col items-center justify-center gap-2 text-gray-600 py-8">
            <Move size={24} className="opacity-20"/>
            <span className="text-xs">Select a grid zone to edit properties.</span>
         </div>
      )}

      {/* GROUP 3: TEXT LAYER */}
      <div className="space-y-4">
         <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
            <Ghost size={14} className="text-gray-500"/>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Text Overlay</span>
         </div>
         <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button 
               onClick={() => onToggleGlass(false)}
               className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${!textGlass ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
               Clean
            </button>
            <button 
               onClick={() => onToggleGlass(true)}
               className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${textGlass ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
            >
               Glass Card
            </button>
         </div>
      </div>

    </div>
  );
};
