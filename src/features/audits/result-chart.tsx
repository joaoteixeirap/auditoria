import { z } from "zod";
import { statistics, type WorkflowDB } from "@/server/repositories/workflow";
import { ApplicationError } from "@/server/services/errors";
const countsSchema = z.object({
  PASS: z.number().int().nonnegative(),
  FAIL: z.number().int().nonnegative(),
  INCONCLUSIVE: z.number().int().nonnegative(),
  ERROR: z.number().int().nonnegative(),
});
export async function ResultChart({ db, org }: { db: WorkflowDB; org: string }) {
  let data: unknown;
  try {
    data = await statistics(db, org);
  } catch (error) {
    if (!(error instanceof ApplicationError)) throw error;
    return <p className="text-sm">Gráfico aguardando habilitação das métricas neste ambiente.</p>;
  }
  const parsed = countsSchema.safeParse(data);
  if (!parsed.success)
    return <p className="text-sm">Gráfico aguardando habilitação das métricas neste ambiente.</p>;
  const values = parsed.data,
    max = Math.max(1, ...Object.values(values)),
    total = Object.values(values).reduce((sum, count) => sum + count, 0);
  return (
    <section
      className="rounded-xl border bg-white p-5"
      aria-label="Resultados das auditorias concluídas"
    >
      <h2 className="mb-4 font-semibold">Resultados das auditorias concluídas</h2>
      {!total ? (
        <p className="text-sm">Nenhum teste concluído para exibir.</p>
      ) : (
        <dl className="space-y-3">
          {Object.entries(values).map(([label, count]) => (
            <div key={label}>
              <div className="flex justify-between text-sm">
                <dt>{label}</dt>
                <dd>{count}</dd>
              </div>
              <div aria-hidden="true" className="mt-1 h-3 rounded bg-slate-100">
                <div
                  className={`h-3 rounded ${label === "FAIL" ? "bg-red-600" : label === "PASS" ? "bg-emerald-600" : "bg-slate-500"}`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-4 text-xs">
        Contagens reais de resultados originais. Revisões humanas são mostradas separadamente.
      </p>
    </section>
  );
}
