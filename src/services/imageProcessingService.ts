
import { removeBackground } from "@imgly/background-removal";

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Compresses a base64 image string by drawing it to a canvas and exporting as WebP.
 * Significantly reduces RAM usage and JSON file size.
 * @param base64Str Source image
 * @param quality 0.0 - 1.0 (default 0.8)
 * @param mimeType Target format (default image/webp)
 * @param maxWidth Max dimension to downscale to (default 1920)
 */
export const compressImage = (base64Str: string, quality = 0.8, mimeType = 'image/webp', maxWidth = 1920): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down if too large to save memory/storage
      if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * scale);
      }

      // Create offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        // Fallback to original if context fails
        console.warn("Compression failed (no context), using original.");
        resolve(base64Str); 
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        // Convert to optimized format
        const compressed = canvas.toDataURL(mimeType, quality);
        // Safety check: if compressed is somehow larger (rare), use original
        if (compressed.length < base64Str.length) {
           resolve(compressed);
        } else {
           resolve(base64Str);
        }
      } catch (e) {
        console.warn("Compression failed (export), using original.", e);
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      console.warn("Compression failed (load), using original.");
      resolve(base64Str);
    };
  });
};

/**
 * AI-powered background removal using @imgly/background-removal
 * This uses a neural network to detect the foreground subject.
 */
export const removeBackgroundAI = async (imageSrc: string | Blob): Promise<string> => {
  try {
    // removeBackground handles downloading the WASM model automatically
    const blob = await removeBackground(imageSrc);
    return await blobToBase64(blob);
  } catch (error) {
    console.error("AI Background Removal Failed:", error);
    throw new Error("AI removal failed. Try Magic Wand instead.");
  }
};

/**
 * Color Key Removal ("Green Screen" style).
 * Samples the 4 corners of the image to find the average background color,
 * then removes that color globally from the entire image (not just contiguous regions).
 */
export const removeBackgroundColorKey = async (imageSrc: string | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { reject(new Error("No context")); return; }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Sample corners to find the "Key Color"
      const corners = [0, w-1, (h-1)*w, (h-1)*w + w-1];
      let r=0, g=0, b=0, c=0;
      corners.forEach(idx => {
         const i = idx * 4;
         r += data[i]; g += data[i+1]; b += data[i+2]; c++;
      });
      const keyR = r/c;
      const keyG = g/c;
      const keyB = b/c;

      const tolerance = 60; // Tunable tolerance for compression artifacts
      const tolSq = tolerance * tolerance;

      for (let i = 0; i < data.length; i += 4) {
          const dr = data[i] - keyR;
          const dg = data[i+1] - keyG;
          const db = data[i+2] - keyB;
          
          // Euclidean distance check
          if (dr*dr + dg*dg + db*db < tolSq) {
              data[i+3] = 0; // Set Alpha to 0
          }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    if (imageSrc instanceof Blob) img.src = URL.createObjectURL(imageSrc);
    else img.src = imageSrc;
  });
};

/**
 * A robust "Magic Wand" implementation for background removal.
 * Uses edge-connected flood fill to remove backgrounds that match the border colors.
 * Includes a feathering pass to reduce jagged edges.
 */
export const removeBackgroundMagicWand = async (imageSrc: string | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Enable CORS if using external URLs
    img.crossOrigin = "Anonymous"; 
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;
      
      // --- 1. Color Model (Sampling Borders) ---
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      
      // Sample perimeter with a step to keep it fast but representative
      const step = Math.max(1, Math.floor(Math.min(width, height) / 50)); 
      
      const sample = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        rSum += data[i]; 
        gSum += data[i+1]; 
        bSum += data[i+2]; 
        count++;
      };
      
      for (let x = 0; x < width; x += step) { sample(x, 0); sample(x, height - 1); }
      for (let y = 0; y < height; y += step) { sample(0, y); sample(width - 1, y); }
      
      const bgR = rSum / (count || 1);
      const bgG = gSum / (count || 1);
      const bgB = bSum / (count || 1);
      
      // --- 2. Flood Fill (BFS) ---
      // Tolerance tuned for AI-generated "solid" backgrounds which often have noise/gradients
      // A slightly higher tolerance helps catch compression artifacts
      const tolerance = 60; 
      
      // Use Int32Array for queue to avoid extensive object allocation
      const visited = new Uint8Array(width * height);
      const queue = new Int32Array(width * height); 
      let qHead = 0;
      let qTail = 0;

      const push = (x: number, y: number) => {
         if (x < 0 || x >= width || y < 0 || y >= height) return;
         const idx = y * width + x;
         if (visited[idx]) return;

         const i = idx * 4;
         const r = data[i], g = data[i+1], b = data[i+2];
         
         // Euclidean distance squared is faster (avoid sqrt)
         // Tolerance squared: 60*60 = 3600
         const distSq = (r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2;

         if (distSq < (tolerance * tolerance)) {
             visited[idx] = 1; // Mark as background
             queue[qTail++] = idx;
         }
      };

      // Seed from all borders
      for (let x = 0; x < width; x++) { push(x, 0); push(x, height-1); }
      for (let y = 1; y < height-1; y++) { push(0, y); push(width-1, y); }

      // Process Queue (BFS)
      while (qHead < qTail) {
          const idx = queue[qHead++];
          const x = idx % width;
          const y = (idx - x) / width;
          
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
      }

      // --- 3. Apply Mask & Feather ---
      for (let i = 0; i < width * height; i++) {
          if (visited[i]) {
              // Background -> Transparent
              data[i * 4 + 3] = 0; 
          } else {
              // Foreground -> Check for edge smoothing
              // If a foreground pixel touches a background pixel, reduce its alpha
              const x = i % width;
              const y = (i - x) / width;
              let bgNeighbors = 0;
              
              if (x > 0 && visited[i-1]) bgNeighbors++;
              if (x < width-1 && visited[i+1]) bgNeighbors++;
              if (y > 0 && visited[i-width]) bgNeighbors++;
              if (y < height-1 && visited[i+width]) bgNeighbors++;
              
              // Simple anti-aliasing/feathering for edge pixels
              if (bgNeighbors > 0) {
                  const currentAlpha = data[i * 4 + 3];
                  // Feather: The more exposed to BG, the more transparent
                  data[i * 4 + 3] = Math.max(0, currentAlpha - (bgNeighbors * 64)); 
              }
          }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (e) => reject(new Error("Failed to load image for processing"));
    
    // Handle Blob or Data URI
    if (imageSrc instanceof Blob) {
       img.src = URL.createObjectURL(imageSrc);
    } else {
       img.src = imageSrc;
    }
  });
};
