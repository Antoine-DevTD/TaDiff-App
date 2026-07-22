export const feedbackKinds = ["bug", "idee", "avis"] as const;
export const feedbackStatuses = ["nouveau", "en_cours", "traite"] as const;

export type FeedbackKind = (typeof feedbackKinds)[number];
export type FeedbackFormValues = {
  kind: FeedbackKind;
  message: string;
  page?: string;
};
