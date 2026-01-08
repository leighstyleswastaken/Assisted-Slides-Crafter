
// This file now acts as a Facade, re-exporting functionality from the specialized sub-modules.
// This preserves existing imports in the application.

export { GeminiEvents } from './ai/core';
export { generateBranding, validateBranding, generateOutline } from './ai/strategist';
export { generateImageConcepts, generateAssetImage } from './ai/art';
export { suggestLayout, suggestLayoutStrategy } from './ai/architect';
export { generateSlideCopy } from './ai/copywriter';
