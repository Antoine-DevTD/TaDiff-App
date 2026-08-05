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

export const treasuryMovementSchema = z.object({
  label: z.string().trim().min(2, "Le libellé est requis").max(160),
  direction: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Le montant doit être positif").max(10_000_000),
  movementDate: z.iso.date(),
  reliability: z.enum(["secured", "probable", "uncertain"]),
  status: z.enum(["planned", "paid"]),
  showId: z.union([z.literal(""), z.uuid()]).optional(),
  notes: z.string().max(1000).optional(),
});

export type TreasuryMovementInput = z.input<typeof treasuryMovementSchema>;

export const treasurySetupSchema = z.object({
  balance: treasuryBalanceSchema.shape.balance,
  fixedCosts: z.array(fixedCostSchema).max(12, "Trop de frais fixes renseignes").default([]),
});

export type TreasurySetupInput = z.input<typeof treasurySetupSchema>;
export type TreasurySetupValues = z.infer<typeof treasurySetupSchema>;
