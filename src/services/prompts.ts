
import { Branding, OutlineItem, AssetKind, Asset, RunDoc, Slide } from "../types";

// Helper to ensure we never pass empty strings to the LLM
const safe = (val: string | undefined | null): string => {
  if (!val || val.trim() === '') return "Nothing";
  return val;
};

const PRESENTATION_STRUCTURES: Record<string, string> = {
  'pitch': `
    STRUCTURE: Pitch Deck (Persuasive)
    1. The Hook / Problem: Define the pain point clearly.
    2. The Solution: Introduce the product/service.
    3. The Market: Evidence of demand or opportunity size.
    4. Business Model / Traction: How it makes money or proof it works.
    5. The Team / Ask: Who is building it and what do they need.
  `,
  'educational': `
    STRUCTURE: Educational / Workshop (Informative)
    1. Introduction / Learning Goal: What will be learned.
    2. Core Concept 1: Definition and explanation.
    3. Core Concept 2 / Case Study: Application or example.
    4. Practical Steps / How-To: Actionable instructions.
    5. Summary / Key Takeaways: Recap of main points.
  `,
  'status': `
    STRUCTURE: Status Report (Data-Driven)
    1. Executive Summary: High-level health check.
    2. Key Achievements: What was done since last time.
    3. Metrics / KPIs: Data visualization and numbers.
    4. Blockers / Risks: Issues requiring attention.
    5. Next Steps / Roadmap: Upcoming plan.
  `,
  'narrative': `
    STRUCTURE: Narrative Arc (Emotional)
    1. The Context: Setting the scene (Before).
    2. The Inciting Incident: What changed or went wrong.
    3. The Journey: The struggle or process of change.
    4. The Climax: The breakthrough moment.
    5. The Resolution: The new state (After) and moral/vision.
  `,
  'generic': `
    STRUCTURE: General Presentation
    1. Title / Topic Intro.
    2. Key Point 1.
    3. Key Point 2.
    4. Key Point 3.
    5. Conclusion / Call to Action.
  `
};

export const Prompts = {
  // --- Stage 1 ---
  
  Branding: (sourceText: string) => `
    Analyze the following source text and generate a branding identity for a presentation deck.
    
    Source Text:
    "${sourceText.slice(0, 10000)}" 
    
    Requirements:
    - Tone: 3-5 words describing the vibe (e.g., "Corporate, Trustworthy, Blue").
    - Palette: 3-5 Hex codes.
    - Text Color: A specific Hex code from the palette (or white/black) that ensures maximum readability on the primary brand colors.
    - Background Color: A default background Hex code that serves as the base for all slides when no image is present. It should contrast well with the Text Color.
    - Fonts: 2-3 Font families (prefer Google Fonts).
    - Keywords: 5-8 single words that capture the core topics (e.g. "Sustainability", "AI", "Growth").
    - Visual Features: 3-5 physical/visual elements described or implied in the text (e.g. "Green leaves", "Glowing circuits", "Handshake").
    - Style Notes: specific visual directions for image generation (e.g. "Use neon gradients, low poly 3d, dark backgrounds").
  `,

  BrandingSafetyCheck: (branding: Branding) => `
    Review the following branding identity elements for a professional presentation context.
    
    Tone: "${safe(branding.tone)}"
    Style Notes: "${safe(branding.style_notes)}"
    Keywords: ${JSON.stringify(branding.keywords)}
    Visual Features: ${JSON.stringify(branding.visual_features)}
    
    Task:
    1. Check for any offensive, NSFW, or harmful content.
    2. Check if the keywords are reasonably short (under 30 chars) and relevant.
    
    Return JSON:
    {
      "safe": boolean,
      "reason": string (if not safe, explain why briefly, otherwise null)
    }
  `,

  Outline: (sourceText: string, branding: Branding, presentationType: string = 'generic') => `
    Create a linear slide outline for a presentation based on the source text and branding.
    
    Branding Context:
    Tone: ${safe(branding.tone)}
    Style: ${safe(branding.style_notes)}

    Target Presentation Type: ${presentationType.toUpperCase()}
    ${PRESENTATION_STRUCTURES[presentationType] || PRESENTATION_STRUCTURES['generic']}

    Source Text:
    "${sourceText.slice(0, 15000)}"

    Instructions:
    - Break the content into logical slides adhering to the STRUCTURE defined above.
    - Assign a clear "Intent" for each slide (e.g., "Introduction", "Problem Statement", "Data Reveal").
    - Suggest a text layout (headline_body, two_column, bullets_only, quote, image_caption).
    - Generate 5-10 slides.
  `,

  // --- Stage 2 ---

  ImageConcepts: (outline: OutlineItem[], branding: Branding) => `
    You are an Art Director. Generate a cohesive "Asset Kit" for this presentation.
    
    Branding Context:
    - Style: ${safe(branding.style_notes)}
    - Tone: ${safe(branding.tone)}
    - Primary Text Color: ${safe(branding.text_color)}
    - Visual Features: ${branding.visual_features?.join(', ') || 'N/A'}
    
    Slide Outline:
    ${JSON.stringify(outline.map((o, i) => ({ index: i, id: o.slide_id, title: safe(o.title) })))}
    
    STRATEGY: "The Kit Approach".
    Do NOT generate a unique background for every slide. We want consistency.
    
    Generate exactly the following assets in this order:
    1. One 'background' for the Intro Slide (Use the ID of the first slide). High impact.
    2. One 'background' for the Outro Slide (Use the ID of the last slide). High impact.
    3. One 'background' for Content Slides (Use ID: "kit_content"). Minimal, low contrast, texture-based, suitable for text overlay.
    4. 2-3 'stamp' assets for reusable decoration (Use ID: "kit_deco"). E.g. Corner shapes, abstract logo elements, or brand motifs.
    5. 3-4 'stamp' assets for SPECIFIC content slides where a visual is critical (Use the specific slide_id).

    CRITICAL INSTRUCTIONS:
    1. CONTRAST: The 'background' assets must provide extreme contrast with the Primary Text Color (${safe(branding.text_color)}). If text is white, backgrounds must be dark. If text is black, backgrounds must be light.
    2. STAMPS: Strictly append: "isolated on a solid white background, no shadows, no gradients, high contrast edge" to the visual_prompt for all stamps to facilitate automatic background removal. Avoid colors that wash out against the background.
    3. BACKGROUNDS (NO FRAMES): The center of the image MUST be empty negative space. **ABSOLUTELY NO borders, frames, vignettes, UI containers, or box outlines.** The image should be full-bleed texture or scene. If the model generates any logos or details, they MUST be positioned in the bottom-left corner.
    
    Return a JSON array of concepts.
  `,

  // --- Stage 3 ---

  SuggestLayout: (assets: Asset[], slideIntent: string) => `
    You are a Layout Architect. Suggest a composition for a 3x3 grid slide.
    
    Slide Intent: "${safe(slideIntent)}"
    
    Available Assets:
    ${JSON.stringify(assets.map(a => ({ id: a.id, kind: a.kind, desc: safe(a.prompt).slice(0, 50) })))}
    
    Zones:
    - background (must be kind='background' or 'texture')
    - nw, n, ne
    - w, c, e
    - sw, s, se
    
    Task:
    Return a JSON object with:
    {
      "zones": { "zone_id": "asset_id", ... }
    }
    Select the best background from available assets. Place stamps in appropriate grid zones to balance the composition. Leave space for text.
  `,

  SuggestLayoutStrategy: (outline: OutlineItem[], assets: Asset[]) => `
    You are a Layout Architect. Assign layouts and assets to the entire slide deck to ensure visual consistency without overuse.
    
    Goal: Create a cohesive visual flow. 
    - Use the Intro Background for the first slide.
    - Use the Outro Background for the last slide.
    - Use the Content Background (kit_content) for most text-heavy slides.
    - Distribute 'stamp' assets (kit_deco) sparingly. Do NOT put a stamp on every slide.
    - **CRITICAL**: The first slide (index 0) is the Title Slide. It MUST NOT contain any 'stamp' or 'motif' assets in the grid zones. Only the Background is allowed.
    - If a specific asset exists for a slide (linked via slide_id), USE IT.
    
    Slides:
    ${JSON.stringify(outline.map((o, i) => ({ index: i, id: o.slide_id, title: safe(o.title), intent: safe(o.intent) })))}
    
    Available Assets (Kit):
    ${JSON.stringify(assets.map(a => ({ 
      id: a.id, 
      kind: a.kind, 
      link: a.linked_slide_id, 
      desc: safe(a.prompt).slice(0, 50) 
    })))}
    
    Grid Zones: nw, n, ne, w, c, e, sw, s, se.
    Background Zone: 'background'.
    
    Task: Return a JSON object with a single "assignments" array. Each item maps a slide_id to its zone configuration.
    
    Return Format:
    {
       "assignments": [
          {
             "slide_id": "string",
             "zones": { "zone_id": "asset_id" }
          }
       ]
    }
  `,

  // --- Stage 4 ---

  Copywriter: (title: string, intent: string, tone: string, layout: string, sourceMaterial: string, keys: string[]) => `
    You are a professional Copywriter. Write content for a presentation slide.
    
    Context:
    - Slide Title: "${safe(title)}"
    - Slide Intent: "${safe(intent)}"
    - Tone: "${safe(tone)}"
    - Layout: "${safe(layout)}"
    
    Source Material:
    "${sourceMaterial.slice(0, 5000)}"
    
    Task:
    Write content for the following fields: ${keys.join(', ')}.
    
    Guidelines:
    - Headlines should be punchy and short.
    - Body copy should be concise, suitable for a slide (not a document).
    - If layout is 'bullets_only' or 'bullets', provide a list of bullets. **IMPORTANT:** Start each bullet point with a bullet character (•) and separate them with a newline character. Example: "• Point 1\n• Point 2".
    - If layout is 'quote', find a relevant quote in source or synthesize one that fits.
    
    Return a JSON object with keys: ${JSON.stringify(keys)}.
  `,

  // --- Reviewer ---
  Reviewer: (outline: OutlineItem[], slides: Slide[], assets: Asset[], branding: Branding) => {
    
    // 1. Construct the Media Pack (Asset Inventory)
    // Providing a catalog for the Reviewer to pick from if they want to add something new.
    const mediaPack = assets.map(a => 
      `- Asset: { "id": "${a.id}", "kind": "${a.kind.toUpperCase()}", "desc": "${safe(a.prompt).slice(0, 60)}..." }`
    ).join('\n');

    // 2. Construct the Branding Context
    const brandContext = `
      Tone: ${safe(branding.tone)}
      Fonts: ${branding.fonts.join(', ')}
      Text Color: ${safe(branding.text_color)}
    `;

    // 3. Construct Rigid Configuration State
    // We send this exact JSON structure to the model so it knows exactly what to modify.
    const deckConfiguration = outline.map(o => {
        const slide = slides.find(s => s.slide_id === o.slide_id);
        const variant = slide?.variants.find(v => v.variant_id === slide.active_variant_id);
        
        // VISUAL CONTEXT: Resolve asset IDs to descriptions so the LLM "sees" the content
        const resolvedVisuals: Record<string, string> = {};
        if (variant?.zones) {
           Object.entries(variant.zones).forEach(([zoneKey, zoneData]) => {
              if (zoneData.asset_id) {
                 const asset = assets.find(a => a.id === zoneData.asset_id);
                 if (asset) {
                    resolvedVisuals[zoneKey] = `[${asset.kind}] ${safe(asset.prompt).slice(0, 50)}...`;
                 }
              }
           });
        }

        return {
           slide_id: o.slide_id,
           variant_id: variant?.variant_id || 'v1',
           title: safe(o.title),
           intent: safe(o.intent),
           // EXPLICIT STATE: Text Fields
           text_fields: variant?.text_content || {},
           active_alignment: variant?.text_alignment || {},
           // EXPLICIT STATE: Visual Zones
           active_zones: variant?.zones || {},
           // CONTEXT: What is actually visible?
           visual_summary: resolvedVisuals
        };
    });

    // TYPESCRIPT DEFINITION (The "Magic Sauce" Context)
    // Providing this to the model drastically reduces hallucination by grounding it in code.
    return `
    You are a JSON-only API acting as a Creative Director.
    
    // --- CONTEXT ---
    const BRANDING = ${JSON.stringify(brandContext)};
    
    // --- ASSET LIBRARY (Use these IDs only) ---
    ${mediaPack}

    // --- CURRENT STATE ---
    const DECK = ${JSON.stringify(deckConfiguration, null, 2)};

    // --- TARGET SCHEMA DEFINITIONS ---
    type Zone = 'background' | 'nw' | 'n' | 'ne' | 'w' | 'c' | 'e' | 'sw' | 's' | 'se';
    type TextField = 'headline' | 'body' | 'caption' | 'quote' | 'author' | 'column_left' | 'column_right' | 'bullets';
    type AssetKind = 'background' | 'stamp' | 'texture';

    interface UpdateTextAction {
      type: 'UPDATE_TEXT_CONTENT';
      payload: {
        slideId: string; // Must match DECK
        variantId: string; // Must match DECK
        field: TextField;
        value: string; // The fully rewritten text (MAX 150 chars)
      }
    }

    interface UpdateZoneAction {
      type: 'UPDATE_ZONE';
      payload: {
        slideId: string; // Must match DECK
        variantId: string; // Must match DECK
        zoneId: Zone;
        assetId: string; // Must be a valid ID from ASSET LIBRARY
      }
    }

    interface UpdateAlignmentAction {
      type: 'UPDATE_TEXT_ALIGNMENT';
      payload: {
        slideId: string;
        variantId: string;
        field: TextField;
        alignment: 'left' | 'center' | 'right';
      }
    }

    interface RequestAssetAction {
      type: 'REQUEST_NEW_ASSET';
      payload: {
        slideId: string; // The slide where this asset is needed
        variantId: string;
        zoneId: Zone; // Where to place it after generation
        visualPrompt: string; // A detailed prompt for the image generator
        kind: AssetKind;
      }
    }

    interface Suggestion {
      description: string; // Short explanation (< 25 words)
      action: UpdateTextAction | UpdateZoneAction | UpdateAlignmentAction | RequestAssetAction;
    }

    interface Response {
      actions: Suggestion[];
    }

    // --- INSTRUCTIONS ---
    1. Analyze the DECK state against the BRANDING.
    2. Identify empty visual zones or weak text copy.
    3. **ALIGNMENT**: Use 'UPDATE_TEXT_ALIGNMENT' to ensure headlines on the Title Slide (first slide) are CENTERED. For body slides, favor LEFT alignment for readability.
    4. **MISSING ASSETS**: If a slide needs a visual (e.g., 'visual_summary' is empty) but the ASSET LIBRARY contains nothing relevant, use 'REQUEST_NEW_ASSET' to commission a new image.
    5. Return a valid JSON object adhering to the 'Response' interface.
    6. Max 10 suggestions total.
    
    // --- RULES ---
    - Do NOT hallucinate Asset IDs. If you need a new image, use REQUEST_NEW_ASSET.
    - If you REQUEST_NEW_ASSET, you MUST provide a detailed 'visualPrompt' suitable for image generation (include brand style notes).
    - If kind is 'stamp', append "isolated on white background" to the visualPrompt.
  `;
  }
};
