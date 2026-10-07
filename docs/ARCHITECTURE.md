# Architecture

EMA Studio is one repository with three runtimes:

| Runtime                        | Location                              | Responsibility                                                                       |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| Next.js (React 19, App Router) | `src/`                                | User interface; proxies `/api/*` to the backend                                      |
| FastAPI (Python)               | `backend/app.py`                      | SQLite data, the single EMA model instance, the job queue, exports, media validation |
| Node renderer                  | `scripts/render.mjs`, `src/remotion/` | One process per render job, spawned by the Python worker                             |

```text
Browser ──/api/*──▶ Next.js rewrite ──▶ FastAPI (127.0.0.1:8010)
                                         ├─ SQLite + data/ files
                                         ├─ EMA Lightning (one instance, CPU by default)
                                         └─ queue worker ──spawn──▶ node scripts/render.mjs
```

The Python worker runs speech and render jobs one at a time. Render jobs never need the model, so they keep running if EMA fails to load. Every job stores a snapshot (text/settings or timeline), so retries reproduce the original request. See the README for limits.

## Frontend layering: service → control → UI

The frontend separates **data access**, **state/behaviour** and **presentation**. Imports only flow downward:

```text
app/        Route files. Read params, render one view. No logic.
views/      Page compositions. Pick a controller hook, lay out organisms.
components/
  templates/  AppShell (sidebar, top bar, notices, player, dialogs), RequireData
  organisms/  Feature blocks wired to controls (ParagraphCard, TimelineEditor, PlayerBar…)
  molecules/  Presentational combinations (PageHeading, Panel, TakePreview, Segmented…)
  atoms/      Smallest building blocks (Button, IconButton, Badge, Waveform, Checkbox…)
controls/   React providers and hooks: state, side effects, orchestration
services/   HTTP calls to FastAPI; no React, no UI strings
i18n/       Dictionaries (tr, en) and error translation
lib/        Types, pure domain helpers, formatting
styles/     CSS layered like the component tree
```

### Rules

- **Atoms and molecules are presentational.** They receive data and callbacks through props and never import from `controls/` or `services/`.
- **Organisms connect UI to controls.** They may call hooks such as `useI18n`, `useAudioPlayer` or receive a controller object (`ProjectEditor`, `MontageEditor`).
- **Controls own behaviour.** Mutations go through `useStudioData().run(...)`, which sets the busy state, refreshes data and turns errors into translated notices.
- **Services are plain functions.** They throw `ApiError` with the raw backend `detail`; translation happens in `i18n/describeError`.
- **Views do not fetch.** They read from providers and pass controllers to organisms.

### Providers (mounted once in `app/layout.tsx`)

| Provider              | Purpose                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `I18nProvider`        | Active locale and dictionary; persists the choice in the `ema-locale` cookie so the server renders the right language                                         |
| `ShellProvider`       | Sidebar collapsed state (`ema-sidebar` cookie), mobile drawer, new-project dialog                                                                             |
| `StudioDataProvider`  | Polls projects, jobs and health every 2 s; exposes `run()` for mutations                                                                                      |
| `DraftsProvider`      | Unsaved montage timelines (per project) and paragraph texts (per paragraph). Survive navigation and editor unmounts; one `beforeunload` guard for all of them |
| `AudioPlayerProvider` | One `<audio>` element for the whole app. Cards, take lists, the montage library and the player bar share play/pause/seek state                                |

Because the shell and providers live in the root layout, playback, data and unsaved drafts survive page navigation. `StudioDataProvider` reports the service as offline only after two consecutive failed polls, and `RequireData` keeps views mounted once data has loaded.

### Controller hooks

- `useProjectEditor(project)` — paragraph drafts, selection, focus, generation, reordering, split/merge, export.
- `useMontageEditor(project)` — timeline draft (`null` = saved), selection, zoom, playhead, preview ↔ audio player coordination, save/render. The Remotion `playerRef` is returned separately because refs must not be read during render.

### Cross-component communication

- Playing a take anywhere highlights its paragraph card (“Playing”), animates the player bar and fills the waveform progress in every place that take is shown.
- The montage preview pauses the shared audio player when it starts, and the audio player pauses the preview when it starts.
- Audio studio and montage are two tabs of the same project (`ProjectTabs`); the sidebar's montage link follows the current project.

## Styling

Plain CSS with design tokens in `src/styles/tokens.css`. Files mirror the component layers (`atoms.css`, `molecules.css`, `shell.css`, `views.css`, `responsive.css`) and are imported by `src/app/globals.css`. No external fonts or CDNs are loaded, so the UI works offline.

## Remotion

`src/remotion/Composition.tsx` is shared by the browser preview (`@remotion/player`) and the Node renderer, so preview and render use the same timeline snapshot. All Remotion packages are pinned to the same version.
