
# Project Structure

## Root
- `index.html`: Entry point. Loads fonts, Tailwind, and Import Maps.
- `index.tsx`: React Root mounting point.
- `metadata.json`: Capabilities manifest (e.g. microphone permissions).

## Source (`src/`)

### Context (`src/context/`)
- `RunDocContext.tsx`: The global state provider. Handles initialization, persistence (autosave), exposes `dispatch`, and manages transient `YOLO` state (active/paused).
- `runDocReducer.ts`: Pure function containing all state mutation logic (Redux pattern). Handles actions like `UPDATE_BRANDING`, `ADD_ASSETS`, `APPROVE_STAGE`, `APPLY_ZONE_TO_INNER`.

### Types (`src/types.ts`)
- Defines the TypeScript interfaces for the entire domain (`RunDoc`, `Slide`, `Asset`, `Branding`).

### Constants (`src/constants.ts`)
- `INITIAL_RUN_DOC`: Default state for new projects.
- `STAGE_NAMES` & `STAGE_DESCRIPTIONS`: Static configuration for the pipeline.

### Services (`src/services/`)
- `geminiService.ts`: Interface to Google's GenAI SDK. Handles specific model calls for text, JSON, and images.
- `prompts.ts`: Storage for prompt engineering logic. Keeps prompts separate from code.
- `pipelineService.ts`: Orchestrator for the "YOLO Mode". Handles async chaining, stage navigation, and interrupt (pause/resume) logic.
- `imageProcessingService.ts`: Wrapper for HTML5 Canvas pixel manipulation (Magic Wand background removal).
- `persistenceService.ts`: Wrapper for IndexedDB (`idb-keyval`) for saving/loading projects.
- `validationService.ts`: Runtime integrity checks for the JSON data model.
- `fontUtils.ts`: Dynamic Google Font loader.

### Components (`src/components/`)

#### Layout
- `AppShell.tsx`: Main layout container. Renders the Sidebar, the active Stage view, and the global **YOLO Modal Overlay**.

#### Stages
- `Stage1Strategist.tsx`: Input, Branding, and Outline generation.
- `Stage2ArtDept.tsx`: Asset generation and background removal management.
  - `ArtDept/ConceptBrief.tsx`: AI suggestions list.
  - `ArtDept/AssetGallery.tsx`: Grid view of generated images with controls and safety modals.
- `Stage3Architect.tsx`: Drag-and-drop layout editor using `react-dnd`.
- `Stage4Copywriter.tsx`: Text editor with layout overlay and soft-limit warnings.
- `Stage5Publisher.tsx`: Final read-only rendering and PDF export.

#### Renderer
- `SlideRenderer.tsx`: The "Engine" that takes a `Slide` object + `AssetLibrary` and renders the final visual output. Used in Stage 5 and PDF generation.

#### UI
- `SettingsModal.tsx`: Global settings (AI Models, Import/Export).
- `StatusBadge.tsx`: Visual indicator for stage status (Locked, Open, Approved).
- `LockGuard.tsx`: A wrapper component that enforces read-only state on approved stages and handles the "Unlock" workflow.
- `LoadingScreen.tsx`: Initial app load state.
- `WelcomeModal.tsx`: Onboarding tutorial.

#### DevTools
- `ProgressTracker.tsx`: Internal tool for tracking feature implementation status.
