# Notebook LLM Web App

A browser-based notebook-style document Q&A app.

## What it does
- Accepts **PDF, DOCX, Excel/CSV, and image** uploads.
- Extracts text in-browser using:
  - PDF.js (PDF)
  - Mammoth.js (DOCX)
  - SheetJS (Excel/CSV)
  - Tesseract.js OCR (images)
- Builds a local in-memory chunk index.
- Answers questions by returning the most relevant snippets with source filenames.

## Run
No build step is required.

```bash
python -m http.server 4173
```

Then open:

- `http://localhost:4173/public/`

## Note
This implementation is fully client-side and does not send file content to a backend.
