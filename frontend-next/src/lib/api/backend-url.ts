import "server-only";

/** Maps a serverFetch path (already prefixed, e.g. "/reports") to the env var
 *  holding the owning module's API base. Falls back to BACKEND_URL when unset,
 *  preserving the original single-origin behaviour. */
const PREFIX_TO_ENV: { prefix: string; env: string }[] = [
  { prefix: "/auth", env: "USER_API_URL" },
  { prefix: "/users", env: "USER_API_URL" },
  { prefix: "/reports", env: "REPORT_API_URL" },
  { prefix: "/tasks", env: "REPORT_API_URL" },
  { prefix: "/notifications", env: "NOTIFICATION_API_URL" },
  { prefix: "/verifications", env: "VERIFICATION_API_URL" },
];

export function resolveBackendBase(path: string): string {
  const match = PREFIX_TO_ENV.find(
    ({ prefix }) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  );
  const fallback = process.env.BACKEND_URL ?? "";
  if (!match) return fallback;
  return process.env[match.env] || fallback;
}
