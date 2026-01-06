
import { TextLayout } from '../types';

/**
 * Calculates a responsive Tailwind text-size class based on the length of the text
 * and the specific layout/field context.
 * 
 * @param layout The current slide text layout
 * @param field The field name (e.g., 'headline', 'body')
 * @param length The character count of the content
 */
export const getAdaptiveFontSize = (layout: TextLayout, field: string, length: number): string => {
  if (length === 0) return '';

  switch (layout) {
    case TextLayout.HeadlineBody:
      if (field === 'headline') {
        if (length < 30) return 'text-6xl';
        if (length < 60) return 'text-5xl';
        if (length < 100) return 'text-4xl';
        return 'text-3xl';
      }
      if (field === 'body') {
        if (length < 150) return 'text-2xl';
        if (length < 300) return 'text-xl';
        if (length < 500) return 'text-lg';
        return 'text-base';
      }
      break;

    case TextLayout.TwoColumn:
      if (field === 'headline') {
        if (length < 40) return 'text-5xl';
        if (length < 80) return 'text-4xl';
        return 'text-3xl';
      }
      if (field.startsWith('column')) {
        if (length < 100) return 'text-xl';
        if (length < 250) return 'text-lg';
        return 'text-sm';
      }
      break;

    case TextLayout.BulletsOnly:
      if (field === 'headline') {
        return 'text-4xl';
      }
      if (field === 'bullets') {
        // Bullet lists usually need breathing room
        if (length < 100) return 'text-3xl leading-loose';
        if (length < 300) return 'text-2xl leading-relaxed';
        return 'text-xl leading-normal';
      }
      break;

    case TextLayout.Quote:
      if (field === 'quote') {
        if (length < 50) return 'text-6xl';
        if (length < 100) return 'text-5xl';
        if (length < 200) return 'text-4xl';
        return 'text-3xl';
      }
      if (field === 'author') {
        return 'text-xl';
      }
      break;

    case TextLayout.ImageCaption:
      if (field === 'headline') {
        if (length < 30) return 'text-4xl';
        return 'text-3xl';
      }
      if (field === 'caption') {
        if (length < 100) return 'text-lg';
        return 'text-sm';
      }
      break;
  }

  // Default fallback
  return 'text-base';
};
