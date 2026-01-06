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
}

const SHARED_TEXT_STYLE: React.CSSProperties = {
  lineHeight: 1.2,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  padding: '1rem', // Virtual padding inside the box
  display: 'flex',
  flexDirection: 'column',
};

export const useAutoFit = (text: string, maxSize: number, minSize: number = 10, onMeasured?: (size: number) => void) => {
  const [fontSize, setFontSize] = useState(maxSize);
  const containerRef = useRef<HTMLDivElement | HTMLTextAreaElement>(null);

  const calculate = useCallback(() => {
    const el = containerRef.current;
    if (!el || !text) return;
    
    let current = maxSize;
    while (current > minSize) {
      el.style.fontSize = `${current}px`;
      if (el.scrollHeight <= el.clientHeight) break;
      current -= 2;
    }
    const finalSize = Math.max(current, minSize);
    setFontSize(finalSize);
    if (onMeasured) onMeasured(finalSize);
  }, [text, maxSize, minSize, onMeasured]);

  useEffect(() => {
    calculate();
    if (document.fonts) document.fonts.ready.then(calculate);
  }, [calculate]);

  return { fontSize, containerRef };
};

export const AutoFitReadOnly: React.FC<AutoFitProps> = ({ 
  text, fontFamily, color, textAlign, verticalAlign, maxSize, minSize, bold, italic, className, onMeasured 
}) => {
  const { fontSize, containerRef } = useAutoFit(text, maxSize, minSize, onMeasured);
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
        fontStyle: italic ? 'italic' : 'normal'
      }}
    >
      <span>{text}</span>
    </div>
  );
};

export const AutoFitEditable: React.FC<AutoFitProps & { onChange: (val: string) => void }> = ({ 
  text, onChange, fontFamily, color, textAlign, verticalAlign, maxSize, minSize, bold, italic, onMeasured 
}) => {
  const { fontSize, containerRef } = useAutoFit(text, maxSize, minSize, onMeasured);
  
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
        // We simulate the vertical alignment for the textarea
        paddingTop: verticalAlign === 'top' ? '1rem' : verticalAlign === 'bottom' ? 'auto' : '0',
        display: 'flex',
        alignItems: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center',
      }} 
    />
  );
};