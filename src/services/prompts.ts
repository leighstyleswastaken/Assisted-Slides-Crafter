
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
    - Key Facts: Extract 3-5 key statistics, numbers, or hard facts from the text (e.g. "Revenue up 20%", "5000 Users"). If none, leave empty.
    - Data Visualizations: Suggest 1-3 charts that could represent the data (e.g. "Bar chart of Year over Year growth").
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

  Outline: (sourceText: string, branding: Branding, presentationType: string = 'generic', length: 'short' | 'medium' | 'long' = 'medium') => {
    const lengthMap = {
        'short': '3-6 slides',
        'medium': '8-12 slides',
        'long': '15-20 slides'
    };

    return `
    Create a linear slide outline for a presentation based on the source text and branding.
    
    Branding Context:
    Tone: ${safe(branding.tone)}
    Style: ${safe(branding.style_notes)}
    Key Facts: ${JSON.stringify(branding.key_facts)}
    Data Vix Suggestions: ${JSON.stringify(branding.data_visualizations)}

    Target Presentation Type: ${presentationType.toUpperCase()}
    Target Length: ${length.toUpperCase()} (${lengthMap[length]})
    
    Core Structure Guide:
    ${PRESENTATION_STRUCTURES[presentationType] || PRESENTATION_STRUCTURES['generic']}

    Source Text:
    "${sourceText.slice(0, 15000)}"

    Instructions:
    - Break the content into logical slides adhering to the STRUCTURE and LENGTH constraints.
    - Assign a clear "Intent" for each slide. 
      * IMPORTANT: The intent should describe the *communicative goal* or a *visual metaphor*. 
      * Bad: "Market Stats"
      * Good: "Show market growth using a climbing mountain metaphor."
    - Suggest a text layout (headline_body, two_column, bullets_only, quote, image_caption).
    
    CRITICAL: DATA HANDLING
    - Check the 'Key Facts' and 'Data Viz Suggestions'.
    - If meaningful data exists (numbers/stats), you MUST create specific slides to reveal them.
    - For these slides, set the 'Intent' to explicitly mention "Chart: [Description]" or "Data Reveal: [Statistic]".
    - This guides the Art Department to generate charts.
    
    Generate ${lengthMap[length]}.
  `},

  // --- Stage 2 ---

  ImageConcepts: (outline: OutlineItem[], branding: Branding) => `
    You are an Art Director. Generate a cohesive "Asset Kit" for this presentation.
    
    // --- INPUT DATA ---
    Branding Style: ${safe(branding.style_notes)}
    Visual Tokens (Features): ${JSON.stringify(branding.visual_features)}
    Keywords: ${JSON.stringify(branding.keywords)}
    Data Context: ${branding.key_facts?.join(', ') || 'None'}
    
    Slide Outline:
    ${JSON.stringify(outline.map((o, i) => ({ index: i, id: o.slide_id, title: safe(o.title), intent: safe(o.intent) })))}
    
    // --- STRATEGY: THE "CLUSTER & COMBINE" METHOD ---
    1. ANALYZE CLUSTERS: Look at the outline. Group slides into related "chapters" (e.g., The Problem Phase, The Solution Phase, The Data Phase).
    2. COMBINE TOKENS: For each key slide or cluster, pick one 'Visual Token' from the branding and combine it with the 'Slide Intent'.
       * Example: Intent="Security Risk" + Token="Shield" => Prompt="A cracked glass shield protecting a glowing data core."
    3. DATA FIRST: If a slide intent mentions "Chart" or "Data", you MUST generate a 'chart' asset for it.
    
    // --- OUTPUT REQUIREMENTS ---
    Generate a JSON array of asset concepts. You must include exactly:
    
    1. [MANDATORY] One 'background' for the Intro Slide (High impact, sets the scene).
    2. [MANDATORY] One 'background' for the Outro Slide (Memorable closure).
    3. [MANDATORY] One 'background' for Content Slides (ID: "kit_content"). Minimal, texture-based, low contrast for text readability.
    4. [MANDATORY] 2-3 'stamp' assets for general decoration (ID: "kit_deco"). Abstract shapes or logos fitting the brand.
    5. [CONDITIONAL] 'chart' assets for any slide mentioning stats/numbers in the intent.
       * Prompt must be: "Flat vector style chart, [DESCRIPTION], on solid white background, clean lines, brand colors".
    6. [CONTEXTUAL] 3-4 'stamp' assets for specific "Clusters" identified in step 1.
       * Prompt must be: "[OBJECT] related to [INTENT], isolated on solid white background, flat lighting, hard edges".

    Visual Style Rule: All assets must respect: "${safe(branding.style_notes)}".
    
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
    Select the best background. Place stamps or CHARTS in appropriate grid zones (e.g. 'e' or 'w' for side-by-side text).
  `,

  SuggestLayoutStrategy: (outline: OutlineItem[], assets: Asset[]) => `
    You are a Layout Architect. Assign layouts and assets to the entire slide deck.
    
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
    
    Task: Return a JSON object with a single "assignments" array.
    If a slide has a specific CHART asset (kind='chart' and linked_slide_id matches), PLACE IT in a prominent zone (e.g. 'c', 'e', or 'w').
    
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

  Copywriter: (title: string, intent: string, tone: string, layout: string, sourceMaterial: string, keys: string[], keyFacts: string[]) => `
    You are a professional Copywriter. Write content for a presentation slide.
    
    CRITICAL: You must strictly adhere to the Slide Intent provided in the Outline. Do not hallucinate generic content.
    
    Context:
    - Slide Title: "${safe(title)}"
    - Slide Intent (PRIMARY INSTRUCTION): "${safe(intent)}"
    - Tone: "${safe(tone)}"
    - Layout: "${safe(layout)}"
    
    Available Data (Key Facts): 
    ${keyFacts.join(', ')}
    
    Source Material Reference:
    "${sourceMaterial.slice(0, 5000)}"
    
    Task:
    Write content for the following fields: ${keys.join(', ')}.
    
    Guidelines:
    - Headlines should be punchy and directly related to the Title.
    - Body copy should be concise.
    - If layout is 'bullets_only', start each bullet with • and separate with newline.
    - If the slide Intent or Key Facts mention data/numbers, YOU MUST INCLUDE THOSE NUMBERS in the copy (body or bullets) to ensure the data is surfaced, even if a chart is present.
    
    Return a JSON object with keys: ${JSON.stringify(keys)}.
  `,

  // --- Reviewer ---
  Reviewer: (outline: OutlineItem[], slides: Slide[], assets: Asset[], branding: Branding) => {
    
    const mediaPack = assets.map(a => 
      `- Asset: { "id": "${a.id}", "kind": "${a.kind.toUpperCase()}", "desc": "${safe(a.prompt).slice(0, 60)}..." }`
    ).join('\n');

    const brandContext = `
      Tone: ${safe(branding.tone)}
      Fonts: ${branding.fonts.join(', ')}
      Text Color: ${safe(branding.text_color)}
    `;

    const deckConfiguration = outline.map(o => {
        const slide = slides.find(s => s.slide_id === o.slide_id);
        const variant = slide?.variants.find(v => v.variant_id === slide.active_variant_id);
        
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
           text_fields: variant?.text_content || {},
           active_alignment: variant?.text_alignment || {},
           active_zones: variant?.zones || {},
           visual_summary: resolvedVisuals
        };
    });

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
    type AssetKind = 'background' | 'stamp' | 'texture' | 'chart';

    interface UpdateTextAction {
      type: 'UPDATE_TEXT_CONTENT';
      payload: {
        slideId: string;
        variantId: string;
        field: TextField;
        value: string;
      }
    }

    interface UpdateZoneAction {
      type: 'UPDATE_ZONE';
      payload: {
        slideId: string;
        variantId: string;
        zoneId: Zone;
        assetId: string;
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
        slideId: string;
        variantId: string;
        zoneId: Zone;
        visualPrompt: string;
        kind: AssetKind;
      }
    }

    interface Suggestion {
      description: string;
      action: UpdateTextAction | UpdateZoneAction | UpdateAlignmentAction | RequestAssetAction;
    }

    interface Response {
      actions: Suggestion[];
    }

    // --- INSTRUCTIONS ---
    1. Analyze the DECK state against the BRANDING.
    2. Identify empty visual zones or weak text copy.
    3. Use 'UPDATE_TEXT_ALIGNMENT' to center headlines on title slides.
    4. Use 'REQUEST_NEW_ASSET' (kind='chart' or 'stamp') if data visualization is missing for a data-heavy slide.
    5. Return a valid JSON object adhering to the 'Response' interface.
    
    // --- CRITICAL RULES ---
    - Do NOT hallucinate Asset IDs. If using 'UPDATE_ZONE', you MUST provide a valid 'assetId' from the provided 'mediaPack'. If no suitable asset exists, use 'REQUEST_NEW_ASSET'.
    - If using 'REQUEST_NEW_ASSET', you MUST provide a detailed 'visualPrompt' (e.g. "A glowing red futuristic shield").
    - If using 'UPDATE_TEXT_ALIGNMENT', you MUST provide 'alignment' ('left', 'center', 'right') and 'field' ('headline', etc).
    - If kind is 'stamp' or 'chart', append "isolated on white background".
  `;
  }
};
