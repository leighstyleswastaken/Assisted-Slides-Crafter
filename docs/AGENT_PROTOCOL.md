
# Agent Protocol

This document defines the "Personas" used in the `prompts.ts` file and how they interact with the data.

## 1. The Strategist
- **Role**: Creative Director.
- **Input**: Raw text / Documents.
- **Output**: JSON Structure (Branding + Outline).
- **Protocol**:
    - MUST extract concrete "Visual Features" (nouns/adjectives) to pass downstream.
    - **New**: MUST extract "Key Facts" (hard numbers/statistics) and suggest "Data Visualizations" if the content implies quantitative data.
    - MUST strictly adhere to the requested JSON Schema (no markdown chatter).

## 2. The Art Director (Image Gen)
- **Role**: Concept Artist.
- **Input**: Outline Item + Branding Chips + Visual Features + Data Viz requests.
- **Output**: Image Prompts & Asset Kinds.
- **Protocol**:
    - MUST differentiate between `background` (full bleed), `stamp` (isolated), and `chart` (data).
    - For `stamp` and `chart` assets, MUST append background removal keywords ("solid white background", "flat vector style", "high contrast").
    - MUST prioritize generating charts if the slide intent or branding data suggests it.

## 3. The Architect (Layout)
- **Role**: Grid Composer.
- **Input**: Available Assets + Slide Intent.
- **Output**: Zone Assignments (3x3 Grid).
- **Protocol**:
    - MUST prefer placing `stamps` in zones that do not overlap the projected text area (heuristic: Text usually on Left, Images on Right).
    - MUST select `background` assets for the `background` zone only.
    - Can suggest shape masks (waves, blobs) for backgrounds if the tone allows it.

## 4. The Copywriter
- **Role**: Editor.
- **Input**: Branding Tone + Layout Constraints + Slide Intent + Key Facts.
- **Output**: Text Strings.
- **Protocol**:
    - MUST respect the `TextLayout` type (e.g., if `bullets_only`, return bullets).
    - MUST write concisely to avoid overflow (though the UI handles overflow via soft-warns).
    - If "Key Facts" are available, MUST integrate them into the copy for authority.

## 5. The Anti-Hallucination Protocol (Technical)
For complex, multi-step logic (like the **Reviewer** loop), relying on natural language instructions is insufficient for faster models like `gemini-flash`. We employ a **Dual-Constraint** approach to prevent hallucinations and infinite loops.

### Constraint A: TypeScript Context
We inject strict TypeScript `interface` definitions directly into the system prompt. LLMs are heavily trained on code; they respect type definitions better than English rules.

**Example Prompting Pattern:**
```typescript
// Define the shape of valid answers in the prompt
interface UpdateZoneAction {
  type: 'UPDATE_ZONE';
  payload: {
    zoneId: 'nw' | 'ne' | 'se' | ...; 
    assetId: string; // Must exist in provided MEDIA_PACK
  }
}
```

### Constraint B: Strict JSON Schema
We pass a rigid JSON Schema to the `generationConfig` of the API call. This physically prevents the model from generating invalid keys or values.

**Critical Rules:**
1.  **Use Enums:** Never use `type: STRING` for fields with finite options (e.g., zones, layout types). Use `enum: ["nw", "ne", ...]`.
2.  **No Open Objects:** Avoid `type: OBJECT` without defining `properties`.
3.  **Required Fields:** Always mark core fields as `required` to prevent partial JSON.

## Failure & Recovery
- **Retry**: If an Agent fails to return valid JSON, the UI catches the error and allows the user to click "Regenerate" (manual retry).
- **Fallback**: The `YOLO Pipeline` wraps these agents. If an agent fails in YOLO mode, the pipeline catches the error, logs it to the status update, and attempts to proceed with partial data if possible, or halts for user intervention.
