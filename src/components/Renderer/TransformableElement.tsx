
import React, { useState, useEffect, useRef } from 'react';
import { BoxTransform } from '../../types';
import { Move } from 'lucide-react';

interface Props {
  field: string;
  transform: BoxTransform;
  baseWidth: number;
  baseHeight: number;
  scale: number;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (field: string, t: BoxTransform) => void;
  children: React.ReactNode;
}

export const TransformableElement: React.FC<Props> = ({ 
  field, transform, baseWidth, baseHeight, scale, isActive, onActivate, onUpdate, children 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState<{ type: 'move' | 'resize'; handle?: string; startX: number; startY: number; startT: BoxTransform } | null>(null);
  const [liveTransform, setLiveTransform] = useState<BoxTransform | null>(null);

  // Use refs for stable callbacks in event listeners
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize', handle?: string) => {
    e.stopPropagation();
    e.preventDefault(); 
    onActivate();
    
    setIsDragging(true);
    setDragInfo({
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startT: { ...transform }
    });
    setLiveTransform({ ...transform });
  };

  useEffect(() => {
    if (!dragInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      if (scale === 0) return;

      const dx = (e.clientX - dragInfo.startX) / (baseWidth * scale) * 100;
      const dy = (e.clientY - dragInfo.startY) / (baseHeight * scale) * 100;

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

      newT.w = Math.max(5, newT.w);
      newT.h = Math.max(5, newT.h);
      
      setLiveTransform(newT);
    };

    const handleMouseUp = () => {
      setLiveTransform(current => {
          if (current) {
              onUpdateRef.current(field, current);
          }
          return null; 
      });
      setIsDragging(false);
      setDragInfo(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, baseWidth, baseHeight, scale, field]);

  const t = (isDragging && liveTransform) ? liveTransform : transform;

  return (
    <div 
      className={`absolute transition-all ${isActive ? 'ring-2 ring-blue-500 bg-blue-500/5' : 'group/field hover:ring-1 hover:ring-blue-400/50'} ${isDragging ? 'z-[100] cursor-grabbing shadow-2xl' : 'z-50'}`}
      style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%`, boxSizing: 'border-box' }}
      onClick={(e) => { e.stopPropagation(); onActivate(); }}
    >
      {/* Handles */}
      {isActive && (
        <>
          <div onMouseDown={(e) => handleMouseDown(e, 'move')} className="absolute -top-6 left-0 right-0 h-6 bg-blue-600 rounded-t-md flex items-center justify-center gap-2 cursor-move shadow-sm z-[60] group/handle select-none"><Move size={12} className="text-white" /><span className="text-[9px] font-bold text-white uppercase tracking-wider">{field.replace('_', ' ')}</span></div>
          <div onMouseDown={(e) => handleMouseDown(e, 'resize', 'nw')} className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
          <div onMouseDown={(e) => handleMouseDown(e, 'resize', 'ne')} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
          <div onMouseDown={(e) => handleMouseDown(e, 'resize', 'sw')} className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
          <div onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')} className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize z-[60] shadow-sm hover:scale-110 transition-transform" />
        </>
      )}
      
      {children}
    </div>
  );
};
