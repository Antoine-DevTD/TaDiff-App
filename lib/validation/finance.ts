import { z } from "zod";

export const fixedCostSchema = z.object({
  label: z.string().min(2, "Le libelle est requis"),
  category: z.enum([
    "Assurance",
    "Banque",
    "Comptable",
    "Stockage",
    "Logiciel",
    "Local",
    "Salaire",
    "Autre",
  ]),
  amount: z.coerce.number().min(0, "Le montant doit etre positif"),
  frequency: z.enum(["Mensuel", "Trimestriel", "Annuel"]),
  nextDueDate: z.string().min(1, "La prochaine echeance est requise"),
  notes: z.string().max(600, "La note est trop longue").optional(),
});

export type FixedCostFormInput = z.input<typeof fixedCostSchema>;
export type FixedCostFormValues = z.infer<typeof fixedCostSchema>;

export const treasuryBalanceSchema = z.object({
  balance: z.coerce
    .number()
    .min(-1000000, "Le solde est trop bas")
    .max(10000000, "Le solde est trop haut"),
  note: z.string().max(300, "La note est trop longue").optional(),
});

export type TreasuryBalanceFormInput = z.input<typeof treasuryBalanceSchema>;
export type TreasuryBalanceFormValues = z.infer<typeof treasuryBalanceSchema>;
