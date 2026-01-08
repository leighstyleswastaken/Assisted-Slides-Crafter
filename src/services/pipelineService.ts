
import React from 'react';
import { RunDoc, Action, Stage, Asset, AssetKind, Slide, SlideVariant, TextLayout, OutlineItem, ShapeType } from '../types';
import { generateImageConcepts, generateAssetImage, generateSlideCopy } from './geminiService';
import { removeBackgroundAI, removeBackgroundColorKey } from './imageProcessingService';
import { generateGhostChart, extractChartDataFromText } from './chartRenderer';

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
    
    // Helper for granular progress
    const updateProgress = (current: number, total: number, task: string) => {
      const percent = Math.round((current / total) * 100);
      onStatusUpdate(`${task} (${current}/${total}) - ${percent}%`);
    };

    // --- STAGE 2: ART DEPT (Auto) ---
    dispatch({ type: 'SET_STAGE', payload: Stage.ArtDept });
    await checkControl(control);

    onStatusUpdate("Thinking of visual concepts (Kit Strategy)...");
    const concepts = await generateImageConcepts(outline, branding, textModel);
    
    const newAssets: Asset[] = [];
    
    onStatusUpdate(`Forging ${concepts.length} assets...`);
    
    const generatedAssets = await processBatch(concepts, 1, async (concept, index) => {
       updateProgress(index + 1, concepts.length, "Forging assets");
       
       try {
          let base64Image = '';
          let chartData = undefined;

          // Chart Ghosting Logic for YOLO
          if (concept.kind === AssetKind.Chart) {
             const contextText = `${concept.visual_prompt} ${branding.key_facts?.join(' ') || ''}`;
             chartData = extractChartDataFromText(contextText);
             const ghostBase64 = generateGhostChart(chartData);
             base64Image = await generateAssetImage(concept.visual_prompt, concept.kind, imageModel, ghostBase64);
          } else {
             base64Image = await generateAssetImage(concept.visual_prompt, concept.kind, imageModel);
          }

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
              tags: [concept.kind, 'yolo'],
              chart_data: chartData
          };
          
          if (concept.kind === AssetKind.Stamp || concept.kind === AssetKind.Chart) {
               try {
                  // Try AI first for best quality stamps
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

    // --- STAGE 3: ARCHITECT (PASS 1 - Backgrounds & Layout Setup) ---
    dispatch({ type: 'SET_STAGE', payload: Stage.Architect });
    await checkControl(control);
    
    onStatusUpdate("Pass 1: Establishing spatial context (Backgrounds)...");
    
    const contentBg = newAssets.find(a => a.linked_slide_id === 'kit_content' && a.kind === AssetKind.Background);
    
    const slideUpdates: Array<{ slideId: string, zones: Record<string, any>, layout: TextLayout }> = [];

    outline.forEach((item, index) => {
        let bgAssetId: string | undefined;

        // 1. Find Specific Background
        const specificBg = newAssets.find(a => a.linked_slide_id === item.slide_id && (a.kind === AssetKind.Background || a.kind === AssetKind.Texture));
        if (specificBg) {
           bgAssetId = specificBg.id;
        } else {
           bgAssetId = contentBg?.id; // Fallback
        }

        const zones: Record<string, any> = {};
        if (bgAssetId) {
            zones['background'] = { type: 'image', asset_id: bgAssetId };
        }

        // Just set layout and background for now. Detail logic comes after text.
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
    }
    
    await checkControl(control);
    // Note: We do NOT approve Architect yet. We "bounce" to Copywriter.

    // --- STAGE 4: COPYWRITER (Generate Text) ---
    dispatch({ type: 'SET_STAGE', payload: Stage.Copywriter });
    await checkControl(control);
    
    onStatusUpdate("Writing context-aware copy based on outline intent...");
    
    const copyResults = await processBatch<OutlineItem, { item: OutlineItem, copy: Record<string, string> } | null>(outline, 2, async (item: OutlineItem, index: number) => {
        updateProgress(index + 1, outline.length, "Writing copy");
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

    // --- STAGE 3: ARCHITECT (PASS 2 - "The Tweak") ---
    // Now that we have copy, we know where the white space is.
    dispatch({ type: 'SET_STAGE', payload: Stage.Architect });
    await checkControl(control);

    onStatusUpdate("Pass 2: Filling negative space with Stamps & Charts...");

    const decoStamps = newAssets.filter(a => a.linked_slide_id === 'kit_deco');
    const detailUpdates: Array<{ slideId: string, zoneId: string, assetId: string, style?: any, glass?: boolean }> = [];

    outline.forEach((item) => {
        // Logic: Where is the empty space based on layout?
        const layout = item.suggest_text_layout || TextLayout.HeadlineBody;
        const availableZones: string[] = [];

        // Heuristic mapping of "Negative Space" based on text layout
        if (layout === TextLayout.HeadlineBody) availableZones.push('e', 'ne', 'se'); // Text is usually Left
        else if (layout === TextLayout.TwoColumn) availableZones.push('n', 's', 'c'); // Text is split W/E
        else if (layout === TextLayout.BulletsOnly) availableZones.push('e', 'ne', 'se'); // Text is Left
        else if (layout === TextLayout.Quote) availableZones.push('nw', 'ne', 'sw', 'se'); // Text is Center
        else if (layout === TextLayout.ImageCaption) availableZones.push('c', 'n'); // Text is Bottom

        if (availableZones.length === 0) return;

        // Priority 1: Specific Chart for this slide?
        const specificChart = newAssets.find(a => a.linked_slide_id === item.slide_id && a.kind === AssetKind.Chart);
        
        // Priority 2: Specific Stamp for this slide?
        const specificStamp = newAssets.find(a => a.linked_slide_id === item.slide_id && a.kind === AssetKind.Stamp);

        // Priority 3: Random Deco Stamp
        const randomStamp = decoStamps.length > 0 ? decoStamps[Math.floor(Math.random() * decoStamps.length)] : null;

        const assetToPlace = specificChart || specificStamp || randomStamp;
        
        if (assetToPlace) {
            let targetZone = availableZones[0];
            let style = {};
            let glass = false;

            // SPECIAL CHART LOGIC
            if (assetToPlace.kind === AssetKind.Chart) {
                targetZone = 'c'; // Charts go in center mostly
                
                // Override zone preference if strict layout conflicts
                if (layout === TextLayout.TwoColumn) targetZone = 's';
                else if (layout === TextLayout.HeadlineBody) targetZone = 'e';

                // Chart styling: Make it large, contained, and ensure background safety
                style = { scale: 1.2, fit: 'contain' };
                glass = true; // Enable glass card to ensure chart readability on backgrounds
            } else {
                // Standard Stamp Logic
                targetZone = availableZones[Math.floor(Math.random() * availableZones.length)];
                style = { scale: 1, fit: 'contain' };
            }

            detailUpdates.push({
                slideId: item.slide_id,
                zoneId: targetZone,
                assetId: assetToPlace.id,
                style,
                glass
            });
        }
    });

    for (const update of detailUpdates) {
        dispatch({ 
            type: 'UPDATE_ZONE', 
            payload: { slideId: update.slideId, variantId: 'v1', zoneId: update.zoneId as any, assetId: update.assetId }
        });
        
        if (update.style) {
             dispatch({
                type: 'UPDATE_ZONE_STYLE',
                payload: { 
                   slideId: update.slideId, 
                   variantId: 'v1', 
                   zoneId: update.zoneId as any,
                   scale: update.style.scale,
                   fit: update.style.fit
                }
             });
        }

        if (update.glass) {
             // For charts, we also want to maybe dim the background or add glass effect to text
             dispatch({
                type: 'TOGGLE_TEXT_GLASS',
                payload: { slideId: update.slideId, variantId: 'v1', enabled: true }
             });
             // Also add a shape mask to background to reduce noise behind chart
             dispatch({
                type: 'UPDATE_SHAPE_MASK',
                payload: { 
                   slideId: update.slideId, 
                   variantId: 'v1', 
                   mask: { type: ShapeType.None, color: '#000000', opacity: 0.4 } // Dim overlay
                }
             });
        }
    }

    await checkControl(control);
    dispatch({ type: 'APPROVE_STAGE', payload: Stage.Architect });
    
    dispatch({ type: 'SET_STAGE', payload: Stage.Publisher });
    onStatusUpdate("Mission Complete");

  } catch (err) {
    if ((err as Error).message === "YOLO Pipeline Aborted") {
        // Suppress error log for manual aborts
        onStatusUpdate("Aborted by user.");
    } else {
        console.error("YOLO Pipeline Failed", err);
        onStatusUpdate("Error in YOLO pipeline. Check console.");
    }
    throw err;
  }
};
