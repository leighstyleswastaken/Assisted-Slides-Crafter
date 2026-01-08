
export interface WaveConfig {
  frequency: number; // How many waves (1-4)
  amplitude: number; // Wave height (0-200)
  offset: number; // Phase shift (0-100)
  flip: boolean; // Bottom wave vs top wave
}

export const generateWavePath = (width: number, height: number, config: WaveConfig): string => {
  const { frequency, amplitude, offset, flip } = config;
  
  const points = 200; // Smoothness
  const waveHeight = (amplitude / 100) * height * 0.3; // Max 30% of height
  const yBase = flip ? height : 0;
  const yDirection = flip ? -1 : 1;
  
  let path = `M 0 ${flip ? height : 0} `;
  
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const normalizedX = (x / width) * Math.PI * 2 * frequency;
    const phase = (offset / 100) * Math.PI * 2;
    const y = yBase + (Math.sin(normalizedX + phase) * waveHeight * yDirection);
    
    path += `L ${x} ${y} `;
  }
  
  // Close the path
  path += `L ${width} ${flip ? height : 0} `;
  path += `L ${width} ${flip ? 0 : height} `;
  path += `L 0 ${flip ? 0 : height} Z`;
  
  return path;
};

export const generateBlobPath = (width: number, height: number, seed: number): string => {
  // Organic blob using Perlin noise approximation
  const points = 12;
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width * 0.35;
  const radiusY = height * 0.35;
  
  let path = 'M ';
  
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    // Pseudo-random noise based on seed and angle
    const noise = Math.sin(seed + angle * 3.7) * 0.3 + 0.7; // 0.4 to 1.0
    const x = centerX + Math.cos(angle) * radiusX * noise;
    const y = centerY + Math.sin(angle) * radiusY * noise;
    
    path += `${i === 0 ? '' : 'L '}${x} ${y} `;
  }
  
  path += 'Z';
  return path;
};

export const generateDiagonalPath = (width: number, height: number, flip: boolean): string => {
  if (flip) {
    return `M 0 0 L ${width} ${height * 0.7} L ${width} ${height} L 0 ${height} Z`;
  }
  return `M 0 ${height * 0.3} L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
};

export const generateArcPath = (width: number, height: number, flip: boolean): string => {
  const controlPointY = flip ? height * 1.5 : -height * 0.5;
  
  return `M 0 ${flip ? height : 0} Q ${width / 2} ${controlPointY} ${width} ${flip ? height : 0} L ${width} ${flip ? 0 : height} L 0 ${flip ? 0 : height} Z`;
};
