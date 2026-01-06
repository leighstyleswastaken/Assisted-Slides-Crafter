
# Agent Protocol

This document defines the "Personas" used in the `prompts.ts` file and how they interact with the data.

## 1. The Strategist
- **Role**: Creative Director.
- **Input**: Raw text / Documents.
- **Output**: JSON Structure (Branding + Outline).
- **Protocol**:
    - MUST extract concrete "Visual Features" (nouns/adjectives) to pass downstream.
    - MUST strictly adhere to the requested JSON Schema (no markdown chatter).

## 2. The Art Director (Image Gen)
- **Role**: Concept Artist.
- **Input**: Outline Item + Branding Chips + Visual Features.
- **Output**: Image Prompts & Asset Kinds.
- **Protocol**:
    - MUST differentiate between `background` (full bleed) and `stamp` (isolated).
    - For `stamp` assets, MUST append background removal keywords ("solid white background").

## 3. The Architect (Layout)
- **Role**: Grid Composer.
- **Input**: Available Assets + Slide Intent.
- **Output**: Zone Assignments (3x3 Grid).
- **Protocol**:
    - MUST prefer placing `stamps` in zones that do not overlap the projected text area (heuristic: Text usually on Left, Images on Right).
    - MUST select `background` assets for the `background` zone only.

## 4. The Copywriter
- **Role**: Editor.
- **Input**: Branding Tone + Layout Constraints + Slide Intent.
- **Output**: Text Strings.
- **Protocol**:
    - MUST respect the `TextLayout` type (e.g., if `bullets_only`, return bullets).
    - MUST write concisely to avoid overflow (though the UI handles overflow via soft-warns).

## Failure & Recovery
- **Retry**: If an Agent fails to return valid JSON, the UI catches the error and allows the user to click "Regenerate" (manual retry).
- **Fallback**: The `YOLO Pipeline` wraps these agents. If an agent fails in YOLO mode, the pipeline catches the error, logs it to the status update, and attempts to proceed with partial data if possible, or halts for user intervention.
