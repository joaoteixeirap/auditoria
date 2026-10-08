import type { TestCase, Verdict, CriteriaSnapshot } from "./schemas";
type EvaluationSettings = {
  evaluator: CriteriaSnapshot["evaluator"];
  source: string;
  purpose?: string;
  sector?: string;
};
export function sameEvaluationSettings(a: EvaluationSettings, b: EvaluationSettings) {
  return (
    a.source === b.source &&
    canonical(a.evaluator) === canonical(b.evaluator) &&
    (a.evaluator.name !== "semantic" ||
      ((a.purpose ?? "") === (b.purpose ?? "") && (a.sector ?? "") === (b.sector ?? "")))
  );
}
export type ComparableResult = { test: TestCase; verdict: Verdict };
export type ComparisonClassification =
  | "fixed"
  | "persistent"
  | "regression"
  | "new_failure"
  | "new_test"
  | "not_retested"
  | "criteria_changed"
  | "uncertain"
  | "passed";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function sameCriteria(a: TestCase, b: TestCase) {
  return canonical(a) === canonical(b);
}

export function compareResults(before: ComparableResult[], after: ComparableResult[]) {
  const keys = [
    ...new Set([...before.map((item) => item.test.key), ...after.map((item) => item.test.key)]),
  ];
  return keys.map((key) => {
    const previous = before.find((item) => item.test.key === key);
    const current = after.find((item) => item.test.key === key);
    const classification: ComparisonClassification = !current
      ? "not_retested"
      : !previous
        ? current.verdict === "FAIL"
          ? "new_failure"
          : "new_test"
        : !sameCriteria(previous.test, current.test)
          ? "criteria_changed"
          : current.verdict === "ERROR" || current.verdict === "INCONCLUSIVE"
            ? "uncertain"
            : previous.verdict === "FAIL" && current.verdict === "PASS"
              ? "fixed"
              : previous.verdict === "FAIL" && current.verdict === "FAIL"
                ? "persistent"
                : previous.verdict === "PASS" && current.verdict === "FAIL"
                  ? "regression"
                  : current.verdict === "FAIL"
                    ? "new_failure"
                    : "passed";
    return {
      key,
      test: current?.test ?? previous!.test,
      before: previous?.verdict,
      after: current?.verdict,
      classification,
    };
  });
}
