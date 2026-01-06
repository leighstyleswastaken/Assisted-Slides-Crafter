
# Assisted Slides Crafter v2

Assisted Slides Crafter is a "glass box" slide generator that emphasizes human curation over blind automation. It follows a strict 5-stage pipeline where every step requires user approval before proceeding.

## Documentation Files

-   **[README.md](README.md)**
    -   Provides developers with a high-level overview of the project's concepts and usage.

-   **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)**
    -   Serves as a manifest of all files in the project, detailing their intent and functionality.

-   **[RESPONSIBILITIES.md](RESPONSIBILITIES.md)**
    -   Tracks the primary roles and complexity of each module to maintain a clear separation of concerns.

-   **[DATA_MODEL.md](DATA_MODEL.md)**
    -   Defines the core data structures used in the application's domain logic.

-   **[STATE_AND_DATA_FLOW.md](STATE_AND_DATA_FLOW.md)**
    -   Documents the application's "backend" business logic and state lifecycle.

-   **[FRONTEND_FLOW.md](FRONTEND_FLOW.md)**
    -   Documents the UI component hierarchy and data flow from parent to child components.

-   **[EXAMPLE_SCENARIO.md](EXAMPLE_SCENARIO.md)**
    -   Provides a concrete, narrative example of a user flow to illustrate system behavior, including failure and recovery loops.

-   **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
    -   Explains the architectural layers used to ensure stability, safety, and auditability.

-   **[docs/AGENT_PROTOCOL.md](docs/AGENT_PROTOCOL.md)**
    -   The definitive guide to Agent Personas, Communication Protocols, and the Failure/Recovery Loops.

-   **[DEPENDENCIES.md](DEPENDENCIES.md)**
    -   Lists all external project dependencies and their purpose.

## Core Philosophy
1.  **Linear Pipeline:** Stage 1 -> Stage 5.
2.  **Asset Kit Builder:** Reusable textures and transparent stamps.
3.  **Deterministic Layout:** Cardinal Grid zones (3x3).
4.  **State Machine:** Backed by a single `RunDoc` JSON object.
5.  **WYSIWYG:** What you see is exactly what exports to PDF.
6.  **YOLO Autopilot:** A managed automated pipeline that navigates stages for you, with Pause/Resume interruptibility.
7.  **Strict Governance:** Approved stages are strictly read-only unless explicitly unlocked by the user.

## Deployment & Demo Mode

### Real AI Mode
To use the application with real AI capabilities:
1.  Clone the repository.
2.  Create a `.env` file (or set Environment Variables in your cloud provider).
3.  Add `API_KEY=your_google_gemini_api_key`.
4.  Run the app.

### Offline / Demo Mode (Vercel)
The application includes a robust **Mock Mode** that simulates all AI responses locally using heuristics and programmatic canvas generation.
1.  Deploy the repository to Vercel/Netlify.
2.  **Do not** set an `API_KEY` environment variable.
3.  The application will detect the missing key on startup and automatically enter "Demo Mode", allowing users to experience the full workflow (Strategist -> Publisher) with simulated data.

## Development
This project uses React 18, TypeScript, and Tailwind CSS.
State is managed via a global Context (`RunDocContext`) adhering to the v2 JSON Schema.
