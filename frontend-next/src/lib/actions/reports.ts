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

export async function completeReport(id: string | number, formData: FormData): Promise<void> {
  await reportsApi.complete(id, formData);
  revalidatePath("/[locale]/reports", "page");
  revalidatePath(`/[locale]/reports/${id}`, "page");
}

export async function confirmReport(id: string | number): Promise<void> {
  await reportsApi.confirm(id);
  revalidatePath(`/[locale]/reports/${id}`, "page");
}
