import { describe, expect, it } from "vitest";
import { mapApiUser, mapApiReport, deriveLevel, mapLeaderboardUser, deriveBadges } from "./mappers";

describe("deriveLevel", () => {
  it("returns novice for 0-499 points", () => {
    expect(deriveLevel(0)).toMatchObject({ level: "novice", levelIcon: "sprout", nextLevelPts: 500 });
    expect(deriveLevel(499)).toMatchObject({ level: "novice" });
  });
  it("returns active for 500-1499", () => {
    expect(deriveLevel(500).level).toBe("active");
    expect(deriveLevel(1499).level).toBe("active");
  });
  it("returns pro / master / legend at the right thresholds", () => {
    expect(deriveLevel(1500).level).toBe("pro");
    expect(deriveLevel(3000).level).toBe("master");
    expect(deriveLevel(5000).level).toBe("legend");
  });
});

describe("mapApiUser", () => {
  it("maps API user fields and derives level", () => {
    const u = mapApiUser({
      id: "u1",
      username: "TestUser",
      email: "t@x",
      points: 250,
      streak: 3,
      role: "VerifiedUser",
      cleanings: 2,
      reports: 4,
      createdAt: "2025-09-12T10:00:00Z",
    });
    expect(u.id).toBe("u1");
    expect(u.name).toBe("TestUser");
    expect(u.points).toBe(250);
    expect(u.level).toBe("novice");
    expect(u.verified).toBe(true);
    expect(u.avatar).toBe("TE");
  });

  it("falls back gracefully when fields missing", () => {
    const u = mapApiUser({});
    expect(u.id).toBe("");
    expect(u.name).toBe("");
    expect(u.avatar).toBe("??");
    expect(u.points).toBe(0);
    expect(u.verified).toBe(false);
  });
});

describe("mapApiReport", () => {
  it("maps fields and normalizes status", () => {
    const r = mapApiReport({
      reportId: "r-1",
      description: "Препълнен контейнер пред блок 24, отпадъци разпилени по тротоара",
      latitude: 42.7,
      longitude: 23.3,
      district: "Лозенец",
      status: "IN_PROGRESS",
      severity: "high",
      reporterName: "EcoMaria",
      createdAt: "2026-05-17T09:12:00Z",
    });
    expect(r.id).toBe("r-1");
    expect(r.status).toBe("in-progress");
    expect(r.severity).toBe("high");
    expect(r.lat).toBeCloseTo(42.7);
    expect(r.gps).toEqual({ lat: 42.7, lng: 23.3 });
    expect(r.title.length).toBeLessThanOrEqual(50);
    expect(r.reporterAvatar).toBe("EC");
  });

  it("normalizes DONE -> done, OPEN -> open, defaults to open", () => {
    expect(mapApiReport({ reportId: "x", status: "DONE" }).status).toBe("done");
    expect(mapApiReport({ reportId: "x", status: "OPEN" }).status).toBe("open");
    expect(mapApiReport({ reportId: "x", status: "WEIRD" }).status).toBe("open");
  });
});

describe("deriveBadges", () => {
  it("awards first_report + first_clean when cleanings > 0", () => {
    const u = { points: 0, streak: 0, cleanings: 1, verified: false };
    const ids = deriveBadges(u).map((b) => b.id);
    expect(ids).toContain("first_report");
    expect(ids).toContain("first_clean");
  });

  it("awards streak_7 at streak >= 7 and clean_10 at cleanings >= 10", () => {
    const ids = deriveBadges({ points: 0, streak: 7, cleanings: 10, verified: false }).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["streak_7", "clean_10"]));
  });

  it("awards verified when user.verified is true", () => {
    expect(deriveBadges({ points: 0, streak: 0, cleanings: 0, verified: true }).map((b) => b.id)).toContain("verified");
  });

  it("awards eco_legend at 5000+ points", () => {
    expect(deriveBadges({ points: 5000, streak: 0, cleanings: 0, verified: false }).map((b) => b.id)).toContain("eco_legend");
  });

  it("awards district_hero at cleanings >= 5 and team_player at cleanings >= 20", () => {
    const ids = deriveBadges({ points: 0, streak: 0, cleanings: 20, verified: false }).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["district_hero", "team_player"]));
  });

  it("awards nothing for a brand-new user", () => {
    expect(deriveBadges({ points: 0, streak: 0, cleanings: 0, verified: false })).toHaveLength(0);
  });
});

describe("mapLeaderboardUser", () => {
  it("adds rank, awards, earnedBadges to a User", () => {
    const raw = { id: "u1", username: "Maria", points: 5420, streak: 18, role: "VerifiedUser", cleanings: 27, reports: 41, createdAt: "2024-11-03T08:00:00Z" };
    const lb = mapLeaderboardUser(raw, 1);
    expect(lb.rank).toBe(1);
    expect(lb.name).toBe("Maria");
    expect(lb.verified).toBe(true);
    expect(lb.earnedBadges.length).toBeGreaterThan(0);
    expect(lb.awards).toBe(lb.earnedBadges.length);
  });
});
