export default function Loading() {
  return (
    <main role="status" className="mx-auto max-w-5xl p-8">
      <span className="sr-only">Carregando página…</span>
      <div
        aria-hidden="true"
        className="h-12 w-72 rounded-lg bg-slate-200 motion-safe:animate-pulse"
      />
      <div
        aria-hidden="true"
        className="mt-8 h-64 rounded-xl bg-slate-200 motion-safe:animate-pulse"
      />
    </main>
  );
}
