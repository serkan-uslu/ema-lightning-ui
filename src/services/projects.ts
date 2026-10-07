import type { Project, Timeline } from "@/lib/types";
import { request } from "./http";

const base = (id: string) => `/projects/${id}`;

export type ProjectPatch = Partial<
  Pick<Project, "name" | "speed" | "seed" | "sample_rate">
>;

export type ExportOptions = {
  format: "wav" | "zip";
  rate: number;
  gap: number;
  ids?: string[];
};

export const projectService = {
  list: () => request<Project[]>("/projects"),
  get: (id: string) => request<Project>(base(id)),
  create: (name: string, text: string) =>
    request<Project>("/projects", "POST", { name, text }),
  update: (id: string, values: ProjectPatch) =>
    request<Project>(base(id), "PATCH", values),
  reorder: (id: string, ids: string[]) =>
    request(`${base(id)}/order`, "PUT", { ids }),
  generate: (id: string, ids?: string[], missingOnly = false) =>
    request(`${base(id)}/generate`, "POST", { ids, missing_only: missingOnly }),
  exportUrl: (id: string, { format, rate, gap, ids }: ExportOptions) => {
    const query = new URLSearchParams({
      format,
      rate: String(rate),
      gap: String(gap),
    });
    if (ids?.length) query.set("ids", ids.join(","));
    return `/api${base(id)}/export?${query}`;
  },
  uploadAsset: (id: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request(`${base(id)}/assets`, "POST", body);
  },
  saveTimeline: (id: string, timeline: Timeline) =>
    request(`${base(id)}/timeline`, "PUT", timeline),
  render: (id: string) => request(`${base(id)}/render`, "POST"),
};
