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

export function getBudgetCategoryLabel(kind: "expense" | "revenue", value: string) {
  const categories = kind === "expense" ? expenseBudgetCategories : revenueBudgetCategories;
  return categories.find((category) => category.value === value)?.label ?? "Autre";
}
