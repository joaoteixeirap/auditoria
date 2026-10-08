"use client";
import { useState } from "react";
import { generateInvitation, joinOrganization, cancelInvitation } from "./invitation-actions";
import { useServerSubmit, Feedback, inputClass } from "@/components/shared/forms";
import { Button } from "@/components/ui/button";
export function InvitationForm() {
  const [code, setCode] = useState("");
  const { submit, pending, result } = useServerSubmit(
    async (input: { email: string; role: string }) => {
      setCode("");
      const response = await generateInvitation(input);
      if (response.code) setCode(response.code);
      return response;
    },
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        submit({ email: String(form.get("email")), role: String(form.get("role")) });
      }}
    >
      <label className="block text-sm">
        E-mail do destinatário
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className={inputClass}
          disabled={pending}
        />
      </label>
      <label className="block text-sm">
        Permissão
        <select name="role" className={inputClass} disabled={pending}>
          <option value="member">Membro — leitura</option>
          <option value="owner">Administrador — gerenciar empresa e auditorias</option>
        </select>
      </label>
      <Button disabled={pending} type="submit">
        Gerar convite
      </Button>
      <Feedback result={result} />
      {code && (
        <label className="block text-sm">
          Código para compartilhar
          <textarea className={inputClass} readOnly value={code} rows={3} />
          <span className="text-xs">
            Mostrado somente agora. O destinatário deve entrar com o e-mail indicado e aceitar o
            código em Criar organização ou Empresa e equipe. Não há envio automático.
          </span>
        </label>
      )}
    </form>
  );
}
export function JoinOrganizationForm() {
  const { submit, pending, result } = useServerSubmit(joinOrganization);
  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget).get("code"));
      }}
    >
      <h2 className="font-semibold">Entrar por convite</h2>
      <label className="block text-sm">
        Código recebido
        <input
          className={inputClass}
          name="code"
          required
          maxLength={64}
          autoComplete="off"
          disabled={pending}
        />
      </label>
      <Button disabled={pending} variant="outline" type="submit">
        Aceitar convite
      </Button>
      <Feedback result={result} />
    </form>
  );
}
export function RevokeInvitation({ id }: { id: string }) {
  const { submit, pending, result } = useServerSubmit(cancelInvitation);
  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => submit(id)}
      >
        Revogar convite
      </Button>
      <Feedback result={result} />
    </div>
  );
}
