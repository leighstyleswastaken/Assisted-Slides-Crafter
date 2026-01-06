
export enum Stage {
  Strategist = 1,
  ArtDept = 2,
  Architect = 3,
  Copywriter = 4,
  Publisher = 5,
}

export enum StageStatus {
  Open = 'open',
  Locked = 'locked',
  Approved = 'approved',
  Dirty = 'dirty',
}

export enum AspectRatio {
  SixteenNine = '16:9',
  FourThree = '4:3',
}

export enum AssetKind {
  Background = 'background',
  Texture = 'texture',
  Stamp = 'stamp',
}

export enum TextLayout {
  HeadlineBody = 'headline_body',
  TwoColumn = 'two_column',
  BulletsOnly = 'bullets_only',
  Quote = 'quote',
  ImageCaption = 'image_caption',
}

export interface BoxTransform {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

export interface Zone {
  asset_id: string;
  content_fit?: 'cover' | 'contain' | 'fill'; // fill = stretch
  alignment?: string;
  scale?: number;
  allow_overflow?: boolean; // New: Allow content to bleed outside the grid zone
}

export type ZoneId = 'background' | 'nw' | 'n' | 'ne' | 'w' | 'c' | 'e' | 'sw' | 's' | 'se';

export interface SlideVariant {
  variant_id: string;
  label: string;
  zones: Record<string, Zone>;
  text_layout: TextLayout;
  text_content: Record<string, string>;
  text_transform?: Record<string, BoxTransform>;
  text_alignment?: Record<string, TextAlign>;
  text_vertical_alignment?: Record<string, VerticalAlign>;
  text_font_family?: Record<string, string>;
  text_font_size?: Record<string, number>; // Stored virtual pixels for export parity
  text_bold?: Record<string, boolean>;
  text_italic?: Record<string, boolean>;
}

export interface Slide {
  slide_id: string;
  active_variant_id: string;
  variants: SlideVariant[];
  status: { layout: string; copy: string; };
}

export interface Branding {
  tone: string;
  palette: string[];
  text_color: string;
  background_color: string;
  fonts: string[];
  style_notes?: string;
  keywords?: string[];
  visual_features?: string[];
}

export interface OutlineItem {
  slide_id: string;
  title: string;
  intent: string;
  suggest_text_layout: TextLayout;
  tags?: string[];
}

export interface Asset {
  id: string;
  kind: AssetKind;
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  uri: string;
  original_uri?: string;
  transparent: boolean;
  keep: boolean;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  prompt: string;
  linked_slide_id?: string;
  tags?: string[];
}

export interface AiSettings {
  textModel: string;
  imageModel: string;
  mockMode: boolean;
}

export interface RunDoc {
  project_id: string;
  version: number;
  last_modified: string;
  stage: Stage;
  presentation_type: string; // e.g., 'pitch', 'educational', 'status'
  stage_status: Record<number, StageStatus>;
  revisions: {
    source: number;
    branding: number;
    outline: number;
  };
  source_material: {
    type: string;
    content: string;
  };
  branding: Branding;
  asset_library: Asset[];
  outline: OutlineItem[];
  deck_settings: {
    aspect_ratio: AspectRatio;
    base_width_px: number;
    base_height_px: number;
    render_scale_mode: string;
  };
  ai_settings: AiSettings;
  slides: Slide[];
  history: {
    events: any[];
  };
  undoStack: RunDoc[];
  redoStack: RunDoc[];
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ImageConcept {
  slide_id: string;
  kind: AssetKind;
  visual_prompt: string;
  rationale: string;
}

export type Action =
  | { type: 'REHYDRATE'; payload: RunDoc }
  | { type: 'SET_STAGE'; payload: Stage }
  | { type: 'APPROVE_STAGE'; payload: Stage }
  | { type: 'UNLOCK_STAGE'; payload: Stage }
  | { type: 'UPDATE_SOURCE'; payload: { type: string; content: string } }
  | { type: 'UPDATE_BRANDING'; payload: Branding }
  | { type: 'UPDATE_OUTLINE'; payload: OutlineItem[] }
  | { type: 'UPDATE_PRESENTATION_TYPE'; payload: string }
  | { type: 'ADD_ASSETS'; payload: Asset[] }
  | { type: 'UPDATE_ASSET'; payload: Partial<Asset> & { id: string } }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'TOGGLE_ASSET_KEEP'; payload: string }
  | { type: 'KEEP_ALL_ASSETS' }
  | { type: 'PRUNE_UNKEPT_ASSETS' }
  | { type: 'UPDATE_ZONE'; payload: { slideId: string; variantId: string; zoneId: ZoneId; assetId: string } }
  | { type: 'UPDATE_ZONE_STYLE'; payload: { slideId: string; variantId: string; zoneId: ZoneId; alignment?: string; scale?: number; fit?: 'cover' | 'contain' | 'fill'; allow_overflow?: boolean } }
  | { type: 'REPLACE_ZONES'; payload: { slideId: string; variantId: string; zones: Record<string, Zone> } }
  | { type: 'APPLY_ZONE_TO_INNER'; payload: { zoneId: ZoneId; assetId: string; alignment?: string } }
  | { type: 'APPLY_LAYOUT_STRATEGY'; payload: Array<{ slideId: string; variantId: string; zones: Record<string, any> }> }
  | { type: 'UPDATE_TEXT_LAYOUT'; payload: { slideId: string; variantId: string; layout: TextLayout } }
  | { type: 'UPDATE_TEXT_CONTENT'; payload: { slideId: string; variantId: string; field: string; value: string } }
  | { type: 'UPDATE_TEXT_TRANSFORM'; payload: { slideId: string; variantId: string; field: string; transform: BoxTransform } }
  | { type: 'UPDATE_TEXT_ALIGNMENT'; payload: { slideId: string; variantId: string; field: string; alignment: TextAlign } }
  | { type: 'UPDATE_TEXT_VERTICAL_ALIGNMENT'; payload: { slideId: string; variantId: string; field: string; alignment: VerticalAlign } }
  | { type: 'UPDATE_TEXT_FONT'; payload: { slideId: string; variantId: string; field: string; font: string } }
  | { type: 'UPDATE_TEXT_FONT_SIZE'; payload: { slideId: string; variantId: string; field: string; size: number } }
  | { type: 'TOGGLE_TEXT_BOLD'; payload: { slideId: string; variantId: string; field: string } }
  | { type: 'TOGGLE_TEXT_ITALIC'; payload: { slideId: string; variantId: string; field: string } }
  | { type: 'UPDATE_PROJECT_ID'; payload: string }
  | { type: 'UPDATE_AI_SETTINGS'; payload: Partial<AiSettings> }
  | { type: 'RESET_PROJECT' }
  | { type: 'APPROVE_PROJECT' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOG_EVENT'; payload: { type: string, detail: any, timestamp?: string } }
  | { type: 'BATCH_ACTIONS'; payload: Action[] };
