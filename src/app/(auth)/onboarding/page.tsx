import Link from "next/link";
import { redirect } from "next/navigation";
import { OrganizationForm } from "@/features/organizations/organization-form";
import { authenticatedClient } from "@/server/services/workspace";
import { ApplicationError } from "@/server/services/errors";
import { signOut } from "@/features/auth/actions";
import { JoinOrganizationForm } from "@/features/organizations/invitation-forms";

export const metadata = { title: "Criar organização" };
export default async function OnboardingPage() {
  try {
    await authenticatedClient();
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "CONFIG") redirect("/settings");
    redirect("/login");
  }
  return (
    <>
      <h1 className="text-2xl font-semibold">Crie sua organização</h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
        Sua empresa terá um espaço independente. Você será administrador e poderá cadastrar seus
        próprios chatbots, políticas e auditorias, sem depender de intermediários.
      </p>
      <OrganizationForm />
      <JoinOrganizationForm />
      <Link href="/dashboard" className="mt-6 block text-sm text-primary underline">
        Acessar uma organização existente
      </Link>
      <form action={signOut} className="mt-4">
        <button className="text-sm text-muted-foreground underline" type="submit">
          Sair da conta
        </button>
      </form>
    </>
  );
}
