"use client";

import { Crown, Trophy } from "lucide-react";
import type { LeaderboardUser } from "@/lib/api/mappers";

const RANK_COLORS = ["#ffffff", "#aaaaaa", "#777777"];

export function Podium({ top3 }: { top3: LeaderboardUser[] }) {
  if (top3.length < 3) return null;
  const order = [top3[1], top3[0], top3[2]];
  const heights = [90, 124, 76];
  const sizes = [18, 24, 16];
  const positions = [2, 1, 3];

  return (
    <div className="flex items-end justify-center gap-4 py-4">
      {order.map((user, i) => (
        <div key={user.id} className="flex flex-col items-center gap-2">
          {positions[i] === 1 && (
            <div className="text-text-1 animate-float"><Crown size={20} strokeWidth={1.8} /></div>
          )}
          <div className="text-text-1 font-medium" style={{ fontSize: sizes[i] }}>{user.avatar}</div>
          <div className={positions[i] === 1 ? "text-text-1" : "text-text-2"} style={{ fontSize: 12, letterSpacing: 1 }}>
            {user.name}
          </div>
          <div
            className="flex flex-col items-center justify-end gap-1 rounded-md"
            style={{
              width: positions[i] === 1 ? 84 : 70,
              height: heights[i],
              background: `rgba(255,255,255,${positions[i] === 1 ? 0.07 : 0.03})`,
              border: `1px solid rgba(255,255,255,${positions[i] === 1 ? 0.2 : 0.1})`,
            }}
          >
            <div style={{ color: RANK_COLORS[i], fontSize: sizes[i] - 2 }}>#{positions[i]}</div>
            <div className="flex items-center gap-1 text-text-3 text-xs">
              {user.awards} <Trophy size={12} strokeWidth={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
