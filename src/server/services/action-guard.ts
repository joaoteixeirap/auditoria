import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { RateLimiter } from "@/lib/utils/rate-limit";

const clientLimiter = new RateLimiter(10, 60_000);
const totalLimiter = new RateLimiter(300, 60_000);

export async function allowPublicAction(scope: string, identity = "") {
  const requestHeaders = await headers();
  const address = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = createHash("sha256")
    .update(`${scope}:${address}:${identity.toLowerCase()}`)
    .digest("hex");
  return totalLimiter.allow(scope) && clientLimiter.allow(key);
}
