import { describe, expect, it } from "vitest";
import { ApiError, UnauthorizedError, isUnauthorized } from "./errors";

describe("ApiError", () => {
  it("captures status, message, and optional body", () => {
    const err = new ApiError(500, "Internal Server Error", { detail: "boom" });
    expect(err.status).toBe(500);
    expect(err.message).toBe("Internal Server Error");
    expect(err.body).toEqual({ detail: "boom" });
    expect(err).toBeInstanceOf(Error);
  });

  it("works without a body", () => {
    const err = new ApiError(404, "Not Found");
    expect(err.body).toBeUndefined();
  });
});

describe("UnauthorizedError", () => {
  it("is an ApiError with status 401", () => {
    const err = new UnauthorizedError();
    expect(err.status).toBe(401);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it("isUnauthorized narrows correctly", () => {
    expect(isUnauthorized(new UnauthorizedError())).toBe(true);
    expect(isUnauthorized(new ApiError(500, "boom"))).toBe(false);
    expect(isUnauthorized(new Error("plain"))).toBe(false);
    expect(isUnauthorized("not even an error")).toBe(false);
  });
});
