/**
 * Dynamically loads Google Fonts by injecting a <link> tag into the head.
 * @param fonts Array of font family names (e.g., ['Roboto', 'Open Sans'])
 */
export const loadGoogleFonts = (fonts: string[]) => {
  if (!fonts || fonts.length === 0) return;

  // Filter out duplicate or standard fonts that might break the API query
  const validFonts = fonts.filter(f => f && f.length > 0 && f !== 'Inter' && f !== 'JetBrains Mono');
  
  if (validFonts.length === 0) return;

  const fontQuery = validFonts.map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;700`).join('&');
  const href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;

  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.href = href;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    console.log(`Loaded fonts: ${validFonts.join(', ')}`);
  }
};
