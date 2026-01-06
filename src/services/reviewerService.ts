
import { GoogleGenAI, Type } from "@google/genai";
import { RunDoc, Action } from "../types";
import { Prompts } from "./prompts";
import { logApiCall } from "./usageService";

// Helper for consistency with other services
const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '') return null;
  return new GoogleGenAI({ apiKey: key });
};

// Retry helper specifically for the reviewer batch loop
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: any) => {
  const msg = (error.message || JSON.stringify(error)).toLowerCase();
  return (
    msg.includes('503') || 
    msg.includes('overloaded') || 
    msg.includes('internal server error') ||
    msg.includes('internal error') ||
    msg.includes('"code":500') ||
    msg.includes('"status":"internal"')
  );
};

export interface ReviewSuggestion {
   description: string;
   action: Action;
}

export const runReviewLoop = async (
  runDoc: RunDoc, 
  model: string = 'gemini-3-flash-preview',
  onProgress?: (msg: string) => void
): Promise<ReviewSuggestion[]> => {
  
  const start = performance.now();
  
  // MOCK MODE Interception
  if (model.includes('mock-') || !process.env.API_KEY) {
     if (onProgress) onProgress("Simulating review analysis...");
     await sleep(1500);
     
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

  // REAL API MODE - BATCHED PROCESSING
  const ai = getAI();
  if (!ai) return [];

  const BATCH_SIZE = 4;
  const slides = runDoc.slides;
  const outline = runDoc.outline;
  const totalSlides = slides.length;
  const allSuggestions: ReviewSuggestion[] = [];

  // Create chunks
  const chunks = [];
  for (let i = 0; i < totalSlides; i += BATCH_SIZE) {
     chunks.push({
        start: i,
        end: Math.min(i + BATCH_SIZE, totalSlides),
        slides: slides.slice(i, i + BATCH_SIZE),
        outline: outline.slice(i, i + BATCH_SIZE)
     });
  }

  for (let i = 0; i < chunks.length; i++) {
     const chunk = chunks[i];
     const batchLabel = `${chunk.start + 1}-${chunk.end}`;
     
     if (onProgress) onProgress(`Analysing slides ${batchLabel} of ${totalSlides}...`);

     let attempt = 0;
     const maxRetries = 3;
     let batchSuccess = false;

     while (!batchSuccess && attempt < maxRetries) {
        try {
           const batchStart = performance.now();
           const response = await ai.models.generateContent({
              model: model,
              // We pass only the chunk's outline and slides to the prompt to keep context small
              contents: Prompts.Reviewer(chunk.outline, chunk.slides, runDoc.asset_library, runDoc.branding),
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

           if (response.text) {
              const parsed = JSON.parse(response.text);
              if (parsed.actions && Array.isArray(parsed.actions)) {
                 allSuggestions.push(...parsed.actions);
              }
           }
           
           const batchEnd = performance.now();
           logApiCall(model, `Reviewer: Batch ${batchLabel}`, 'success', Math.round(batchEnd - batchStart));
           batchSuccess = true;

        } catch (error: any) {
           attempt++;
           if (isRetryableError(error) && attempt < maxRetries) {
              console.warn(`Reviewer batch ${batchLabel} failed (Attempt ${attempt}). Retrying...`);
              await sleep(2000 * attempt); // Exponential backoff
           } else {
              console.error(`Reviewer batch ${batchLabel} failed permanently.`, error);
              logApiCall(model, `Reviewer: Batch ${batchLabel}`, 'error', 0);
              // We break the retry loop but continue to the next batch (partial success is better than none)
              break; 
           }
        }
     }
  }

  const totalEnd = performance.now();
  logApiCall(model, "Reviewer: Total Loop", 'success', Math.round(totalEnd - start));
  
  return allSuggestions;
};
