
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', style }) => {
  return (
    <div 
      className={`relative backdrop-blur-md bg-white/10 border border-white/20 shadow-lg rounded-xl overflow-hidden ${className}`}
      style={{
        ...style,
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)', // Safari
      }}
    >
      {children}
    </div>
  );
};
