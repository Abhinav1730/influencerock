import "server-only";
import { profiles } from "../profiles";
import type { ConsultationInput, ConsultationResult } from "../types";
import { PipelineStore } from "./pipeline-store";
const profileIds = new Set(profiles.map((p) => p.id));
const limits = {
  name: 120,
  email: 254,
  organization: 160,
  jurisdictions: 300,
  timeframe: 40,
  expertise: 100,
  objective: 5000,
  profileId: 80,
};
export function validateConsultation(value: unknown): ConsultationInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid enquiry.");
  const input = value as Record<string, unknown>;
  const clean = {} as Omit<ConsultationInput, "consent">;
  for (const key of Object.keys(limits) as Array<keyof typeof limits>) {
    if (input[key] !== undefined && typeof input[key] !== "string")
      throw new Error("Invalid " + key + ".");
    const field = ((input[key] ?? "") as string).trim();
    if (field.length > limits[key]) throw new Error(key + " is too long.");
    clean[key] = field;
  }
  if (
    !clean.name ||
    !clean.organization ||
    !clean.jurisdictions ||
    clean.objective.length < 20 ||
    !/^\S+@\S+\.\S+$/.test(clean.email) ||
    input.consent !== true
  )
    throw new Error("Please complete the required fields.");
  if (clean.profileId && !profileIds.has(clean.profileId))
    throw new Error("Unknown profile.");
  if (
    ![
      "Within 1 month",
      "1–3 months",
      "3–6 months",
      "Long-term planning",
    ].includes(clean.timeframe)
  )
    throw new Error("Invalid timeframe.");
  return { ...clean, consent: true };
}
export async function saveConsultation(
  input: ConsultationInput,
  idempotencyKey?: string,
): Promise<ConsultationResult> {
  const store = new PipelineStore();
  try {
    const id = store.enqueueConsultation(input, idempotencyKey);
    return { id, saved: true, queued: true, delivered: false };
  } finally {
    store.close();
  }
}
