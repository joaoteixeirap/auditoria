import { workspaceContext, validatedId } from "@/server/services/workspace";
import { document, signedFile } from "@/server/repositories/workflow";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await workspaceContext();
    const value = await document(
      context.db,
      context.organization.id,
      validatedId((await params).id),
    );
    return new Response(null, {
      status: 303,
      headers: {
        Location: await signedFile(context.db, "policy-documents", value.storage_path),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Documento indisponível.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
