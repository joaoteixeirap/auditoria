import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3 font-bold">
          <ShieldCheck size={30} className="text-primary" aria-hidden="true" />
          Auditor de IA
        </Link>
        <div className="rounded-2xl border bg-white p-7 shadow-sm sm:p-9">{children}</div>
        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          Qualidade e evidências para suas entregas de IA.
        </p>
      </div>
    </main>
  );
}
