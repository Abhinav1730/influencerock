import Link from 'next/link';
import { notFound } from 'next/navigation';
import { profiles } from '@/lib/profiles';
import { smartMeetBookingUrl, testDelegate } from '@/lib/smartmeet';
export const metadata = { title: 'Schedule a SmartMeet' };
export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const profile = params.delegate === testDelegate.id ? testDelegate : profiles.find(profile => profile.id === params.delegate);
  if (params.delegate && !profile) notFound();
  const selected = profile || testDelegate;
  return <section className="container contact-page"><div className="contact-intro">
    <div className="eyebrow">MEET INSIDE SMARTMEET</div>
    <h1>Schedule with<br /><em>{selected.name}.</em></h1>
    <p className="lead">Choose a time and meet the SmartMeet AI representative for {selected.name}. Your booking is confirmed immediately. SmartMeet emails your confirmation and meeting link immediately. Your AI representative’s separate message arrives in the next hourly email delivery.</p>
    <p>No account required. Join from your scheduled start time until one hour later. The AI avatar leads the meeting; human delegate attendance is not required.</p>
    {process.env.SMARTMEET_URL ? <Link className="button primary" href={smartMeetBookingUrl(selected.id)}>Choose a meeting time</Link> : <p>Scheduling is awaiting configuration.</p>}
    <p><Link href="/network">Return to the directory</Link></p>
  </div></section>;
}
