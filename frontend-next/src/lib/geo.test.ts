import { describe, it, expect } from "vitest";
import { SOFIA_CENTER, clampLat, clampLng, formatCoords } from "./geo";

describe("geo helpers", () => {
  it("exposes Sofia center as [lng, lat]", () => {
    expect(SOFIA_CENTER).toEqual([23.3219, 42.6977]);
  });

  it("clamps latitude to [-90, 90]", () => {
    expect(clampLat(120)).toBe(90);
    expect(clampLat(-120)).toBe(-90);
    expect(clampLat(42.7)).toBe(42.7);
  });

  it("clamps longitude to [-180, 180]", () => {
    expect(clampLng(200)).toBe(180);
    expect(clampLng(-200)).toBe(-180);
    expect(clampLng(23.3)).toBe(23.3);
  });

  it("formats coordinates to 5 decimal places with N/E suffix", () => {
    expect(formatCoords(42.69771, 23.32194)).toBe("42.69771°N, 23.32194°E");
  });
});
