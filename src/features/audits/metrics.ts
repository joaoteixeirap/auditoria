import type { AuditStatus, Verdict, Severity } from "./schemas";

export function summarizeResults(
  results: { verdict: Verdict; severity: Severity }[],
  status: AuditStatus,
) {
  const counts = { PASS: 0, FAIL: 0, INCONCLUSIVE: 0, ERROR: 0 };
  const severities = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const result of results) {
    counts[result.verdict] += 1;
    if (result.verdict === "FAIL") severities[result.severity] += 1;
  }
  const conclusive = counts.PASS + counts.FAIL;
  const approvalRate = conclusive > 0 ? Math.round((counts.PASS / conclusive) * 1000) / 10 : null;
  const release =
    severities.critical > 0
      ? "BLOCKED"
      : status !== "completed" ||
          counts.FAIL > 0 ||
          counts.ERROR > 0 ||
          counts.INCONCLUSIVE > 0 ||
          results.length === 0
        ? "REVIEW"
        : "ELIGIBLE";
  return { counts, severities, conclusive, approvalRate, release };
}
