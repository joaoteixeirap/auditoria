export function parsePage(input: string | string[] | undefined) {
  if (typeof input !== "string" || !/^\d{1,6}$/.test(input)) return 1;
  return Math.max(1, Math.min(10_000, Number(input)));
}
export function parseSearch(input: string | string[] | undefined) {
  return typeof input === "string" ? input.trim().slice(0, 120) : "";
}
