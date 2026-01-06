import { RunDoc, Stage, StageStatus } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateRunDoc = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (!data) {
    return { valid: false, errors: ['Data is null or undefined'] };
  }

  // 1. Core Metadata
  if (data.version !== 2) errors.push(`Expected version 2, got ${data.version}`);
  if (typeof data.project_id !== 'string') errors.push('Missing project_id');
  
  // 2. Stage Enums
  // TypeScript numeric enums include both forward and reverse mappings. 
  // We check if it exists as a value (which covers the numbers).
  if (!Object.values(Stage).includes(data.stage)) {
    errors.push(`Invalid stage: ${data.stage}`);
  }

  // 3. Stage Status
  if (!data.stage_status) {
    errors.push('Missing stage_status');
  } else {
    // Check required keys 1-5
    [1, 2, 3, 4, 5].forEach(s => {
      const status = data.stage_status[s];
      // String enums in TS compile to objects where values are the strings.
      if (!Object.values(StageStatus).includes(status)) {
        errors.push(`Invalid status for stage ${s}: ${status}`);
      }
    });
  }

  // 4. Branding
  if (!data.branding) {
    errors.push('Missing branding');
  } else {
    if (!Array.isArray(data.branding.palette)) errors.push('Branding palette must be an array');
    if (!Array.isArray(data.branding.fonts)) errors.push('Branding fonts must be an array');
    if (typeof data.branding.tone !== 'string') errors.push('Branding tone must be a string');
  }

  // 5. Arrays
  if (!Array.isArray(data.outline)) errors.push('Outline must be an array');
  if (!Array.isArray(data.asset_library)) errors.push('Asset library must be an array');
  if (!Array.isArray(data.slides)) errors.push('Slides must be an array');

  // 6. Slide Integrity
  if (Array.isArray(data.slides)) {
    data.slides.forEach((slide: any, i: number) => {
      if (!slide.slide_id) errors.push(`Slide ${i} missing slide_id`);
      if (!Array.isArray(slide.variants)) errors.push(`Slide ${i} missing variants array`);
      
      if (Array.isArray(slide.variants)) {
        slide.variants.forEach((v: any, vi: number) => {
           if (!v.variant_id) errors.push(`Slide ${i} Variant ${vi} missing variant_id`);
           if (!v.zones) errors.push(`Slide ${i} Variant ${vi} missing zones object`);
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
