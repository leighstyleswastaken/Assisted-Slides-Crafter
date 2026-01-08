
import { RunDoc, Action, ShapeType, Slide } from '../../types';

export const slideReducer = (state: RunDoc, action: Action): RunDoc => {
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

    case 'UPDATE_SHAPE_MASK': {
      const { slideId, variantId, mask, peekAssetId } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              const currentBg = variant.zones.background || { asset_id: '' };
              const currentMask = currentBg.shape_mask || { type: ShapeType.None, intensity: 50, flip: false, color: '', opacity: 0 };
              
              return {
                ...variant,
                zones: {
                  ...variant.zones,
                  background: {
                    ...currentBg,
                    shape_mask: { ...currentMask, ...mask },
                    ...(peekAssetId !== undefined ? { peek_asset_id: peekAssetId } : {})
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
                text_alignment: { ...(variant.text_alignment || {}), [field]: alignment }
              };
            })
          };
        })
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
        })
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
        })
      };
    }

    case 'TOGGLE_TEXT_BOLD': {
      const { slideId, variantId, field } = action.payload;
      return {
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
        })
      };
    }

    case 'TOGGLE_TEXT_ITALIC': {
      const { slideId, variantId, field } = action.payload;
      return {
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
        })
      };
    }

    case 'UPDATE_BACKGROUND_GRADIENT': {
      const { slideId, variantId, gradient } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              const currentBg = variant.zones.background || { asset_id: '' };
              return {
                ...variant,
                zones: {
                  ...variant.zones,
                  background: {
                    ...currentBg,
                    gradient
                  }
                }
              };
            })
          };
        })
      };
    }

    case 'TOGGLE_TEXT_GLASS': {
      const { slideId, variantId, enabled } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              return { ...variant, text_glass: enabled };
            })
          };
        })
      };
    }

    case 'UPDATE_ZONE_EFFECT': {
      const { slideId, variantId, zoneId, effect } = action.payload;
      return {
        ...state,
        slides: state.slides.map(slide => {
          if (slide.slide_id !== slideId) return slide;
          return {
            ...slide,
            variants: slide.variants.map(variant => {
              if (variant.variant_id !== variantId) return variant;
              const currentZone = variant.zones[zoneId];
              return {
                ...variant,
                zones: {
                  ...variant.zones,
                  [zoneId]: {
                    ...currentZone,
                    image_effect: { ...(currentZone.image_effect || {}), ...effect }
                  }
                }
              };
            })
          };
        })
      };
    }

    case 'REPLACE_ZONES': {
      const { slideId, variantId, zones } = action.payload;
      return {
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
        })
      };
    }

    case 'APPLY_ZONE_TO_INNER': {
      const { zoneId, assetId, alignment } = action.payload;
      return {
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
        }))
      };
    }

    case 'APPLY_LAYOUT_STRATEGY':
      return {
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
        })
      };

    case 'UPDATE_TEXT_LAYOUT':
      return {
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
        })
      };

    default:
      return state;
  }
};
