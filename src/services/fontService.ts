
import JSZip from 'jszip';
// @ts-ignore
import FileSaver from 'file-saver';

// Handle CDN export discrepancies for file-saver
const saveAs = (FileSaver && FileSaver.saveAs) ? FileSaver.saveAs : FileSaver;

export const downloadFontPack = async (fontNames: string[], projectId: string) => {
  const zip = new JSZip();
  const folder = zip.folder("fonts_to_install");
  
  if (!folder) return;

  // Filter out system/default fonts that don't need downloading
  const uniqueFonts = [...new Set(fontNames.filter(f => f && f.trim() !== '' && f !== 'Inter' && f !== 'Arial' && f !== 'Helvetica' && f !== 'Sans-Serif'))];
  
  if (uniqueFonts.length === 0) {
      throw new Error("No custom Google Fonts detected in this brand (Inter/Arial are standard).");
  }

  // Helper to wait
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const font of uniqueFonts) {
      try {
          // 1. Fetch CSS from Google to find the binary URL
          // We request the font with multiple weights to ensure bold works
          const cssUrl = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
          const cssResp = await fetch(cssUrl);
          const cssText = await cssResp.text();

          // 2. Extract WOFF2 URLs (Regex for src: url(...))
          // Google CSS often contains multiple @font-face blocks (for different charsets)
          // We greedily grab the first latin-like one or just all unique URLs.
          const urlMatches = cssText.matchAll(/src:\s*url\(([^)]+)\)/g);
          const urls = Array.from(urlMatches).map(m => m[1]);
          
          if (urls.length > 0) {
              // Usually the last one is Latin or contains the most glyphs in standard Google CSS
              const fontUrl = urls[urls.length - 1]; 
              
              // 3. Fetch Font Blob
              const fontResp = await fetch(fontUrl);
              const fontBlob = await fontResp.blob();
              
              // 4. Add to Zip (using ttf extension so OS recognizes it easily, though woff2 works on modern OS too)
              // We'll stick to .woff2 as it's what Google usually serves modern browsers
              folder.file(`${font.replace(/\s+/g, '_')}.woff2`, fontBlob);
          } else {
              folder.file(`${font}_error.txt`, `Could not extract binary URL from CSS. Download manually at fonts.google.com/specimen/${font.replace(/\s+/g, '+')}`);
          }
          
          await delay(200); // Politeness delay
      } catch (e) {
          console.error(`Failed to fetch font ${font}`, e);
          folder.file(`${font}_error.txt`, "Could not auto-fetch. Please download manually from fonts.google.com");
      }
  }
  
  folder.file("INSTRUCTIONS.txt", "1. Unzip this folder.\n2. Right-click the font files.\n3. Select 'Install' (or double click and Install).\n4. Restart PowerPoint fully to see the fonts.");

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${projectId}_FontPack.zip`);
};
