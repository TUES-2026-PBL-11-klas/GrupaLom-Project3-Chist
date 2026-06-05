export interface Badge {
  id: string;
  icon: string;
  pts: number;
}

export const BADGES: Badge[] = [
  { id: "first_report",  icon: "sprout",      pts: 15 },
  { id: "first_clean",   icon: "paintbrush",  pts: 40 },
  { id: "streak_7",      icon: "flame",       pts: 100 },
  { id: "clean_10",      icon: "zap",         pts: 200 },
  { id: "verified",      icon: "badge-check", pts: 500 },
  { id: "eco_legend",    icon: "globe",       pts: 1000 },
  { id: "district_hero", icon: "building",    pts: 300 },
  { id: "team_player",   icon: "users",       pts: 250 },
];
