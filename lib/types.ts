export interface Profile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  gender: string;
  country: string;
  countryCode?: string;
  city: string;
  region: string;
  continent?: string;
  title: string;
  expertise: string;
  industry: string;
  seniority: string;
  languages: string[];
  bio: string;
  image: string;
  representation: string;
  portraitSource: string;
}
export type ProfileTab = "all" | "leadership" | "regional" | "network";
export interface DirectoryFilters {
  q?: string;
  country?: string;
  region?: string;
  expertise?: string;
  seniority?: string;
  industry?: string;
  tab?: ProfileTab;
}
export interface ConsultationInput {
  name: string;
  email: string;
  organization: string;
  jurisdictions: string;
  timeframe: string;
  expertise: string;
  objective: string;
  profileId: string;
  consent: boolean;
}
export interface ConsultationResult {
  id: string;
  saved: boolean;
  delivered: boolean;
  queued: boolean;
}
