import { NextResponse, type NextRequest } from "next/server";
import { createActionClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    hash &&
    hash.length <= 512 &&
    (type === "email" || type === "signup" || type === "recovery")
  ) {
    const db = await createActionClient();
    const { error } = await db.auth.verifyOtp({ token_hash: hash, type });
    if (!error) {
      const response = NextResponse.redirect(
        new URL(type === "recovery" ? "/reset-password" : "/dashboard", request.url),
      );
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?confirmation=error", request.url));
}
