
import { Type } from "@google/genai";
import { Branding, OutlineItem, TextLayout } from "../../types";
import { Prompts } from "../prompts";
import { callGemini } from "./core";

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
      contents: Prompts.Copywriter(slide.title, slide.intent, branding.tone, layout, sourceMaterial, keys, branding.key_facts || []),
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
