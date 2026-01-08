
import { GoogleGenAI } from "@google/genai";
import { logApiCall } from "../usageService";

// We now pass the key in each call or use a helper that reads from env
export const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '') return null;
  return new GoogleGenAI({ apiKey: key });
};

// Helper: Sleep function
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const MOCK_DELAY = 1000;

// Helper: Check if error is retryable (503 Service Unavailable, Overloaded, or 500 Internal)
export const isRetryableError = (error: any) => {
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

// Helper: Check if error is a quota limit (429 or Resource Exhausted)
export const isQuotaError = (error: any) => {
  const msg = (error.message || JSON.stringify(error)).toLowerCase();
  return msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
};

// Helper to wrap calls with logging AND retry logic
export async function callGemini<T>(
  model: string, 
  operationName: string, 
  callFn: (ai: GoogleGenAI | null) => Promise<{ result: T, usage?: { promptTokenCount?: number, candidatesTokenCount?: number } }>
): Promise<T> {
  const hasKey = !!process.env.API_KEY && process.env.API_KEY.trim() !== '';
  
  if (model.includes('mock-') || !hasKey) {
     if (!hasKey && !model.includes('mock-')) {
         console.warn(`[Gemini] No API Key detected during call to ${operationName}. Falling back to Mock Mode.`);
         GeminiEvents.emit('mockUsed');
     } else {
         GeminiEvents.emit('mockUsed');
     }

     await sleep(MOCK_DELAY);
     logApiCall(model, operationName, 'success', MOCK_DELAY, 0, 0);
     const res = await callFn(null);
     return res.result; 
  }

  const ai = getAI();
  if (!ai) throw new Error("Gemini Client failed to initialize");

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
