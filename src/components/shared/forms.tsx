"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/services/errors";

export const inputClass =
  "w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-slate-100";

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
export function fieldAccessibility(id: string, error?: string) {
  return { id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined };
}

export function Feedback({ result }: { result: ActionResult | null }) {
  return (
    <div aria-live="polite">
      {result && (
        <p
          role={result.success ? "status" : "alert"}
          className={`rounded-lg border p-3 text-sm ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}

export function useServerSubmit<T>(action: (input: T) => Promise<ActionResult>) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const submit = (input: T) =>
    startTransition(async () => {
      try {
        const response = await action(input);
        setResult(response);
        if (response.success && response.redirectTo) {
          router.push(response.redirectTo);
          router.refresh();
        } else if (response.success) router.refresh();
      } catch {
        setResult({ success: false, message: "Não foi possível concluir. Tente novamente." });
      }
    });
  return { submit, pending, result };
}
