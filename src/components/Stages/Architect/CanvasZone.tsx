
import React from 'react';
import { useDrop } from 'react-dnd';
import { ZoneId, Zone, Asset } from '../../../types';
import { Trash2, Plus } from 'lucide-react';

const ITEM_TYPE_ASSET = 'ASSET';

interface Props {
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
  onSelect: () => void;
  isSelected: boolean;
  className?: string;
}

export const CanvasZone: React.FC<Props> = ({ 
  zoneId, label, zoneData, assets, onDrop, onClear, 
  onSelect, isSelected, className 
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE_ASSET,
    drop: (item: { id: string }) => onDrop(item.id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [onDrop]);

  const asset = assets.find(a => a.id === zoneData?.asset_id);
  const alignment = zoneData?.alignment || 'center center';
  const scale = zoneData?.scale || 1;
  const fit = zoneData?.content_fit || 'contain';
  const allowOverflow = zoneData?.allow_overflow || false;

  let borderClass = 'border-gray-800/20 hover:border-gray-600';
  let bgClass = '';

  if (isOver) {
    bgClass = 'bg-blue-500/30';
    borderClass = 'border-blue-400 border-solid';
  } else if (canDrop) {
    bgClass = 'bg-blue-500/5';
    borderClass = 'border-blue-500/30 border-dashed animate-pulse';
  } else if (isSelected) {
    bgClass = 'bg-blue-500/10 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]';
    borderClass = 'border-blue-500 border-solid ring-1 ring-blue-500';
  }

  return (
    <div 
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      onClick={onSelect}
      className={`relative border transition-all duration-200 flex items-center justify-center group
        ${allowOverflow ? 'overflow-visible z-20' : 'overflow-hidden z-10'}
        ${bgClass} ${borderClass}
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
          {/* Quick Actions only (Trash) */}
          <div className={`absolute top-1 right-1 flex transition-opacity z-50 pointer-events-auto ${isSelected || isOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
             <div className="flex bg-gray-900/90 border border-gray-700 rounded p-0.5 shadow-xl">
               <button onClick={(e) => { e.stopPropagation(); onClear(zoneId); }} className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-gray-800" title="Clear Zone">
                  <Trash2 size={12} />
               </button>
             </div>
          </div>
        </>
      ) : (
         <div className={`pointer-events-none flex flex-col items-center justify-center text-gray-600 transition-opacity ${canDrop ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-100'}`}>
            <Plus size={16} />
            <span className="text-[8px] font-mono uppercase">{label}</span>
         </div>
      )}
    </div>
  );
};
