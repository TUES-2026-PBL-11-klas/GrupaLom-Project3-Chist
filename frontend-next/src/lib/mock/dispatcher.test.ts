import { describe, expect, it } from "vitest";
import { mockResponse } from "./dispatcher";
import { MOCK_ME, MOCK_USERS, MOCK_REPORTS } from "./data";

describe("mock dispatcher", () => {
  it("GET /users/me returns MOCK_ME with 200", async () => {
    const res = mockResponse("/users/me");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_ME);
  });

  it("GET /users/leaderboard returns MOCK_USERS with 200", async () => {
    const res = mockResponse("/users/leaderboard");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_USERS);
  });

  it("GET /reports returns MOCK_REPORTS with 200", async () => {
    const res = mockResponse("/reports");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_REPORTS);
  });

  it("GET /reports with query string still returns MOCK_REPORTS", async () => {
    const res = mockResponse("/reports?district=Лозенец");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_REPORTS);
  });

  it("GET /reports/r-101 returns the matching report", async () => {
    const res = mockResponse("/reports/r-101");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reportId).toBe("r-101");
  });

  it("GET /reports/missing returns 404", async () => {
    const res = mockResponse("/reports/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("POST mutation returns 200 with null body (no-op in mock mode)", async () => {
    const res = mockResponse("/reports/r-101/claim", { method: "PATCH" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("null");
  });

  it("unmapped GET path returns 501 Not Implemented", async () => {
    const res = mockResponse("/this/path/has/no/mock");
    expect(res.status).toBe(501);
  });
});
