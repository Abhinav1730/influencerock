export type Capability = {
  title: string;
  intro: string;
  description: string;
  outcomes: [string, string, string];
  image: string;
};

export const capabilities: Capability[] = [
  {
    title: "Strategic Access",
    intro: "Open the right doors. Build the right relationships.",
    description: "We identify the institutions and stakeholders relevant to your objective, then develop credible pathways for purposeful engagement.",
    outcomes: ["Relevant conversations", "Thoughtful stakeholder engagement", "Clearer pathways forward"],
    image: "/images/civic-building.png",
  },
  {
    title: "Government & Public Affairs",
    intro: "Understand the institutions shaping your future.",
    description: "We map government and policy environments, monitor change, and help clients engage through lawful and transparent channels.",
    outcomes: ["Institutional mapping", "Policy perspective", "Responsible engagement"],
    image: "/images/civic-building.png",
  },
  {
    title: "Global Market Entry",
    intro: "Know the landscape before you enter it.",
    description: "We bring local context to market decisions, including institutions, commercial networks, potential partners, and practical constraints.",
    outcomes: ["Local market context", "Partner identification", "Better prepared decisions"],
    image: "/images/hero-rio.png",
  },
  {
    title: "Strategic Introductions",
    intro: "Make every connection purposeful.",
    description: "When appropriate, we facilitate carefully considered introductions based on relevance, credibility, and a clear strategic purpose.",
    outcomes: ["Relevant introductions", "Careful preparation", "Credible dialogue"],
    image: "/images/consultation-lake.png",
  },
  {
    title: "Political & Institutional Intelligence",
    intro: "See change before it becomes a constraint.",
    description: "We turn political, regulatory, and institutional developments into a clear view of what may matter for your objective.",
    outcomes: ["Early perspective", "Risk awareness", "Informed timing"],
    image: "/images/civic-building.png",
  },
  {
    title: "Sensitive Situations",
    intro: "Navigate complexity with discretion.",
    description: "We help clients understand sensitive environments, coordinate appropriate communication, and protect long-term interests.",
    outcomes: ["Confidential assessment", "Stakeholder clarity", "Measured response"],
    image: "/images/consultation-lake.png",
  },
];

export const method = [
  { title: "Understand", description: "Define the objective, constraints, jurisdictions, and measures of success." },
  { title: "Map", description: "Identify the institutions, stakeholders, dynamics, and risks that matter." },
  { title: "Strategize", description: "Choose a purposeful sequence of relationships and channels." },
  { title: "Connect", description: "Facilitate appropriate conversations and engagement." },
  { title: "Navigate", description: "Monitor change and adapt the approach as circumstances evolve." },
];

export type Scenario = {
  title: string;
  challenge: string;
  approach: string;
  considerations: string[];
  image: string;
};

export const scenarios: Scenario[] = [
  {
    title: "Clean-energy manufacturer entering a new market",
    challenge: "A manufacturer is assessing an unfamiliar market with regulatory uncertainty and stakeholders across government, industry, and local communities.",
    approach: "Map the landscape, identify relevant institutions and potential partners, and prepare a coordinated engagement strategy.",
    considerations: ["Regulatory uncertainty", "Local partnerships", "Community impact"],
    image: "/images/wind-coast.png",
  },
  {
    title: "Institutional investor assessing a new region",
    challenge: "An investor needs a grounded view of institutional priorities, commercial partners, and policy direction before allocating capital.",
    approach: "Combine local intelligence with stakeholder mapping and carefully considered introductions.",
    considerations: ["Political and policy context", "Partner credibility", "Long-term outlook"],
    image: "/images/civic-building.png",
  },
  {
    title: "Multinational navigating a policy shift",
    challenge: "A proposed rule could affect operations in several jurisdictions, each with its own institutions and timetable.",
    approach: "Monitor developments, explain likely implications, and plan lawful, transparent engagement with relevant stakeholders.",
    considerations: ["Cross-border coordination", "Timing and sequence", "Reputational care"],
    image: "/images/consultation-lake.png",
  },
];

export type NetworkEntry = {
  region: string;
  country: string;
  expertise: string;
  industry: string;
  objective: string;
  detail: string;
};

export const networkEntries: NetworkEntry[] = [
  { region: "Americas", country: "Brazil", expertise: "Market Entry", industry: "Energy", objective: "Expansion", detail: "Market context, stakeholder mapping, and local partnerships across Latin America." },
  { region: "Americas", country: "United States", expertise: "Public Affairs", industry: "Finance", objective: "Policy", detail: "Institutional analysis and policy monitoring for complex investment decisions." },
  { region: "Europe", country: "Switzerland", expertise: "Strategic Access", industry: "Finance", objective: "Partnerships", detail: "Cross-border relationships and strategic introductions from a European base." },
  { region: "Europe", country: "Belgium", expertise: "Public Affairs", industry: "Technology", objective: "Policy", detail: "EU institutional mapping and transparent public-affairs engagement." },
  { region: "Middle East", country: "United Arab Emirates", expertise: "Market Entry", industry: "Infrastructure", objective: "Expansion", detail: "Regional market context and relationship strategy for major projects." },
  { region: "Africa", country: "Ghana", expertise: "Strategic Access", industry: "Infrastructure", objective: "Partnerships", detail: "Local stakeholder landscape and responsible partnership pathways." },
  { region: "Asia-Pacific", country: "Singapore", expertise: "Institutional Intelligence", industry: "Technology", objective: "Risk", detail: "Policy and institutional perspective across Southeast Asian markets." },
  { region: "Central Asia & Eurasia", country: "Kazakhstan", expertise: "Institutional Intelligence", industry: "Energy", objective: "Risk", detail: "Political and commercial context for complex cross-border objectives." },
];
