import { BADGES, type Badge } from "@/lib/data/badges";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  points: number;
  streak: number;
  level: string;
  levelIcon: string;
  nextLevelPts: number;
  verified: boolean;
  cleanings: number;
  reports: number;
  joined: string;
}

export interface Report {
  id: string;
  reportId?: string;
  title: string;
  location: string;
  district: string;
  lat: number;
  lng: number;
  status: "open" | "in-progress" | "done";
  severity: string;
  reporter: string;
  reporterAvatar: string;
  time: string;
  description: string;
  gps: { lat: number; lng: number };
  photoUrl?: string | null;
}

const LEVEL_THRESHOLDS = [
  { level: "novice",  icon: "sprout", min: 0,    max: 499 },
  { level: "active",  icon: "award",  min: 500,  max: 1499 },
  { level: "pro",     icon: "medal",  min: 1500, max: 2999 },
  { level: "master",  icon: "gem",    min: 3000, max: 4999 },
  { level: "legend",  icon: "trophy", min: 5000, max: Infinity },
];

export function deriveLevel(points: number) {
  const lvl = LEVEL_THRESHOLDS.find((l) => points >= l.min && points <= l.max) ?? LEVEL_THRESHOLDS[0];
  const next = LEVEL_THRESHOLDS.find((l) => l.min > points);
  return { level: lvl.level, levelIcon: lvl.icon, nextLevelPts: next?.min ?? lvl.max };
}

export function mapApiUser(data: Record<string, unknown> = {}): User {
  const username = (data.username as string) ?? "";
  const pts = (data.points as number) ?? 0;
  const { level, levelIcon, nextLevelPts } = deriveLevel(pts);
  const createdAt = data.createdAt as string | undefined;
  return {
    id: (data.id as string) ?? "",
    name: username,
    email: (data.email as string) ?? "",
    avatar: (username || "??").slice(0, 2).toUpperCase(),
    points: pts,
    streak: (data.streak as number) ?? 0,
    level,
    levelIcon,
    nextLevelPts,
    verified: data.role === "VerifiedUser",
    cleanings: (data.cleanings as number) ?? 0,
    reports: (data.reports as number) ?? 0,
    joined: createdAt ? new Date(createdAt).toLocaleDateString("bg-BG", { month: "long", year: "numeric" }) : "",
  };
}

export function mapApiReport(data: Record<string, unknown>): Report {
  const sev = ((data.severity as string) ?? "medium").toLowerCase();
  const desc = (data.description as string) ?? "";
  const reporterName = (data.reporterName as string) ?? "";
  const lat = (data.latitude as number) ?? 0;
  const lng = (data.longitude as number) ?? 0;
  const id = ((data.reportId as string) ?? (data.id as string) ?? "");
  const createdAt = data.createdAt as string | undefined;

  const rawStatus = ((data.status as string) ?? "open").toUpperCase();
  let status: Report["status"] = "open";
  if (rawStatus === "IN_PROGRESS" || rawStatus === "IN-PROGRESS") status = "in-progress";
  else if (rawStatus === "DONE" || rawStatus === "COMPLETED") status = "done";
  else if (rawStatus === "OPEN" || rawStatus === "NEW") status = "open";

  return {
    id,
    reportId: data.reportId as string | undefined,
    title: desc ? desc.slice(0, 50) : "",
    location: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    district: (data.district as string) ?? "",
    lat,
    lng,
    status,
    severity: sev,
    reporter: reporterName,
    reporterAvatar: (reporterName || "??").slice(0, 2).toUpperCase(),
    time: createdAt ? new Date(createdAt).toLocaleDateString("bg-BG") : "",
    description: desc,
    gps: { lat, lng },
    photoUrl: (data.photoUrl as string | null) ?? null,
  };
}

export interface LeaderboardUser extends User {
  rank: number;
  awards: number;
  earnedBadges: Badge[];
}

interface DerivableUser {
  points: number;
  streak: number;
  cleanings: number;
  verified: boolean;
}

export function deriveBadges(u: DerivableUser): Badge[] {
  return BADGES.filter((b) => {
    if (b.id === "first_report" && u.cleanings > 0) return true;
    if (b.id === "first_clean" && u.cleanings > 0) return true;
    if (b.id === "streak_7" && u.streak >= 7) return true;
    if (b.id === "clean_10" && u.cleanings >= 10) return true;
    if (b.id === "verified" && u.verified) return true;
    if (b.id === "eco_legend" && u.points >= 5000) return true;
    if (b.id === "district_hero" && u.cleanings >= 5) return true;
    if (b.id === "team_player" && u.cleanings >= 20) return true;
    return false;
  });
}

export function mapLeaderboardUser(data: Record<string, unknown>, rank: number): LeaderboardUser {
  const user = mapApiUser(data);
  const earned = deriveBadges(user);
  return { ...user, rank, awards: earned.length, earnedBadges: earned };
}
