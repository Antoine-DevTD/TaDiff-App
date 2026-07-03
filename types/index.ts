export type ShowStatus = "En diffusion" | "Creation" | "En pause";

export type Show = {
  id: string;
  title: string;
  discipline: string;
  status: ShowStatus;
  nextDate: string;
  budget: number;
  notes: string;
  posterUrl?: string;
  costProfile?: CostProfile;
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
  notes: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  name: string;
  organization: string;
  role: string;
  email: string;
  city: string;
  status: "Prospect" | "En discussion" | "Partenaire";
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
