
# Architecture

Assisted Slides Crafter implements a "Glass Box" architecture designed to build trust by making every AI decision visible and editable.

## The Three Layers

### 1. The Team (Agents)
These are the AI logic modules encapsulated in `geminiService.ts`. They act as specialized workers.
- **Strategist Agent**: specialized in text analysis and structure.
- **Art Director Agent**: specialized in visual description (Midjourney-style prompting).
- **Copywriter Agent**: specialized in brevity and formatting.

### 2. The Governance (State Machine)
The `RunDocContext` acts as the governance layer.
- **Gates**: It prevents moving to the Copywriting phase before the Layout phase is secure.
- **Lock-out**: Once a stage is Approved, the `LockGuard` component physically overlays the UI, converting it to a read-only state. This prevents accidental edits to upstream data that would cascade destructively (e.g., changing the Outline after generating Assets).
- **Audit**: Every asset generated and every text written is stored in the `RunDoc` for review.

### 3. The Preview (WYSIWYG)
The Application Shell provides the interface for the user to interact with the Team and Governance.
- It is crucial that the "Edit" view in Stage 4 matches the "Final" view in Stage 5 exactly.
- We achieve this by sharing the `CompositeCanvas` and `SlideRenderer` logic (or keeping CSS properties identical) across stages.

## Stability & Safety
- **Schema-First Engineering**: To prevent AI hallucinations (e.g., inventing asset IDs or infinite text loops), all complex agents must rely on **Strict JSON Schemas** defined in the API call, supplemented by **TypeScript Interface Context** in the prompt.
- **Schema Validation**: `validationService.ts` ensures that even if the AI outputs malformed JSON, or if a save file is corrupted, the app won't crash silently.
- **Local Persistence**: IndexedDB ensures work is not lost on refresh, which is critical for a multi-step creative process.
- **YOLO Interrupt**: The automated pipeline runs in a discrete async service that checks a mutable ref (`YoloControl`) at every major step, ensuring the user can pull the plug or pause execution instantly.
