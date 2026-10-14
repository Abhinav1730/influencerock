import { PipelineStore } from "@/lib/server/pipeline-store";
import { verifyResendWebhook } from "@/lib/server/resend-webhook";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const reader = request.body?.getReader();
  if (!reader)
    return Response.json({ error: "Body required" }, { status: 400, headers });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 64_000) {
      await reader.cancel();
      return Response.json(
        { error: "Body too large" },
        { status: 413, headers },
      );
    }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  let id: string;
  try {
    id = verifyResendWebhook(
      raw,
      request.headers,
      process.env.RESEND_WEBHOOK_SECRET || "",
    );
  } catch {
    return Response.json(
      { error: "Invalid signature" },
      { status: 401, headers },
    );
  }
  let event;
  try {
    event = JSON.parse(raw);
    if (
      typeof event.type !== "string" ||
      typeof event.data?.email_id !== "string"
    )
      throw new Error();
  } catch {
    return Response.json({ error: "Invalid event" }, { status: 400, headers });
  }
  const store = new PipelineStore();
  try {
    store.recordWebhook(id, event.data.email_id, event.type);
    return Response.json({ received: true }, { headers });
  } finally {
    store.close();
  }
}
