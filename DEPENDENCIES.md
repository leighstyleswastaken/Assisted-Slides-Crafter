
# Dependencies

## Core Framework
- **react**: UI library.
- **react-dom**: DOM bindings.
- **tailwindcss**: Utility-first CSS framework.

## Logic & State
- **idb-keyval**: Simple Promise-based keyval store implemented with IndexedDB. Used for Autosave.
- **react-dnd**: Drag and Drop primitives. Used in Stage 3 (Architect).
- **react-dnd-html5-backend**: HTML5 backend for DnD.

## AI & Processing
- **@google/genai**: Google Gemini API SDK. Powering all intelligence.
- **@imgly/background-removal**: Client-side WASM background removal. Used in Stage 2.

## Output
- **html2pdf.js**: Client-side PDF generation. Captures the DOM of Stage 5 and rasterizes it into a PDF.

## Icons & Fonts
- **lucide-react**: Icon set.
- **Google Fonts API**: Dynamic font loading via `fontUtils.ts`.
