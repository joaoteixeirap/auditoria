"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { executeNext, cancelAudit, type AuditProgress } from "./actions";
import { statusLabels } from "./labels";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/shared/forms";
import type { ActionResult } from "@/server/services/errors";

export function AuditRunner({
  auditId,
  initial,
  canRun,
}: {
  auditId: string;
  initial: AuditProgress;
  canRun: boolean;
}) {
  const [progress, setProgress] = useState(initial),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<ActionResult | null>(null);
  const stop = useRef(false),
    [, transition] = useTransition(),
    router = useRouter();
  const active = progress.status === "pending" || progress.status === "running";
  const execute = () => {
    if (busy) return;
    stop.current = false;
    setBusy(true);
    setFeedback(null);
    transition(async () => {
      try {
        while (!stop.current) {
          const result = await executeNext(auditId);
          if (!result.success || !result.progress) {
            setFeedback(result);
            break;
          }
          setProgress(result.progress);
          if (!["pending", "running"].includes(result.progress.status)) break;
        }
      } catch {
        setFeedback({
          success: false,
          message:
            "A execução perdeu a conexão. Retome para continuar a partir dos resultados salvos.",
        });
      } finally {
        setBusy(false);
        router.refresh();
      }
    });
  };
  const cancel = () => {
    stop.current = true;
    transition(async () => {
      try {
        const result = await cancelAudit(auditId);
        setFeedback(result);
        if (result.success && result.status) {
          const status = result.status;
          setProgress((previous) => ({ ...previous, status }));
          router.refresh();
        }
      } catch {
        setFeedback({
          success: false,
          message: "Não foi possível cancelar. Confira a conexão e tente novamente.",
        });
      }
    });
  };
  return (
    <section
      className="mb-7 rounded-xl border bg-white p-5 sm:p-6"
      aria-label="Execução da auditoria"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{statusLabels[progress.status]}</h2>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {progress.processed} de {progress.total} resultados persistidos
        </p>
      </div>
      <progress
        className="mt-4 h-3 w-full accent-indigo-700"
        value={progress.processed}
        max={progress.total}
        aria-label="Testes persistidos"
      />
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Cada cenário é processado no servidor e salvo antes do próximo. Fechar esta página pausa o
        avanço; resultados persistidos podem ser retomados.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {active && canRun && (
          <>
            <Button disabled={busy} onClick={execute}>
              {busy
                ? "Executando…"
                : progress.processed
                  ? "Continuar execução"
                  : "Executar cenários"}
            </Button>
            {busy && (
              <Button
                variant="outline"
                onClick={() => {
                  stop.current = true;
                }}
              >
                Pausar após o teste atual
              </Button>
            )}
            <Button variant="outline" onClick={cancel}>
              Cancelar auditoria
            </Button>
          </>
        )}
        {!active && (
          <Button variant="outline" onClick={() => router.refresh()}>
            Atualizar resultados
          </Button>
        )}
      </div>
      <div className="mt-4">
        <Feedback result={feedback} />
      </div>
    </section>
  );
}
