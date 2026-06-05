export interface Reward {
  id: number;
  icon: string;
  cost: number;
  category: "food" | "eco" | "transport" | "experience" | "status";
  featured?: boolean;
  hot?: boolean;
  newBadge?: boolean;
}

export const REWARDS: Reward[] = [
  { id: 1, icon: "coffee",    cost: 500,  category: "food",       featured: true, hot: true },
  { id: 2, icon: "tree-pine", cost: 800,  category: "eco" },
  { id: 3, icon: "ticket",    cost: 1200, category: "transport",  newBadge: true },
  { id: 4, icon: "utensils",  cost: 350,  category: "food" },
  { id: 5, icon: "recycle",   cost: 600,  category: "eco" },
  { id: 6, icon: "medal",     cost: 3000, category: "status" },
  { id: 7, icon: "ticket",    cost: 2000, category: "experience", newBadge: true },
  { id: 8, icon: "droplets",  cost: 400,  category: "eco" },
];

export const CATEGORIES = ["all", "food", "eco", "transport", "experience", "status"] as const;
export type Category = (typeof CATEGORIES)[number];
