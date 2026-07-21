import { paragraph } from "@/lib/email-template-variables";
import type { Json } from "@/types/database.types";
import type { ContactEmailTemplate } from "@/lib/email-templates";

export type BuiltInEmailTemplate = {
  id: string;
  name: string;
  messageType: ContactEmailTemplate;
  subjectTemplate: string;
  bodyJson: Json;
};

const bold = [{ type: "bold" }];

export const builtInEmailTemplates: BuiltInEmailTemplate[] = [
  {
    id: "builtin-first-touch",
    name: "Premiere rencontre",
    messageType: "first-touch",
    subjectTemplate: "@titre_spectacle - proposition pour @structure",
    bodyJson: {
      type: "doc",
      content: [
        paragraph("Bonjour @prenom_contact,"),
        paragraph("Je me permets de vous contacter pour vous presenter @titre_spectacle."),
        paragraph("@logline", bold),
        paragraph("@synopsis"),
        paragraph("Le spectacle explore @thematiques."),
        paragraph("Il a ete pense pour @public."),
        paragraph("Je serais heureux d'echanger avec vous pour voir comment ce projet pourrait trouver sa place au sein de @structure."),
        paragraph("Bien a vous,"),
      ],
    },
  },
  {
    id: "builtin-follow-up",
    name: "Relance",
    messageType: "follow-up",
    subjectTemplate: "Suite a notre echange - @titre_spectacle",
    bodyJson: {
      type: "doc",
      content: [
        paragraph("Bonjour @prenom_contact,"),
        paragraph("Je me permets de revenir vers vous au sujet de @titre_spectacle."),
        paragraph("@logline", bold),
        paragraph("@synopsis"),
        paragraph("Avez-vous eu l'occasion de regarder les elements transmis ? Je reste disponible pour preciser la forme, les conditions d'accueil ou les prochaines disponibilites."),
        paragraph("Bien a vous,"),
      ],
    },
  },
  {
    id: "builtin-date-option",
    name: "Invitation a une representation",
    messageType: "date-option",
    subjectTemplate: "Invitation - @titre_spectacle",
    bodyJson: {
      type: "doc",
      content: [
        paragraph("Bonjour @prenom_contact,"),
        paragraph("Je souhaitais vous inviter a decouvrir @titre_spectacle lors de notre prochaine representation."),
        paragraph("Prochaine date : @prochaine_date", bold),
        paragraph("@logline"),
        paragraph("Cette rencontre pourrait etre l'occasion d'echanger simplement sur le spectacle et les possibilites d'accueil au sein de @structure."),
        paragraph("Bien a vous,"),
      ],
    },
  },
];
