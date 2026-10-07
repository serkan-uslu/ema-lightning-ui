# Development

## Setup

```bash
npm ci                                   # also installs the Husky git hook
cd backend && uv sync --python 3.11 --frozen && cd ..
npm run setup:browser                    # Chrome for Testing for MP4 renders
npm run dev                              # Next.js :3000 + FastAPI :8010
```

Restart `npm run dev` after backend changes; the frontend hot-reloads.

On the first `npm run dev`, the Python worker creates the EMA model and automatically downloads its weights from Hugging Face (`canberkkkkkk/ema-lightning`). No separate model download command or API key is needed. The web interface may open while the model is downloading or loading; wait for **Model ready** before generating speech. Both stages use the loading status; a download percentage is not available.

`npm ci` and `uv sync` install dependencies; `npm run setup:browser` downloads the video render browser. These commands do not download the model weights. `npm run dev:web` and `npm start` only start Next.js, so they require a separately running FastAPI service for speech generation. See the [README](../README.md#data-backup-and-offline-use) for the Hugging Face cache location and offline setup.

## Scripts

| Script                            | What it does                                                       |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                     | Starts FastAPI and Next.js together                                |
| `npm run dev:web`                 | Next.js only (backend started separately)                          |
| `npm run build` / `npm start`     | Production build / server                                          |
| `npm run typecheck`               | `tsc --noEmit`                                                     |
| `npm run lint` / `lint:fix`       | ESLint (Next.js core-web-vitals + TypeScript, Prettier-compatible) |
| `npm run format` / `format:check` | Prettier                                                           |
| `npm run check`                   | typecheck + lint + format check — run before opening a PR          |
| `npm run test:backend`            | `pytest` for the FastAPI service                                   |
| `npm run setup:browser`           | Downloads the render browser                                       |

## Code quality tooling

- **ESLint 9** flat config in `eslint.config.mjs`: `eslint-config-next` (core-web-vitals + TypeScript, including the React Compiler hook rules), `eslint-config-prettier`, consistent type imports, no unused variables.
- **Prettier** config in `.prettierrc.json`; ignored paths in `.prettierignore`.
- **Husky + lint-staged**: `.husky/pre-commit` runs `npx lint-staged`, which applies `eslint --fix` and `prettier --write` to staged files (`.lintstagedrc.json`). A commit fails on any ESLint warning.
- **EditorConfig** for indentation and line endings.

Python code is checked by the pytest suite; no Python formatter is enforced yet.

## Adding a feature

1. **Service** — add the HTTP call to the matching file in `src/services/`. Return typed data, throw `ApiError`.
2. **Control** — add state and actions to a provider or controller hook in `src/controls/`. Run mutations through `run()` so busy/error handling stays consistent.
3. **UI** — build atoms/molecules first if a new visual primitive is needed, then wire it in an organism. Keep atoms/molecules free of hooks from `controls/`.
4. **Copy** — add every user-facing string to `src/i18n/tr.ts` and `src/i18n/en.ts` (TypeScript fails if `en` misses a key).
5. **Styles** — add classes to the CSS file of the same layer and use tokens from `tokens.css`.
6. Run `npm run check`, `npm run build` and, for backend changes, `npm run test:backend`.

## Backend notes

- The model is created once (`EMA()`); never instantiate it per request.
- Each job stores an immutable snapshot; retries must reuse it.
- New backend error messages are Turkish strings in `HTTPException`. Add an English translation to `backendErrors` in `src/i18n/en.ts` with the exact Turkish text as the key.
- Interactive API docs: <http://127.0.0.1:8010/docs>.

## Manual verification checklist

- Create a project, generate a paragraph, play it from the card, the take list and the player bar; play/pause state must match everywhere.
- Change text or speed and confirm the old take shows "out of date".
- Export WAV and ZIP.
- In the montage, add takes and an image, split a clip, save, render and download.
- Switch TR/EN and collapse the sidebar; reload and confirm both preferences persist.
- Check a phone-width viewport for horizontal overflow.
