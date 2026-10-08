export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export type ActionResult = { success: boolean; message: string; redirectTo?: string };
export function actionError(error: unknown): ActionResult {
  if (error instanceof ApplicationError) return { success: false, message: error.message };
  console.error("Falha em operação do servidor", { code: "UNEXPECTED" });
  return {
    success: false,
    message: "Não foi possível concluir. Verifique a conexão e tente novamente.",
  };
}
