
import { Type } from "@google/genai";
import { Branding, OutlineItem, TextLayout } from "../../types";
import { Prompts } from "../prompts";
import { callGemini } from "./core";
import { mockBranding, mockOutline } from "./mocks";

export const generateBranding = async (sourceText: string, model: string = 'gemini-3-flash-preview'): Promise<Branding> => {
  return callGemini(model, 'Strategist: Branding', async (ai) => {
    if (!ai) return { result: mockBranding() };

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
            key_facts: { type: Type.ARRAY, items: { type: Type.STRING } },
            data_visualizations: { type: Type.ARRAY, items: { type: Type.STRING } },
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

export const generateOutline = async (
    sourceText: string, 
    branding: Branding, 
    model: string = 'gemini-3-flash-preview', 
    presentationType: string = 'generic',
    length: 'short' | 'medium' | 'long' = 'medium'
): Promise<OutlineItem[]> => {
  return callGemini(model, 'Strategist: Outline', async (ai) => {
    if (!ai) return { result: mockOutline() };

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.Outline(sourceText, branding, presentationType, length),
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
