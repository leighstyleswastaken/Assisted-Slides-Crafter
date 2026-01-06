
# Frontend Flow

## Component Hierarchy

- **App** (Root)
  - **RunDocProvider** (State Container)
    - **AppShell** (Layout)
      - **Sidebar** (Navigation & Settings)
      - **YOLO Modal** (Global Blocking Overlay)
      - **ToastContainer** (Global Notifications)
      - **Main View Area** (Dynamic Stage Rendering)
        - Stage 1: **Strategist** (Wrapped in LockGuard)
        - Stage 2: **ArtDept** (Wrapped in LockGuard)
          - **ConceptBrief** (Left Col)
          - **AssetGallery** (Right Col)
            - **ImportModal** (File Classification)
        - Stage 3: **Architect** (Wrapped in LockGuard)
          - **SlideNavigator** (Left Col)
          - **SlideCanvas** (Center / Drag & Drop)
          - **AssetDrawer** (Right Col)
        - Stage 4: **Copywriter** (Wrapped in LockGuard)
          - **SlideNavigator** (Left Col)
          - **CompositeCanvas** (Center / Text Overlay)
          - **ContextPanel** (Right Col)
        - Stage 5: **Publisher**
          - **SlideRenderer** (The Engine)

## Key User Interactions

### "YOLO Mode" (Autopilot)
1.  User clicks "YOLO Mode" in Stage 1.
2.  `RunDocContext` sets `yoloActive = true`.
3.  **AppShell** renders the **YOLO Modal**, blocking all other UI interactions.
4.  `pipelineService` takes control:
    - **Stage 2**: Generates concepts -> Generates Assets -> Removes Backgrounds.
    - *Breakpoint*: Checks for Pause signal.
    - **Navigation**: Dispatches `SET_STAGE` to visualize progress.
    - **Stage 3**: Heuristic Layout Assignment (Intro BG -> Slide 1, Kit BG -> Content Slides).
    - **Stage 4**: Generates Copy for all slides.
5.  User can click **Pause** on the modal to inspect state, then **Resume** to continue.
6.  Upon completion, navigates to Stage 5.

### Locking & Safety
1.  When a user clicks "Approve Stage", the `StageStatus` becomes `Approved`.
2.  The `LockGuard` component detects this status.
3.  It renders a transparent overlay over the stage content, intercepting all clicks.
4.  User attempts to edit -> `LockGuard` shows "Locked" tooltip.
5.  User clicks the overlay -> `LockGuard` prompts "Un-approve to edit?".
6.  If confirmed, status reverts to `Open`, and controls unlock.

### Drag and Drop (Stage 3)
1.  User drags `DraggableAsset` from Asset Drawer.
2.  User drops onto `CanvasZone` (3x3 grid).
3.  `Stage3Architect` dispatches `UPDATE_ZONE`.
4.  **Advanced**: User hovers over a placed asset in a zone.
5.  User clicks "Apply to Inner".
6.  Reducer applies that asset to the same zone for all slides *except* the first and last.

### Auto-Offline Handling
1.  API call fails with 429/503 (Resource Exhausted).
2.  `geminiService` emits `quotaExhausted` event.
3.  `RunDocContext` catches event.
4.  State updates: `ai_settings.mockMode = true`.
5.  **ToastContainer** displays error: "API Quota Reached. Switched to Offline Mock Mode."
6.  Subsequent calls use `mock-` data immediately.
