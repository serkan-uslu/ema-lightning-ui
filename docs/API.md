# HTTP API

FastAPI listens on `127.0.0.1:8010`. The Next.js app proxies `/api/*` to it (`EMA_BACKEND_URL` overrides the target). Interactive docs are at <http://127.0.0.1:8010/docs> while the backend runs. Frontend wrappers live in `src/services/`.

| Method | Path                                        | Purpose                                                                         |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/health`                               | Model status/device, queue paused flag, data path, version, render availability |
| GET    | `/api/projects`                             | List projects with paragraphs, takes, assets, jobs and timeline                 |
| POST   | `/api/projects`                             | Create a project from `{ name, text }`                                          |
| GET    | `/api/projects/{pid}`                       | One project                                                                     |
| PATCH  | `/api/projects/{pid}`                       | Update `name`, `speed`, `seed`, `sample_rate`                                   |
| POST   | `/api/projects/{pid}/paragraphs`            | Append paragraphs `{ texts: string[] }`                                         |
| PATCH  | `/api/projects/{pid}/paragraphs/{id}`       | Update text, overrides or `selected_take`                                       |
| DELETE | `/api/projects/{pid}/paragraphs/{id}`       | Delete a paragraph (its takes stay available to montages)                       |
| POST   | `/api/projects/{pid}/paragraphs/{id}/split` | Split at `{ offset }`                                                           |
| POST   | `/api/projects/{pid}/paragraphs/{id}/merge` | Merge into the previous paragraph                                               |
| PUT    | `/api/projects/{pid}/order`                 | Reorder `{ ids }` (must contain every paragraph once)                           |
| POST   | `/api/projects/{pid}/generate`              | Queue speech jobs `{ ids?, missing_only? }`                                     |
| GET    | `/api/projects/{pid}/export`                | `format=wav\|zip`, `rate`, `gap` (0–10 s), optional `ids`                       |
| POST   | `/api/projects/{pid}/assets`                | Upload PNG/JPEG/MP4 (multipart `file`)                                          |
| PUT    | `/api/projects/{pid}/timeline`              | Save `{ aspect, clips }` (validated for sources, bounds and overlaps)           |
| POST   | `/api/projects/{pid}/render`                | Queue an MP4 render of the saved timeline                                       |
| GET    | `/api/jobs`                                 | All jobs, newest first                                                          |
| POST   | `/api/queue`                                | Pause/resume `{ paused }`                                                       |
| POST   | `/api/jobs/{jid}/cancel`                    | Cancel a queued job                                                             |
| POST   | `/api/jobs/{jid}/retry`                     | Retry a failed, interrupted or cancelled job with its original snapshot         |
| GET    | `/api/files/{folder}/{filename}`            | Serve stored audio, media and renders (supports HTTP Range)                     |

Errors use FastAPI's `{ "detail": "..." }` shape with Turkish messages; see [I18N.md](I18N.md).
