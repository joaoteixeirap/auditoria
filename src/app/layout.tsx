import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Auditor de IA · Configuração", template: "%s · Auditor de IA" },
  description: "Testes reproduzíveis para chatbots e agentes de inteligência artificial.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
