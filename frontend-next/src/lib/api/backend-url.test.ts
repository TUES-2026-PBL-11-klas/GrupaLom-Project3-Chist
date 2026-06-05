import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveBackendBase } from "./backend-url";

describe("resolveBackendBase", () => {
  beforeEach(() => {
    delete process.env.USER_API_URL;
    delete process.env.REPORT_API_URL;
    delete process.env.NOTIFICATION_API_URL;
    delete process.env.VERIFICATION_API_URL;
    process.env.BACKEND_URL = "http://fallback/api";
  });

  it("routes /auth and /users to USER_API_URL", () => {
    process.env.USER_API_URL = "http://user-module:8080/api";
    expect(resolveBackendBase("/auth/login")).toBe("http://user-module:8080/api");
    expect(resolveBackendBase("/users/me")).toBe("http://user-module:8080/api");
  });

  it("routes /reports and /tasks to REPORT_API_URL", () => {
    process.env.REPORT_API_URL = "http://report-module:8081/api";
    expect(resolveBackendBase("/reports")).toBe("http://report-module:8081/api");
    expect(resolveBackendBase("/tasks/5")).toBe("http://report-module:8081/api");
  });

  it("routes /notifications to NOTIFICATION_API_URL", () => {
    process.env.NOTIFICATION_API_URL = "http://notification-module:8082/api";
    expect(resolveBackendBase("/notifications")).toBe("http://notification-module:8082/api");
  });

  it("routes /verifications to VERIFICATION_API_URL", () => {
    process.env.VERIFICATION_API_URL = "http://verification-module:8083/api";
    expect(resolveBackendBase("/verifications")).toBe("http://verification-module:8083/api");
  });

  it("falls back to BACKEND_URL when the matching module var is unset", () => {
    expect(resolveBackendBase("/reports")).toBe("http://fallback/api");
    expect(resolveBackendBase("/anything/else")).toBe("http://fallback/api");
  });
});
