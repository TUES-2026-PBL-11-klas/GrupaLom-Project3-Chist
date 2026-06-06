"use server";

import { revalidatePath } from "next/cache";
import { reportsApi } from "@/lib/api";

export async function createReport(formData: FormData): Promise<void> {
  await reportsApi.create(formData);
  revalidatePath("/[locale]/reports", "page");
}

export async function claimReport(id: string | number): Promise<void> {
  await reportsApi.claim(id);
  revalidatePath("/[locale]/reports", "page");
  revalidatePath(`/[locale]/reports/${id}`, "page");
}

// Mirrors report-module's POINTS_PER_COMPLETION. The backend awards these points
// synchronously when a report flips to CLEANED with an acting user; we surface
// the amount so the UI can confirm the reward to the cleaner. Kept non-exported:
// this is a "use server" module, where every *export* must be an async function.
const POINTS_PER_COMPLETION = 50;

export async function completeReport(id: string | number, formData: FormData): Promise<number> {
  await reportsApi.complete(id, formData);
  revalidatePath("/[locale]/reports", "page");
  revalidatePath(`/[locale]/reports/${id}`, "page");
  return POINTS_PER_COMPLETION;
}
