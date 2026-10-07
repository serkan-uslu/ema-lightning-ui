/**
 * Thin HTTP layer for the local FastAPI service. Next.js rewrites `/api/*`
 * to the backend (see next.config.ts). No React, no UI strings here: callers
 * translate `ApiError` through the i18n layer.
 */
export type ApiErrorKind = "network" | "validation" | "backend";

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    public status: number,
    /** Raw `detail` message from FastAPI, when it sent one. */
    public detail?: string,
  ) {
    super(detail || kind);
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function toApiError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data.detail === "string")
      return new ApiError("backend", response.status, data.detail);
    return new ApiError("validation", response.status);
  } catch {
    return new ApiError("network", response.status);
  }
}

export async function request<T>(
  path: string,
  method: Method = "GET",
  body?: unknown,
): Promise<T> {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("network", 0);
  }
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

/** Fetches a file URL and hands it to the browser as a download. */
export async function downloadFile(url: string, filename: string) {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new ApiError("network", 0);
  }
  if (!response.ok) throw await toApiError(response);
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
