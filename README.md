
# Assisted Slides Crafter v3.0

Assisted Slides Crafter (ASC) is a "glass box" AI presentation engine that prioritizes human curation over blind automation. It features a strict 5-stage pipeline—Strategist, Art Dept, Architect, Copywriter, and Publisher—ensuring professional, deterministic output.

## Core Philosophy
1.  **Linear Pipeline:** A structured workflow (Stage 1 -> Stage 5) that mirrors a real creative agency.
2.  **Glass Box AI:** Every AI decision (branding, outline, layout) is visible, editable, and reversible.
3.  **Deterministic Layout:** A 3x3 Cardinal Grid system ensures layouts are reproducible and exportable.
4.  **WYSIWYG:** The browser rendering engine allows for pixel-perfect PDF and PPTX exports.
5.  **Offline-First:** Fully PWA compliant with a robust Mock Mode for offline or demo usage.

## Key Features

### 🚀 Template System
Jumpstart projects with pre-configured narrative structures:
-   **Startup Pitch**: Problem, Solution, Market, Business Model.
-   **Educational**: Goals, Concepts, Case Studies, Takeaways.
-   **Status Report**: Metrics, Blockers, Roadmap (Data-heavy).
-   **Narrative**: Hero's Journey arc for emotional storytelling.

### 🛠️ PWA & Offline Support
-   **Installable**: Runs as a native desktop/mobile app via Chrome/Edge.
-   **Mock Mode**: Automatically detects missing API keys or network issues and switches to a high-fidelity simulation mode using programmatic art generation.
-   **Local Persistence**: All work is autosaved to IndexedDB.

### 🎨 High-Fidelity Export
-   **PDF**: Canvas-based rasterization captures every pixel, font, and CSS effect (grain, vignette).
-   **PPTX**: Native PowerPoint generation with editable text and images.
-   **Font Pack**: Automatically downloads and zips Google Fonts used in the project for local installation, ensuring PowerPoint text looks identical to the web view.

### 🤖 The "YOLO" Autopilot
A managed automated pipeline that navigates the stages for you.
-   **Interruptible**: Pause, Resume, or Stop the AI at any moment.
-   **Creative Director**: A specialized "Reviewer" agent in Stage 5 that critiques the final deck and autonomously fixes layout issues or commissions new assets.

## Deployment & Setup

### Real AI Mode
To use the application with real AI capabilities:
1.  Clone the repository.
2.  Create a `.env` file (or set Environment Variables in your cloud provider).
3.  Add `API_KEY=your_google_gemini_api_key`.
4.  Run the app.

### Demo / Tutorial Mode
The application is designed to work immediately without configuration:
1.  Deploy to Vercel/Netlify.
2.  Open the app.
3.  If no API key is detected, it enters **Mock Mode**.
4.  Select **"Guided Tutorial"** on the welcome screen to learn the interface.

## Documentation
-   **[PROGRESS.md](PROGRESS.md)**: Development changelog.
-   **[FEATURES.md](FEATURES.md)**: Comprehensive feature list.
-   **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)**: File manifest.
-   **[docs/AGENT_PROTOCOL.md](docs/AGENT_PROTOCOL.md)**: System prompt definitions.

## Technology Stack
-   **Frontend**: React 18, TypeScript, Tailwind CSS.
-   **State**: Context API + useReducer + IndexedDB.
-   **AI**: Google GenAI SDK (Gemini 3 Pro / Flash / Imagen).
-   **Graphics**: HTML5 Canvas, SVG Filters, WebP Compression.
