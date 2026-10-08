import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuditTable } from "./audit-table";
import type { AuditRun } from "@/types/database";
it("histórico identifica as três origens sem apresentar API real como demonstração", () => {
  const id = "11111111-1111-4111-8111-111111111111",
    created = "2026-10-08T12:00:00Z";
  const audit = (source: AuditRun["source"]): AuditRun => ({
    id: crypto.randomUUID(),
    organization_id: id,
    agent_id: id,
    agent_version_id: id,
    created_by: id,
    request_key: id,
    source,
    status: "completed",
    total_tests: 1,
    processed_count: 1,
    selected_case_ids: [id],
    criteria_snapshot: {},
    criteria_fingerprint: "fingerprint",
    error_code: null,
    created_at: created,
    started_at: created,
    completed_at: created,
    updated_at: created,
    conditions_snapshot: {
      agent: { id, name: `Chatbot ${source}`, environment: "demo" },
      client: { id, name: "Empresa" },
      version: { id, label: "v1", demo_revision: 1 },
      connector: { type: "demo", revision: 1 },
    },
  });
  const html = renderToStaticMarkup(
    createElement(AuditTable, { audits: [audit("http"), audit("csv"), audit("demo")] }),
  );
  expect(html).toContain("Chatbot real via API");
  expect(html).toContain("Respostas importadas — sem chamada ao chatbot");
  expect(html.match(/Demonstração — dados fictícios/g)).toHaveLength(1);
});
