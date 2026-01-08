
import React from 'react';
import { GradientConfig, GradientType } from '../../types';

export const GradientMesh: React.FC<{ config: GradientConfig; width: number; height: number }> = ({ config, width, height }) => {
  if (config.type === GradientType.Solid) {
     return <div className="absolute inset-0" style={{ backgroundColor: config.colors[0] }} />;
  }

  if (config.type === GradientType.Mesh) {
    return (
      <svg width={width} height={height} className="absolute inset-0" style={{ mixBlendMode: 'normal' }} preserveAspectRatio="none">
        <defs>
          {/* Blur filter for smooth blending */}
          <filter id="mesh-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={60} />
          </filter>
          
          {/* Generate radial gradients for each color point */}
          {config.colors.map((color, i) => {
            const total = config.colors.length;
            // Distribute points in a rough circle/spiral
            const angle = (i / total) * Math.PI * 2;
            const radius = 0.35; // Distance from center
            // Convert to percentages 0-100
            const cx = 50 + Math.cos(angle) * radius * 100;
            const cy = 50 + Math.sin(angle) * radius * 100;
            
            return (
              <radialGradient key={i} id={`mesh-grad-${i}`} cx={`${cx}%`} cy={`${cy}%`} r="60%">
                <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>
        
        {/* Base layer (first color) */}
        <rect width="100%" height="100%" fill={config.colors[0]} />

        {/* Overlay gradient blobs */}
        {config.colors.map((_, i) => (
          <rect 
            key={i}
            width="100%" 
            height="100%"
            fill={`url(#mesh-grad-${i})`}
            filter="url(#mesh-blur)"
            style={{ mixBlendMode: 'overlay' }}
          />
        ))}
      </svg>
    );
  }
  
  // Fallback to CSS gradients
  const gradient = config.type === GradientType.Linear
    ? `linear-gradient(${config.angle || 135}deg, ${config.colors.join(', ')})`
    : `radial-gradient(circle at center, ${config.colors.join(', ')})`;
    
  return <div className="absolute inset-0" style={{ background: gradient }} />;
};
