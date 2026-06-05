import "server-only";
import { serverFetch } from "./server";

export { serverFetch } from "./server";
export { ApiError, UnauthorizedError, isUnauthorized } from "./errors";

export const authApi = {
  refresh: (refreshToken: string) =>
    serverFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  // login / register / logout live in /api/auth/* route handlers — not here.
};

export const reportsApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][]
    ).toString();
    return serverFetch(`/reports${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string | number) => serverFetch(`/reports/${id}`),
  create: (formData: FormData) =>
    serverFetch("/reports", { method: "POST", body: formData }),
  claim: (id: string | number) =>
    serverFetch(`/reports/${id}/status?status=IN_PROGRESS`, { method: "PATCH" }),
  complete: (id: string | number, _formData: FormData) =>
    serverFetch(`/reports/${id}/status?status=CLEANED`, { method: "PATCH" }),
  confirm: (id: string | number) =>
    serverFetch(`/reports/${id}/status?status=CLEANED`, { method: "PATCH" }),
  flag: (id: string | number, _reason: string) =>
    Promise.resolve(),
  mapPins: () =>
    serverFetch("/reports"),
};

export const usersApi = {
  getMe: () => serverFetch("/users/me"),
  updateMe: (p: Record<string, unknown>) =>
    serverFetch("/users/me", { method: "PATCH", body: JSON.stringify(p) }),
  getById: (id: string) => serverFetch(`/users/${id}`),
  getPublicById: (id: string) => serverFetch(`/users/internal/${id}`),
  getBadges: () => serverFetch("/users/me/badges"),
  getActivity: (page = 0) =>
    serverFetch(`/users/me/activity?page=${page}&size=20`),
  getStats: () => serverFetch("/users/me/stats"),
  getLeaderboard: () => serverFetch("/users/leaderboard"),
};

export const leaderboardApi = {
  get: (period = "week", page = 0) =>
    serverFetch(`/leaderboard?period=${period}&page=${page}&size=20`),
};

export const aiApi = {
  verifyImage: (fd: FormData) =>
    serverFetch("/verifications/check-image", { method: "POST", body: fd }),
  compareImages: (fd: FormData) =>
    serverFetch("/verifications", { method: "POST", body: fd }),
};

export const verificationsApi = {
  verify: (body: Record<string, unknown>) =>
    serverFetch("/verifications", { method: "POST", body: JSON.stringify(body) }),
  getById: (id: number) => serverFetch(`/verifications/${id}`),
  getByTaskId: (taskId: number) => serverFetch(`/verifications/task/${taskId}`),
};

export const statsApi = {
  getGlobal: () => serverFetch("/stats/global"),
  getByDistrict: () => serverFetch("/stats/districts"),
};

export const notificationsApi = {
  list: (unread = false) =>
    serverFetch(`/notifications${unread ? "?unread=true" : ""}`),
  markRead: (id: number) =>
    serverFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    serverFetch("/notifications/read-all", { method: "PATCH" }),
};
