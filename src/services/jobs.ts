import type { Health, Job } from "@/lib/types";
import { request } from "./http";

export const jobService = {
  list: () => request<Job[]>("/jobs"),
  cancel: (id: string) => request(`/jobs/${id}/cancel`, "POST"),
  retry: (id: string) => request(`/jobs/${id}/retry`, "POST"),
  setPaused: (paused: boolean) => request("/queue", "POST", { paused }),
};

export const systemService = {
  health: () => request<Health>("/health"),
};
