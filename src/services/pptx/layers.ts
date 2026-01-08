
import pptxgen from "pptxgenjs";
import { SlideVariant, Asset, ShapeType, BoxTransform } from "../../types";
import { LAYOUT_PRESETS } from "../../constants";
import { rasterizeShapeLayer } from "./utils";

const SLIDE_WIDTH_IN = 10;
const SLIDE_HEIGHT_IN = 5.625;
const PX_TO_PT_RATIO = 0.375;
const LINE_HEIGHT_RATIO = 1.2;

export const applyBackground = async (pptSlide: pptxgen.Slide, variant: SlideVariant, assets: Asset[], bgColor: string) => {
    const bgZone = variant.zones['background'];
    const bgAsset = assets.find(a => a.id === bgZone?.asset_id);
    const peekAsset = bgZone?.peek_asset_id ? assets.find(a => a.id === bgZone.peek_asset_id) : undefined;
    
    // Base Layer: Solid Background Color
    pptSlide.background = { color: bgColor };

    // CASE A: Shape Mask is Active
    if (bgZone?.shape_mask && bgZone.shape_mask.type !== ShapeType.None && (bgAsset || peekAsset)) {
       const compositeUri = await rasterizeShapeLayer(bgAsset, peekAsset, bgZone.shape_mask, 1920, 1080);
       if (compositeUri) {
          pptSlide.background = { data: compositeUri };
       }
       return;
    }

    // CASE B: Standard Single Image
    if (bgAsset && bgAsset.uri) {
        const fitMode = bgZone?.content_fit || 'cover';
        
        if (fitMode === 'fill') {
            pptSlide.background = { data: bgAsset.uri };
        } else {
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

export const addAssetGrid = (pptSlide: pptxgen.Slide, variant: SlideVariant, assets: Asset[]) => {
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

        // Apply Scale factor
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

export const addTextLayer = (pptSlide: pptxgen.Slide, variant: SlideVariant, brandFont: string, textColor: string) => {
    const layoutFields = LAYOUT_PRESETS[variant.text_layout] || {};
    const transforms: Record<string, BoxTransform> = {};
    Object.keys(layoutFields).forEach(key => { transforms[key] = variant.text_transform?.[key] || layoutFields[key]; });

    for (const [field, transform] of Object.entries(transforms)) {
        const text = variant.text_content[field];
        if (!text) continue;
        
        const x = (transform.x / 100) * SLIDE_WIDTH_IN;
        const y = (transform.y / 100) * SLIDE_HEIGHT_IN;
        const w = (transform.w / 100) * SLIDE_WIDTH_IN;
        const h = (transform.h / 100) * SLIDE_HEIGHT_IN;
        
        const storedSizePx = variant.text_font_size?.[field] || (field === 'headline' || field === 'quote' ? 100 : 40);
        const fontSizePT = Math.round(storedSizePx * PX_TO_PT_RATIO);

        pptSlide.addText(text, {
            x, y, w, h,
            fontSize: fontSizePT,
            color: textColor,
            bold: variant.text_bold?.[field] ?? (field === 'headline' || field === 'quote'),
            italic: variant.text_italic?.[field] ?? false,
            align: variant.text_alignment?.[field] || 'left',
            valign: variant.text_vertical_alignment?.[field] || 'middle',
            fontFace: variant.text_font_family?.[field] || brandFont,
            lineSpacing: Math.round(fontSizePT * LINE_HEIGHT_RATIO), 
            margin: 10,
            wrap: true,
            shrinkText: true 
        });
    }
};
