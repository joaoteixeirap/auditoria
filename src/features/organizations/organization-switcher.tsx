"use client";

import { useState } from "react";
import { switchOrganization } from "./actions";
import { Button } from "@/components/ui/button";
import { Feedback, inputClass, useServerSubmit } from "@/components/shared/forms";

export function OrganizationSwitcher({
  options,
  current,
}: {
  options: { id: string; name: string }[];
  current: string;
}) {
  const [selected, setSelected] = useState(current);
  const { submit, pending, result } = useServerSubmit<string>(switchOrganization);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(selected);
      }}
    >
      <label htmlFor="organization" className="block text-sm font-medium">
        Organização
      </label>
      <select
        id="organization"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className={inputClass}
        disabled={pending}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <Feedback result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Selecionando…" : "Acessar organização"}
      </Button>
    </form>
  );
}
