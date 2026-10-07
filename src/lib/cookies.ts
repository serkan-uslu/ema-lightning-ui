const ONE_YEAR = 60 * 60 * 24 * 365;

/** Client-side preference cookie, readable by the root layout on the server. */
export function writePreferenceCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}
