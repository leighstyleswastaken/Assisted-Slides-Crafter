
# Project Structure

## Root
- `index.html`: Entry point. Loads fonts, Tailwind, and Import Maps.
- `index.tsx`: React Root mounting point.
- `manifest.json`: PWA Manifest (Name, Icons, Theme Color).
- `sw.js`: Service Worker for offline asset caching.
- `metadata.json`: Capabilities manifest (e.g. microphone permissions).

## Source (`src/`)

### Context (`src/context/`)
- `RunDocContext.tsx`: The global state provider. Handles initialization, persistence (autosave), and YOLO state.
- `runDocReducer.ts`: **Main Orchestrator**. Combines slice reducers and manages History (Undo/Redo).
- `reducers/`: **State Slices**
  - `globalReducer.ts`: Stage transitions, branding, and project settings.
  - `assetReducer.ts`: Library management (add, delete, toggle keep).
  - `slideReducer.ts`: Complex updates for zones, text, and layout.

### Types (`src/types.ts`)
- Defines the TypeScript interfaces for the entire domain (`RunDoc`, `Slide`, `Asset`, `Branding`).

### Constants (`src/constants.ts`)
- `INITIAL_RUN_DOC`: Default state for new projects.
- `STAGE_NAMES` & `STAGE_DESCRIPTIONS`: Static configuration for the pipeline.

### Domain Logic
- `templates.ts`: Definitions for pre-built decks (Startup, Narrative, etc.) and the Tutorial flow.

### Services (`src/services/`)
- `geminiService.ts`: **Facade**. Re-exports specialized AI functions to the rest of the app.
- `ai/`: **AI Agents**
  - `core.ts`: Base client wrapper, error handling, retry logic, and event bus.
  - `strategist.ts`: Branding analysis and Outline generation.
  - `art.ts`: Image prompting and generation.
  - `architect.ts`: Layout strategy and zoning logic.
  - `copywriter.ts`: Text generation.
  - `mocks.ts`: Offline/Demo mode logic.
- `pptxService.ts`: **Orchestrator**. Manages the PowerPoint generation process.
- `pptx/`: **PPTX Engine**
  - `layers.ts`: Logic for Backgrounds, Asset Grids, and Text layers.
  - `utils.ts`: Shape rasterization and helpers.
- `prompts.ts`: Storage for prompt engineering logic. Keeps prompts separate from code.
- `pipelineService.ts`: Orchestrator for the "YOLO Mode". Handles async chaining and interrupts.
- `imageProcessingService.ts`: Wrapper for HTML5 Canvas pixel manipulation (Magic Wand background removal).
- `persistenceService.ts`: Wrapper for IndexedDB (`idb-keyval`) for saving/loading projects.
- `validationService.ts`: Runtime integrity checks for the JSON data model.
- `fontUtils.ts`: Dynamic Google Font loader.
- `fontService.ts`: Font Pack Generator (fetch & zip).

### Components (`src/components/`)

#### Layout
- `AppShell.tsx`: Main layout container. Renders the Sidebar and active Stage.
- `StageScaffold.tsx`: Responsive layout wrapper for individual stages.

#### Stages
- `Stage1Strategist.tsx`: Input, Branding, and Outline generation.
- `Stage2ArtDept.tsx`: Asset generation management.
  - `ArtDept/ConceptBrief.tsx`: AI suggestions list.
  - `ArtDept/AssetGallery.tsx`: Grid view with controls and safety modals.
- `Stage3Architect.tsx`: Layout composition.
  - `Architect/DraggableAsset.tsx`: Drag source.
  - `Architect/CanvasZone.tsx`: Drop target (3x3 grid).
  - `Architect/StyleControlPanel.tsx`: Controls for shapes, gradients, and effects.
- `Stage4Copywriter.tsx`: Text editor with layout overlay.
- `Stage5Publisher.tsx`: Final review and export.
  - `Publisher/ReviewModal.tsx`: Creative Director interface.
  - `Publisher/PublisherSidebar.tsx`: Final polish settings.

#### Renderer
- `SlideSurface.tsx`: **The Engine**. Renders the final visual output (DOM). Used in all stages.
- `TransformableElement.tsx`: Wrapper for interactive move/resize handles (Stage 4).
- `AutoFitComponents.tsx`: Text scaling logic.
- `ShapeMaskLayer.tsx`: SVG background clipping.
- `GradientMesh.tsx`: Complex CSS/SVG gradients.
- `GlassCard.tsx`: UI container style.

#### UI
- `YoloOverlay.tsx`: Full-screen automation feedback.
- `TutorialCoach.tsx`: Floating onboarding guide.
- `SettingsModal.tsx`: Global settings (AI Models, Import/Export).
- `StatusBadge.tsx`: Visual indicator for stage status.
- `LockGuard.tsx`: Enforces read-only state on approved stages.
- `LoadingScreen.tsx`: Initial app load state.
- `WelcomeModal.tsx`: Onboarding and JSON Import.

#### DevTools
- `ProgressTracker.tsx`: Feature implementation status.
- `UsageLogger.tsx`: Token and API latency monitor.
