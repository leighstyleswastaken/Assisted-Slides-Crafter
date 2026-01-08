
import { GoogleGenAI, Type } from "@google/genai";
import { RunDoc, Action, Asset } from "../types";
import { Prompts } from "./prompts";
import { logApiCall } from "./usageService";

/**
 * REVIEWER SERVICE (The "Creative Director")
 */

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '') return null;
  return new GoogleGenAI({ apiKey: key });
};

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
   confidence: 'high' | 'medium' | 'low';
   reasoning: string;
   action: Action | any; 
}

function safeParseActions(rawText: string): ReviewSuggestion[] {
  if (!rawText) return [];

  const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const suggestions: ReviewSuggestion[] = [];

  try {
    const parsed = JSON.parse(clean);
    let list = [];
    if (parsed.actions && Array.isArray(parsed.actions)) list = parsed.actions;
    else if (Array.isArray(parsed)) list = parsed;

    if (list.length > 0) {
       list.forEach((item: any) => {
          if (validateStructure(item)) suggestions.push(item);
       });
       return suggestions;
    }
  } catch (e) {
    // Continue to surgical extraction
  }

  // Surgical Extraction
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
        potentialStarts.push(i);
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        const start = potentialStarts.pop();
        
        if (start !== undefined) {
           const candidate = clean.substring(start, i + 1);
           if (candidate.includes('"description"') && candidate.includes('"action"')) {
              try {
                 const obj = JSON.parse(candidate);
                 if (validateStructure(obj)) {
                    suggestions.push(obj);
                 }
              } catch (e) {
                 // Ignore
              }
           }
        }
      }
    }
  }

  return suggestions;
}

// Basic structure check, deeper logic check happens in runReviewLoop
function validateStructure(obj: any): boolean {
   if (!obj || !obj.description || !obj.action || !obj.action.type || !obj.action.payload) return false;
   return true;
}

// Deep logic validation to prevent hallucinations
function validateLogic(suggestion: ReviewSuggestion, validAssetIds: Set<string>): boolean {
    const { type, payload } = suggestion.action;

    // 1. Check for hallucinated Asset IDs
    if (type === 'UPDATE_ZONE') {
        if (!payload.assetId || !validAssetIds.has(payload.assetId)) {
            console.warn(`[Reviewer] Filtered hallucinated asset ID: ${payload.assetId}`);
            return false;
        }
    }

    // 2. Check for empty prompts
    if (type === 'REQUEST_NEW_ASSET') {
        if (!payload.visualPrompt || typeof payload.visualPrompt !== 'string' || payload.visualPrompt.trim().length < 5) {
            console.warn(`[Reviewer] Filtered empty/short prompt`);
            return false;
        }
    }

    // 3. Check for valid alignment enums
    if (type === 'UPDATE_TEXT_ALIGNMENT') {
        const valid = ['left', 'center', 'right', 'justify'];
        if (!payload.alignment || !valid.includes(payload.alignment.toLowerCase())) {
             console.warn(`[Reviewer] Filtered invalid alignment: ${payload.alignment}`);
             return false;
        }
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
  
  // MOCK MODE
  if (model.includes('mock-') || !process.env.API_KEY) {
     if (onProgress) onProgress("Simulating review analysis...");
     await sleep(1500);
     const suggestions: ReviewSuggestion[] = [];
     if (runDoc.slides.length > 0) {
        const slide = runDoc.slides[0];
        suggestions.push({
           description: "The current headline is a bit generic. Let's make it punchier.",
           confidence: 'high',
           reasoning: "Title slide impact is critical.",
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
     return suggestions;
  }

  const ai = getAI();
  if (!ai) return [];

  const BATCH_SIZE = 2;
  const slides = runDoc.slides;
  const outline = runDoc.outline;
  const totalSlides = slides.length;
  const allSuggestions: ReviewSuggestion[] = [];
  
  // Create a Set of valid asset IDs for validation
  const validAssetIds = new Set(runDoc.asset_library.map(a => a.id));

  const chunks = [];
  for (let i = 0; i < totalSlides; i += BATCH_SIZE) {
     chunks.push({
        start: i,
        end: Math.min(i + BATCH_SIZE, totalSlides),
        slides: slides.slice(i, i + BATCH_SIZE),
        outline: outline.slice(i, i + BATCH_SIZE)
     });
  }

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
                 responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                       actions: {
                          type: Type.ARRAY,
                          items: {
                             type: Type.OBJECT,
                             properties: {
                                description: { type: Type.STRING },
                                confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
                                reasoning: { type: Type.STRING },
                                action: {
                                   type: Type.OBJECT,
                                   properties: {
                                      type: { type: Type.STRING, enum: ["UPDATE_TEXT_CONTENT", "UPDATE_ZONE", "UPDATE_TEXT_ALIGNMENT", "REQUEST_NEW_ASSET"] },
                                      payload: { 
                                         type: Type.OBJECT,
                                         properties: {
                                            slideId: { type: Type.STRING },
                                            variantId: { type: Type.STRING },
                                            field: { type: Type.STRING },
                                            value: { type: Type.STRING },
                                            zoneId: { type: Type.STRING },
                                            assetId: { type: Type.STRING },
                                            alignment: { type: Type.STRING },
                                            visualPrompt: { type: Type.STRING },
                                            kind: { type: Type.STRING }
                                         },
                                         required: ["slideId", "variantId"]
                                      }
                                   },
                                   required: ["type", "payload"]
                                }
                             },
                             required: ["description", "action", "confidence", "reasoning"]
                          }
                       }
                    }
                 }
              }
           });

           const rawText = response.text || '';
           const rawSuggestions = safeParseActions(rawText);
           
           // Filter suggestions based on logic (valid IDs, valid prompts)
           const validSuggestions = rawSuggestions.filter(s => validateLogic(s, validAssetIds));

           const batchEnd = performance.now();
           logApiCall(model, `Reviewer: Batch ${batchLabel}`, 'success', Math.round(batchEnd - batchStart));
           return validSuggestions;

        } catch (error: any) {
           attempt++;
           if (isRetryableError(error) && attempt < maxRetries) {
              await sleep(2000 * attempt); 
           } else {
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
      batchResults.forEach(res => { if (res) allSuggestions.push(...res); });
  }

  const totalEnd = performance.now();
  logApiCall(model, "Reviewer: Total Loop", 'success', Math.round(totalEnd - start));
  
  return allSuggestions;
};
