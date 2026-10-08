"use client";

import { useRef, useState, useTransition } from "react";
import { createAudit, loadVersions } from "./actions";
import type { TestCase } from "./schemas";
import { categoryLabels, severityLabels } from "./labels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Feedback, inputClass, useServerSubmit } from "@/components/shared/forms";

type Option = { id: string; label: string; demo_revision: 1 | 2; source: "demo" | "http" };
export function NewAuditForm({
  agents,
  initialAgent,
  initialVersions,
  scenarios,
  previousRun,
}: {
  agents: { id: string; name: string }[];
  initialAgent: string;
  initialVersions: Option[];
  scenarios: TestCase[];
  previousRun?: string;
}) {
  const [agentId, setAgentId] = useState(initialAgent),
    [versions, setVersions] = useState(initialVersions);
  const [versionId, setVersionId] = useState(
    initialVersions.find((version) => version.demo_revision === 1)?.id ??
      initialVersions[0]?.id ??
      "",
  );
  const [selected, setSelected] = useState(
      scenarios
        .filter(
          (test) =>
            previousRun ||
            (initialVersions[0]?.source === "demo"
              ? test.evaluation.kind !== "semantic"
              : test.evaluation.kind === "semantic"),
        )
        .slice(0, 10)
        .map((test) => test.id),
    ),
    [authorized, setAuthorized] = useState(false);
  const [aiAuthorized, setAiAuthorized] = useState(false);
  const isDemo = versions.find((version) => version.id === versionId)?.source === "demo";
  const availableScenarios = previousRun
    ? scenarios
    : isDemo
      ? scenarios.filter((test) => test.evaluation.kind !== "semantic")
      : scenarios.filter((test) => test.evaluation.kind === "semantic");
  const chosen = selected.filter((id) => availableScenarios.some((test) => test.id === id));
  const [loading, transition] = useTransition(),
    [loadingError, setLoadingError] = useState("");
  const generation = useRef(0),
    requestKey = useRef("");
  const { submit, pending, result } = useServerSubmit(createAudit);
  const changeAgent = (id: string) => {
    setAgentId(id);
    setVersionId("");
    setVersions([]);
    setLoadingError("");
    const current = ++generation.current;
    transition(async () => {
      const result = await loadVersions(id);
      if (generation.current !== current) return;
      if (!result.success) {
        setLoadingError(result.message);
        return;
      }
      setVersions(result.versions);
      setSelected(
        scenarios
          .filter((test) =>
            result.versions[0]?.source === "demo"
              ? test.evaluation.kind !== "semantic"
              : test.evaluation.kind === "semantic",
          )
          .slice(0, 10)
          .map((test) => test.id),
      );
      setVersionId(
        result.versions.find((version) => version.demo_revision === 1)?.id ??
          result.versions[0]?.id ??
          "",
      );
    });
  };
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!requestKey.current) requestKey.current = crypto.randomUUID();
        submit({
          agentId,
          versionId,
          caseIds: chosen,
          authorized,
          aiAuthorized,
          requestKey: requestKey.current,
          previousRun,
        });
      }}
    >
      <fieldset disabled={pending} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="audit-agent" className="mb-2 block text-sm font-medium">
            Chatbot a testar
          </label>
          <select
            id="audit-agent"
            className={inputClass}
            value={agentId}
            disabled={!!previousRun}
            onChange={(event) => changeAgent(event.target.value)}
          >
            {agents.map((agent) => (
              <option value={agent.id} key={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-version" className="mb-2 block text-sm font-medium">
            Versão a testar
          </label>
          <select
            id="audit-version"
            className={inputClass}
            value={versionId}
            disabled={loading}
            onChange={(event) => setVersionId(event.target.value)}
          >
            <option value="">{loading ? "Carregando…" : "Selecione uma versão"}</option>
            {versions.map((version) => (
              <option value={version.id} key={version.id}>
                {version.label} ·{" "}
                {version.source === "http"
                  ? "HTTP"
                  : version.demo_revision === 1
                    ? "Falhas intencionais"
                    : "Corrigida"}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
      {loadingError && (
        <p role="alert" className="text-sm text-red-700">
          {loadingError}
        </p>
      )}
      <fieldset disabled={pending || !!previousRun} className="space-y-3">
        <legend className="mb-3 font-semibold">Cenários e regras de referência</legend>
        <p className="mb-4 text-sm text-muted-foreground">
          Selecione de 1 a 10 testes. O catálogo curado usa políticas fictícias; regras próprias
          aprovadas usam avaliação semântica. Os critérios selecionados serão preservados.
        </p>
        {availableScenarios.map((test) => (
          <label
            key={test.id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4"
          >
            <input
              type="checkbox"
              className="mt-1 size-4 accent-indigo-700"
              checked={selected.includes(test.id)}
              onChange={(event) =>
                setSelected((previous) =>
                  event.target.checked
                    ? [...previous, test.id]
                    : previous.filter((id) => id !== test.id),
                )
              }
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{test.name}</span>
                <Badge variant="outline">{severityLabels[test.severity]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {categoryLabels[test.category]}
                </span>
              </span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                {test.policy.description}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Pergunta: {test.question}
              </span>
            </span>
          </label>
        ))}
        {!availableScenarios.length && (
          <p className="text-sm">
            Nenhuma política aprovada disponível.{" "}
            <a className="text-primary underline" href="/policies">
              Adicionar políticas da empresa
            </a>
          </p>
        )}
      </fieldset>
      <label className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-6">
        <input
          type="checkbox"
          checked={authorized}
          disabled={pending}
          onChange={(event) => setAuthorized(event.target.checked)}
          className="mt-1 size-4 accent-indigo-700"
        />
        <span>
          Confirmo que tenho autorização para testar este chatbot. Entendo que versões HTTP enviam
          as perguntas ao endpoint configurado e que as regras fictícias deste catálogo precisam ser
          compatíveis com o chatbot. Versões de demonstração não chamam APIs externas.
        </span>
      </label>
      <Feedback result={result} />
      {chosen.some(
        (id) => scenarios.find((test) => test.id === id)?.evaluation.kind === "semantic",
      ) && (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={aiAuthorized}
            onChange={(event) => setAiAuthorized(event.target.checked)}
            disabled={pending}
          />
          Autorizo enviar as perguntas, respostas, finalidade do chatbot e políticas selecionadas à
          provedor de IA configurado (Gemini ou OpenAI) para avaliação semântica.
        </label>
      )}
      <Button
        disabled={
          pending ||
          loading ||
          !authorized ||
          !versionId ||
          !chosen.length ||
          chosen.length > 10 ||
          (chosen.some(
            (id) => scenarios.find((test) => test.id === id)?.evaluation.kind === "semantic",
          ) &&
            !aiAuthorized)
        }
        type="submit"
      >
        {pending ? "Preparando…" : `Preparar auditoria · ${chosen.length} teste(s)`}
      </Button>
    </form>
  );
}
