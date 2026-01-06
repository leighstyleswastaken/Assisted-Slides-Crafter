import pptxgen from "pptxgenjs";
import { RunDoc, Slide, Asset, TextLayout, ZoneId, BoxTransform, Zone, SlideVariant } from "../types";
import { LAYOUT_PRESETS } from "../constants";

/**
 * PPTX ENGINE CONSTANTS
 */
const SLIDE_WIDTH_IN = 10;
const SLIDE_HEIGHT_IN = 5.625;
const PX_TO_PT_RATIO = 0.375; // 1 Browser Pixel = 0.375 PPT Points (at 1920x1080)
const LINE_HEIGHT_RATIO = 1.2; // Match CSS line-height: 1.2

const stripHex = (hex: string) => hex.replace('#', '');

/**
 * 1. BACKGROUND HANDLER
 * Maps Architect "Fit" states to PPTX Background properties.
 */
const applyBackground = (pptSlide: pptxgen.Slide, variant: SlideVariant, assets: Asset[], bgColor: string) => {
    const bgZone = variant.zones['background'];
    const bgAsset = assets.find(a => a.id === bgZone?.asset_id);
    
    // Base Layer: Solid Background Color
    pptSlide.background = { color: bgColor };

    if (bgAsset && bgAsset.uri) {
        const fitMode = bgZone?.content_fit || 'cover';
        
        if (fitMode === 'fill') {
            // "Space" Mode: Stretch image to fill entire slide regardless of aspect ratio
            pptSlide.background = { data: bgAsset.uri };
        } else {
            // "Box" (contain) or "Crop" (cover) Modes:
            // Uses centered image sizing logic provided by PptxGenJS
            pptSlide.addImage({
                data: bgAsset.uri,
                x: 0, y: 0, 
                w: SLIDE_WIDTH_IN, 
                h: SLIDE_HEIGHT_IN,
                sizing: { 
                  type: (fitMode === 'cover' ? 'cover' : 'contain') as any, 
                  w: SLIDE_WIDTH_IN, 
                  h: SLIDE_HEIGHT_IN 
                }
            });
        }
    }
};

/**
 * 2. ASSET GRID HANDLER
 * Maps the 3x3 Cardinal Grid and user scaling to slide coordinates.
 */
const addAssetGrid = (pptSlide: pptxgen.Slide, variant: SlideVariant, assets: Asset[]) => {
    const gridPos: Record<string, {x:number, y:number}> = { 
        'nw':{x:0,y:0}, 'n':{x:33.3,y:0}, 'ne':{x:66.6,y:0}, 
        'w':{x:0,y:33.3}, 'c':{x:33.3,y:33.3}, 'e':{x:66.6,y:33.3}, 
        'sw':{x:0,y:66.6}, 's':{x:33.3,y:66.6}, 'se':{x:66.6,y:66.6} 
    };

    for (const [zoneKey, zoneData] of Object.entries(variant.zones)) {
        if (zoneKey === 'background') continue;
        const asset = assets.find(a => a.id === zoneData.asset_id);
        if (!asset || !asset.uri) continue;

        const pos = gridPos[zoneKey];
        if (!pos) continue;

        let w = SLIDE_WIDTH_IN / 3;
        let h = SLIDE_HEIGHT_IN / 3;
        let x = (pos.x / 100) * SLIDE_WIDTH_IN;
        let y = (pos.y / 100) * SLIDE_HEIGHT_IN;

        // Apply Scale factor (0.5x, 1x, 1.5x) from center
        const scale = zoneData.scale || 1;
        if (scale !== 1) { 
            const oldW = w; const oldH = h; 
            w *= scale; h *= scale; 
            x += (oldW - w) / 2; y += (oldH - h) / 2; 
        }

        pptSlide.addImage({ 
            data: asset.uri, 
            x, y, w, h, 
            sizing: { 
                type: zoneData.content_fit === 'cover' ? 'cover' : 'contain', 
                w, h 
            } 
        });
    }
};

/**
 * 3. TEXT LAYER HANDLER
 * Converts browser typography (pixels, alignment, bold) to PPTX points.
 */
const addTextLayer = (pptSlide: pptxgen.Slide, variant: SlideVariant, brandFont: string, textColor: string) => {
    const layoutFields = LAYOUT_PRESETS[variant.text_layout] || {};
    const transforms: Record<string, BoxTransform> = {};
    Object.keys(layoutFields).forEach(key => { transforms[key] = variant.text_transform?.[key] || layoutFields[key]; });

    for (const [field, transform] of Object.entries(transforms)) {
        const text = variant.text_content[field];
        if (!text) continue;
        
        // Positioning: Percent to Inches conversion
        const x = (transform.x / 100) * SLIDE_WIDTH_IN;
        const y = (transform.y / 100) * SLIDE_HEIGHT_IN;
        const w = (transform.w / 100) * SLIDE_WIDTH_IN;
        const h = (transform.h / 100) * SLIDE_HEIGHT_IN;
        
        // Font Size: Measured Virtual Pixel to PPT Point conversion
        // Using Math.round to satisfy "Nearest Point" rounding requirement
        const storedSizePx = variant.text_font_size?.[field] || (field === 'headline' || field === 'quote' ? 100 : 40);
        const fontSizePT = Math.round(storedSizePx * PX_TO_PT_RATIO);

        pptSlide.addText(text, {
            x, y, w, h,
            fontSize: fontSizePT,
            color: textColor,
            // Respect state flags (defaults provided as fallback)
            bold: variant.text_bold?.[field] ?? (field === 'headline' || field === 'quote'),
            italic: variant.text_italic?.[field] ?? false,
            align: variant.text_alignment?.[field] || 'left',
            valign: variant.text_vertical_alignment?.[field] || 'middle',
            fontFace: variant.text_font_family?.[field] || brandFont,
            // Line Spacing: CSS 1.2 is roughly 120% leading
            lineSpacing: Math.round(fontSizePT * LINE_HEIGHT_RATIO), 
            margin: 10,
            wrap: true,
            shrinkText: true 
        });
    }
};

/**
 * PRIMARY EXPORT SERVICE
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

    // 1. Process Background (Box/Space/Crop logic)
    applyBackground(pptSlide, variant, runDoc.asset_library, backgroundColor);

    // 2. Process Asset Grid (Stamps & Motifs)
    addAssetGrid(pptSlide, variant, runDoc.asset_library);

    // 3. Process Text Layer (Font Parity & Line Spacing)
    addTextLayer(pptSlide, variant, brandFont, textColor);
  }
  
  const filename = customFilename || `${runDoc.project_id}_Deck.pptx`;
  pres.writeFile({ fileName: filename });
};