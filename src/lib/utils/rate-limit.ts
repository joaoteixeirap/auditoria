/** Limite por processo. Supabase Auth também aplica seus limites persistentes. */
export class RateLimiter {
  private buckets = new Map<string, { count: number; until: number }>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly clock = Date.now,
  ) {}
  allow(key: string): boolean {
    const now = this.clock();
    for (const [id, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(id);
    const bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= 2000) return false;
      this.buckets.set(key, { count: 1, until: now + this.windowMs });
      return true;
    }
    if (bucket.count >= this.max) return false;
    bucket.count += 1;
    return true;
  }
}
