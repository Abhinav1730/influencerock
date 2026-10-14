import { equalSecret, readJson } from "@/lib/server/access";
import { validateMeetingEvent } from "@/lib/server/meeting-events";
import { PipelineStore } from "@/lib/server/pipeline-store";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (
    !equalSecret(
      request.headers.get("X-SmartMeet-Bridge-Key") || "",
      process.env.SMARTMEET_BRIDGE_KEY || "",
    )
  )
    return Response.json({ error: "Access denied" }, { status: 403, headers });
  let event;
  try {
    event = validateMeetingEvent(await readJson(request, 64_000));
  } catch {
    return Response.json(
      { error: "Invalid meeting event" },
      { status: 400, headers },
    );
  }
  const store = new PipelineStore();
  try {
    const id = store.ingestMeeting(event.meeting, event.notifications);
    return Response.json(
      { id, queued: event.notifications.map((n) => n.id) },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Meeting event conflict" },
      { status: 409, headers },
    );
  } finally {
    store.close();
  }
}
