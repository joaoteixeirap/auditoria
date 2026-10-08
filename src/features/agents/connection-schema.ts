import { z } from "zod";
import { httpConfigSchema } from "./http-contract";

export const connectionSchema = z.object({
  versionId: z.uuid(),
  endpoint: z.url().max(2000),
  token: z
    .string()
    .max(4000)
    .refine((value) => !/[\r\n]/.test(value), "Credencial inválida."),
  authorized: z.literal(true, "Confirme a autorização e a compatibilidade do contrato."),
  config: httpConfigSchema.optional(),
});
