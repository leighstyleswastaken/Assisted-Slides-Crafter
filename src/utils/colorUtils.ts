
/**
 * Calculates the relative luminance of a color
 */
const getLuminance = (r: number, g: number, b: number) => {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

/**
 * Returns either black or white depending on which contrasts better with the background color.
 * Uses WCAG guidelines.
 * @param hexColor Background color in hex format
 */
export const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = getLuminance(r, g, b);
  
  // Threshold of 0.5 is standard, but 0.179 is WCAG cutoff. 
  // Visual preference often leans towards black only on very light backgrounds.
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
};

/**
 * Extracts a palette of dominant colors from an image URL.
 * Uses a simplified histogram approach on a canvas.
 */
export const extractPaletteFromImage = async (imageSrc: string, colorCount: number = 5): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Downscale for performance
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('No context'); return; }
      
      const width = 100;
      const height = Math.floor((width / img.width) * img.height);
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height).data;
      const colorMap: Record<string, number> = {};
      
      // Sampling step
      for (let i = 0; i < imageData.length; i += 4 * 10) {
         const r = Math.round(imageData[i] / 10) * 10; // Quantize
         const g = Math.round(imageData[i+1] / 10) * 10;
         const b = Math.round(imageData[i+2] / 10) * 10;
         const a = imageData[i+3];
         
         if (a < 128) continue; // Skip transparent
         
         const key = `${r},${g},${b}`;
         colorMap[key] = (colorMap[key] || 0) + 1;
      }
      
      // Sort by frequency
      const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
      
      const palette = sorted.slice(0, colorCount).map(([key]) => {
         const [r, g, b] = key.split(',').map(Number);
         return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      });
      
      resolve(palette);
    };
    
    img.onerror = reject;
  });
};
