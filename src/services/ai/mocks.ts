
import { AssetKind, Branding, OutlineItem, TextLayout, ImageConcept } from "../../types";

/**
 * Heuristic mapping to provide relevant emojis for mock assets
 */
export const getThematicEmoji = (prompt: string): string => {
  const p = prompt.toLowerCase();
  if (p.includes('chart') || p.includes('graph') || p.includes('data')) return '📊';
  if (p.includes('rocket') || p.includes('launch') || p.includes('start')) return '🚀';
  if (p.includes('grow') || p.includes('up')) return '📈';
  if (p.includes('team') || p.includes('people') || p.includes('human')) return '👥';
  if (p.includes('idea') || p.includes('light') || p.includes('bulb')) return '💡';
  if (p.includes('data') || p.includes('server') || p.includes('cloud')) return '☁️';
  if (p.includes('money') || p.includes('cash') || p.includes('revenue')) return '💰';
  if (p.includes('earth') || p.includes('global') || p.includes('world')) return '🌎';
  if (p.includes('shield') || p.includes('lock') || p.includes('security')) return '🛡️';
  if (p.includes('target') || p.includes('goal') || p.includes('aim')) return '🎯';
  if (p.includes('gear') || p.includes('setting') || p.includes('process')) return '⚙️';
  if (p.includes('robot') || p.includes('ai') || p.includes('chip')) return '🤖';
  if (p.includes('city') || p.includes('building')) return '🏙️';
  if (p.includes('abstract') || p.includes('art')) return '🎨';
  if (p.includes('camera') || p.includes('photo')) return '📸';
  if (p.includes('success') || p.includes('check') || p.includes('done')) return '✅';
  if (p.includes('warning') || p.includes('risk') || p.includes('alert')) return '⚠️';
  if (p.includes('network') || p.includes('connect')) return '🌐';
  if (p.includes('ship') || p.includes('logistics') || p.includes('truck')) return '🚚';
  if (p.includes('energy') || p.includes('power') || p.includes('bolt')) return '⚡';
  return '📦'; 
};

export const createMockImage = (prompt: string, kind: AssetKind = AssetKind.Background): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const emoji = getThematicEmoji(prompt);

  // 1. Draw Background based on kind
  if (kind === AssetKind.Background) {
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    // "Project Red Dust" Theme: Deep Mars Atmosphere
    gradient.addColorStop(0, '#1a0505'); // Deep Dark Red/Black
    gradient.addColorStop(1, '#7c2d12'); // Martian Soil Brown/Red
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ef4444'; // Bright Red Accent
    ctx.beginPath();
    ctx.arc(800, 200, 300, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

  } else if (kind === AssetKind.Stamp || kind === AssetKind.Chart) {
    // STAMPS/CHARTS: White background for transparency
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 1024);
    
    ctx.font = '650px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(emoji, 512, 512);

  } else {
    // Textures: Subtle clean grid
    ctx.fillStyle = '#0c0a09'; // Warm Black
    ctx.fillRect(0, 0, 1024, 1024);
    
    ctx.strokeStyle = '#290e0e'; // Dark Red Grid
    ctx.lineWidth = 2;
    for(let i=0; i<1024; i+=128) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
    }
  }

  // Label for developer transparency
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 950, 1024, 74);
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`MOCK ${kind.toUpperCase()} INTERCEPT: ${emoji}`, 512, 995);

  return canvas.toDataURL('image/png');
};

export const mockBranding = (): Branding => ({
  tone: "Technological, Adventurous, Martian",
  palette: ["#ef4444", "#7c2d12", "#0c0a09"],
  text_color: "#ffffff",
  background_color: "#0c0a09",
  fonts: ["Orbitron", "Inter"],
  style_notes: "Cinematic red dust atmospheres with clean tech white overlays.",
  keywords: ["Mars", "Future", "Success"],
  visual_features: ["Basalt base", "Solar panels", "Dust storms"],
  key_facts: ["Oxygen levels at 95%", "3D Printed Habitat: 400sqft", "Mission Duration: 18 Months"],
  data_visualizations: ["Bar chart showing oxygen generation over time"]
});

export const mockOutline = (): OutlineItem[] => [
  { slide_id: "m1", title: "Project Red Dust", intent: "Visionary Introduction", suggest_text_layout: TextLayout.HeadlineBody },
  { slide_id: "m2", title: "Atmospheric Harvest", intent: "Oxygen Generation Tech", suggest_text_layout: TextLayout.TwoColumn },
  { slide_id: "m3", title: "Mission Critical", intent: "Final Call to Action", suggest_text_layout: TextLayout.HeadlineBody }
];

export const mockConcepts = (outline: OutlineItem[]): ImageConcept[] => {
  return [
     { slide_id: outline[0].slide_id, kind: AssetKind.Background, visual_prompt: "Martian landscape at sunset", rationale: "Intro" },
     { slide_id: "kit_content", kind: AssetKind.Background, visual_prompt: "Subtle dark rocky texture", rationale: "Content" },
     { slide_id: "kit_deco", kind: AssetKind.Stamp, visual_prompt: "Futuristic Mars Colony Logo", rationale: "Deco" },
     { slide_id: "kit_chart", kind: AssetKind.Chart, visual_prompt: "Bar chart showing oxygen growth", rationale: "Data" }
  ];
};
