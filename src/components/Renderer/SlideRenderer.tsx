
import React from 'react';
import { Slide, Asset, Branding } from '../../types';
import { SlideSurface } from './SlideSurface';

interface Props {
  slide: Slide;
  assets: Asset[];
  branding: Branding;
  className?: string;
  polish?: { noise: boolean; vignette: boolean; };
}

/**
 * SlideRenderer (Legacy Wrapper)
 * Now delegates all core logic to SlideSurface to ensure parity across stages.
 */
export const SlideRenderer: React.FC<Props> = (props) => {
  return (
    <div className={props.className}>
      <SlideSurface {...props} mode="preview" />
    </div>
  );
};
