
import { Branding, OutlineItem, AssetKind, Asset, RunDoc, Slide } from "../types";

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
    
    Tone: "${branding.tone}"
    Style Notes: "${branding.style_notes}"
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
    Tone: ${branding.tone}
    Style: ${branding.style_notes}

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
    - Style: ${branding.style_notes}
    - Tone: ${branding.tone}
    - Primary Text Color: ${branding.text_color}
    - Visual Features: ${branding.visual_features?.join(', ') || 'N/A'}
    
    Slide Outline:
    ${JSON.stringify(outline.map((o, i) => ({ index: i, id: o.slide_id, title: o.title })))}
    
    STRATEGY: "The Kit Approach".
    Do NOT generate a unique background for every slide. We want consistency.
    
    Generate exactly the following assets in this order:
    1. One 'background' for the Intro Slide (Use the ID of the first slide). High impact.
    2. One 'background' for the Outro Slide (Use the ID of the last slide). High impact.
    3. One 'background' for Content Slides (Use ID: "kit_content"). Minimal, low contrast, texture-based, suitable for text overlay.
    4. 2-3 'stamp' assets for reusable decoration (Use ID: "kit_deco"). E.g. Corner shapes, abstract logo elements, or brand motifs.
    5. 3-4 'stamp' assets for SPECIFIC content slides where a visual is critical (Use the specific slide_id).

    CRITICAL INSTRUCTIONS:
    1. CONTRAST: The 'background' assets must provide extreme contrast with the Primary Text Color (${branding.text_color}). If text is white, backgrounds must be dark. If text is black, backgrounds must be light.
    2. STAMPS: Strictly append: "isolated on a solid white background, no shadows, no gradients, high contrast edge" to the visual_prompt for all stamps to facilitate automatic background removal. Avoid colors that wash out against the background.
    3. BACKGROUNDS (NO FRAMES): The center of the image MUST be empty negative space. **ABSOLUTELY NO borders, frames, vignettes, UI containers, or box outlines.** The image should be full-bleed texture or scene. If the model generates any logos or details, they MUST be positioned in the bottom-left corner.
    
    Return a JSON array of concepts.
  `,

  // --- Stage 3 ---

  SuggestLayout: (assets: Asset[], slideIntent: string) => `
    You are a Layout Architect. Suggest a composition for a 3x3 grid slide.
    
    Slide Intent: "${slideIntent}"
    
    Available Assets:
    ${JSON.stringify(assets.map(a => ({ id: a.id, kind: a.kind, desc: a.prompt?.slice(0, 50) })))}
    
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
    ${JSON.stringify(outline.map((o, i) => ({ index: i, id: o.slide_id, title: o.title, intent: o.intent })))}
    
    Available Assets (Kit):
    ${JSON.stringify(assets.map(a => ({ 
      id: a.id, 
      kind: a.kind, 
      link: a.linked_slide_id, 
      desc: a.prompt?.slice(0, 50) 
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
    - Slide Title: "${title}"
    - Slide Intent: "${intent}"
    - Tone: "${tone}"
    - Layout: "${layout}"
    
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
  Reviewer: (outline: OutlineItem[], slides: Slide[], assets: Asset[], branding: Branding) => `
    You are the Creative Director polishing the final deck. Your goal is to improve polish without changing the fundamental structure.
    
    Deck Content:
    ${JSON.stringify(outline.map(o => {
        const slide = slides.find(s => s.slide_id === o.slide_id);
        const variant = slide?.variants.find(v => v.variant_id === slide.active_variant_id);
        
        // Find asset descriptions
        const bgAsset = assets.find(a => a.id === variant?.zones['background']?.asset_id);
        const bgDesc = bgAsset ? bgAsset.prompt : "No background";
        const zoneKeys = Object.keys(variant?.zones || {}).filter(k => k !== 'background' && variant?.zones[k]?.asset_id);
        
        return {
           id: o.slide_id,
           title: o.title,
           intent: o.intent,
           text: variant?.text_content,
           bg_description: bgDesc,
           active_zones: zoneKeys
        };
    }))}

    Branding Tone: ${branding.tone}

    Instructions:
    Identify up to 5 small, high-impact improvements.
    - **Light Touch Only**: Do NOT change the layout type or swap backgrounds unless the current one is visibly broken or missing.
    - **Typography**: Rewrite headlines that are too long or boring.
    - **Image Polish**: Suggest changing the scale (0.5 to 1.5) or alignment of stamp images (in 'nw', 'ne', etc.) to better balance with text.
    - **Layout Tweaks**: If a text box feels too cramped, you can adjust its position/size slightly (e.g. increase width by 10%).
    
    Return JSON array of actions. Supported Actions:
    1. Update Text: { "type": "UPDATE_TEXT_CONTENT", "payload": { "slideId": "...", "variantId": "v1", "field": "headline"|"body", "value": "New text" } }
    2. Image Move/Scale: { "type": "UPDATE_ZONE_STYLE", "payload": { "slideId": "...", "variantId": "v1", "zoneId": "ne"|..., "scale": 0.5|1.0|1.5, "alignment": "center left"|... } }
    3. Text Move/Resize: { "type": "UPDATE_TEXT_TRANSFORM", "payload": { "slideId": "...", "variantId": "v1", "field": "headline", "transform": { "x": 5, "y": 10, "w": 90, "h": 20 } } }
    4. Font Sizing: { "type": "UPDATE_TEXT_FONT_SIZE", "payload": { "slideId": "...", "variantId": "v1", "field": "headline", "size": 64 } }
    
    Output JSON ONLY. Include a 'description' field for each action to explain the change to the user.
    {
      "actions": [ 
         { 
            "description": "Short explanation of why",
            "action": { "type": "...", "payload": { ... } }
         } 
      ]
    }
  `
};
