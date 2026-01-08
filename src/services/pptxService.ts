
import pptxgen from "pptxgenjs";
import { RunDoc } from "../types";
import { applyBackground, addAssetGrid, addTextLayer } from "./pptx/layers";

const stripHex = (hex: string) => hex.replace('#', '');

/**
 * PRIMARY EXPORT SERVICE
 * Now acts as an orchestrator for the specialized layer handlers.
 */
export const generatePPTX = async (runDoc: RunDoc, customFilename?: string) => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; 
  
  const textColor = stripHex(runDoc.branding.text_color || '#000000');
  const backgroundColor = stripHex(runDoc.branding.background_color || '#FFFFFF');
  const brandFont = runDoc.branding.fonts[0] || 'Arial';
  
  for (const slideData of runDoc.slides) {
    const variant = slideData.variants.find(v => v.variant_id === slideData.active_variant_id);
    if (!variant) continue;
    
    const pptSlide = pres.addSlide();

    // 1. Process Background (Box/Space/Crop/Shape logic)
    await applyBackground(pptSlide, variant, runDoc.asset_library, backgroundColor);

    // 2. Process Asset Grid (Stamps & Motifs)
    addAssetGrid(pptSlide, variant, runDoc.asset_library);

    // 3. Process Text Layer (Font Parity & Line Spacing)
    addTextLayer(pptSlide, variant, brandFont, textColor);
  }
  
  const filename = customFilename || `${runDoc.project_id}_Deck.pptx`;
  pres.writeFile({ fileName: filename });
};
