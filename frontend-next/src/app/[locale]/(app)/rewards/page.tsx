import { usersApi, isUnauthorized } from "@/lib/api";
import { mapApiUser, type User } from "@/lib/api/mappers";
import { RewardsClient } from "@/components/rewards/RewardsClient";
import { redirect } from "next/navigation";

export default async function RewardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  let user: User;
  try {
    const raw = (await usersApi.getMe()) as Record<string, unknown>;
    user = mapApiUser(raw);
  } catch (err) {
    if (isUnauthorized(err)) redirect(`/${locale}/login`);
    throw err;
  }

  return <RewardsClient user={user} />;
}
