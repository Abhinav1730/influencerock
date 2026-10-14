import type { Profile } from './types';

export const testDelegate: Profile = {
  id: 'test-abhinav-saxena', name: 'Abhinav Saxena', firstName: 'Abhinav', lastName: 'Saxena',
  gender: 'Male', country: 'India', countryCode: 'IN', city: 'Online', region: 'Asia-Pacific', continent: 'Asia',
  title: 'AI representative · SmartMeet test profile', expertise: 'SmartMeet meetings', industry: 'Technology',
  seniority: 'Country Network', languages: ['English'],
  bio: 'Abhinav Saxena is the test delegate for the Influence Rock and SmartMeet scheduling flow. Choose a meeting time, receive confirmation by email, and meet the SmartMeet AI representative inside SmartMeet.',
  image: '/assets/portraits/abhinav-saxena.svg', representation: 'digital', portraitSource: 'initials',
};
export function smartMeetBookingUrl(delegateId: string): string {
  const configured = process.env.SMARTMEET_URL;
  if (!configured) return `/schedule?delegate=${encodeURIComponent(delegateId)}`;
  return `${configured.replace(/\/$/, '')}/book?delegate=${encodeURIComponent(delegateId)}&source=influence-rock`;
}
