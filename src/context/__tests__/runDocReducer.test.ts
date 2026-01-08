
import { describe, it, expect } from 'vitest';
import { runDocReducer } from '../runDocReducer';
import { INITIAL_RUN_DOC } from '../../constants';
import { RunDoc, Slide, Action, TextLayout } from '../../types';

// Helper to create a basic state with one slide
const createStateWithSlide = (): RunDoc => {
  const slide: Slide = {
    slide_id: 's1',
    active_variant_id: 'v1',
    variants: [{
      variant_id: 'v1',
      label: 'Default',
      zones: {
        background: { asset_id: '' },
        c: { asset_id: '' }
      },
      text_layout: TextLayout.HeadlineBody,
      text_content: { headline: 'Initial' },
      text_bold: {},
      text_italic: {}
    }],
    status: { layout: 'open', copy: 'open' }
  };

  return {
    ...INITIAL_RUN_DOC,
    slides: [slide],
    // Ensure history stacks are initialized
    undoStack: [],
    redoStack: []
  };
};

describe('runDocReducer', () => {
  
  it('should update text content correctly', () => {
    const initialState = createStateWithSlide();
    const action: Action = {
      type: 'UPDATE_TEXT_CONTENT',
      payload: {
        slideId: 's1',
        variantId: 'v1',
        field: 'headline',
        value: 'Updated Headline'
      }
    };

    const newState = runDocReducer(initialState, action);
    const variant = newState.slides[0].variants[0];
    
    expect(variant.text_content.headline).toBe('Updated Headline');
    // Ensure mutation didn't happen in place
    expect(initialState.slides[0].variants[0].text_content.headline).toBe('Initial');
  });

  it('should update nested zone configuration', () => {
    const initialState = createStateWithSlide();
    const action: Action = {
      type: 'UPDATE_ZONE',
      payload: {
        slideId: 's1',
        variantId: 'v1',
        zoneId: 'c',
        assetId: 'asset_123'
      }
    };

    const newState = runDocReducer(initialState, action);
    const zone = newState.slides[0].variants[0].zones['c'];
    
    expect(zone.asset_id).toBe('asset_123');
  });

  it('should handle UNDO correctly', () => {
    const initialState = createStateWithSlide();
    
    // 1. Perform an action
    const action1: Action = {
      type: 'UPDATE_TEXT_CONTENT',
      payload: { slideId: 's1', variantId: 'v1', field: 'headline', value: 'Step 1' }
    };
    const state1 = runDocReducer(initialState, action1);
    
    // 2. Perform another action
    const action2: Action = {
      type: 'UPDATE_TEXT_CONTENT',
      payload: { slideId: 's1', variantId: 'v1', field: 'headline', value: 'Step 2' }
    };
    const state2 = runDocReducer(state1, action2);

    expect(state2.slides[0].variants[0].text_content.headline).toBe('Step 2');
    expect(state2.undoStack.length).toBeGreaterThan(0);

    // 3. UNDO
    const undoAction: Action = { type: 'UNDO' };
    const state3 = runDocReducer(state2, undoAction);

    expect(state3.slides[0].variants[0].text_content.headline).toBe('Step 1');
    expect(state3.redoStack.length).toBe(1);
  });

  it('should handle REDO correctly', () => {
    const initialState = createStateWithSlide();
    
    // Move forward
    const state1 = runDocReducer(initialState, {
      type: 'UPDATE_TEXT_CONTENT',
      payload: { slideId: 's1', variantId: 'v1', field: 'headline', value: 'Forward' }
    });

    // Undo
    const state2 = runDocReducer(state1, { type: 'UNDO' });
    expect(state2.slides[0].variants[0].text_content.headline).toBe('Initial');

    // Redo
    const state3 = runDocReducer(state2, { type: 'REDO' });
    expect(state3.slides[0].variants[0].text_content.headline).toBe('Forward');
  });

  it('should handle BATCH_ACTIONS atomically', () => {
    const initialState = createStateWithSlide();
    const batch: Action = {
        type: 'BATCH_ACTIONS',
        payload: [
            { type: 'UPDATE_TEXT_CONTENT', payload: { slideId: 's1', variantId: 'v1', field: 'headline', value: 'Batch Head' } },
            { type: 'UPDATE_ZONE', payload: { slideId: 's1', variantId: 'v1', zoneId: 'c', assetId: 'batch_asset' } }
        ]
    };

    const newState = runDocReducer(initialState, batch);
    const v = newState.slides[0].variants[0];

    expect(v.text_content.headline).toBe('Batch Head');
    expect(v.zones.c.asset_id).toBe('batch_asset');
    
    // Batch should only add ONE entry to history
    // (Initial state has 0, creating new state pushes initial to undo)
    expect(newState.undoStack.length).toBe(1);
  });

});
