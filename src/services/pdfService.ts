
import { jsPDF } from "jspdf";
import { RunDoc } from "../types";

/**
 * PDF Export Service (V3 - Parity Focus)
 * This version uses the actual rendered DOM to ensure that Google Fonts, 
 * AutoFit measurements, and CSS effects (Grain, Vignette) are preserved 
 * exactly as they appear in the Publisher.
 */
export const generatePDF = async (runDoc: RunDoc, customFilename?: string) => {
  // Capture all elements with the "canonical-slide" class
  const slides = document.querySelectorAll('.canonical-slide');
  
  if (!slides.length) {
    throw new Error("Export Failed: Rendering engine needs active DOM context. Please ensure Publisher tab is visible.");
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080],
    hotfixes: ["px_scaling"]
  });

  // Adaptive scaling to prevent memory crash on large decks
  // 2x is Retinal quality, but 1.5x is usually sufficient for 1080p PDFs
  const count = slides.length;
  let renderScale = 2;
  if (count > 10) renderScale = 1.5;
  if (count > 25) renderScale = 1.25;
  if (count > 40) renderScale = 1.0;

  console.log(`Exporting ${count} slides at ${renderScale}x scale...`);

  const html2canvas = (window as any).html2canvas;

  for (let i = 0; i < slides.length; i++) {
    const slideEl = slides[i] as HTMLElement;
    if (i > 0) doc.addPage([1920, 1080], 'landscape');

    if (html2canvas) {
       try {
           const canvas = await html2canvas(slideEl, {
              scale: renderScale,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              logging: false
           });
           
           const imgData = canvas.toDataURL('image/jpeg', 0.85); // Moderate compression
           doc.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
           
           // Hint for Garbage Collection
           canvas.width = 0;
           canvas.height = 0;
           canvas.remove();
       } catch (err) {
           console.error(`Failed to rasterize slide ${i+1}`, err);
           // Fallback visual
           doc.setFillColor('#FFDDDD');
           doc.rect(0, 0, 1920, 1080, 'F');
           doc.setFontSize(24);
           doc.setTextColor('#FF0000');
           doc.text(`Error rendering slide ${i+1}`, 100, 100);
       }
    } else {
       // Manual Fallback if capture fails (Similar to v2 but simplified)
       doc.setFillColor('#FFFFFF');
       doc.rect(0, 0, 1920, 1080, 'F');
       doc.setFontSize(40);
       doc.text("Export Capture System initializing...", 960, 540, { align: 'center' });
    }
  }

  const filename = customFilename || `${runDoc.project_id}_Deck.pdf`;
  doc.save(filename);
};
