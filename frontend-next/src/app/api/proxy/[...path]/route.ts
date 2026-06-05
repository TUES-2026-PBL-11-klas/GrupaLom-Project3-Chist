import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const reportApiUrl = process.env.REPORT_API_URL ?? process.env.BACKEND_URL ?? "";
  const reportBase = reportApiUrl.replace(/\/api\/?$/, "");

  if (!reportBase) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const res = await fetch(`${reportBase}/${path.join("/")}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const blob = await res.blob();
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") ?? "image/jpeg");
    headers.set("Cache-Control", "public, max-age=3600");
    return new NextResponse(blob, { headers });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
