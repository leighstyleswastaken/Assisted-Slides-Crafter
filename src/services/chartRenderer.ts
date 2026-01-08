
import { ChartData } from '../types';

/**
 * Parses raw text (e.g. key facts) to try and extract chartable numbers.
 * Heuristic based.
 */
export const extractChartDataFromText = (text: string): ChartData => {
  // 1. Try to find percentages
  const percentages = text.match(/(\d+)%/g);
  if (percentages && percentages.length > 1) {
    const values = percentages.map(p => parseInt(p.replace('%', '')));
    return {
      type: 'pie',
      values: values.slice(0, 5), // Limit slices
      title: 'Data Distribution'
    };
  }

  // 2. Try to find loose large numbers (e.g. for a bar chart)
  const numbers = text.match(/\b\d{2,6}\b/g);
  if (numbers && numbers.length > 1) {
    const values = numbers.map(n => parseInt(n));
    return {
      type: 'bar',
      values: values.slice(0, 6),
      title: 'Key Metrics'
    };
  }

  // Fallback Dummy Data
  return {
    type: 'bar',
    values: [35, 60, 45, 80, 55],
    title: 'Growth Projection'
  };
};

/**
 * Draws a high-contrast black & white "Ghost" chart.
 * This image is used as a structural control input for the AI.
 * White shapes on Black background tells the AI "Draw something here".
 */
export const generateGhostChart = (data: ChartData): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw High Contrast Background (Black)
  // Black represents "Void" or "Background" to the AI controlnet-like process
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Draw Structural Elements (White)
  // White represents "Matter" or "Object"
  ctx.fillStyle = '#FFFFFF';
  
  if (data.type === 'bar') {
    const marginX = 100;
    const marginY = 150;
    const availableWidth = 1024 - (marginX * 2);
    const availableHeight = 1024 - (marginY * 2);
    
    const barCount = data.values.length;
    const barWidth = (availableWidth / barCount) * 0.6; // 60% bar, 40% gap
    const gap = (availableWidth / barCount) * 0.4;
    
    const maxValue = Math.max(...data.values) * 1.1; // 10% headroom
    
    data.values.forEach((val, i) => {
      const height = (val / maxValue) * availableHeight;
      const x = marginX + (i * (barWidth + gap)) + (gap / 2);
      const y = 1024 - marginY - height;
      
      // Draw the block
      ctx.fillRect(x, y, barWidth, height);
    });
    
    // Draw Axis Line
    ctx.fillRect(marginX, 1024 - marginY, availableWidth, 4);

  } else if (data.type === 'pie') {
    const centerX = 512;
    const centerY = 512;
    const radius = 400;
    const total = data.values.reduce((a, b) => a + b, 0);
    
    let startAngle = 0;
    
    data.values.forEach((val, i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      
      // Use alternating shades of grey/white to distinctify slices for the AI
      // Pure white vs Light Grey
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#CCCCCC';
      ctx.fill();
      
      // Gap between slices
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      
      startAngle += sliceAngle;
    });
  }

  // NOTE: We do NOT draw text labels. 
  // LLMs struggle to render small legible text inside images.
  // We rely on the React Overlay system (Stage 4) to place HTML text labels *over* the generated image.

  return canvas.toDataURL('image/png').split(',')[1]; // Return base64 data portion only
};
