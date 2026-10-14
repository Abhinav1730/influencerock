import { timingSafeEqual } from 'node:crypto';
import { profiles } from '@/lib/profiles';
import { testDelegate } from '@/lib/smartmeet';
export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const expected = Buffer.from(process.env.SMARTMEET_BRIDGE_KEY || '');
  const supplied = Buffer.from(request.headers.get('X-SmartMeet-Bridge-Key') || '');
  const headers = { 'Cache-Control': 'no-store' };
  if (expected.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ error: 'Access denied.' }, { status: 403, headers });
  const { id } = await context.params;
  const profile = id === testDelegate.id ? testDelegate : profiles.find(profile => profile.id === id);
  if (!profile) return Response.json({ error: 'Delegate not found.' }, { status: 404, headers });
  // Generated directory identities have no mailbox unless explicitly configured.
  let mapping: Record<string, string>;
  try { mapping = JSON.parse(process.env.SMARTMEET_DELEGATE_EMAILS || '{}'); }
  catch { return Response.json({ error: 'Delegate configuration is invalid.' }, { status: 503, headers }); }
  const email = id === testDelegate.id ? process.env.SMARTMEET_TEST_DELEGATE_EMAIL : mapping[id];
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Delegate mailbox is invalid.' }, { status: 503, headers });
  return Response.json({ id: profile.id, name: profile.name, title: profile.title, email,
    bio: profile.bio, expertise: profile.expertise, country: profile.country, languages: profile.languages,
    timezone: process.env.SMARTMEET_DELEGATE_TIMEZONE || 'Asia/Kolkata',
    workingHours: { start: 9, end: 17, weekdays: [1, 2, 3, 4, 5] },
  }, { headers });
}
