
import { RunDoc, TextLayout, Slide, OutlineItem, SlideVariant, AspectRatio } from './types';
import { INITIAL_RUN_DOC } from './constants';

// Helper to generate full slide structures from outline
const generateSlidesFromOutline = (outline: OutlineItem[]): Slide[] => {
  return outline.map(item => {
    const layout = item.suggest_text_layout || TextLayout.HeadlineBody;
    
    // Generate placeholder content based on layout type
    const text_content: Record<string, string> = {};
    
    switch (layout) {
      case TextLayout.HeadlineBody:
        text_content.headline = item.title;
        text_content.body = item.intent || "Placeholder body text for this slide.";
        break;
      case TextLayout.TwoColumn:
        text_content.headline = item.title;
        text_content.column_left = "Key point regarding " + item.title.toLowerCase();
        text_content.column_right = "Supporting details for " + item.title.toLowerCase();
        break;
      case TextLayout.BulletsOnly:
        text_content.headline = item.title;
        text_content.bullets = "• First key point\n• Second key point\n• Third key point";
        break;
      case TextLayout.Quote:
        text_content.quote = `"${item.intent}"`;
        text_content.author = "Source / Attribution";
        break;
      case TextLayout.ImageCaption:
        text_content.headline = item.title;
        text_content.caption = item.intent;
        break;
      default:
        text_content.headline = item.title;
        text_content.body = item.intent;
    }

    const variant: SlideVariant = {
      variant_id: 'v1',
      label: 'Default Layout',
      zones: {
         background: { asset_id: '' }, // Empty init
         nw: { asset_id: '' }, n: { asset_id: '' }, ne: { asset_id: '' },
         w: { asset_id: '' }, c: { asset_id: '' }, e: { asset_id: '' },
         sw: { asset_id: '' }, s: { asset_id: '' }, se: { asset_id: '' }
      },
      text_layout: layout,
      text_content: text_content,
      text_bold: { headline: true },
      text_italic: {}
    };

    return {
      slide_id: item.slide_id,
      active_variant_id: 'v1',
      variants: [variant],
      status: { layout: 'draft', copy: 'draft' }
    };
  });
};

const buildTemplate = (
  id: string, 
  name: string, 
  desc: string, 
  tags: string[], 
  type: string, 
  branding: any, 
  outline: OutlineItem[]
) => {
  return {
    id,
    name,
    description: desc,
    tags,
    data: {
      ...INITIAL_RUN_DOC,
      project_id: id,
      presentation_type: type,
      branding,
      outline,
      // Critical: Pre-generate slides so Architect/Copywriter stages work immediately
      slides: generateSlidesFromOutline(outline),
      revisions: { source: 1, branding: 1, outline: 1 }
    }
  };
};

export const TEMPLATES = [
  {
    id: "tutorial_mode",
    name: "Guided Tutorial",
    description: "Start here to learn the ASC flow. Offline mode enabled.",
    tags: ["Learning", "Offline"],
    data: {
      ...INITIAL_RUN_DOC,
      project_id: "tutorial_mode",
      presentation_type: "pitch",
      ai_settings: { ...INITIAL_RUN_DOC.ai_settings, mockMode: true },
      source_material: {
        type: "text",
        content: "Red Planet Pioneers: Establishing the first permanent human habitat on Mars. Mission Goal: Sustainability through 3D-printing and recycled resources."
      },
      branding: {
        ...INITIAL_RUN_DOC.branding,
        palette: ['#000000', '#FFFFFF']
      },
      outline: [],
      slides: [],
      revisions: { source: 1, branding: 0, outline: 0 }
    }
  },
  buildTemplate(
    "template_startup",
    "Startup Pitch",
    "A classic 5-slide deck structure for early stage startups.",
    ["Business", "Pitch"],
    "pitch",
    {
        tone: "Innovative, Disruptive, Trustworthy",
        palette: ["#0f172a", "#3b82f6", "#ffffff"],
        text_color: "#ffffff",
        background_color: "#0f172a",
        fonts: ["Inter", "Roboto"],
        style_notes: "Clean tech aesthetic with blue accents.",
        keywords: ["Growth", "Scale", "Innovation"],
        visual_features: ["Rocket launch", "Upward charts", "Modern office", "Handshake"]
    },
    [
        { slide_id: "s1", title: "The Problem", intent: "Define the user pain point", suggest_text_layout: TextLayout.HeadlineBody },
        { slide_id: "s2", title: "Our Solution", intent: "Showcase product value", suggest_text_layout: TextLayout.TwoColumn },
        { slide_id: "s3", title: "Market Size", intent: "TAM/SAM/SOM analysis", suggest_text_layout: TextLayout.BulletsOnly },
        { slide_id: "s4", title: "Business Model", intent: "How we make money", suggest_text_layout: TextLayout.HeadlineBody },
        { slide_id: "s5", title: "The Team", intent: "Founding members", suggest_text_layout: TextLayout.ImageCaption },
    ]
  ),
  buildTemplate(
    "template_educational",
    "Educational Workshop",
    "Clear, structured flow for teaching concepts and steps.",
    ["Education", "Clean"],
    "educational",
    {
        tone: "Clear, Encouraging, Academic",
        palette: ["#fffbeb", "#b45309", "#1f2937"],
        text_color: "#1f2937",
        background_color: "#fffbeb",
        fonts: ["Merriweather", "Open Sans"],
        style_notes: "Warm academic feel. High readability.",
        keywords: ["Learning", "Focus", "Steps"],
        visual_features: ["Books", "Chalkboard", "Lightbulb", "Magnifying glass"]
    },
    [
        { slide_id: "e1", title: "Workshop Goals", intent: "What we will learn today", suggest_text_layout: TextLayout.HeadlineBody },
        { slide_id: "e2", title: "Core Concept", intent: "Definition and theory", suggest_text_layout: TextLayout.TwoColumn },
        { slide_id: "e3", title: "Case Study", intent: "Real world example", suggest_text_layout: TextLayout.ImageCaption },
        { slide_id: "e4", title: "Practical Steps", intent: "How to apply this", suggest_text_layout: TextLayout.BulletsOnly },
        { slide_id: "e5", title: "Key Takeaways", intent: "Summary of points", suggest_text_layout: TextLayout.HeadlineBody },
    ]
  ),
  buildTemplate(
    "template_status",
    "Weekly Status Report",
    "Data-heavy structure for updates, metrics, and blockers.",
    ["Business", "Data"],
    "status",
    {
        tone: "Direct, Data-Driven, Transparent",
        palette: ["#1e293b", "#10b981", "#ffffff"],
        text_color: "#ffffff",
        background_color: "#1e293b",
        fonts: ["Roboto", "Lato"],
        style_notes: "Dark mode dashboard aesthetic.",
        keywords: ["Metrics", "Progress", "Goals"],
        visual_features: ["Dashboard", "Calendar", "Checkmark", "Warning sign"]
    },
    [
        { slide_id: "st1", title: "Executive Summary", intent: "High level health check", suggest_text_layout: TextLayout.HeadlineBody },
        { slide_id: "st2", title: "Key Metrics", intent: "KPI performance", suggest_text_layout: TextLayout.TwoColumn },
        { slide_id: "st3", title: "Accomplishments", intent: "What shipped this week", suggest_text_layout: TextLayout.BulletsOnly },
        { slide_id: "st4", title: "Blockers & Risks", intent: "Items needing attention", suggest_text_layout: TextLayout.HeadlineBody },
        { slide_id: "st5", title: "Next Steps", intent: "Plan for next week", suggest_text_layout: TextLayout.BulletsOnly },
    ]
  ),
  buildTemplate(
    "template_narrative",
    "Hero's Journey",
    "Emotional storytelling arc for visionary presentations.",
    ["Story", "Creative"],
    "narrative",
    {
        tone: "Cinematic, Emotional, Inspiring",
        palette: ["#000000", "#e11d48", "#ffffff"],
        text_color: "#ffffff",
        background_color: "#000000",
        fonts: ["Playfair Display", "Lato"],
        style_notes: "High contrast, cinematic lighting, emotional imagery.",
        keywords: ["Journey", "Change", "Victory"],
        visual_features: ["Stormy sky", "Mountain peak", "Sunrise", "Path"]
    },
    [
        { slide_id: "n1", title: "The Old World", intent: "Setting the scene before change", suggest_text_layout: TextLayout.HeadlineBody },
        { slide_id: "n2", title: "The Inciting Incident", intent: "The problem or opportunity", suggest_text_layout: TextLayout.Quote },
        { slide_id: "n3", title: "The Struggle", intent: "Challenges faced", suggest_text_layout: TextLayout.ImageCaption },
        { slide_id: "n4", title: "The Breakthrough", intent: "The solution or realization", suggest_text_layout: TextLayout.HeadlineBody },
        { slide_id: "n5", title: "The New World", intent: "Future vision", suggest_text_layout: TextLayout.TwoColumn },
    ]
  )
];
