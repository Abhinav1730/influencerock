import "server-only";
import { open } from "node:fs/promises";
import path from "node:path";
import type { PressContact } from "../outreach";

const MAX_BYTES = 2 * 1024 * 1024;
const fields = ["id", "outlet", "name", "beat", "segment", "region", "contactType", "contact", "sourceUrl", "sourceChecked"] as const;

export async function readPressContacts(
  filename = process.env.IR_PRESS_CONTACTS_FILE || path.join(process.cwd(), "original-assets", "press-contacts.json"),
): Promise<PressContact[] | null> {
  try {
    // Operator-managed data stays outside the standalone build's file trace.
    const file = await open(/*turbopackIgnore: true*/ filename, "r");
    let text: string;
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > MAX_BYTES) return null;
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
      if (bytesRead > MAX_BYTES) return null;
      text = buffer.toString("utf8", 0, bytesRead);
    } finally {
      await file.close();
    }
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || !("contacts" in data) || !Array.isArray(data.contacts) || data.contacts.length > 5000) return null;
    const contacts: PressContact[] = [];
    for (const row of data.contacts) {
      if (!row || typeof row !== "object" || fields.some((field) => typeof row[field] !== "string" || row[field].length > 2000)) return null;
      contacts.push(Object.fromEntries(fields.map((field) => [field, row[field]])) as unknown as PressContact);
    }
    return contacts;
  } catch {
    return null;
  }
}
