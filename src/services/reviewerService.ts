
import { GoogleGenAI, Type } from "@google/genai";
import { RunDoc, Action } from "../types";
import { Prompts } from "./prompts";
import { logApiCall } from "./usageService";

/**
 * REVIEWER SERVICE (The "Creative Director")
 * 
 * IMPLEMENTATION NOTE:
 * This service uses the "Dual-Constraint Protocol" to prevent hallucinations in Flash models.
 * 
 * 1. PROMPT CONTEXT: We inject strict TypeScript interfaces (UpdateTextAction, etc.) 
 *    into the system prompt via `prompts.ts`. This grounds the model in code-logic.
 * 
 * 2. SCHEMA CONSTRAINTS: We pass a strict JSON Schema with `enum` values for 
 *    types, zones, and fields. This physically prevents the API from returning 
 *    invalid strings like "top-left" (instead of "nw") or infinite loops of text.
 * 
 * If modifying this service, ensure BOTH the Prompt Interfaces and the JSON Schema match.
 */

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
   action: Action | any; // Any allows for the new RequestAssetAction which isn't in core Action type yet
}

/**
 * Robustly parses JSON to handle truncated or messy AI output.
 * Scans for ANY balanced brace block that looks like a valid suggestion.
 */
function safeParseActions(rawText: string): ReviewSuggestion[] {
  if (!rawText) return [];

  const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const suggestions: ReviewSuggestion[] = [];

  // 1. Try Happy Path (Complete valid JSON)
  try {
    const parsed = JSON.parse(clean);
    let list = [];
    if (parsed.actions && Array.isArray(parsed.actions)) list = parsed.actions;
    else if (Array.isArray(parsed)) list = parsed;

    if (list.length > 0) {
       list.forEach((item: any) => {
          if (validateSuggestion(item)) suggestions.push(item);
       });
       return suggestions;
    }
  } catch (e) {
    // Continue to surgical extraction
  }

  // 2. Surgical Extraction (Greedy)
  let braceDepth = 0;
  let inString = false;
  let isEscaped = false;
  
  const potentialStarts: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        potentialStarts.push(i); // Record where this brace layer started
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        const start = potentialStarts.pop(); // Match with the most recent open brace
        
        if (start !== undefined) {
           const candidate = clean.substring(start, i + 1);
           
           if (candidate.includes('"description"') && candidate.includes('"action"')) {
              try {
                 const obj = JSON.parse(candidate);
                 if (validateSuggestion(obj)) {
                    suggestions.push(obj);
                 }
              } catch (e) {
                 // Ignore parse errors for partial fragments
              }
           }
        }
      }
    }
  }

  if (suggestions.length > 0) {
     console.warn(`[Reviewer] JSON Recovery: Salvaged ${suggestions.length} actions from malformed output.`);
  } else {
     console.warn(`[Reviewer] Recovery failed. Raw output length: ${clean.length}`);
  }

  return suggestions;
}

// Validation Helper
function validateSuggestion(obj: any): boolean {
   if (!obj || !obj.description || !obj.action || !obj.action.type || !obj.action.payload) return false;
   
   // Anti-Hallucination: Check string lengths (Mitigation for repetitive loops)
   if (typeof obj.description === 'string' && obj.description.length > 500) {
       console.warn("[Reviewer] Rejected action: Description too long (Hallucination suspected)");
       return false;
   }

   const p = obj.action.payload;
   
   // Sanity check all string values in payload
   for (const key in p) {
       if (typeof p[key] === 'string' && p[key].length > 2000) {
           console.warn(`[Reviewer] Rejected action: Payload field '${key}' too long (Hallucination suspected)`);
           return false;
       }
   }
   
   if (obj.action.type === 'UPDATE_TEXT_CONTENT') {
      if (!p.value || typeof p.value !== 'string') return false;
      if (!p.field || typeof p.field !== 'string') return false;
      // IDs should be short
      if (p.field.length > 50) return false; 
   }
   
   if (obj.action.type === 'UPDATE_ZONE') {
      if (!p.assetId || typeof p.assetId !== 'string') return false;
      if (!p.zoneId || typeof p.zoneId !== 'string') return false;
      // IDs should be short
      if (p.assetId.length > 100 || p.zoneId.length > 50) return false;
   }

   if (obj.action.type === 'REQUEST_NEW_ASSET') {
      if (!p.visualPrompt || typeof p.visualPrompt !== 'string') return false;
      if (!p.kind || typeof p.kind !== 'string') return false;
   }

   return true;
}

export const runReviewLoop = async (
  runDoc: RunDoc, 
  model: string = 'gemini-3-flash-preview',
  concurrency: number = 1,
  onProgress?: (msg: string) => void,
  onDebugCapture?: (raw: string) => void
): Promise<ReviewSuggestion[]> => {
  
  const start = performance.now();
  
  // MOCK MODE Interception
  if (model.includes('mock-') || !process.env.API_KEY) {
     if (onProgress) onProgress("Simulating review analysis...");
     await sleep(1500);
     
     const suggestions: ReviewSuggestion[] = [];
     
     if (runDoc.slides.length > 0) {
        const slide = runDoc.slides[0];
        suggestions.push({
           description: "The current headline is a bit generic. Let's make it punchier.",
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

     if (runDoc.slides.length > 1) {
        const slide = runDoc.slides[1];
        suggestions.push({
           description: "The background image feels constrained. Switching to 'cover' fit.",
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

  // Reduced batch size to 2 to prevent "Unterminated string" errors from large JSON responses
  const BATCH_SIZE = 2;
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

  // Helper function to process a single chunk
  const processChunk = async (chunk: any) => {
     const batchLabel = `${chunk.start + 1}-${chunk.end}`;
     
     let attempt = 0;
     const maxRetries = 3;
     
     while (attempt < maxRetries) {
        try {
           const batchStart = performance.now();
           const response = await ai.models.generateContent({
              model: model,
              contents: Prompts.Reviewer(chunk.outline, chunk.slides, runDoc.asset_library, runDoc.branding),
              config: {
                 responseMimeType: "application/json",
                 maxOutputTokens: 8192, 
                 // STRICT SCHEMA ENFORCEMENT
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
                                      // Restrict Action Types
                                      type: { 
                                          type: Type.STRING, 
                                          enum: ["UPDATE_TEXT_CONTENT", "UPDATE_ZONE", "UPDATE_TEXT_ALIGNMENT", "REQUEST_NEW_ASSET"] 
                                      },
                                      payload: { 
                                         type: Type.OBJECT,
                                         properties: {
                                            slideId: { type: Type.STRING },
                                            variantId: { type: Type.STRING },
                                            // Restrict Fields
                                            field: { 
                                                type: Type.STRING, 
                                                enum: ["headline", "body", "caption", "quote", "author", "column_left", "column_right", "bullets"]
                                            },
                                            value: { type: Type.STRING },
                                            // Restrict Zones
                                            zoneId: { 
                                                type: Type.STRING,
                                                enum: ["background", "nw", "n", "ne", "w", "c", "e", "sw", "s", "se"]
                                            },
                                            assetId: { type: Type.STRING },
                                            alignment: { 
                                                type: Type.STRING, 
                                                enum: ["left", "center", "right"] 
                                            },
                                            // New fields for REQUEST_NEW_ASSET
                                            visualPrompt: { type: Type.STRING },
                                            kind: { 
                                                type: Type.STRING, 
                                                enum: ["background", "stamp", "texture"] 
                                            }
                                         },
                                         required: ["slideId", "variantId"]
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

           const rawText = response.text || '';
           const suggestions = safeParseActions(rawText);
           
           if (suggestions.length === 0 && rawText.length > 20 && onDebugCapture) {
              onDebugCapture(`--- BATCH ${batchLabel} FAILURE (Length: ${rawText.length}) ---\n${rawText}\n-------------------`);
           }
           
           const batchEnd = performance.now();
           logApiCall(model, `Reviewer: Batch ${batchLabel}`, 'success', Math.round(batchEnd - batchStart));
           return suggestions;

        } catch (error: any) {
           attempt++;
           if (isRetryableError(error) && attempt < maxRetries) {
              console.warn(`Reviewer batch ${batchLabel} failed (Attempt ${attempt}). Retrying...`);
              await sleep(2000 * attempt); 
           } else {
              console.error(`Reviewer batch ${batchLabel} failed permanently.`, error);
              logApiCall(model, `Reviewer: Batch ${batchLabel}`, 'error', 0);
              return []; 
           }
        }
     }
     return [];
  };

  for (let i = 0; i < chunks.length; i += concurrency) {
      const slice = chunks.slice(i, i + concurrency);
      
      if (onProgress) {
          const currentCount = Math.min((i + concurrency) * BATCH_SIZE, totalSlides);
          onProgress(`Analysing slides... (${currentCount}/${totalSlides})`);
      }

      const batchPromises = slice.map(chunk => processChunk(chunk));
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(res => {
          if (res) allSuggestions.push(...res);
      });
  }

  const totalEnd = performance.now();
  logApiCall(model, "Reviewer: Total Loop", 'success', Math.round(totalEnd - start));
  
  return allSuggestions;
};
