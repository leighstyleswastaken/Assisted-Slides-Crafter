
import { RunDoc, Stage, StageStatus, AspectRatio, AssetKind, TextLayout, BoxTransform, BrandKit } from './types';

export const PRESENTATION_TYPES = [
  { id: 'pitch', label: 'Pitch Deck', icon: '🚀', desc: 'Persuasive. Problem, Solution, Market, Ask.' },
  { id: 'educational', label: 'Educational / Workshop', icon: '🎓', desc: 'Informative. Concepts, Steps, Key Takeaways.' },
  { id: 'status', label: 'Status Report', icon: '📊', desc: 'Update. Progress, Metrics, Blockers, Next Steps.' },
  { id: 'narrative', label: 'Story / Narrative', icon: '📖', desc: 'Emotional. Hook, Journey, Climax, Resolution.' },
  { id: 'generic', label: 'General Presentation', icon: '📑', desc: 'Balanced. Introduction, Body, Conclusion.' },
];

export const BRAND_KITS: BrandKit[] = [
  {
    id: 'startup_tech',
    name: 'Tech Startup',
    palette: ['#3b82f6', '#0f172a', '#ffffff', '#cbd5e1'],
    text_color: '#ffffff',
    background_color: '#0f172a',
    fonts: ['Inter', 'Roboto'],
    tone: 'Modern, Clean, Innovative'
  },
  {
    id: 'nature_eco',
    name: 'Eco / Nature',
    palette: ['#064e3b', '#10b981', '#ecfdf5', '#f59e0b'],
    text_color: '#064e3b',
    background_color: '#ecfdf5',
    fonts: ['Merriweather', 'Lato'],
    tone: 'Organic, Fresh, Trustworthy'
  },
  {
    id: 'luxury_dark',
    name: 'Luxury Dark',
    palette: ['#000000', '#fbbf24', '#262626', '#d4d4d4'],
    text_color: '#ffffff',
    background_color: '#000000',
    fonts: ['Playfair Display', 'Lato'],
    tone: 'Elegant, Premium, Sophisticated'
  },
  {
    id: 'vibrant_pop',
    name: 'Vibrant Pop',
    palette: ['#db2777', '#7c3aed', '#fff1f2', '#111827'],
    text_color: '#111827',
    background_color: '#fff1f2',
    fonts: ['Poppins', 'Open Sans'],
    tone: 'Energetic, Playful, Bold'
  }
];

export const INITIAL_RUN_DOC: RunDoc = {
  project_id: `proj_${Date.now()}`,
  version: 2,
  last_modified: new Date().toISOString(),
  stage: Stage.Strategist,
  presentation_type: 'pitch', // Default
  stage_status: {
    1: StageStatus.Open,
    2: StageStatus.Locked,
    3: StageStatus.Locked,
    4: StageStatus.Locked,
    5: StageStatus.Locked,
  },
  revisions: {
    source: 0,
    branding: 0,
    outline: 0,
  },
  source_material: {
    type: 'text',
    content: '',
  },
  branding: {
    tone: 'Professional, Clean, Impactful',
    palette: ['#000000', '#FFFFFF'],
    text_color: '#FFFFFF',
    background_color: '#030712', // gray-950
    fonts: ['Inter'],
    keywords: [],
    visual_features: []
  },
  asset_library: [],
  outline: [],
  deck_settings: {
    aspect_ratio: AspectRatio.SixteenNine,
    base_width_px: 1920,
    base_height_px: 1080,
    render_scale_mode: 'transform_scale',
  },
  ai_settings: {
    textModel: 'gemini-3-flash-preview',
    imageModel: 'gemini-2.5-flash-image',
    mockMode: false
  },
  slides: [],
  history: {
    events: [],
  },
  undoStack: [],
  redoStack: []
};

export const LAYOUT_PRESETS: Record<TextLayout, Record<string, BoxTransform>> = {
  [TextLayout.HeadlineBody]: {
    headline: { x: 5, y: 8, w: 90, h: 20 },
    body: { x: 5, y: 32, w: 90, h: 60 }
  },
  [TextLayout.TwoColumn]: {
    headline: { x: 5, y: 8, w: 90, h: 15 },
    column_left: { x: 5, y: 28, w: 42.5, h: 64 },
    column_right: { x: 52.5, y: 28, w: 42.5, h: 64 }
  },
  [TextLayout.BulletsOnly]: {
    headline: { x: 5, y: 8, w: 90, h: 15 },
    bullets: { x: 10, y: 28, w: 80, h: 64 }
  },
  [TextLayout.Quote]: {
    quote: { x: 10, y: 20, w: 80, h: 40 },
    author: { x: 10, y: 65, w: 80, h: 10 }
  },
  [TextLayout.ImageCaption]: {
    headline: { x: 5, y: 72, w: 90, h: 10 },
    caption: { x: 5, y: 84, w: 90, h: 10 }
  }
};

export const STAGE_NAMES = {
  [Stage.Strategist]: 'Strategist',
  [Stage.ArtDept]: 'Art Dept',
  [Stage.Architect]: 'Architect',
  [Stage.Copywriter]: 'Copywriter',
  [Stage.Publisher]: 'Publisher',
};

export const STAGE_DESCRIPTIONS = {
  [Stage.Strategist]: 'Analysis, branding, and outline generation.',
  [Stage.ArtDept]: 'Asset generation, curation, and background removal.',
  [Stage.Architect]: 'Layout skeleton and zone assignment.',
  [Stage.Copywriter]: 'Content filling and copy polish.',
  [Stage.Publisher]: 'Final polish and PDF export.',
};

export const POPULAR_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Raleway", "Merriweather", "Playfair Display", "Nunito", "Poppins", "Lora", "Titillium Web", "Ubuntu", "Bebas Neue", "Lobster", "Abril Fatface", "Pacifico"
];
