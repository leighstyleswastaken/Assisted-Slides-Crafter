
# Testing Strategy: The Glass Box

Since Assisted Slides Crafter is a deterministic "Glass Box" system, our testing strategy focuses on **State Integrity** and **Pipeline Resilience**. 

We do not need to test if the AI generates "good" art (subjective). We need to test that the AI's output is correctly *handled*, *stored*, and *rendered* by the application.

## 1. Core Philosophy
1.  **State is King**: If `runDocReducer` works, the app works. 80% of testing effort goes here.
2.  **Mock the Brain**: Never call the real Gemini API in tests. Use `mock-gemini` logic or strict mocks to ensure deterministic results.
3.  **Parsers are Critical**: The AI returns JSON. Tests must verify our `try/catch` and validation logic handles garbage output gracefully.

## 2. Priority 1: Unit Tests (Logic)

### State Machine (`src/context/__tests__/runDocReducer.test.ts`)
The reducer handles deep nested updates (slides -> variants -> zones). Regression here breaks the UI.
*   **Test**: `UPDATE_TEXT_CONTENT` updates the correct slide/variant/field.
*   **Test**: `UPDATE_ZONE` updates the grid without mutating other slides.
*   **Test**: `UNDO` correctly reverts the state stack.
*   **Test**: `BATCH_ACTIONS` performs multiple updates atomically.

### Validation (`src/services/__tests__/validationService.test.ts`)
Ensures we don't load corrupt JSON files that crash the app.
*   **Test**: Valid `RunDoc` returns `true`.
*   **Test**: Missing `slide_id` returns `false` with helpful error message.
*   **Test**: Malformed `branding` object is caught.

### Prompt Builders (`src/services/__tests__/prompts.test.ts`)
Ensures our prompt templates don't throw errors when given edge-case data (nulls, empty arrays).
*   **Test**: `Prompts.Reviewer` generates valid string even with 0 assets.
*   **Test**: `Prompts.Outline` handles empty key facts array.

## 3. Priority 2: Integration Tests (The Pipeline)

### YOLO Pipeline (`src/services/__tests__/pipelineService.test.ts`)
The autopilot involves async chaining of multiple agents.
*   **Test**: Run the pipeline with mocked services. Verify `dispatch` is called in the correct order (Strategist -> Art -> Architect -> Copywriter).
*   **Test**: Verify `STOP` signal correctly aborts the promise chain.

## 4. Priority 3: Visual/Component Tests

### Slide Surface (`src/components/Renderer/__tests__/SlideSurface.test.tsx`)
*   **Smoke Test**: Renders without crashing given a standard Slide object.
*   **Parity Test**: Ensure DOM structure matches what `html2canvas` expects (no shadow DOM, standard CSS).

## Recommended Tooling
*   **Runner**: `Vitest` (Fast, Vite-native).
*   **DOM**: `jsdom` (Simulate browser).
*   **Library**: `@testing-library/react`.

## Directory Structure
Colocate tests with code for easy maintenance.
```
src/
  context/
    runDocReducer.ts
    __tests__/
      runDocReducer.test.ts
  services/
    ai/
      ...
    __tests__/
      validationService.test.ts
```
