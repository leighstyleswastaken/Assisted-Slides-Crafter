# State and Data Flow

## The Flux Pattern
Assisted Slides Crafter uses a unidirectional data flow pattern (React Context + Reducer).

1.  **View**: User clicks "Generate" or "Approve".
2.  **Action**: An Action object (e.g., `{ type: 'APPROVE_STAGE', payload: 1 }`) is dispatched.
3.  **Reducer**: The `runDocReducer` calculates the new state based on the action.
    *   *Side Effect*: If Stage 2 is approved, the reducer automatically initializes empty slides for Stage 3 using intelligent defaults (e.g., assigning Intro/Outro backgrounds).
4.  **State**: The Global `RunDoc` is updated.
5.  **Re-render**: UI components update to reflect the new state.

## Persistence
- **Technology**: IndexedDB (via `idb-keyval`).
- **Trigger**: Autosave on state change (debounced 2s).
- **Lifecycle**:
    - App Mount: Attempt to load `deckforge_rundoc_v2`.
    - If found -> Validate Schema -> Hydrate State.
    - If not found -> Initialize default empty state.

## The Pipeline Flow
Data flows strictly "Downstream".

### Manual Mode
1.  **Stage 1 (Strategist)**: Creates `Branding` and `Outline`.
2.  **Stage 2 (Art Dept)**: Consumes `Branding` + `Outline` -> Produces `AssetLibrary`.
3.  **Stage 3 (Architect)**: Consumes `AssetLibrary` + `Outline` -> Produces `Slide` Layouts (Zones).
4.  **Stage 4 (Copywriter)**: Consumes `Slide` Layouts + `Branding` -> Produces `TextContent`.
5.  **Stage 5 (Publisher)**: Consumes `Slide` + `AssetLibrary` + `Branding` -> Produces PDF.

### YOLO Mode (Automated)
The `pipelineService` acts as a "Super User", dispatching actions sequentially without human input.
- It pauses execution between stages to allow the UI to re-render and show progress.
- It respects the `YoloControl` ref to handle user interrupts (Pause/Stop).

## Governance (Locking)
- **State**: `state.stage_status[N]` can be `Locked`, `Open`, or `Approved`.
- **Enforcement**: 
    - Navigation guards prevent entering `Locked` stages.
    - `LockGuard` component prevents editing `Approved` stages.
- **Transition**: `APPROVE_STAGE` locks the current stage and unlocks the next one. `UNLOCK_STAGE` reverts status to `Open`.

### Auto-Offline Handling
1.  **Quota Error (429/Resource Exhausted)**:
    - Detected by `geminiService`.
    - **Action**: Stops execution immediately. Do NOT retry.
    - **Event**: Emits `quotaExhausted`.
    - **UI**: Switches global state to `mockMode: true` and displays a red Toast notification.
    - **Recovery**: User must manually disable Mock Mode in settings to retry real calls.
2.  **Server Error (503/Overloaded)**:
    - Detected by `geminiService`.
    - **Action**: Retries request with exponential backoff (up to 5 attempts).
    - **Event**: Logs warnings to console.