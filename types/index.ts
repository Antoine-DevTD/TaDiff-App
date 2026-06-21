export type ShowStatus = "En diffusion" | "Creation" | "En pause";

export type Show = {
  id: string;
  title: string;
  discipline: string;
  status: ShowStatus;
  nextDate: string;
  budget: number;
  notes: string;
};

export type Contact = {
  id: string;
  name: string;
  organization: string;
  role: string;
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
  showTitle: string;
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
