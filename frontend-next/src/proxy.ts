import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATH_PATTERNS = [/^\/login(\/.*)?$/];

export default function proxy(req: NextRequest) {
  const intlResponse = intlMiddleware(req);
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return intlResponse;

  const locale = segments[0];
  const rest = "/" + segments.slice(1).join("/");

  const isPublic = PUBLIC_PATH_PATTERNS.some((p) => p.test(rest));
  if (isPublic) return intlResponse;

  const hasSession = req.cookies.has("cw_token");
  if (hasSession) return intlResponse;

  const loginUrl = new URL(`/${locale}/login`, req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
