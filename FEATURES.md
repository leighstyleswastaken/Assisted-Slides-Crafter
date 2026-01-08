
# Assisted Slides Crafter: Master Feature List

## 01. Strategist (Analysis & Core Identity)
- [x] **Source Material Ingestion**: Support for large text blocks with automatic manual editing.
- [x] **Branding Extraction**: AI-driven generation of Tone, Palette (Hex), Typography, and Visual Keywords.
- [x] **Data Extraction (New)**: Identifies "Key Facts" (numbers, stats) and suggests "Data Visualizations" (charts) from the source text.
- [x] **Magic Palette (New)**: Extract dominant colors from uploaded logo/image via canvas analysis.
- [x] **Brand Kits (New)**: Instant application of pre-defined style systems (Tech, Luxury, Eco, Pop).
- [x] **Global Colors**: Definition of primary Text Color and default Background Color for all slides.
- [x] **Narrative Architect**: AI generation of slide outlines with specific "Intent" and "Suggested Layouts".
- [x] **Google Font Integration**: Dynamic loading of any Google Font identified by the branding agent.
- [x] **Validation Loop**: AI safety check for branding metadata before stage approval.
- [x] **Presentation Types**: Support for specialized narrative flows (Pitch, Educational, Status Report, Narrative).

## 02. Art Dept (Asset Forge)
- [x] **Concept Briefing**: Agent-driven visual concept list based on slide intent.
- [x] **Chart Generation (New)**: Detects "Data Visualization" requirements and generates vector-style flat charts on white backgrounds.
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
- [x] **Inspector Groups (New)**: Organized control panel separating Background, Selected Element, and Text settings.
- [x] **Hybrid Input System**: "Click-to-Assign" fallback for users on hybrid touch/mouse devices where Drag-and-Drop is difficult.
- [x] **Mobile Asset Drawer**: Touch-optimized bottom sheet for dragging assets without losing context of the canvas on small screens.
- [x] **Dedicated Background Drop Zone**: Explicit "Background Layer" bar above the canvas to safely drop wallpapers without conflicting with grid zones.
- [x] **Modern Shape Masks**: Procedural SVG backgrounds (Waves, Blobs, Arcs, Diagonals) with adjustable intensity, color tint, and orientation.
- [x] **Cinematic Motion**: "Slow Pan" and "Zoom" CSS animations for static assets.
- [x] **Premium Shadows**: Depth-aware drop shadows (Subtle, Medium, Dramatic).
- [x] **Layered Composition**: Support for "Peek Assets" that sit behind shape masks for depth effects.
- [x] **Background Control Bar**: Dedicated toggles for **Box** (Contain), **Space** (Fill/Stretch), and **Crop** (Cover).
- [x] **Zone Logic**: Individual asset controls for Scale (cycling), Alignment (cardinal points), and Fit.
- [x] **Overflow Control (New)**: Toggle to allow assets to bleed outside their grid zone (prevent clipping).
- [x] **Quick Remove (New)**: Dedicated trash actions for specific zones or backgrounds within the Inspector.
- [x] **Global Sync**: "Apply to All" button to synchronize backgrounds across the entire deck.
- [x] **Layout Strategy AI**: Intelligent "Auto-Layout All" logic that follows a consistent visual narrative.
- [x] **Multi-Backend Input**: Intelligent switching between HTML5 DnD and Touch API for iPad/Tablet support.

## 04. Copywriter (Content & Fit)
- [x] **Context-Aware Generation**: AI writes copy based on source material, slide intent, and visual layout.
- [x] **AutoFit Engine**: Dynamic font-size calculation that shrinks text to fit containers without overflow.
- [x] **Smooth Text Rendering**: Opacity-based fade-in to prevent "Flash of Massive Text" during font calculations.
- [x] **Vertical/Horizontal Alignment**: Full control over text positioning within overlay boxes.
- [x] **Text Formatting**: Toggle Bold and Italic styles for individual text fields.
- [x] **Inline Editing**: WYSIWYG text editing with real-time measurement updates.
- [x] **Interactive Composition**: Intuitive move and resize handles for all text elements with top-bar controls.

## 05. Publisher (Final Polish & Export)
- [x] **Visual Parity Rendering**: High-fidelity SlideSurface used across all stages.
- [x] **Smart Contrast**: Auto-calculation of text color (Black/White) based on background luminance for accessibility.
- [x] **Post-Processing Polish**: Global filters for Film Grain (noise) and Vignette effects.
- [x] **AI Reviewer Loop**: Final quality check that issues "Repair Actions" (text rewrites or layout tweaks).
    - [x] **Anti-Hallucination (New)**: Strict validation ensures the Reviewer only modifies zones with valid, existing assets.
    - [x] **Anti-Churn**: Change detection prevents the reviewer from re-analyzing identical states.
    - [x] **Asset Commissioning**: Capability to request and generate new assets if gaps are found.
    - [x] **Event Logging**: Persistent history of all AI interventions for audit trails.
- [x] **High-Res PDF Export**: DOM-capture system that preserves Google Fonts and CSS effects.
- [x] **PPTX Export**: Native PowerPoint generation with precision coordinate mapping.
    - [x] **Shape Rasterization**: Composite background layers (Shape + Peek + Color) are baked into high-res images for PowerPoint compatibility.
    - [x] **Style Parity**: Respects state-driven Bold, Italic, and browser-measured Font Size.
    - [x] **Font Pack Generator**: Scrapes and bundles custom Google Fonts into a ZIP for local installation.
- [x] **Virtualized Navigator**: High-performance thumbnail rail using `react-window` for efficient scrolling.

## Infrastructure & DX
- [x] **PWA**: Fully installable with Service Worker caching for offline app loading.
    - [x] **Manual Install Button**: Sidebar trigger to recover dismissed install prompts.
- [x] **Global State Machine**: Redux-style reducer with single-atom state (`RunDoc`).
- [x] **Persistence**: IndexedDB autosave with schema validation.
- [x] **Keep-Alive Architecture**: Cached DOM states for instant navigation between stages.
- [x] **Quick Restore**: Load JSON projects directly from the welcome screen.
- [x] **Project Archive**: Full ZIP export containing JSON data, logs, and raw asset files.
- [x] **Undo/Redo**: Full history stack for all destructive actions.
- [x] **Usage Monitor**: Real-time token tracking and API latency logging.
- [x] **YOLO Mode**: Full-pipeline automation with Pause/Resume/Abort controls.
- [x] **Mock Mode**: Seamless offline development with simulated AI responses.
- [x] **Rich Template Library**: Dedicated starter decks for various use cases (Startup, Education, Status).
- [x] **Commission History**: Explicit logging of AI-generated assets with visual tagging in gallery.
