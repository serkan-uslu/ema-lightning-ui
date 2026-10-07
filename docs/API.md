# HTTP API

FastAPI listens on `127.0.0.1:8010`. The Next.js app proxies `/api/*` to it (`EMA_BACKEND_URL` overrides the target). Interactive docs are at <http://127.0.0.1:8010/docs> while the backend runs. Frontend wrappers live in `src/services/`.

| Method | Path                                        | Purpose                                                                            |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| GET    | `/api/health`                               | Model status/device, queue paused flag, data path, version, render availability    |
| GET    | `/api/projects`                             | List projects with paragraphs, takes, assets, jobs and timeline                    |
| POST   | `/api/projects`                             | Create a project from `{ name, text }`                                             |
| GET    | `/api/projects/{pid}`                       | One project                                                                        |
| DELETE | `/api/projects/{pid}`                       | Delete an idle project and its stored audio, media, render outputs and job records |
| DELETE | `/api/projects/{pid}/takes/{id}`            | Delete an unused audio take and its WAV; return the updated project                |
| PATCH  | `/api/projects/{pid}`                       | Update `name`, `speed`, `seed`, `sample_rate`                                      |
| POST   | `/api/projects/{pid}/paragraphs`            | Append paragraphs `{ texts: string[] }`                                            |
| PATCH  | `/api/projects/{pid}/paragraphs/{id}`       | Update text, overrides or `selected_take`                                          |
| DELETE | `/api/projects/{pid}/paragraphs/{id}`       | Delete a paragraph (its takes stay available to montages)                          |
| POST   | `/api/projects/{pid}/paragraphs/{id}/split` | Split at `{ offset }`                                                              |
| POST   | `/api/projects/{pid}/paragraphs/{id}/merge` | Merge into the previous paragraph                                                  |
| PUT    | `/api/projects/{pid}/order`                 | Reorder `{ ids }` (must contain every paragraph once)                              |
| POST   | `/api/projects/{pid}/generate`              | Queue speech jobs `{ ids?, missing_only? }`                                        |
| GET    | `/api/projects/{pid}/export`                | `format=wav\|zip`, `rate`, `gap` (0–10 s), optional `ids`                          |
| POST   | `/api/projects/{pid}/assets`                | Upload PNG/JPEG/MP4 (multipart `file`)                                             |
| PUT    | `/api/projects/{pid}/timeline`              | Save `{ aspect, clips }` (validated for sources, bounds and overlaps)              |
| POST   | `/api/projects/{pid}/render`                | Queue an MP4 render of the saved timeline                                          |
| GET    | `/api/jobs`                                 | All jobs, newest first                                                             |
| POST   | `/api/queue`                                | Pause/resume `{ paused }`                                                          |
| POST   | `/api/jobs/{jid}/cancel`                    | Cancel a queued job                                                                |
| POST   | `/api/jobs/{jid}/retry`                     | Retry a failed, interrupted or cancelled job with its original snapshot            |
| GET    | `/api/files/{folder}/{filename}`            | Serve stored audio, media and renders (supports HTTP Range)                        |

Errors use FastAPI's `{ "detail": "..." }` shape with Turkish messages; see [I18N.md](I18N.md).

Deletion is permanent. Project and take deletion return `409` while the project has queued or running jobs. A take referenced by the saved montage cannot be deleted: remove its clips and save the montage first. Deleting a selected take clears that paragraph's selection; other takes remain. Paragraph deletion preserves its takes so existing montages keep working.

Deleting a take can make an old render snapshot unavailable for retry. Retry checks source records and files and returns an explanatory `409` when they are missing; the user can update the montage and start a new render. Completed MP4 files remain until their project is deleted.

Files are staged under `data/.delete-*` until the SQLite deletion transaction commits. A staging or database failure restores the files and keeps the records. Cleanup failures after commit are logged and retain the staging directory without undoing a successful deletion. This rollback handles request failures; it is not a recovery guarantee for a forced process termination or power loss during deletion.
