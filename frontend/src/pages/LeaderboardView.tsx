import { useState, useEffect } from "react";
import { Crown, Flame, Paintbrush, Trophy, Check } from "lucide-react";
import DataIcon from "../components/DataIcon.tsx";
import "../styles/LeaderboardView.css";
import { BADGES } from "../data/constants.ts";
import { useApp } from "../context/AppContext.tsx";
import { usersApi } from "../services/api.ts";
import { t, translateLevel } from "../i18n.ts";
import type { Lang } from "../i18n.ts";


const RANK_COLORS = ["#ffffff", "#aaaaaa", "#777777"];

const LEVEL_THRESHOLDS = [
  { level: "НОВИЧ", icon: "sprout", min: 0, max: 499 },
  { level: "АКТИВЕН", icon: "award", min: 500, max: 1499 },
  { level: "ПРО", icon: "medal", min: 1500, max: 2999 },
  { level: "МАСТЪР", icon: "gem", min: 3000, max: 4999 },
  { level: "ЛЕГЕНДА", icon: "trophy", min: 5000, max: Infinity },
];

interface UserEntry {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  level: string;
  levelIcon: string;
  cleanings: number;
  verified: boolean;
  rank: number;
  awards: number;
  earnedBadges: Array<{ id: string; icon: string; name: string }>;
}

function mapLeaderboardUser(data: any): UserEntry {
  const pts = data.points ?? 0;
  const lvl = LEVEL_THRESHOLDS.find((l) => pts >= l.min && pts <= l.max) ?? LEVEL_THRESHOLDS[0];
  const user = {
    id: data.id ?? "",
    name: data.username ?? "",
    avatar: (data.username ?? "??").slice(0, 2).toUpperCase(),
    points: pts,
    streak: data.streak ?? 0,
    level: lvl.level,
    levelIcon: lvl.icon,
    cleanings: data.cleanings ?? 0,
    verified: data.role === "VerifiedUser",
    rank: 0,
    awards: 0,
    earnedBadges: [] as Array<{ id: string; icon: string; name: string }>,
  };
  const earnedBadges = BADGES.filter((badge) => {
    if (badge.id === "first_report" && user.cleanings > 0) return true;
    if (badge.id === "first_clean" && user.cleanings > 0) return true;
    if (badge.id === "streak_7" && user.streak >= 7) return true;
    if (badge.id === "clean_10" && user.cleanings >= 10) return true;
    if (badge.id === "verified" && user.verified) return true;
    if (badge.id === "eco_legend" && user.points >= 5000) return true;
    if (badge.id === "district_hero" && user.cleanings >= 5) return true;
    if (badge.id === "team_player" && user.cleanings >= 20) return true;
    return false;
  });
  user.awards = earnedBadges.length;
  user.earnedBadges = earnedBadges;
  return user;
}

function Podium({ top3 }: { top3: UserEntry[] }) {
  const order = [top3[1], top3[0], top3[2]];
  const heights = [90, 124, 76];
  const sizes = [18, 24, 16];
  const positions = [2, 1, 3];

  return (
    <div className="leaderboard__podium">
      {order.map((user, i) => (
        <div key={user.id} className="leaderboard__podium-item">
          {positions[i] === 1 && (
            <div className="leaderboard__podium-crown anim-float"><Crown size={20} strokeWidth={1.8} /></div>
          )}
          <div className="leaderboard__podium-avatar" style={{ fontSize: sizes[i] }}>
            {user.avatar}
          </div>
          <div
            className="leaderboard__podium-name"
            style={{ color: positions[i] === 1 ? "var(--text-1)" : "var(--text-2)" }}
          >
            {user.name}
          </div>
          <div
            className="leaderboard__podium-col"
            style={{
              width: positions[i] === 1 ? 84 : 70,
              height: heights[i],
              background: `rgba(255,255,255,${positions[i] === 1 ? 0.07 : 0.03})`,
              border: `1px solid rgba(255,255,255,${positions[i] === 1 ? 0.2 : 0.1})`,
            }}
          >
            <div
              className="leaderboard__podium-rank"
              style={{ color: RANK_COLORS[i], fontSize: sizes[i] - 2 }}
            >
              #{positions[i]}
            </div>
            <div className="leaderboard__podium-pts" style={{ color: "var(--text-3)" }}>
              {user.awards} <Trophy size={12} strokeWidth={2} />
            </div>
            <div className="leaderboard__podium-icon"><DataIcon name={user.levelIcon} size={16} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderRow({ user, isMe, index, sortBy, i: i18n, lang }: { user: UserEntry; isMe: boolean; index: number; sortBy: string; i: ReturnType<typeof t>; lang: Lang }) {
  const rankColor = index < 3 ? RANK_COLORS[index] : null;

  const getValue = () => {
    if (sortBy === "awards") return user.awards;
    if (sortBy === "cleanings") return user.cleanings;
    return user.points;
  };

  const getLabel = () => {
    if (sortBy === "awards") return i18n.leaderboardAwardsLabel;
    if (sortBy === "cleanings") return i18n.leaderboardCleaningsLabel;
    return i18n.leaderboardPointsLabel;
  };

  return (
    <div
      className={`leaderboard__row ${isMe ? "leaderboard__row--me" : "leaderboard__row--other"} anim-fade-up`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div
        className="leaderboard__rank-badge"
        style={{
          background: rankColor ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
          border: rankColor ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
          color: rankColor || "var(--text-3)",
        }}
      >
        #{index + 1}
      </div>
      <span className="leaderboard__row-avatar">{user.avatar}</span>
      <div className="leaderboard__row-info">
        <div className="leaderboard__row-name" style={{ color: "var(--text-1)" }}>
          {user.name}
          {user.verified && <span className="leaderboard__verified-badge"><Check size={10} strokeWidth={3} /></span>}
          {isMe && <span className="leaderboard__me-badge">{i18n.leaderboardYou}</span>}
        </div>
        <div className="leaderboard__row-meta">
          <span><DataIcon name={user.levelIcon} size={12} /> {translateLevel(lang, user.level)}</span>
          {user.streak > 0 && <span style={{ color: "var(--text-3)" }}>· <Flame size={12} strokeWidth={2} /> {user.streak}</span>}
          <span style={{ color: "var(--text-3)" }}>· <Paintbrush size={12} strokeWidth={2} /> {user.cleanings}</span>
        </div>
        {sortBy === "awards" && user.earnedBadges.length > 0 && (
          <div className="leaderboard__badges-preview">
            {user.earnedBadges.slice(0, 3).map((badge) => (
              <span key={badge.id} title={badge.name}><DataIcon name={badge.icon} size={14} /></span>
            ))}
            {user.earnedBadges.length > 3 && (
              <span className="leaderboard__more-badges">+{user.earnedBadges.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <div className="leaderboard__row-pts-col">
        <div className="leaderboard__row-pts" style={{ color: rankColor || "var(--text-1)" }}>
          {getValue().toLocaleString()}
        </div>
        <div className="leaderboard__row-pts-label">{getLabel()}</div>
      </div>
    </div>
  );
}

interface LeaderboardViewProps {
  lang: Lang;
}

export default function LeaderboardView({ lang }: LeaderboardViewProps) {
  const { user } = useApp();
  const i = t(lang);
  const [sortBy, setSortBy] = useState("awards");
  const [leaderboardData, setLeaderboardData] = useState<UserEntry[]>([]);

  useEffect(() => {
    usersApi.getLeaderboard()
      .then((data: any[]) => setLeaderboardData(data.map(mapLeaderboardUser)))
      .catch(() => setLeaderboardData([]));
  }, []);

  const periods = [
    { id: "awards", label: i.leaderboardAwards },
    { id: "cleanings", label: i.leaderboardCleanings },
    { id: "points", label: i.leaderboardPoints },
  ];

  const sortedData = [...leaderboardData]
    .sort((a, b) => {
      if (sortBy === "awards") return b.awards - a.awards;
      if (sortBy === "cleanings") return b.cleanings - a.cleanings;
      return b.points - a.points;
    })
    .map((u, idx) => ({ ...u, rank: idx + 1 }));

  const myEntry = sortedData.find((u) => u.name === user.name);
  const top3 = sortedData.slice(0, 3);

  return (
    <div className="leaderboard">
      <div className="label-caps">{i.leaderboardTitle}</div>

      <div className="leaderboard__tabs">
        {periods.map((p) => (
          <button
            key={p.id}
            className={`leaderboard__tab ${sortBy === p.id ? "leaderboard__tab--active" : "leaderboard__tab--inactive"}`}
            onClick={() => setSortBy(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Podium top3={top3} />

      {myEntry && (
        <div className="leaderboard__my-rank">
          <span className="leaderboard__my-rank-label">{i.leaderboardYourPos}</span>
          <span className="leaderboard__my-rank-val">
            #{myEntry.rank} ·{" "}
            {sortBy === "awards"
              ? <>{myEntry.awards} <Trophy size={12} strokeWidth={2} /></>
              : sortBy === "cleanings"
                ? <>{myEntry.cleanings} <Paintbrush size={12} strokeWidth={2} /></>
                : <>{myEntry.points.toLocaleString()} <DataIcon name="star" size={12} /></>}
          </span>
        </div>
      )}

      <div className="leaderboard__list">
        {sortedData.map((u: any, idx: number) => (
          <LeaderRow key={u.id} user={u} isMe={u.name === user.name} index={idx} sortBy={sortBy} i={i} lang={lang} />
        ))}
      </div>
    </div>
  );
}
