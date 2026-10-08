import { NextResponse, type NextRequest } from "next/server";
import { createActionClient } from "@/lib/supabase/server";
import { authDestination } from "@/lib/utils/auth-redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const db = await createActionClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(
        new URL(authDestination(request.nextUrl.searchParams.get("next")), request.url),
      );
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?confirmation=error", request.url));
}
