export type ShowStatus = "En diffusion" | "Creation" | "En pause";

export type CompanyDocument = {
  id: string;
  title: string;
  docType: string;
  storagePath: string;
  fileUrl: string;
  note: string;
  createdAt: string;
};

export type CalendarEventKind = "event" | "deadline" | "show";

export type CalendarEvent = {
  id: string;
  title: string;
  eventDate: string;
  kind: CalendarEventKind;
  relatedShowId: string | null;
  note: string;
};

export type CompanyRoleValue = "owner" | "admin" | "member" | "readonly";

export type CompanyMember = {
  id: string;
  fullName: string;
  role: CompanyRoleValue;
  email: string;
  isSelf: boolean;
};

export type CompanyProfile = {
  id: string;
  name: string;
  city: string;
  discipline: string;
  email: string;
  phone: string;
  website: string;
  siret: string;
  licenseNumber: string;
  logoUrl: string;
  description: string;
};

export type Show = {
  id: string;
  title: string;
  discipline: string;
  status: ShowStatus;
  nextDate: string;
  budget: number;
  detailedBudgetEnabled?: boolean;
  notes: string;
  posterUrl?: string;
  costProfile?: CostProfile;
};

export type ShowBudgetItem = {
  id: string;
  showId: string;
  kind: "expense" | "revenue";
  category: string;
  label: string;
  amount: number;
  sortOrder: number;
};

export type ShowDocumentType =
  | "Affiche"
  | "Dossier artistique"
  | "Note d'intention"
  | "Synopsis"
  | "Texte"
  | "Budget"
  | "Fiche technique"
  | "RIB"
  | "Statuts"
  | "Devis";

export type ShowDocumentStatus = "Manquant" | "A mettre a jour" | "Pret";

export type ShowDocument = {
  id: string;
  showId: string;
  title: string;
  documentType: ShowDocumentType;
  status: ShowDocumentStatus;
  fileUrl: string;
  storagePath?: string;
  notes: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  name: string;
  organization: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  status: "Prospect" | "En discussion" | "Partenaire";
  tags: string[];
};

export type PipelineStage =
  | "A qualifier"
  | "Contacte"
  | "Relance prevue"
  | "Negociation"
  | "Confirme"
  | "Perdu";

export type PipelineDeal = {
  id: string;
  title: string;
  contactId: string;
  showId: string;
  venue: string;
  stage: PipelineStage;
  value: number;
  probability: number;
  performanceDate: string;
  nextAction: string;
  nextFollowUpAt: string;
  lostReason: string;
  contactName: string;
  contactOrganization: string;
  contactEmail?: string;
  showTitle: string;
  createdAt: string;
  commercialPackId?: string;
  quoteId?: string;
  invitations?: PerformanceInvitation[];
};

export type PerformanceInvitation = {
  id: string;
  performanceOpportunityId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  performanceDate: string;
  venue: string;
  sentAt: string;
  deliveredAt: string;
  emailOpenedAt: string;
  emailClickedAt: string;
  bouncedAt: string;
  linkOpenedAt: string;
  respondedAt: string;
  response: "yes" | "no" | null;
  createdAt: string;
};

export type Reminder = {
  id: string;
  label: string;
  dueDate: string;
  relatedTo: string;
  done: boolean;
  priority: "low" | "normal" | "high";
};

export type CostProfile = {
  artistFees: number;
  technicalFees: number;
  rights: number;
  production: number;
  transportPerKm: number;
  hotelPerNight: number;
  socialChargesRate: number;
  tourCommissionRate: number;
};

export type ProfitabilityInput = {
  salePrice: number;
  performanceCount: number;
  distanceKm: number;
  hotelNights: number;
  workshopRevenue: number;
  subsidyRevenue: number;
  strategicTags: string[];
  costProfile: CostProfile;
};

export type ProfitabilityVerdict =
  | "rentable"
  | "equilibre"
  | "strategique"
  | "deficitaire";

export type ProfitabilityResult = {
  breakEven: number;
  commissionCost: number;
  fixedCost: number;
  grossRevenue: number;
  margin: number;
  marginRate: number;
  totalCost: number;
  verdict: ProfitabilityVerdict;
  suggestions: string[];
};

export type CommercialPack = {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  includes: string[];
  recommendedFor: string;
};

export type GrantStatus = "A surveiller" | "En montage" | "Depose" | "Attribue";

export type GrantOpportunity = {
  id: string;
  title: string;
  funder: string;
  territory: string;
  discipline: string;
  deadline: string;
  amount: number;
  status: GrantStatus;
  relatedShowId?: string;
  requirements?: ShowDocumentType[];
  eligibility?: string;
  sourceUrl?: string;
  themes?: string[];
};

export type PatronageStatus = "Prospect" | "Argumentaire" | "Negociation" | "Signe";

export type PatronageDeal = {
  id: string;
  companyName: string;
  contactName: string;
  amount: number;
  status: PatronageStatus;
  nextAction: string;
  nextFollowUpAt: string;
  packId: string;
};

export type EmailCampaignStatus = "Brouillon" | "Prete" | "Envoyee";

export type EmailCampaign = {
  id: string;
  name: string;
  template: string;
  audience: string;
  status: EmailCampaignStatus;
  sentCount: number;
  openRate: number;
  nextSendAt: string;
};

export type BillingPlan = {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  current?: boolean;
};

export type BetaSignupStatus = "reserved" | "waitlist";

export type BetaSignup = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  discipline: string;
  mainNeed: string;
  status: BetaSignupStatus;
  position: number;
  createdAt: string;
};

export type QuoteStatus = "A preparer" | "Envoye" | "Acompte attendu" | "Solde attendu" | "Archive";

export type QuoteItem = {
  id: string;
  number: string;
  dealId: string;
  title: string;
  organization: string;
  amount: number;
  depositDue: number;
  balanceDue: number;
  status: QuoteStatus;
  dueDate: string;
};

export type FixedCostFrequency = "Mensuel" | "Trimestriel" | "Annuel";

export type FixedCostCategory =
  | "Assurance"
  | "Banque"
  | "Comptable"
  | "Stockage"
  | "Logiciel"
  | "Local"
  | "Salaire"
  | "Autre";

export type FixedCost = {
  id: string;
  label: string;
  category: FixedCostCategory;
  amount: number;
  frequency: FixedCostFrequency;
  nextDueDate: string;
  notes: string;
};

export type TreasurySnapshot = {
  id: string;
  balance: number;
  recordedOn: string;
  note: string;
};

export type ActivityEntry = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityLabel: string;
  createdAt: string;
};
