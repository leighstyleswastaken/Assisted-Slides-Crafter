
# Assisted Slides Crafter: Master Feature List

This document serves as the source of truth for all implemented features to prevent regression during development.

## 01. Strategist (Analysis & Core Identity)
- [x] **Source Material Ingestion**: Support for large text blocks with automatic manual editing.
- [x] **Branding Extraction**: AI-driven generation of Tone, Palette (Hex), Typography, and Visual Keywords.
- [x] **Global Colors**: Definition of primary Text Color and default Background Color for all slides.
- [x] **Narrative Architect**: AI generation of slide outlines with specific "Intent" and "Suggested Layouts".
- [x] **Google Font Integration**: Dynamic loading of any Google Font identified by the branding agent.
- [x] **Validation Loop**: AI safety check for branding metadata before stage approval.
- [x] **Presentation Types**: Support for specialized narrative flows (Pitch, Educational, Status Report, Narrative).

## 02. Art Dept (Asset Forge)
- [x] **Concept Briefing**: Agent-driven visual concept list based on slide intent.
- [x] **Asset Kit Strategy**: Specific generation logic for "Kit Content" (textures) and "Deco Kit" (stamps).
- [x] **Multi-Model Support**: Toggle between Gemini 2.5 Flash (speed) and 3 Pro (quality).
- [x] **Triple-Mode Background Removal**:
    - **Magic Wand**: Contiguous flood-fill based on edge sampling.
    - **AI Remover**: Neural network-based subject detection (@imgly/background-removal).
    - **Color Key**: Global chroma-subtraction for green-screen style assets.
- [x] **Library Management**: Keep/Discard logic, ZIP export, and manual image import/classification.
- [x] **Hi-Fi Mock Engine**: Programmatic emoji-based asset generation for offline/quota-exhausted testing.
- [x] **Image Compression**: Automatic WebP conversion (0.8 quality) to reduce memory footprint.
- [x] **Reviewer Integration**: Visually tagged assets commissioned by the Stage 5 reviewer.

## 03. Architect (Structural Composition)
- [x] **3x3 Cardinal Grid**: Precision placement system for stamps and motifs.
- [x] **Background Control Bar**: Dedicated toggles for **Box** (Contain), **Space** (Fill/Stretch), and **Crop** (Cover).
- [x] **Zone Logic**: Individual asset controls for Scale (cycling), Alignment (cardinal points), and Fit.
- [x] **Overflow Control**: Toggle to allow assets to bleed outside their grid zone (prevent clipping).
- [x] **Global Sync**: "Apply to All" button to synchronize backgrounds across the entire deck.
- [x] **Layout Strategy AI**: Intelligent "Auto-Layout All" logic that follows a consistent visual narrative.
- [x] **Mobile/Touch Support**: Drag-and-drop backend automatically switches to Touch for iPad/Mobile users.

## 04. Copywriter (Content & Fit)
- [x] **Context-Aware Generation**: AI writes copy based on source material, slide intent, and visual layout.
- [x] **AutoFit Engine**: Dynamic font-size calculation that shrinks text to fit containers without overflow.
- [x] **Vertical/Horizontal Alignment**: Full control over text positioning within overlay boxes.
- [x] **Text Formatting**: Toggle Bold and Italic styles for individual text fields.
- [x] **Inline Editing**: WYSIWYG text editing with real-time measurement updates.
- [x] **Interactive Composition**: Intuitive move and resize handles for all text elements with top-bar controls.

## 05. Publisher (Final Polish & Export)
- [x] **Visual Parity Rendering**: High-fidelity SlideSurface used across all stages.
- [x] **Post-Processing Polish**: Global filters for Film Grain (noise) and Vignette effects.
- [x] **AI Reviewer Loop**: Final quality check that issues "Repair Actions" (text rewrites or layout tweaks).
    - [x] **Anti-Churn**: Change detection prevents the reviewer from re-analyzing identical states.
    - [x] **Asset Commissioning**: Capability to request and generate new assets if gaps are found.
    - [x] **Event Logging**: Persistent history of all AI interventions for audit trails.
- [x] **High-Res PDF Export**: DOM-capture system that preserves Google Fonts and CSS effects.
- [x] **PPTX Export**: Native PowerPoint generation with precision coordinate mapping.
    - [x] **Style Parity**: Respects state-driven Bold, Italic, and browser-measured Font Size.
    - [x] **Font Pack Generator**: Scrapes and bundles custom Google Fonts into a ZIP for local installation to ensure PPTX rendering fidelity.
- [x] **Virtualized Navigator**: High-performance thumbnail rail using `react-window` for efficient scrolling of large decks.

## Infrastructure & DX
- [x] **PWA**: Fully installable with Service Worker caching for offline app loading.
- [x] **Global State Machine**: Redux-style reducer with single-atom state (`RunDoc`).
- [x] **Persistence**: IndexedDB autosave with schema validation.
- [x] **Quick Restore**: Load JSON projects directly from the welcome screen.
- [x] **Undo/Redo**: Full history stack for all destructive actions.
- [x] **Usage Monitor**: Real-time token tracking and API latency logging.
- [x] **YOLO Mode**: Full-pipeline automation with Pause/Resume/Abort controls.
- [x] **Mock Mode**: Seamless offline development with simulated AI responses.
- [x] **Safe Demo Deployment**: Automatic fallback to Mock Mode if API Keys are missing in production.
- [x] **Rich Template Library**: Dedicated starter decks for various use cases (Startup, Education, Status).
- [x] **Commission History**: Explicit logging of AI-generated assets with visual tagging in gallery.
