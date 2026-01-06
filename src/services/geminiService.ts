
import { GoogleGenAI, Type } from "@google/genai";
import { Branding, OutlineItem, TextLayout, AssetKind, ImageConcept, Asset, ZoneId, AiSettings } from "../types";
import { Prompts } from "./prompts";
import { logApiCall } from "./usageService";

// We now pass the key in each call or use a helper that reads from env
const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '') return null;
  return new GoogleGenAI({ apiKey: key });
};

// Helper: Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- EVENTS ---
type EventListener = () => void;
const listeners: { 
  quotaExhausted: EventListener[],
  mockUsed: EventListener[]
} = {
  quotaExhausted: [],
  mockUsed: []
};

export const GeminiEvents = {
  subscribe: (event: 'quotaExhausted' | 'mockUsed', cb: EventListener) => {
    listeners[event].push(cb);
    return () => {
      listeners[event] = listeners[event].filter(l => l !== cb);
    };
  },
  emit: (event: 'quotaExhausted' | 'mockUsed') => {
    listeners[event].forEach(cb => cb());
  }
};

// --- MOCK DATA ---
const MOCK_DELAY = 1000;

/**
 * Heuristic mapping to provide relevant emojis for mock assets
 */
const getThematicEmoji = (prompt: string): string => {
  const p = prompt.toLowerCase();
  if (p.includes('rocket') || p.includes('launch') || p.includes('start')) return '🚀';
  if (p.includes('grow') || p.includes('chart') || p.includes('up')) return '📈';
  if (p.includes('team') || p.includes('people') || p.includes('human')) return '👥';
  if (p.includes('idea') || p.includes('light') || p.includes('bulb')) return '💡';
  if (p.includes('data') || p.includes('server') || p.includes('cloud')) return '☁️';
  if (p.includes('money') || p.includes('cash') || p.includes('revenue')) return '💰';
  if (p.includes('earth') || p.includes('global') || p.includes('world')) return '🌎';
  if (p.includes('shield') || p.includes('lock') || p.includes('security')) return '🛡️';
  if (p.includes('target') || p.includes('goal') || p.includes('aim')) return '🎯';
  if (p.includes('gear') || p.includes('setting') || p.includes('process')) return '⚙️';
  if (p.includes('robot') || p.includes('ai') || p.includes('chip')) return '🤖';
  if (p.includes('city') || p.includes('building')) return '🏙️';
  if (p.includes('abstract') || p.includes('art')) return '🎨';
  if (p.includes('camera') || p.includes('photo')) return '📸';
  if (p.includes('success') || p.includes('check') || p.includes('done')) return '✅';
  if (p.includes('warning') || p.includes('risk') || p.includes('alert')) return '⚠️';
  if (p.includes('network') || p.includes('connect')) return '🌐';
  if (p.includes('ship') || p.includes('logistics') || p.includes('truck')) return '🚚';
  if (p.includes('energy') || p.includes('power') || p.includes('bolt')) return '⚡';
  if (p.includes('dna') || p.includes('bio') || p.includes('science')) return '🧬';
  if (p.includes('mars') || p.includes('planet') || p.includes('dust')) return '🪐';
  if (p.includes('colony') || p.includes('base') || p.includes('habitat')) return '🏘️';
  if (p.includes('rover') || p.includes('vehicle') || p.includes('wheel')) return '🚜';
  if (p.includes('molecule') || p.includes('atom') || p.includes('oxygen')) return '⚛️';
  return '📦'; 
};

const createMockImage = (prompt: string, kind: AssetKind = AssetKind.Background): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const emoji = getThematicEmoji(prompt);

  // 1. Draw Background based on kind
  if (kind === AssetKind.Background) {
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    // "Project Red Dust" Theme: Deep Mars Atmosphere
    gradient.addColorStop(0, '#1a0505'); // Deep Dark Red/Black
    gradient.addColorStop(1, '#7c2d12'); // Martian Soil Brown/Red
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Abstract minimal circle accent (Sun/Planet)
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ef4444'; // Bright Red Accent
    ctx.beginPath();
    ctx.arc(800, 200, 300, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

  } else if (kind === AssetKind.Stamp) {
    // STAMPS: Critical for background removal parity
    // Use PURE WHITE background for mock stamps to ensure Color Key Fallback works.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 1024);
    
    ctx.font = '650px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(emoji, 512, 512);

  } else {
    // Textures: Subtle clean grid (Dark Warm Theme)
    ctx.fillStyle = '#0c0a09'; // Warm Black
    ctx.fillRect(0, 0, 1024, 1024);
    
    ctx.strokeStyle = '#290e0e'; // Dark Red Grid
    ctx.lineWidth = 2;
    for(let i=0; i<1024; i+=128) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }
  }

  // Label for developer transparency
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 950, 1024, 74);
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`MOCK ${kind.toUpperCase()} INTERCEPT: ${emoji}`, 512, 995);

  return canvas.toDataURL('image/png');
};

const mockBranding = (): Branding => ({
  tone: "Technological, Adventurous, Martian",
  palette: ["#ef4444", "#7c2d12", "#0c0a09"],
  text_color: "#ffffff",
  background_color: "#0c0a09",
  fonts: ["Orbitron", "Inter"],
  style_notes: "Cinematic red dust atmospheres with clean tech white overlays.",
  keywords: ["Mars", "Future", "Success"],
  visual_features: ["Basalt base", "Solar panels", "Dust storms"]
});

const mockOutline = (): OutlineItem[] => [
  { slide_id: "m1", title: "Project Red Dust", intent: "Visionary Introduction", suggest_text_layout: TextLayout.HeadlineBody },
  { slide_id: "m2", title: "Atmospheric Harvest", intent: "Oxygen Generation Tech", suggest_text_layout: TextLayout.TwoColumn },
  { slide_id: "m3", title: "Mission Critical", intent: "Final Call to Action", suggest_text_layout: TextLayout.HeadlineBody }
];

const mockConcepts = (outline: OutlineItem[]): ImageConcept[] => {
  return [
     { slide_id: outline[0].slide_id, kind: AssetKind.Background, visual_prompt: "Martian landscape at sunset", rationale: "Intro" },
     { slide_id: "kit_content", kind: AssetKind.Background, visual_prompt: "Subtle dark rocky texture", rationale: "Content" },
     { slide_id: "kit_deco", kind: AssetKind.Stamp, visual_prompt: "Futuristic Mars Colony Logo", rationale: "Deco" },
     { slide_id: "kit_deco_2", kind: AssetKind.Stamp, visual_prompt: "Rover Wheel Tread Pattern", rationale: "Texture" },
     { slide_id: "kit_deco_3", kind: AssetKind.Stamp, visual_prompt: "Oxygen Molecule Diagram", rationale: "Science" }
  ];
};

// --- END MOCK DATA ---

// Helper: Check if error is retryable (503 Service Unavailable or Overloaded)
const isRetryableError = (error: any) => {
  const msg = (error.message || JSON.stringify(error)).toLowerCase();
  if (msg.includes('503') || msg.includes('overloaded') || msg.includes('internal server error')) {
    return true;
  }
  return false;
};

// Helper: Check if error is a quota limit (429 or Resource Exhausted)
const isQuotaError = (error: any) => {
  const msg = (error.message || JSON.stringify(error)).toLowerCase();
  return msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
};

// Helper to wrap calls with logging AND retry logic
async function callGemini<T>(
  model: string, 
  operationName: string, 
  callFn: (ai: GoogleGenAI | null) => Promise<{ result: T, usage?: { promptTokenCount?: number, candidatesTokenCount?: number } }>
): Promise<T> {
  const hasKey = !!process.env.API_KEY && process.env.API_KEY.trim() !== '';
  
  // Mock Mode Interceptor - Triggered if requested OR if no key exists
  if (model.includes('mock-') || !hasKey) {
     if (!hasKey && !model.includes('mock-')) {
         console.warn(`[Gemini] No API Key detected during call to ${operationName}. Falling back to Mock Mode.`);
         GeminiEvents.emit('mockUsed'); // Notify UI to switch visual indicators
     } else {
         GeminiEvents.emit('mockUsed');
     }

     await sleep(MOCK_DELAY);
     logApiCall(model, operationName, 'success', MOCK_DELAY, 0, 0);
     const res = await callFn(null);
     return res.result; 
  }

  // Real Mode
  const ai = getAI();
  if (!ai) {
      // Should be unreachable due to check above, but for type safety:
      throw new Error("Gemini Client failed to initialize");
  }

  let attempt = 0;
  const maxRetries = 5; 
  const baseDelay = 2000; 

  while (true) {
    const start = performance.now();
    try {
      const { result, usage } = await callFn(ai);
      const end = performance.now();
      logApiCall(
        model, 
        operationName, 
        'success', 
        Math.round(end - start),
        usage?.promptTokenCount,
        usage?.candidatesTokenCount
      );
      return result;
    } catch (error: any) {
      const end = performance.now();
      
      if (isQuotaError(error)) {
         console.error(`[Gemini] Quota Exceeded in ${operationName}. Switching to Offline Mode.`);
         logApiCall(model, operationName, 'error', Math.round(end - start));
         GeminiEvents.emit('quotaExhausted'); 
         throw error; 
      }

      if (isRetryableError(error) && attempt < maxRetries) {
        attempt++;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Server Error (${operationName}). Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        logApiCall(model, `${operationName} (Retry ${attempt})`, 'error', Math.round(end - start));
        
        await sleep(delay);
        continue; 
      }

      logApiCall(model, operationName, 'error', Math.round(end - start));
      console.error(`[Gemini] Fatal Error in ${operationName}:`, error);
      throw error;
    }
  }
}

// --- Stage 1: Strategist ---

export const generateBranding = async (sourceText: string, model: string = 'gemini-3-flash-preview'): Promise<Branding> => {
  return callGemini(model, 'Strategist: Branding', async (ai) => {
    if (!ai) return { result: mockBranding() }; // Mock Mode

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.Branding(sourceText),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tone: { type: Type.STRING },
            palette: { type: Type.ARRAY, items: { type: Type.STRING } },
            text_color: { type: Type.STRING },
            background_color: { type: Type.STRING },
            fonts: { type: Type.ARRAY, items: { type: Type.STRING } },
            style_notes: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            visual_features: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["tone", "palette", "text_color", "background_color", "fonts", "style_notes"],
        }
      },
    });

    if (!response.text) throw new Error("No response from AI");
    return { 
        result: JSON.parse(response.text) as Branding,
        usage: response.usageMetadata
    };
  });
};

export const validateBranding = async (branding: Branding, model: string = 'gemini-3-flash-preview'): Promise<{safe: boolean, reason?: string}> => {
  return callGemini(model, 'Strategist: Validation', async (ai) => {
    if (!ai) return { result: { safe: true } };

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.BrandingSafetyCheck(branding),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safe: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["safe"]
        }
      }
    });

    if (!response.text) return { result: { safe: true }, usage: response.usageMetadata };
    return { 
        result: JSON.parse(response.text),
        usage: response.usageMetadata
    };
  });
}

export const generateOutline = async (sourceText: string, branding: Branding, model: string = 'gemini-3-flash-preview', presentationType: string = 'generic'): Promise<OutlineItem[]> => {
  return callGemini(model, 'Strategist: Outline', async (ai) => {
    if (!ai) return { result: mockOutline() };

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.Outline(sourceText, branding, presentationType),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              slide_id: { type: Type.STRING, description: "Unique short ID like 'slide_1'" },
              title: { type: Type.STRING },
              intent: { type: Type.STRING },
              suggest_text_layout: { 
                type: Type.STRING, 
                description: "One of: headline_body, two_column, bullets_only, quote, image_caption" 
              },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["slide_id", "title", "intent", "suggest_text_layout"]
          }
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    
    const rawData = JSON.parse(response.text);
    const result = rawData.map((item: any) => ({
      ...item,
      suggest_text_layout: Object.values(TextLayout).includes(item.suggest_text_layout) 
        ? item.suggest_text_layout 
        : TextLayout.HeadlineBody
    }));

    return { result, usage: response.usageMetadata };
  });
};

// --- Stage 2: Art Dept ---

export const generateImageConcepts = async (outline: OutlineItem[], branding: Branding, model: string = 'gemini-3-flash-preview'): Promise<ImageConcept[]> => {
  return callGemini(model, 'ArtDept: Concepts', async (ai) => {
    if (!ai) return { result: mockConcepts(outline) };

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.ImageConcepts(outline, branding),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              slide_id: { type: Type.STRING, description: "The specific slide ID, OR 'kit_content' for general backgrounds, OR 'kit_deco' for general stamps." },
              visual_prompt: { type: Type.STRING, description: "The actual prompt to send to the image generator." },
              rationale: { type: Type.STRING, description: "Why this image fits the slide." },
              kind: { type: Type.STRING, enum: [AssetKind.Texture, AssetKind.Stamp, AssetKind.Background] }
            },
            required: ["slide_id", "visual_prompt", "kind"]
          }
        }
      }
    });

    if (!response.text) throw new Error("No concepts generated");
    return { 
        result: JSON.parse(response.text) as ImageConcept[],
        usage: response.usageMetadata
    };
  });
};

export const generateAssetImage = async (prompt: string, kind: AssetKind = AssetKind.Background, model: string = 'gemini-2.5-flash-image'): Promise<string> => {
  return callGemini(model, 'ArtDept: ImageGen', async (ai) => {
    if (!ai) return { result: createMockImage(prompt, kind) };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config: {}
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const result = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return { result, usage: response.usageMetadata };
      }
    }

    throw new Error("No image data found in response");
  });
};

// --- Stage 3: Architect ---

export const suggestLayout = async (
  assets: Asset[], 
  slideIntent: string, 
  model: string = 'gemini-3-flash-preview'
): Promise<{ zones: Record<string, any> }> => {
  return callGemini(model, 'Architect: Layout', async (ai) => {
    if (!ai) return { result: { zones: { 'background': assets[0]?.id } } };

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.SuggestLayout(assets, slideIntent),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            zones: {
              type: Type.OBJECT,
              properties: {
                background: { type: Type.STRING },
                nw: { type: Type.STRING }, n: { type: Type.STRING }, ne: { type: Type.STRING },
                w: { type: Type.STRING }, c: { type: Type.STRING }, e: { type: Type.STRING },
                sw: { type: Type.STRING }, s: { type: Type.STRING }, se: { type: Type.STRING },
              }
            }
          }
        }
      }
    });

    if (!response.text) throw new Error("No layout suggested");
    const raw = JSON.parse(response.text);
    
    const zones: Record<string, any> = {};
    if (raw.zones) {
      Object.entries(raw.zones).forEach(([key, val]) => {
        if (typeof val === 'string' && val.length > 0) {
          zones[key] = { type: 'image', asset_id: val };
        }
      });
    }
    return { result: { zones }, usage: response.usageMetadata };
  });
}

export const suggestLayoutStrategy = async (
  outline: OutlineItem[],
  assets: Asset[],
  model: string = 'gemini-3-flash-preview'
): Promise<{ assignments: Array<{ slide_id: string; zones: Record<string, any> }> }> => {
  return callGemini(model, 'Architect: Strategy', async (ai) => {
    if (!ai) return { result: { assignments: [] } };

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.SuggestLayoutStrategy(outline, assets),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             assignments: {
                type: Type.ARRAY,
                items: {
                   type: Type.OBJECT,
                   properties: {
                      slide_id: { type: Type.STRING },
                      zones: {
                         type: Type.OBJECT,
                         properties: {
                            background: { type: Type.STRING },
                            nw: { type: Type.STRING }, n: { type: Type.STRING }, ne: { type: Type.STRING },
                            w: { type: Type.STRING }, c: { type: Type.STRING }, e: { type: Type.STRING },
                            sw: { type: Type.STRING }, s: { type: Type.STRING }, se: { type: Type.STRING },
                         }
                      }
                   },
                   required: ["slide_id", "zones"]
                }
             }
          }
        }
      }
    });

    if (!response.text) throw new Error("No strategy suggested");
    
    const raw = JSON.parse(response.text);
    const assignments = raw.assignments.map((a: any) => {
       const zones: Record<string, any> = {};
       if (a.zones) {
          Object.entries(a.zones).forEach(([key, val]) => {
             if (typeof val === 'string' && val.length > 0) {
                zones[key] = { type: 'image', asset_id: val };
             }
          });
       }
       return { slide_id: a.slide_id, zones };
    });

    return { result: { assignments }, usage: response.usageMetadata };
  });
};

// --- Stage 4: Copywriter ---

export const generateSlideCopy = async (
  slide: OutlineItem,
  layout: TextLayout,
  branding: Branding,
  sourceMaterial: string,
  model: string = 'gemini-3-flash-preview'
): Promise<Record<string, string>> => {
  return callGemini(model, `Copywriter: ${slide.title.slice(0, 15)}...`, async (ai) => {
    if (!ai) {
        return { 
            result: { 
                headline: slide.title, 
                body: `Establishing a mission presence on the red planet. Our basalt 3D-printing technology allows for rapid habitat deployment using local resources.`,
                bullets: "• Sustainable Basil Habitat\n• Solar Grid Integration\n• Recycled H2O Systems",
                column_left: "Resource Extraction",
                column_right: "Life Support Logic",
                quote: "Mars is no longer a dream; it's our next construction site.",
                author: "Habitation Lead"
            } 
        };
    }

    const keys = {
      [TextLayout.HeadlineBody]: ['headline', 'body'],
      [TextLayout.TwoColumn]: ['headline', 'column_left', 'column_right'],
      [TextLayout.BulletsOnly]: ['headline', 'bullets'],
      [TextLayout.Quote]: ['quote', 'author'],
      [TextLayout.ImageCaption]: ['headline', 'caption']
    }[layout] || ['headline', 'body'];

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.Copywriter(slide.title, slide.intent, branding.tone, layout, sourceMaterial, keys),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { ...keys.reduce((acc, key) => ({ ...acc, [key]: { type: Type.STRING } }), {}) },
          required: keys
        }
      }
    });

    if (!response.text) throw new Error("No copy generated");
    return { 
        result: JSON.parse(response.text) as Record<string, string>,
        usage: response.usageMetadata
    };
  });
};
