"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function logout(locale: string): Promise<void> {
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  await fetch(`${process.env.AUTH_INTERNAL_URL ?? "http://localhost:3000"}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
  }).catch(() => {
    jar.delete("cw_token");
  });

  redirect(`/${locale}/login`);
}
