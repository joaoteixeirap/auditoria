/** Lista fechada: não aceitar URLs externas, protocolo relativo ou redirects livres. */
export function authDestination(value: string | null) {
  return value === "/reset-password" ? "/reset-password" : "/dashboard";
}
