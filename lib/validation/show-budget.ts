import { z } from "zod";

export const expenseBudgetCategories = [
  { value: "creation", label: "Répétitions et création" },
  { value: "artistic", label: "Équipe artistique" },
  { value: "scenography", label: "Scénographie, décors et costumes" },
  { value: "technical", label: "Technique et régie" },
  { value: "communication", label: "Diffusion et communication" },
  { value: "touring", label: "Tournée et représentations" },
  { value: "rights", label: "Droits, taxes et assurances" },
  { value: "other", label: "Autres dépenses" },
] as const;

export const revenueBudgetCategories = [
  { value: "own", label: "Apport de la compagnie" },
  { value: "coproduction", label: "Coproductions" },
  { value: "grants", label: "Subventions et aides" },
  { value: "patronage", label: "Mécénat et partenaires privés" },
  { value: "sales", label: "Préachats et cessions" },
  { value: "ticketing", label: "Billetterie" },
  { value: "other", label: "Autres entrées" },
] as const;

const budgetCategories = [
  ...expenseBudgetCategories.map((category) => category.value),
  ...revenueBudgetCategories.map((category) => category.value),
] as [string, ...string[]];

export const showBudgetItemSchema = z
  .object({
    kind: z.enum(["expense", "revenue"]),
    category: z.enum(budgetCategories),
    label: z.string().trim().min(2, "Précisez à quoi correspond ce montant.").max(120),
    amount: z.coerce.number().min(0, "Le montant doit être positif.").max(99_999_999),
    scope: z.enum(["creation", "performance"]).default("creation"),
  })
  .superRefine((value, context) => {
    const categories = value.kind === "expense" ? expenseBudgetCategories : revenueBudgetCategories;
    if (!categories.some((category) => category.value === value.category)) {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "Cette catégorie ne correspond pas au type de ligne.",
      });
    }
  });

export type ShowBudgetItemInput = z.input<typeof showBudgetItemSchema>;
export type ShowBudgetItemValues = z.infer<typeof showBudgetItemSchema>;

const boundedAmount = z.coerce.number().min(0).max(99_999_999);
const boundedPercent = z.coerce.number().min(0).max(100);

export const showBudgetPersonnelSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(2).max(100),
  group: z.enum(["plateau", "creation", "technique"]),
  active: z.boolean(),
  count: z.coerce.number().int().min(1).max(100),
  rehearsalServices: z.coerce.number().min(0).max(1000),
  rehearsalGrossRate: boundedAmount,
  performanceGrossRate: boundedAmount,
  chargeRate: z.coerce.number().min(0).max(2),
});

export const showBudgetProfileSchema = z.object({
  convention: z.string().trim().min(2).max(160),
  rateSourceUrl: z.union([z.literal(""), z.url()]),
  rateEffectiveDate: z.union([z.literal(""), z.iso.date()]),
  performancesTarget: z.coerce.number().int().min(1).max(10000),
  exploitationMode: z.enum(["cession", "revenue_share", "rental"]),
  cessionFee: boundedAmount,
  venueRental: boundedAmount,
  minimumGuarantee: boundedAmount,
  companySharePercent: boundedPercent,
  averageTicketPrice: boundedAmount,
  venueCapacity: z.coerce.number().int().min(0).max(100000),
  expectedOccupancyPercent: boundedPercent,
  rightsTerritory: z.enum(["paris", "outside_paris"]),
  authorRightsPercent: boundedPercent,
  sacdContributionPercent: boundedPercent,
  directorRightsPercent: boundedPercent,
  musicRightsPercent: boundedPercent,
  overheadPercent: boundedPercent,
  contingencyPercent: boundedPercent,
  cessionMarginPercent: boundedPercent,
  personnel: z.array(showBudgetPersonnelSchema).max(40),
});

export type ShowBudgetProfileInput = z.input<typeof showBudgetProfileSchema>;
export type ShowBudgetProfileValues = z.infer<typeof showBudgetProfileSchema>;

export function getBudgetCategoryLabel(kind: "expense" | "revenue", value: string) {
  const categories = kind === "expense" ? expenseBudgetCategories : revenueBudgetCategories;
  return categories.find((category) => category.value === value)?.label ?? "Autre";
}
