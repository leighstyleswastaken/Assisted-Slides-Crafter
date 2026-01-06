
# Module Responsibilities

## State Management (`RunDocContext`, `runDocReducer`)
**Responsibility**: Source of Truth.
- Maintains the integrity of the `RunDoc` object.
- Enforces state transitions (e.g., unlocking stages).
- Handles hydration/dehydration from storage.
- **New**: Manages ephemeral UI state (Toast Notifications).
- **Complexity**: High. Central hub of the application.

## AI Service (`geminiService`)
**Responsibility**: Intelligence Provider.
- Translates domain requests (e.g., "Make branding") into GenAI API calls.
- Enforces JSON Schema on AI outputs to ensure type safety.
- Handles model selection (Pro vs Flash).
- **New**: Manages API Quota events (Event Bus) and Mock Mode switching.
- **Complexity**: Medium. Wraps external API complexity.

## Prompt Engineering (`prompts.ts`)
**Responsibility**: Personality & Instruction.
- Contains the "System Instructions" for the various AI personas (Strategist, Art Director, Copywriter).
- Ensures prompts include necessary context (e.g., passing Branding Chips to Art Dept).
- **Complexity**: Low (Pure strings/functions), but high impact on quality.

## Pipeline Orchestrator (`pipelineService`)
**Responsibility**: Automation.
- Executes the "YOLO Mode".
- Chains multiple service calls together (Concept -> Image Gen -> Bg Removal -> Layout -> Copy).
- Makes heuristic decisions when human input is skipped.
- **Complexity**: High. Managing async flows and race conditions.

## Renderer (`SlideRenderer`)
**Responsibility**: Visual Output.
- Deterministic rendering of a slide based *only* on the data provided.
- Must match HTML-to-PDF output exactly.
- Handles "Polish" effects (Grain, Vignette).
- **Complexity**: Medium. CSS composition and layering.

## UI Stages (`Stage1` - `Stage5`)
**Responsibility**: Human-in-the-loop Interface.
- Visualization of the current state.
- Dispatching user intents to the Reducer.
- **Complexity**: Medium. React component logic.
