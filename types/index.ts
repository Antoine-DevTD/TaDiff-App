export type ShowStatus = "En diffusion" | "Creation" | "En pause";

export type Show = {
  id: string;
  title: string;
  discipline: string;
  status: ShowStatus;
  nextDate: string;
  budget: number;
};

export type Contact = {
  id: string;
  name: string;
  organization: string;
  role: string;
  city: string;
  status: "Prospect" | "En discussion" | "Partenaire";
};

export type PipelineDeal = {
  id: string;
  title: string;
  venue: string;
  stage: "A qualifier" | "Contacte" | "Negociation" | "Gagne";
  value: number;
};

export type Reminder = {
  id: string;
  label: string;
  dueDate: string;
  relatedTo: string;
};
