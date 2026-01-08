
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TextAlign, VerticalAlign } from '../../types';

interface AutoFitProps {
  text: string;
  fontFamily: string;
  color: string;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  maxSize: number;
  minSize?: number;
  bold?: boolean;
  italic?: boolean;
  className?: string;
  onMeasured?: (size: number) => void;
  initialFontSize?: number;
}

const SHARED_TEXT_STYLE: React.CSSProperties = {
  lineHeight: 1.2,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  padding: '1rem', // Virtual padding inside the box
  display: 'flex',
  flexDirection: 'column',
};

export const useAutoFit = (
    text: string, 
    maxSize: number, 
    minSize: number = 10, 
    onMeasured?: (size: number) => void,
    initialFontSize?: number
) => {
  // MEMORY: If we have a stored size, use it immediately. 
  // We skip the bounds check here to ensure we trust the memory first, preventing the "reset" to maxSize.
  const [fontSize, setFontSize] = useState(() => {
      return (initialFontSize && initialFontSize > 0) ? initialFontSize : maxSize;
  });

  // SHYNESS LOGIC: 
  // If we have a memory (initialFontSize), we are READY immediately. No blur, no flash.
  // If we don't (new text), we start unready to allow the smooth blur-in.
  const [isReady, setIsReady] = useState(() => !!(initialFontSize && initialFontSize > 0));

  const containerRef = useRef<HTMLDivElement | HTMLTextAreaElement>(null);
  const lastReportedSize = useRef<number>(initialFontSize || maxSize);

  const calculate = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // If text is empty, we can just be ready
    if (!text) {
        setIsReady(true);
        return;
    }
    
    // If we already have a memory, start checking FROM that size to save cycles and prevent jumps.
    // Otherwise start from maxSize.
    let current = fontSize; 
    
    // Heuristic: If overflowing at current memory, we need to shrink. 
    // If lots of space, we might grow (but usually we start at maxSize for fresh calcs).
    // To be safe and deterministic, if we are NOT ready, we scan from Top Down.
    // If we ARE ready (memory), we just verify.
    if (!isReady) {
        current = maxSize;
    }

    let iterations = 0;
    const MAX_ITERATIONS = 100;

    // Standard Binary-like decrement
    // If we have memory, this loop usually runs 0 or 1 times just to verify fit.
    while (current > minSize && iterations < MAX_ITERATIONS) {
      el.style.fontSize = `${current}px`;
      if (el.scrollHeight <= el.clientHeight) break;
      current -= 2;
      iterations++;
    }
    
    const finalSize = Math.max(current, minSize);
    
    setFontSize(prev => {
        if (prev !== finalSize) return finalSize;
        return prev;
    });

    if (onMeasured && Math.abs(lastReportedSize.current - finalSize) > 0.5) {
        lastReportedSize.current = finalSize;
        onMeasured(finalSize);
    }

    setIsReady(true);
  }, [text, maxSize, minSize, onMeasured, isReady, fontSize]);

  useEffect(() => {
    // We run calculate on mount. 
    // If we had memory, isReady is ALREADY true, so the user sees the text instantly.
    // Calculate runs in the background to ensure it still fits (e.g. if container changed).
    calculate();
    
    if (document.fonts) {
        document.fonts.ready.then(calculate);
    }

    // NEW: Listen for window resize to recalculate fit
    const handleResize = () => calculate();
    window.addEventListener('resize', handleResize);
    
    return () => {
        window.removeEventListener('resize', handleResize);
    };
  }, [calculate]);

  return { fontSize, containerRef, isReady };
};

export const AutoFitReadOnly: React.FC<AutoFitProps> = ({ 
  text, fontFamily, color, textAlign, verticalAlign, maxSize, minSize, bold, italic, className, onMeasured, initialFontSize
}) => {
  const { fontSize, containerRef, isReady } = useAutoFit(text, maxSize, minSize, onMeasured, initialFontSize);
  const justifyContent = verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center';

  return (
    <div 
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`w-full h-full ${className}`}
      style={{ 
        ...SHARED_TEXT_STYLE,
        fontFamily, 
        color, 
        textAlign, 
        justifyContent,
        fontSize: `${fontSize}px`,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        // Logic: If ready from start (Memory), opacity 1. If loading (New), opacity 0 -> 1.
        opacity: isReady ? 1 : 0,
        filter: isReady ? 'blur(0px)' : 'blur(4px)',
        transform: isReady ? 'scale(1)' : 'scale(0.98)', 
        transition: 'opacity 0.25s ease-out, filter 0.25s ease-out, transform 0.25s ease-out'
      }}
    >
      <span>{text}</span>
    </div>
  );
};

export const AutoFitEditable: React.FC<AutoFitProps & { onChange: (val: string) => void }> = ({ 
  text, onChange, fontFamily, color, textAlign, verticalAlign, maxSize, minSize, bold, italic, onMeasured, initialFontSize
}) => {
  const { fontSize, containerRef, isReady } = useAutoFit(text, maxSize, minSize, onMeasured, initialFontSize);
  
  return (
    <textarea 
      ref={containerRef as React.RefObject<HTMLTextAreaElement>}
      autoFocus 
      value={text} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full h-full bg-transparent resize-none outline-none focus:bg-white/5 rounded transition-colors overflow-hidden" 
      style={{ 
        ...SHARED_TEXT_STYLE,
        fontFamily, 
        color, 
        textAlign, 
        fontSize: `${fontSize}px`,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        paddingTop: verticalAlign === 'top' ? '1rem' : verticalAlign === 'bottom' ? 'auto' : '0',
        display: 'flex',
        alignItems: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center',
        opacity: isReady ? 1 : 0,
        filter: isReady ? 'blur(0px)' : 'blur(4px)',
        transition: 'opacity 0.25s ease-out, filter 0.25s ease-out'
      }} 
    />
  );
};
