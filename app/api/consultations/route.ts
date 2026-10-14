import {
  validateConsultation,
  saveConsultation,
} from "@/lib/server/consultations";
export const runtime = "nodejs";
const json = (body: object, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host"))
        return json(
          { error: "Cross-origin submissions are not allowed." },
          403,
        );
    } catch {
      return json({ error: "Invalid origin." }, 403);
    }
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "JSON required." }, 415);
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Invalid JSON." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 14000) {
        await reader.cancel();
        return json({ error: "Request too large." }, 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  let input;
  try {
    input = validateConsultation(body);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Invalid enquiry." },
      400,
    );
  }
  const key = request.headers.get("Idempotency-Key") || undefined;
  if (key && !/^[a-zA-Z0-9_-]{24,100}$/.test(key))
    return json({ error: "Invalid request key." }, 400);
  try {
    return json(await saveConsultation(input, key), 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Idempotency key"))
      return json(
        { error: "This request key was used for different details." },
        409,
      );
    console.error("Consultation storage unavailable");
    return json({ error: "Could not save request." }, 500);
  }
}
