
import React from 'react';
import { useDrag } from 'react-dnd';
import { Asset } from '../../../types';
import { CheckCircle2 } from 'lucide-react';

const ITEM_TYPE_ASSET = 'ASSET';

interface Props {
  asset: Asset;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const DraggableAsset: React.FC<Props> = ({ asset, isSelected, onSelect }) => {
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
      onClick={onSelect}
      className={`
        relative aspect-square rounded overflow-hidden cursor-grab active:cursor-grabbing border bg-gray-900 group transition-all
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-xl scale-95' : 'border-gray-700 hover:border-gray-500'}
      `}
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
      {isSelected && (
         <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center backdrop-blur-[1px]">
            <CheckCircle2 className="text-white drop-shadow-md" size={24} />
         </div>
      )}
    </div>
  );
};
