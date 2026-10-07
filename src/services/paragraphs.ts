import type { SeedMode } from "@/lib/types";
import { request } from "./http";

const base = (projectId: string) => `/projects/${projectId}/paragraphs`;

export type ParagraphPatch = Partial<{
  text: string;
  speed: number | null;
  seed: number | null;
  seed_mode: SeedMode;
  sample_rate: number | null;
  selected_take: string;
}>;

export const paragraphService = {
  add: (projectId: string, texts: string[]) =>
    request(base(projectId), "POST", { texts }),
  update: (projectId: string, id: string, values: ParagraphPatch) =>
    request(`${base(projectId)}/${id}`, "PATCH", values),
  remove: (projectId: string, id: string) =>
    request(`${base(projectId)}/${id}`, "DELETE"),
  split: (projectId: string, id: string, offset: number) =>
    request(`${base(projectId)}/${id}/split`, "POST", { offset }),
  mergeWithPrevious: (projectId: string, id: string) =>
    request(`${base(projectId)}/${id}/merge`, "POST"),
};
