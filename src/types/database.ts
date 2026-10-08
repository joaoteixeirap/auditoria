// Contrato das migrations versionadas. Atualizar junto ao schema.
import type { AuditStatus, Verdict, Severity } from "@/features/audits/schemas";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Client = {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  description: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};
export type Agent = {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  description: string;
  category: "customer_service" | "sales" | "hr" | "support" | "finance" | "other";
  environment: "demo" | "staging" | "production";
  connection_type: "demo";
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};
export type Organization = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type Membership = {
  organization_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};
export type AgentVersion = {
  id: string;
  organization_id: string;
  agent_id: string;
  label: string;
  notes: string;
  created_at: string;
  demo_revision: 1 | 2;
};
export type AuditRun = {
  id: string;
  organization_id: string;
  agent_id: string;
  agent_version_id: string;
  created_by: string;
  request_key: string;
  source: "demo";
  status: AuditStatus;
  total_tests: number;
  processed_count: number;
  selected_case_ids: string[];
  criteria_snapshot: Json;
  conditions_snapshot: Json;
  criteria_fingerprint: string;
  error_code: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};
export type TestExecution = {
  id: string;
  organization_id: string;
  audit_run_id: string;
  test_case_id: string;
  scenario_key: string;
  category: string;
  severity: Severity;
  verdict: Verdict;
  response: string;
  reason: string;
  evidence: string;
  recommendation: string;
  latency_ms: number;
  created_at: string;
};
export type Finding = {
  id: string;
  organization_id: string;
  audit_run_id: string;
  test_execution_id: string;
  severity: Severity;
  reason: string;
  evidence: string;
  recommendation: string;
  created_at: string;
};
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; display_name: string; created_at: string; updated_at: string },
        { id: string; display_name?: string },
        { display_name?: string }
      >;
      organizations: Table<Organization, never, { name?: string }>;
      organization_members: Table<Membership, never, never>;
      clients: Table<
        Client,
        Omit<Client, "id" | "created_at" | "updated_at">,
        Partial<Omit<Client, "id" | "organization_id" | "created_at" | "updated_at">>
      >;
      agents: Table<
        Agent,
        Omit<Agent, "id" | "created_at" | "updated_at">,
        Partial<
          Omit<Agent, "id" | "organization_id" | "connection_type" | "created_at" | "updated_at">
        >
      >;
      agent_versions: Table<AgentVersion, Omit<AgentVersion, "id" | "created_at">, never>;
      test_suites: Table<
        { id: string; name: string; version: number; source: string; created_at: string },
        never,
        never
      >;
      policy_rules: Table<
        { id: string; key: string; version: number; definition: Json; created_at: string },
        never,
        never
      >;
      test_cases: Table<
        {
          id: string;
          suite_id: string;
          key: string;
          version: number;
          policy_key: string;
          policy_version: number;
          definition: Json;
          created_at: string;
        },
        never,
        never
      >;
      audit_runs: Table<AuditRun, never, never>;
      test_executions: Table<TestExecution, never, never>;
      findings: Table<Finding, never, never>;
      usage_records: Table<
        {
          id: string;
          organization_id: string;
          audit_run_id: string;
          kind: string;
          units: number;
          estimated_cost: number;
          created_at: string;
        },
        never,
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: { Args: { organization_name: string }; Returns: string };
      create_agent: {
        Args: {
          org_id: string;
          linked_client: string;
          agent_name: string;
          agent_description: string;
          agent_category: string;
          agent_environment: string;
          version_label: string;
        };
        Returns: string;
      };
      phase1_health: { Args: Record<string, never>; Returns: string };
      phase2_health: { Args: Record<string, never>; Returns: string };
      create_demo_audit: {
        Args: {
          org_id: string;
          selected_agent: string;
          selected_version: string;
          case_ids: string[];
          idempotency_key: string;
          authorized: boolean;
        };
        Returns: string;
      };
      append_demo_execution: {
        Args: {
          run_id: string;
          case_id: string;
          result_verdict: string;
          result_response: string;
          result_reason: string;
          result_evidence: string;
          result_recommendation: string;
          result_latency: number;
        };
        Returns: string;
      };
      cancel_demo_audit: { Args: { run_id: string }; Returns: string };
      fail_demo_audit: { Args: { run_id: string; failure_code: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
