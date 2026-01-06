import React from 'react';
import { RunDoc, Action, Stage, Asset, AssetKind, Slide, SlideVariant, TextLayout, OutlineItem } from '../types';
import { generateImageConcepts, generateAssetImage, generateSlideCopy } from './geminiService';
import { removeBackgroundAI, removeBackgroundColorKey } from './imageProcessingService';

export interface YoloControl {
  isPaused: boolean;
  isAborted: boolean;
  resumeResolver: (() => void) | null;
}

// Helper to check for pause/abort signals
const checkControl = async (control: YoloControl) => {
  if (control.isAborted) throw new Error("YOLO Pipeline Aborted");
  
  if (control.isPaused) {
    await new Promise<void>((resolve) => {
      control.resumeResolver = resolve;
    });
  }
  
  // Double check after resume
  if (control.isAborted) throw new Error("YOLO Pipeline Aborted");
};

// Batch Processor Helper
async function processBatch<T, R>(
  items: T[], 
  concurrency: number, 
  task: (item: T, index: number) => Promise<R>,
  control: YoloControl
): Promise<R[]> {
  const results: R[] = [];
  
  // Process in chunks
  for (let i = 0; i < items.length; i += concurrency) {
    await checkControl(control);
    
    const chunk = items.slice(i, i + concurrency);
    // Map chunk to promises
    const promises = chunk.map((item, offset) => task(item, i + offset));
    
    // Wait for chunk to finish
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }
  
  return results;
}

export const runYoloPipeline = async (
  initialState: RunDoc, 
  dispatch: React.Dispatch<Action>,
  onStatusUpdate: (msg: string) => void,
  control: YoloControl
) => {
  try {
    const textModel = initialState.ai_settings.textModel;
    const imageModel = initialState.ai_settings.imageModel;
    const outline = initialState.outline;
    const branding = initialState.branding;
    
    // --- STAGE 2: ART DEPT (Auto) ---
    dispatch({ type: 'SET_STAGE', payload: Stage.ArtDept });
    await checkControl(control);

    onStatusUpdate("Thinking of visual concepts (Kit Strategy)...");
    const concepts = await generateImageConcepts(outline, branding, textModel);
    
    const newAssets: Asset[] = [];
    
    onStatusUpdate(`Forging ${concepts.length} assets (Safe Mode)...`);
    
    const generatedAssets = await processBatch(concepts, 1, async (concept, index) => {
       onStatusUpdate(`Forging asset ${index + 1}/${concepts.length}: ${concept.kind}...`);
       
       try {
          const base64Image = await generateAssetImage(concept.visual_prompt, concept.kind, imageModel);
          const asset: Asset = {
              id: `asset_yolo_${Date.now()}_${index}`,
              kind: concept.kind,
              mime: 'image/png',
              uri: base64Image,
              original_uri: base64Image, 
              transparent: false,
              keep: true, 
              status: 'completed',
              prompt: concept.visual_prompt,
              linked_slide_id: concept.slide_id,
              tags: [concept.kind, 'yolo']
          };
          
          if (concept.kind === AssetKind.Stamp) {
               try {
                  // Try AI first
                  const noBgUri = await removeBackgroundAI(base64Image);
                  asset.uri = noBgUri;
                  asset.transparent = true;
               } catch (e) {
                   console.warn("AI removal failed, falling back to Color Key removal...", e);
                   try {
                       // Color Key is extremely reliable for white-background mock stamps
                       const colorKeyUri = await removeBackgroundColorKey(base64Image);
                       asset.uri = colorKeyUri;
                       asset.transparent = true;
                   } catch (e2) {
                       console.error("All background removal methods failed for yolo asset", e2);
                   }
               }
          }
          return asset;
       } catch (e) {
          console.error(`Failed to gen asset for ${concept.slide_id}`, e);
          return null;
       }
    }, control);

    generatedAssets.forEach(a => { if (a) newAssets.push(a); });
    
    dispatch({ type: 'ADD_ASSETS', payload: newAssets });
    await checkControl(control);
    dispatch({ type: 'APPROVE_STAGE', payload: Stage.ArtDept });

    // --- STAGE 3: ARCHITECT (Auto) ---
    dispatch({ type: 'SET_STAGE', payload: Stage.Architect });
    await checkControl(control);
    
    onStatusUpdate("Assembling layouts with Kit logic...");
    
    const contentBg = newAssets.find(a => a.linked_slide_id === 'kit_content' && a.kind === 'background');
    const decoStamps = newAssets.filter(a => a.linked_slide_id === 'kit_deco');
    
    const slideUpdates: Array<{ slideId: string, zones: Record<string, any>, layout: TextLayout }> = [];

    outline.forEach((item, index) => {
        let bgAssetId: string | undefined;

        const specificBg = newAssets.find(a => a.linked_slide_id === item.slide_id && (a.kind === AssetKind.Background || a.kind === AssetKind.Texture));
        
        if (specificBg) {
           bgAssetId = specificBg.id;
        } else if (index === 0) {
           bgAssetId = contentBg?.id;
        } else if (index === outline.length - 1) {
           bgAssetId = contentBg?.id; 
        } else {
           bgAssetId = contentBg?.id;
        }

        let stampAsset = newAssets.find(a => a.linked_slide_id === item.slide_id && a.kind === AssetKind.Stamp);
        
        if (!stampAsset && decoStamps.length > 0 && Math.random() > 0.7) {
           stampAsset = decoStamps[Math.floor(Math.random() * decoStamps.length)];
        }

        const zones: Record<string, any> = {};
        
        if (bgAssetId) {
            zones['background'] = { type: 'image', asset_id: bgAssetId };
        }
        
        if (stampAsset) {
            zones['e'] = { type: 'image', asset_id: stampAsset.id };
        }

        slideUpdates.push({
            slideId: item.slide_id,
            zones,
            layout: item.suggest_text_layout || TextLayout.HeadlineBody
        });
    });

    for (const update of slideUpdates) {
        dispatch({ 
            type: 'UPDATE_TEXT_LAYOUT', 
            payload: { slideId: update.slideId, variantId: 'v1', layout: update.layout }
        });
        
        if (update.zones['background']) {
             dispatch({ 
                type: 'UPDATE_ZONE', 
                payload: { slideId: update.slideId, variantId: 'v1', zoneId: 'background', assetId: update.zones['background'].asset_id }
            });
        }
        if (update.zones['e']) {
             dispatch({ 
                type: 'UPDATE_ZONE', 
                payload: { slideId: update.slideId, variantId: 'v1', zoneId: 'e', assetId: update.zones['e'].asset_id }
            });
        }
    }
    
    await checkControl(control);
    dispatch({ type: 'APPROVE_STAGE', payload: Stage.Architect });

    // --- STAGE 4: COPYWRITER (Auto) ---
    dispatch({ type: 'SET_STAGE', payload: Stage.Copywriter });
    await checkControl(control);
    
    onStatusUpdate("Writing copy...");
    
    const copyResults = await processBatch<OutlineItem, { item: OutlineItem, copy: Record<string, string> } | null>(outline, 2, async (item: OutlineItem, index: number) => {
        onStatusUpdate(`Writing copy for slide ${index+1}/${outline.length}: ${item.title.slice(0, 20)}...`);
        const layout = item.suggest_text_layout || TextLayout.HeadlineBody;
        
        try {
            const copy = await generateSlideCopy(
                item,
                layout,
                branding,
                initialState.source_material.content,
                textModel
            );
            return { item, copy };
        } catch (e) {
            console.error("Failed copy gen", e);
            return null;
        }
    }, control);

    copyResults.forEach(res => {
        if (!res) return;
        Object.entries(res.copy).forEach(([field, value]) => {
            dispatch({
                type: 'UPDATE_TEXT_CONTENT',
                payload: { slideId: res.item.slide_id, variantId: 'v1', field, value }
            });
        });
    });
    
    await checkControl(control);
    dispatch({ type: 'APPROVE_STAGE', payload: Stage.Copywriter });
    
    dispatch({ type: 'SET_STAGE', payload: Stage.Publisher });
    onStatusUpdate("Done! Enjoy your deck.");

  } catch (err) {
    console.error("YOLO Pipeline Failed", err);
    if ((err as Error).message !== "YOLO Pipeline Aborted") {
        onStatusUpdate("Error in YOLO pipeline. Check console.");
    }
    throw err;
  }
};