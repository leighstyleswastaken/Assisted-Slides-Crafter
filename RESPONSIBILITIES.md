
# Module Responsibilities

## State Management (`RunDocContext`, `runDocReducer`)
**Responsibility**: Source of Truth.
- **Slice Pattern**: The reducer is decomposed into `slideReducer` (content), `assetReducer` (library), and `globalReducer` (meta).
- **History**: The main reducer manages the `undoStack` and `redoStack` for global time-travel.
- **Persistence**: Handles hydration/dehydration from IndexedDB.
- **Notifications**: Manages ephemeral UI alerts.
- **Complexity**: High. Central hub of the application.

## AI Service (`geminiService`)
**Responsibility**: Intelligence Facade.
- **Facade Pattern**: `geminiService.ts` acts as a single entry point, delegating to specialized agents in `src/services/ai/`.
- **Agents**:
  - `Strategist`: Text analysis and JSON structure.
  - `Art`: Image generation prompts and calls.
  - `Architect`: Layout heuristics.
  - `Copywriter`: Text generation.
- **Resilience**: `core.ts` handles API Quota events, Mock Mode fallback, and exponential backoff retries.
- **Complexity**: Medium. Wraps external API complexity.

## Export Engine (`pptxService`, `pdfService`)
**Responsibility**: High-Fidelity Output.
- **Layer Architecture**: `pptxService` orchestrates specialized layer handlers (`layers.ts`) for Backgrounds, Grids, and Text to keep the logic clean.
- **Rasterization**: `utils.ts` handles complex Canvas operations to bake Shape Masks and SVG filters into PNGs compatible with PowerPoint.
- **Parity**: Ensures what you see on the `SlideSurface` matches the exported file pixel-for-pixel (PDF) or coordinate-for-coordinate (PPTX).

## Pipeline Orchestrator (`pipelineService`)
**Responsibility**: Automation.
- Executes the "YOLO Mode".
- Chains the specialized AI agents together securely.
- Manages the "Human-in-the-loop" interrupt logic (Pause/Stop).
- **Complexity**: High. Managing async flows and race conditions.

## Renderer (`SlideSurface`)
**Responsibility**: The Visual Kernel.
- Deterministic rendering of a slide based *only* on the data provided.
- **Unified Engine**: Used by Stage 3 (Assets), Stage 4 (Text), Stage 5 (Preview), and PDF Generation.
- **Sub-Systems**:
  - `ShapeMaskLayer`: Procedural SVGs.
  - `TransformableElement`: Interactive editing handles.
  - `AutoFit`: Text scaling physics.
- **Complexity**: High. CSS composition and layering.

## Font Service (`fontService`)
**Responsibility**: Asset Acquisition.
- Fetches CSS from Google Fonts API.
- Parses and downloads binary font files (WOFF2).
- Bundles them into ZIP archives for the "Font Pack" feature.
- **Complexity**: Medium. Handling blobs and async streams.

## UI Stages (`Stage1` - `Stage5`)
**Responsibility**: Human Interface.
- Visualization of the current state.
- Dispatching user intents to the Reducer.
- **Refactored**: Complex UI logic (like the Asset Gallery or Layout Controls) is now extracted into sub-components for better maintainability and render performance.
- **Complexity**: Medium. React component logic.
