
import React, { useMemo } from 'react';
import { Asset, ShapeType } from '../../types';
import { generateWavePath, generateBlobPath, generateDiagonalPath, generateArcPath } from '../../services/shapeService';

interface Props {
  asset: Asset;
  peekAsset: Asset | null;
  shapeMask: {
    type: ShapeType;
    color?: string;
    opacity?: number;
    flip?: boolean;
    intensity?: number;
  };
  width: number;
  height: number;
}

export const ShapeMaskLayer: React.FC<Props> = ({ asset, peekAsset, shapeMask, width, height }) => {
  const clipPath = useMemo(() => {
    const intensity = shapeMask.intensity ?? 50;
    const flip = shapeMask.flip ?? false;
    
    switch (shapeMask.type) {
      case ShapeType.Wave:
        return generateWavePath(width, height, {
          frequency: 2,
          amplitude: intensity,
          offset: 25,
          flip
        });
      case ShapeType.Blob:
        return generateBlobPath(width, height, intensity);
      case ShapeType.Diagonal:
        return generateDiagonalPath(width, height, flip);
      case ShapeType.Arc:
        return generateArcPath(width, height, flip);
      default:
        return '';
    }
  }, [shapeMask.type, shapeMask.intensity, shapeMask.flip, width, height]);
  
  const maskId = `shape-mask-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="absolute inset-0 z-5 pointer-events-none">
      <svg width={width} height={height} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        <defs>
          <clipPath id={maskId}>
            <path d={clipPath} />
          </clipPath>
        </defs>
      </svg>
      
      {/* Background image clipped by shape */}
      <div 
        className="absolute inset-0"
        style={{ clipPath: `url(#${maskId})` }}
      >
        <img 
          src={asset.uri}
          className="w-full h-full object-cover"
          alt="shaped background"
        />
        
        {/* Optional solid color overlay */}
        {shapeMask.color && (
          <div 
            className="absolute inset-0 mix-blend-multiply"
            style={{ 
              backgroundColor: shapeMask.color,
              opacity: shapeMask.opacity ?? 0.5
            }}
          />
        )}
      </div>
    </div>
  );
};
