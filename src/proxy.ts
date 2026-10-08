import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfigurationStatus } from "@/lib/supabase/config";
import { refreshSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  const isPublic = ["/login", "/register", "/forgot-password"].includes(request.nextUrl.pathname);
  if (getSupabaseConfigurationStatus() !== "configured") {
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/settings", request.url));
  }
  const { response, claims } = await refreshSession(request);
  if (!claims && !isPublic) {
    const next = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of response.cookies.getAll()) next.cookies.set(cookie);
    next.headers.set("Cache-Control", "private, no-store");
    return next;
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/agents/:path*",
    "/audits/:path*",
    "/organizations",
    "/onboarding",
    "/reset-password",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
