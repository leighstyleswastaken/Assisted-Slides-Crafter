
// ... (existing imports and pushToHistory helper)
import { RunDoc, Action, Stage, StageStatus, Slide, SlideVariant, TextLayout } from '../types';
import { INITIAL_RUN_DOC } from '../constants';

const pushToHistory = (state: RunDoc): RunDoc => {
  const { undoStack, ...cleanState } = state;
  const newUndoStack = [state, ...(undoStack || [])].slice(0, 50);
  return { ...state, undoStack: newUndoStack, redoStack: [] };
};

// Internal reducer for processing single actions without history side-effects
const innerReducer = (state: RunDoc, action: Action): RunDoc => {
  switch (action.type) {
    case 'UPDATE_TEXT_CONTENT':
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== action.payload.slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== action.payload.variantId) return variant;
              return {
                ...variant,
                text_content: { ...variant.text_content, [action.payload.field]: action.payload.value }
              };
            })
          };
        })
      };

    case 'UPDATE_ZONE': {
      const { slideId, variantId, zoneId, assetId } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return {
                ...variant,
                zones: {
                  ...variant.zones,
                  [zoneId]: { ...variant.zones[zoneId], asset_id: assetId }
                }
              };
            })
          };
        })
      };
    }

    case 'UPDATE_ZONE_STYLE': {
      const { slideId, variantId, zoneId, alignment, scale, fit, allow_overflow } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return {
                ...variant,
                zones: {
                  ...variant.zones,
                  [zoneId]: { 
                    ...variant.zones[zoneId], 
                    ...(alignment && { alignment }), 
                    ...(scale !== undefined && { scale }), 
                    ...(fit && { content_fit: fit }),
                    ...(allow_overflow !== undefined && { allow_overflow })
                  }
                }
              };
            })
          };
        })
      };
    }

    case 'UPDATE_TEXT_TRANSFORM': {
      const { slideId, variantId, field, transform } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return {
                ...variant,
                text_transform: {
                  ...variant.text_transform,
                  [field]: transform
                }
              };
            })
          };
        })
      };
    }

    case 'UPDATE_TEXT_FONT_SIZE': {
      const { slideId, variantId, field, size } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return {
                ...variant,
                text_font_size: {
                  ...variant.text_font_size,
                  [field]: size
                }
              };
            })
          };
        })
      };
    }

    default:
      return state;
  }
};

export const runDocReducer = (state: RunDoc, action: Action): RunDoc => {
  const lastModified = new Date().toISOString();

  // Handle BATCH_ACTIONS explicitly to bundle history
  if (action.type === 'BATCH_ACTIONS') {
    let newState = { ...state };
    // Process all sub-actions on the temp state
    action.payload.forEach(subAction => {
      newState = innerReducer(newState, subAction);
    });
    
    // Only push to history once, after all transformations
    return pushToHistory({
      ...newState,
      last_modified: lastModified
    });
  }

  // Handle individual actions that map to innerReducer (but need history)
  if (['UPDATE_TEXT_CONTENT', 'UPDATE_ZONE', 'UPDATE_ZONE_STYLE', 'UPDATE_TEXT_TRANSFORM', 'UPDATE_TEXT_FONT_SIZE'].includes(action.type)) {
    const newState = innerReducer(state, action);
    return pushToHistory({
      ...newState,
      last_modified: lastModified
    });
  }

  // Handle non-history-wrapped styling updates (if any - e.g. alignment updates were previously not pushing history in some cases, but for consistency let's look at the original file)
  // Original file had some inconsistent history pushing. We will maintain the explicit cases below for things NOT in the "batchable" list above, or handle the rest.

  switch (action.type) {
    case 'REHYDRATE':
      return { ...action.payload, last_modified: lastModified };

    case 'SET_STAGE':
      return { ...state, stage: action.payload };

    case 'APPROVE_STAGE': {
      const stage = action.payload;
      const nextStage = stage < 5 ? (stage + 1 as Stage) : stage;
      
      const updatedStatus = { 
        ...state.stage_status, 
        [stage]: StageStatus.Approved 
      };

      if (nextStage !== stage && state.stage_status[nextStage] === StageStatus.Locked) {
         updatedStatus[nextStage] = StageStatus.Open;
      }

      return {
        ...state,
        stage: nextStage,
        stage_status: updatedStatus,
        last_modified: lastModified
      };
    }

    case 'APPROVE_PROJECT': {
      const allApproved = {
        1: StageStatus.Approved,
        2: StageStatus.Approved,
        3: StageStatus.Approved,
        4: StageStatus.Approved,
        5: StageStatus.Approved,
      };
      
      return {
        ...state,
        stage_status: allApproved,
        stage: Stage.Publisher, 
        last_modified: lastModified
      };
    }

    case 'UNLOCK_STAGE':
      return {
        ...state,
        stage_status: {
          ...state.stage_status,
          [action.payload]: StageStatus.Open
        },
        last_modified: lastModified
      };

    case 'UPDATE_SOURCE':
      return pushToHistory({
        ...state,
        source_material: action.payload,
        revisions: { ...state.revisions, source: state.revisions.source + 1 },
        last_modified: lastModified
      });

    case 'UPDATE_BRANDING':
      return pushToHistory({
        ...state,
        branding: action.payload,
        revisions: { ...state.revisions, branding: state.revisions.branding + 1 },
        last_modified: lastModified
      });

    case 'UPDATE_PRESENTATION_TYPE':
      return pushToHistory({
        ...state,
        presentation_type: action.payload,
        last_modified: lastModified
      });

    case 'UPDATE_OUTLINE': {
      const currentSlideIds = new Set(state.slides.map(s => s.slide_id));
      const newSlides: Slide[] = action.payload.map(item => {
        if (currentSlideIds.has(item.slide_id)) {
          return state.slides.find(s => s.slide_id === item.slide_id)!;
        }
        return {
          slide_id: item.slide_id,
          active_variant_id: 'v1',
          variants: [
            {
              variant_id: 'v1',
              label: 'Default Variant',
              zones: { background: { asset_id: '' } },
              text_layout: item.suggest_text_layout || TextLayout.HeadlineBody,
              text_content: { headline: item.title, body: item.intent },
              text_bold: { headline: true }, 
              text_italic: {}
            }
          ],
          status: { layout: 'draft', copy: 'draft' }
        };
      });

      return pushToHistory({
        ...state,
        outline: action.payload,
        slides: newSlides,
        revisions: { ...state.revisions, outline: state.revisions.outline + 1 },
        last_modified: lastModified
      });
    }

    case 'ADD_ASSETS':
      return {
        ...state,
        asset_library: [...state.asset_library, ...action.payload],
        last_modified: lastModified
      };

    case 'UPDATE_ASSET':
      return {
        ...state,
        asset_library: state.asset_library.map(a => 
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
        last_modified: lastModified
      };

    case 'DELETE_ASSET':
      return {
        ...state,
        asset_library: state.asset_library.filter(a => a.id !== action.payload),
        last_modified: lastModified
      };

    case 'TOGGLE_ASSET_KEEP':
      return {
        ...state,
        asset_library: state.asset_library.map(a => 
          a.id === action.payload ? { ...a, keep: !a.keep } : a
        ),
        last_modified: lastModified
      };

    case 'KEEP_ALL_ASSETS':
      return {
        ...state,
        asset_library: state.asset_library.map(a => ({ ...a, keep: true })),
        last_modified: lastModified
      };

    case 'PRUNE_UNKEPT_ASSETS':
      return {
        ...state,
        asset_library: state.asset_library.filter(a => a.keep),
        last_modified: lastModified
      };

    // Note: UPDATE_ZONE and UPDATE_ZONE_STYLE are handled by innerReducer/batch logic above if called individually or in batch.
    
    case 'REPLACE_ZONES': {
      const { slideId, variantId, zones } = action.payload;
      return pushToHistory({
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return { ...variant, zones };
            })
          };
        }),
        last_modified: lastModified
      });
    }

    case 'APPLY_ZONE_TO_INNER': {
      const { zoneId, assetId, alignment } = action.payload;
      return pushToHistory({
        ...state,
        slides: state.slides.map(slide => ({
          ...slide,
          variants: slide.variants.map(variant => ({
            ...variant,
            zones: {
              ...variant.zones,
              [zoneId]: { ...variant.zones[zoneId], asset_id: assetId, ...(alignment && { alignment }) }
            }
          }))
        })),
        last_modified: lastModified
      });
    }

    case 'APPLY_LAYOUT_STRATEGY':
      return pushToHistory({
        ...state,
        slides: state.slides.map(slide => {
          const update = action.payload.find(u => u.slideId === slide.slide_id);
          if (!update) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== update.variantId) return variant;
              return { ...variant, zones: update.zones };
            })
          };
        }),
        last_modified: lastModified
      });

    case 'UPDATE_TEXT_LAYOUT':
      return pushToHistory({
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== action.payload.slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== action.payload.variantId) return variant;
              return { ...variant, text_layout: action.payload.layout };
            })
          };
        }),
        last_modified: lastModified
      });

    // UPDATE_TEXT_CONTENT and UPDATE_TEXT_TRANSFORM handled by innerReducer logic above

    case 'UPDATE_TEXT_ALIGNMENT': {
      const { slideId, variantId, field, alignment } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return {
                ...variant,
                text_alignment: { ...variant.text_alignment, [field]: alignment }
              };
            })
          };
        }),
        last_modified: lastModified
      };
    }

    case 'UPDATE_TEXT_VERTICAL_ALIGNMENT': {
      const { slideId, variantId, field, alignment } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return {
                ...variant,
                text_vertical_alignment: { ...variant.text_vertical_alignment, [field]: alignment }
              };
            })
          };
        }),
        last_modified: lastModified
      };
    }

    case 'UPDATE_TEXT_FONT': {
      const { slideId, variantId, field, font } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return {
                ...variant,
                text_font_family: { ...variant.text_font_family, [field]: font }
              };
            })
          };
        }),
        last_modified: lastModified
      };
    }

    // UPDATE_TEXT_FONT_SIZE handled by innerReducer logic above

    case 'TOGGLE_TEXT_BOLD': {
      const { slideId, variantId, field } = action.payload;
      return pushToHistory({
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              const currentBold = variant.text_bold?.[field] || false;
              return {
                ...variant,
                text_bold: { ...variant.text_bold, [field]: !currentBold }
              };
            })
          };
        }),
        last_modified: lastModified
      });
    }

    case 'TOGGLE_TEXT_ITALIC': {
      const { slideId, variantId, field } = action.payload;
      return pushToHistory({
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              const currentItalic = variant.text_italic?.[field] || false;
              return {
                ...variant,
                text_italic: { ...variant.text_italic, [field]: !currentItalic }
              };
            })
          };
        }),
        last_modified: lastModified
      });
    }

    case 'UPDATE_PROJECT_ID':
      return { ...state, project_id: action.payload, last_modified: lastModified };

    case 'UPDATE_AI_SETTINGS':
      return { ...state, ai_settings: { ...state.ai_settings, ...action.payload }, last_modified: lastModified };

    case 'RESET_PROJECT':
      return { ...INITIAL_RUN_DOC, project_id: `proj_${Date.now()}`, last_modified: lastModified };

    case 'UNDO': {
      if (!state.undoStack || state.undoStack.length === 0) return state;
      const [previousState, ...newUndoStack] = state.undoStack;
      return {
        ...previousState,
        undoStack: newUndoStack,
        redoStack: [state, ...(state.redoStack || [])]
      };
    }

    case 'REDO': {
      if (!state.redoStack || state.redoStack.length === 0) return state;
      const [nextState, ...newRedoStack] = state.redoStack;
      return {
        ...nextState,
        undoStack: [state, ...(state.undoStack || [])],
        redoStack: newRedoStack
      };
    }

    default:
      return state;
  }
};
