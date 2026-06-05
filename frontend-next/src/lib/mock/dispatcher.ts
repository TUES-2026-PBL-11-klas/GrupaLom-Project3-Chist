import { MOCK_ME, MOCK_USERS, MOCK_REPORTS } from "./data";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function mockResponse(path: string, init?: RequestInit): Response {
  const method = (init?.method ?? "GET").toUpperCase();
  const pathOnly = path.split("?")[0];

  // Mutations: no-op success in mock mode. State for "added" reports etc.
  // lives in client state in Phase 4.
  if (method !== "GET") {
    return json(null);
  }

  if (pathOnly === "/users/me") return json(MOCK_ME);
  if (pathOnly === "/users/leaderboard") return json(MOCK_USERS);
  if (pathOnly === "/reports") return json(MOCK_REPORTS);

  const reportDetail = pathOnly.match(/^\/reports\/([^/]+)$/);
  if (reportDetail) {
    const id = reportDetail[1];
    const found = MOCK_REPORTS.find((r) => r.reportId === id);
    return found ? json(found) : json({ message: "Not Found" }, 404);
  }

  return json({ message: `Mock not implemented for ${method} ${pathOnly}` }, 501);
}
