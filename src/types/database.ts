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
  is_organization: boolean;
};
export type Agent = {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
  description: string;
  category: "customer_service" | "sales" | "hr" | "support" | "finance" | "other";
  environment: "demo" | "staging" | "production";
  connection_type: "demo" | "http";
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
  source: "demo" | "http" | "csv";
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
      organization_invitations: Table<
        {
          id: string;
          organization_id: string;
          email: string;
          role: "owner" | "member";
          created_at: string;
          expires_at: string;
          used_at: string | null;
        },
        never,
        never
      >;
      policy_documents: Table<
        {
          id: string;
          organization_id: string;
          name: string;
          storage_path: string;
          content: string;
          created_by: string;
          created_at: string;
        },
        {
          id: string;
          organization_id: string;
          name: string;
          storage_path: string;
          content: string;
          created_by: string;
        },
        never
      >;
      custom_scenarios: Table<
        {
          id: string;
          organization_id: string;
          rule_key: string;
          version: number;
          definition: Json;
          state: "draft" | "approved";
          document_id: string | null;
          created_by: string;
          created_at: string;
        },
        never,
        never
      >;
      finding_reviews: Table<
        {
          id: string;
          organization_id: string;
          finding_id: string;
          verdict: "confirmed" | "dismissed" | "needs_review";
          reason: string;
          created_by: string;
          created_at: string;
        },
        {
          organization_id: string;
          finding_id: string;
          verdict: "confirmed" | "dismissed" | "needs_review";
          reason: string;
        },
        never
      >;
      release_decisions: Table<
        {
          id: string;
          organization_id: string;
          audit_run_id: string;
          decision: "released" | "blocked" | "needs_review";
          reason: string;
          created_by: string;
          created_at: string;
        },
        {
          organization_id: string;
          audit_run_id: string;
          decision: "released" | "blocked" | "needs_review";
          reason: string;
        },
        never
      >;
      audit_reports: Table<
        {
          id: string;
          organization_id: string;
          audit_run_id: string;
          storage_path: string;
          snapshot: Json;
          created_by: string;
          created_at: string;
        },
        {
          id: string;
          organization_id: string;
          audit_run_id: string;
          storage_path: string;
          snapshot: Json;
        },
        never
      >;
      evaluation_usage: Table<
        {
          id: string;
          organization_id: string;
          test_execution_id: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          estimated_cost: number | null;
          created_at: string;
        },
        never,
        never
      >;
      agent_connections: Table<
        {
          id: string;
          organization_id: string;
          agent_id: string;
          agent_version_id: string;
          endpoint: string;
          encrypted_token: string | null;
          encrypted_config: string | null;
          contract: string;
          created_at: string;
        },
        {
          organization_id: string;
          agent_id: string;
          agent_version_id: string;
          endpoint: string;
          encrypted_token: string | null;
          encrypted_config?: string | null;
          contract?: string;
        },
        never
      >;
      profiles: Table<
        { id: string; display_name: string; created_at: string; updated_at: string },
        { id: string; display_name?: string },
        { display_name?: string }
      >;
      organizations: Table<Organization, never, { name?: string }>;
      organization_members: Table<Membership, never, never>;
      clients: Table<
        Client,
        Omit<Client, "id" | "created_at" | "updated_at" | "is_organization">,
        Partial<
          Omit<Client, "id" | "organization_id" | "created_at" | "updated_at" | "is_organization">
        >
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
          estimated_cost: number | null;
          created_at: string;
        },
        never,
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_membership_invitation: {
        Args: { org_id: string; target_email: string; target_role: string; invite_hash: string };
        Returns: string;
      };
      accept_membership_invitation: { Args: { invite_hash: string }; Returns: string };
      revoke_membership_invitation: {
        Args: { org_id: string; invitation_id: string };
        Returns: undefined;
      };
      memberships_health: { Args: Record<string, never>; Returns: string };
      company_members: {
        Args: { org_id: string };
        Returns: { user_id: string; display_name: string; role: string; created_at: string }[];
      };
      company_client_id: { Args: { org_id: string }; Returns: string };
      create_company_agent: {
        Args: {
          org_id: string;
          agent_name: string;
          agent_description: string;
          agent_category: string;
          agent_environment: string;
          version_label: string;
          linked_client?: string;
        };
        Returns: string;
      };
      company_dashboard: { Args: { org_id: string }; Returns: Json };
      b2b_health: { Args: Record<string, never>; Returns: string };
      create_company_audit: {
        Args: {
          org_id: string;
          selected_agent: string;
          selected_version: string;
          case_ids: string[];
          idempotency_key: string;
          selected_model: string;
          authorized: boolean;
        };
        Returns: string;
      };
      retest_audit: {
        Args: {
          org_id: string;
          previous_run: string;
          selected_version: string;
          idempotency_key: string;
          authorized: boolean;
        };
        Returns: string;
      };
      audit_statistics: { Args: { org_id: string }; Returns: Json };
      save_custom_scenario: {
        Args: {
          org_id: string;
          scenario: Json;
          approved: boolean;
          previous_key?: string;
          linked_document?: string;
        };
        Returns: string;
      };
      create_workflow_audit: {
        Args: {
          org_id: string;
          selected_agent: string;
          selected_version: string;
          case_ids: string[];
          idempotency_key: string;
          selected_source: string;
          imported: Json;
          selected_model: string | null;
          authorized: boolean;
        };
        Returns: string;
      };
      append_evaluated_execution: {
        Args: {
          run_id: string;
          case_id: string;
          result_verdict: string;
          result_response: string;
          result_reason: string;
          result_evidence: string;
          result_recommendation: string;
          result_latency: number;
          usage_model?: string;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost?: number;
        };
        Returns: string;
      };
      phase3_health: { Args: Record<string, never>; Returns: string };
      phase4_health: { Args: Record<string, never>; Returns: string };
      phase6_health: { Args: Record<string, never>; Returns: string };
      create_http_audit: {
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
