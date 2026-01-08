
import { Type } from "@google/genai";
import { Asset, OutlineItem } from "../../types";
import { Prompts } from "../prompts";
import { callGemini } from "./core";

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
