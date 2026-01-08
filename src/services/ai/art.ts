
import { Type } from "@google/genai";
import { Branding, OutlineItem, AssetKind, ImageConcept } from "../../types";
import { Prompts } from "../prompts";
import { callGemini } from "./core";
import { mockConcepts, createMockImage } from "./mocks";

export const generateImageConcepts = async (outline: OutlineItem[], branding: Branding, model: string = 'gemini-3-flash-preview'): Promise<ImageConcept[]> => {
  return callGemini(model, 'ArtDept: Concepts', async (ai) => {
    if (!ai) return { result: mockConcepts(outline) };

    const response = await ai.models.generateContent({
      model: model,
      contents: Prompts.ImageConcepts(outline, branding),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             // Array wrapper to handle potential top-level array ambiguity in some models
             concepts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slide_id: { type: Type.STRING },
                    visual_prompt: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    kind: { type: Type.STRING, enum: [AssetKind.Texture, AssetKind.Stamp, AssetKind.Background, AssetKind.Chart] }
                  },
                  required: ["slide_id", "visual_prompt", "kind"]
                }
             }
          }
        }
      }
    });

    if (!response.text) throw new Error("No concepts generated");
    
    // Fallback parsing for array vs object wrapper
    const parsed = JSON.parse(response.text);
    const result = Array.isArray(parsed) ? parsed : parsed.concepts;
    
    return { 
        result: result as ImageConcept[],
        usage: response.usageMetadata
    };
  });
};

export const generateAssetImage = async (
  prompt: string, 
  kind: AssetKind = AssetKind.Background, 
  model: string = 'gemini-2.5-flash-image',
  referenceImageBase64?: string
): Promise<string> => {
  return callGemini(model, 'ArtDept: ImageGen', async (ai) => {
    // 1. Validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
       console.warn("Empty prompt received for image generation. Using fallback.");
       return { result: createMockImage("Fallback: Empty Prompt", kind) };
    }

    const safePrompt = prompt.trim();

    if (!ai) return { result: createMockImage(safePrompt, kind) };

    try {
      // Construct the payload
      const parts: any[] = [{ text: safePrompt }];

      // If we have a Ghost Chart/Reference, add it to the payload
      if (referenceImageBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: referenceImageBase64
          }
        });
        // Add a directive to the prompt to force adherence to the image structure
        parts[0].text += " \n\nIMPORTANT: Use the provided image as a strict structural layout guide. Maintain the relative sizes, positions, and shapes of the white elements exactly, but render them in the requested artistic style (e.g. 3d, glowing, glass). Do not add text.";
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: {}
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const result = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          return { result, usage: response.usageMetadata };
        }
      }
      
      console.warn("No inlineData in response", response);
      throw new Error("No image data found in response");

    } catch (e: any) {
       if (e.message?.includes('oneof field') || e.status === 'INVALID_ARGUMENT') {
          console.error("Invalid Argument sent to Image Gen model. Prompt:", safePrompt);
       }
       throw e;
    }
  });
};
