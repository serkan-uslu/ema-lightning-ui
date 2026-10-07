import { ApiError } from "@/services/http";
import { TextFileError } from "@/lib/project";
import type { Locale } from "./config";
import en from "./en";
import tr, { type Dictionary } from "./tr";

export const dictionaries: Record<Locale, Dictionary> = { tr, en };
export type { Dictionary };

/** Turns any thrown value into a message in the active language. */
export function describeError(error: unknown, t: Dictionary) {
  if (error instanceof TextFileError)
    return error.reason === "too-large"
      ? t.errors.fileTooLarge
      : t.errors.fileEncoding;
  if (error instanceof ApiError) {
    if (error.detail) return t.backendErrors[error.detail] ?? error.detail;
    return error.kind === "validation" ? t.errors.validation : t.errors.network;
  }
  return t.errors.generic;
}

/** Translates a stored backend message (job/model errors). */
export const translateBackend = (message: string, t: Dictionary) =>
  t.backendErrors[message] ?? message;
