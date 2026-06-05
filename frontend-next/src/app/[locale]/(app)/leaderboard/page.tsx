import { usersApi, isUnauthorized } from "@/lib/api";
import { mapApiUser, mapLeaderboardUser, type LeaderboardUser, type User } from "@/lib/api/mappers";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";
import { redirect } from "next/navigation";

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  let me: User | null = null;
  let users: LeaderboardUser[] = [];
  try {
    const [meRaw, lbRaw] = await Promise.all([
      usersApi.getMe() as Promise<Record<string, unknown>>,
      usersApi.getLeaderboard() as Promise<Record<string, unknown>[]>,
    ]);
    me = mapApiUser(meRaw);
    users = (lbRaw ?? []).map((u, i) => mapLeaderboardUser(u, i + 1));
  } catch (err) {
    if (isUnauthorized(err)) redirect(`/${locale}/login`);
    throw err;
  }

  return <LeaderboardClient users={users} me={me!} />;
}
