
import { Asset, ShapeType } from "../../types";
import { generateWavePath, generateBlobPath, generateDiagonalPath, generateArcPath } from "../shapeService";

// Helper to rasterize complex SVG shape masks + peek layers into a single image for PPTX
export const rasterizeShapeLayer = async (
  primaryAsset: Asset | undefined,
  peekAsset: Asset | undefined,
  shapeMask: any,
  width: number,
  height: number
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(''); return; }

    const loadImg = (uri: string) => new Promise<HTMLImageElement>((res) => {
       const img = new Image();
       img.crossOrigin = 'anonymous';
       img.onload = () => res(img);
       img.src = uri;
    });

    (async () => {
       try {
          // 1. Draw Peek Asset (Bottom Layer)
          if (peekAsset?.uri) {
             const img = await loadImg(peekAsset.uri);
             // Cover logic
             const scale = Math.max(width / img.width, height / img.height);
             const x = (width / 2) - (img.width / 2) * scale;
             const y = (height / 2) - (img.height / 2) * scale;
             ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          }

          // 2. Draw Primary Asset (Top Layer) clipped by Shape
          if (primaryAsset?.uri) {
             ctx.save();
             
             // Define Path
             let d = '';
             const intensity = shapeMask.intensity ?? 50;
             const flip = shapeMask.flip ?? false;

             if (shapeMask.type === ShapeType.Wave) d = generateWavePath(width, height, { frequency: 2, amplitude: intensity, offset: 25, flip });
             else if (shapeMask.type === ShapeType.Blob) d = generateBlobPath(width, height, intensity);
             else if (shapeMask.type === ShapeType.Diagonal) d = generateDiagonalPath(width, height, flip);
             else if (shapeMask.type === ShapeType.Arc) d = generateArcPath(width, height, flip);
             
             if (d) {
                const path = new Path2D(d);
                ctx.clip(path);
             }

             const img = await loadImg(primaryAsset.uri);
             // Cover logic
             const scale = Math.max(width / img.width, height / img.height);
             const x = (width / 2) - (img.width / 2) * scale;
             const y = (height / 2) - (img.height / 2) * scale;
             ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

             // Color Overlay
             if (shapeMask.color && shapeMask.opacity) {
                ctx.globalAlpha = shapeMask.opacity;
                ctx.fillStyle = shapeMask.color;
                ctx.fillRect(0, 0, width, height);
             }

             ctx.restore();
          }
          
          resolve(canvas.toDataURL('image/png'));
       } catch (e) {
          console.error("Shape rasterization failed", e);
          resolve('');
       }
    })();
  });
};
