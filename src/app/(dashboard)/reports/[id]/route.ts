import { workspaceContext, validatedId } from "@/server/services/workspace";
import { report, signedFile } from "@/server/repositories/workflow";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await workspaceContext(),
      value = await report(context.db, context.organization.id, validatedId((await params).id));
    return new Response(null, {
      status: 303,
      headers: {
        Location: await signedFile(context.db, "audit-reports", value.storage_path),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Relatório indisponível.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
