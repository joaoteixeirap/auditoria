"use client";
import { createReport } from "./report-actions";
import { Button } from "@/components/ui/button";
import { Feedback, useServerSubmit } from "@/components/shared/forms";
export function ReportButton({ auditId }: { auditId: string }) {
  const { submit, pending, result } = useServerSubmit(createReport);
  return (
    <div>
      <Button disabled={pending} variant="outline" onClick={() => submit(auditId)}>
        {pending ? "Gerando PDF…" : "Gerar relatório PDF privado"}
      </Button>
      <Feedback result={result} />
    </div>
  );
}
