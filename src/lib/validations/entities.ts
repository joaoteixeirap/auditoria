import { z } from "zod";

export const uuidSchema = z.uuid("Identificador inválido.");
const name = z
  .string()
  .trim()
  .min(2, "Informe pelo menos 2 caracteres.")
  .max(120, "Use até 120 caracteres.");
const description = z.string().trim().max(2000, "Use até 2000 caracteres.");
export const organizationSchema = z.object({ name });
export const clientSchema = z.object({
  name,
  contact_name: z.string().trim().max(120),
  contact_email: z.union([z.literal(""), z.email("Informe um e-mail válido.")]),
  description,
  status: z.enum(["active", "archived"]),
});
export const agentSchema = z.object({
  name,
  client_id: z.union([uuidSchema, z.literal("")]),
  description,
  category: z.enum(["customer_service", "sales", "hr", "support", "finance", "other"]),
  environment: z.enum(["demo", "staging", "production"]),
  status: z.enum(["active", "archived"]),
});
export const versionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  notes: description,
  demo_revision: z.enum(["1", "2"]),
});
export const createAgentSchema = agentSchema.extend({ version: versionSchema.shape.label });
export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").max(254),
  password: z.string().min(1, "Informe sua senha.").max(128),
});
export const passwordSchema = z
  .string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(128, "Use até 128 caracteres.");
export const registerSchema = loginSchema.extend({
  password: passwordSchema,
  display_name: z.string().trim().min(2).max(100),
});
export const recoverySchema = loginSchema.pick({ email: true });
export const newPasswordSchema = z.object({ password: passwordSchema });
export type ClientInput = z.infer<typeof clientSchema>;
export type AgentInput = z.infer<typeof agentSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type VersionInput = z.infer<typeof versionSchema>;
