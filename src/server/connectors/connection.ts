import "server-only";
import { decryptCredential } from "./credentials";
import { httpConfigSchema } from "@/features/agents/http-contract";
import { HttpConnector } from "./http";
import { ApplicationError } from "@/server/services/errors";
type Connection = {
  organization_id: string;
  agent_version_id: string;
  endpoint: string;
  encrypted_token: string | null;
  encrypted_config: string | null;
  contract: string;
};
export function configuredConnector(connection: Connection) {
  try {
    const scope = `${connection.organization_id}:${connection.agent_version_id}`;
    const token = connection.encrypted_token
      ? decryptCredential(connection.encrypted_token, scope)
      : "";
    if (connection.contract === "message-text-v1")
      return new HttpConnector(connection.endpoint, token);
    if (connection.contract !== "http-json-v1" || !connection.encrypted_config)
      throw new Error("config");
    const config = httpConfigSchema.parse(
      JSON.parse(
        decryptCredential(connection.encrypted_config, `${scope}:http-json-v1`),
      ) as unknown,
    );
    return new HttpConnector(connection.endpoint, token, config);
  } catch {
    throw new ApplicationError(
      "CONFIG",
      "Não foi possível abrir a conexão. Confira a chave de criptografia e registre uma nova versão para corrigir a configuração.",
    );
  }
}
