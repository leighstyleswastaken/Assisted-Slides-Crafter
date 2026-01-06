
import { GoogleGenAI, Type } from "@google/genai";
import { RunDoc, Action } from "../types";
import { Prompts } from "./prompts";
import { logApiCall } from "./usageService";

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '') return null;
  return new GoogleGenAI({ apiKey: key });
};

export interface ReviewSuggestion {
   description: string;
   action: Action;
}

export const runReviewLoop = async (
  runDoc: RunDoc, 
  model: string = 'gemini-3-flash-preview'
): Promise<ReviewSuggestion[]> => {
  
  const start = performance.now();
  
  // MOCK MODE Interception
  if (model.includes('mock-') || !process.env.API_KEY) {
     await new Promise(resolve => setTimeout(resolve, 1500));
     
     const suggestions: ReviewSuggestion[] = [];
     
     // Mock Suggestion 1: Headline Adjustment
     if (runDoc.slides.length > 0) {
        const slide = runDoc.slides[0];
        suggestions.push({
           description: "The current headline is a bit generic. Let's make it punchier to grab attention immediately.",
           action: {
              type: 'UPDATE_TEXT_CONTENT',
              payload: { 
                 slideId: slide.slide_id, 
                 variantId: slide.active_variant_id, 
                 field: 'headline', 
                 value: "Mission: Red Dust" 
              }
           }
        });
     }

     // Mock Suggestion 2: Visual Balance
     if (runDoc.slides.length > 1) {
        const slide = runDoc.slides[1];
        suggestions.push({
           description: "The background image on the second slide feels a bit constrained. Switching to 'cover' fit will improve immersion.",
           action: {
              type: 'UPDATE_ZONE_STYLE',
              payload: { 
                 slideId: slide.slide_id, 
                 variantId: slide.active_variant_id, 
                 zoneId: 'background', 
                 fit: 'cover'
              }
           }
        });
     }

     logApiCall(model, "Reviewer: Improvement Loop (Mock)", 'success', 1500, 0, 0);
     return suggestions;
  }

  // REAL API MODE
  const ai = getAI();
  if (!ai) {
     // Fallback if no AI instance (should be caught by mock check above, but safe-guard)
     return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.Reviewer(runDoc.outline, runDoc.slides, runDoc.asset_library, runDoc.branding),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             actions: {
                type: Type.ARRAY,
                items: {
                   type: Type.OBJECT,
                   properties: {
                      description: { type: Type.STRING },
                      action: {
                         type: Type.OBJECT,
                         properties: {
                            type: { type: Type.STRING },
                            payload: { 
                               type: Type.OBJECT,
                               properties: {
                                  slideId: { type: Type.STRING },
                                  variantId: { type: Type.STRING },
                                  field: { type: Type.STRING },
                                  value: { type: Type.STRING },
                                  zoneId: { type: Type.STRING },
                                  assetId: { type: Type.STRING },
                                  scale: { type: Type.NUMBER },
                                  alignment: { type: Type.STRING },
                                  size: { type: Type.NUMBER },
                                  transform: {
                                     type: Type.OBJECT,
                                     properties: {
                                        x: { type: Type.NUMBER },
                                        y: { type: Type.NUMBER },
                                        w: { type: Type.NUMBER },
                                        h: { type: Type.NUMBER }
                                     }
                                  }
                               }
                            }
                         },
                         required: ["type", "payload"]
                      }
                   },
                   required: ["description", "action"]
                }
             }
          }
        }
      }
    });

    const end = performance.now();
    logApiCall(
        model, 
        "Reviewer: Improvement Loop", 
        'success', 
        Math.round(end - start),
        response.usageMetadata?.promptTokenCount,
        response.usageMetadata?.candidatesTokenCount
    );

    if (!response.text) return [];
    
    const parsed = JSON.parse(response.text);
    return parsed.actions || [];

  } catch (error) {
    const end = performance.now();
    logApiCall(model, "Reviewer: Improvement Loop", 'error', Math.round(end - start));
    console.error("Review Loop Failed", error);
    return [];
  }
};
