# Chat Model Comparator

A lightweight web UI to compare two model responses side by side.

## Features

- Select up to two models in the same chat window.
- Send one prompt with Enter (or the Send button).
- Prompt is delivered to both selected models.
- Responses are shown in split-screen columns for easy comparison.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

> The app tries `POST /api/chat` with `{ model, prompt }`. If your backend is not wired, it falls back to demo responses.
