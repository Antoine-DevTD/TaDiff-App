import { z } from "zod";

const optionalUrl = z.union([
  z.literal(""),
  z.string().url("URL invalide").refine((value) => /^https?:\/\//i.test(value), "Seules les URL HTTP et HTTPS sont acceptees"),
]);
const stringList = z.array(z.string().trim().min(1)).max(30);

export const legalInformationSchema = z.object({
  serviceName: z.string().trim().min(1).max(80),
  operatorName: z.string().trim().min(1).max(160),
  operatorLegalForm: z.string().trim().min(1).max(160),
  operatorAddress: z.string().trim().min(1).max(500),
  operatorRegistration: z.string().trim().min(1).max(240),
  operatorVat: z.string().trim().min(1).max(160),
  publicationDirector: z.string().trim().min(1).max(160),
  professionalPhone: z.string().trim().max(40),
  legalEmail: z.string().trim().email(),
  privacyEmail: z.string().trim().email(),
  supportEmail: z.string().trim().email(),
  billingEmail: z.string().trim().email(),
  betaPrice: z.string().trim().min(1).max(100),
  legalVersion: z.string().trim().min(1).max(40),
});

export const grantCatalogSchema = z.object({
  title: z.string().trim().min(2).max(240),
  funder: z.string().trim().min(2).max(180),
  territory: z.string().trim().max(160),
  discipline: z.string().trim().max(160),
  deadline: z.string().trim(),
  amountMax: z.coerce.number().min(0).max(100_000_000),
  eligibility: z.string().trim().max(4000),
  requirements: stringList,
  themes: stringList,
  sourceUrl: optionalUrl,
  active: z.boolean(),
  lastVerifiedAt: z.string().trim(),
});

export const patronageCatalogSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  programName: z.string().trim().min(2).max(240),
  themes: stringList,
  territories: stringList,
  nextDeadline: z.string().trim(),
  amountMin: z.coerce.number().min(0).max(100_000_000),
  amountMax: z.coerce.number().min(0).max(100_000_000),
  eligibility: z.string().trim().max(4000),
  sourceUrl: optionalUrl,
  notes: z.string().trim().max(4000),
  active: z.boolean(),
  lastVerifiedAt: z.string().trim(),
}).refine((value) => value.amountMax >= value.amountMin, {
  message: "Le montant maximal doit etre superieur au montant minimal.",
  path: ["amountMax"],
});

export const platformEmailTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  messageType: z.enum(["first-touch", "follow-up", "date-option"]),
  subjectTemplate: z.string().trim().min(2).max(300),
  bodyJson: z.unknown(),
  active: z.boolean(),
});

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["deepseek", "openai", "anthropic", "mistral"]),
  model: z.string().trim().min(2).max(120),
  embeddingProvider: z.enum(["openai", "supabase"]),
  embeddingModel: z.string().trim().min(2).max(120),
  ragTopK: z.coerce.number().int().min(1).max(30),
  systemPrompt: z.string().trim().min(40).max(8000),
});

export const ragDocumentSchema = z.object({
  title: z.string().trim().min(2).max(240),
  content: z.string().trim().min(20).max(100_000),
  sourceUrl: optionalUrl,
  active: z.boolean(),
});

export const aiCompanyAccessSchema = z.object({
  enabled: z.boolean(),
  monthlyQuota: z.coerce.number().int().min(0).max(100_000_000),
  bonusBalance: z.coerce.number().int().min(0).max(1_000_000_000),
});

export type AiCompanyAccessInput = z.input<typeof aiCompanyAccessSchema>;

export type LegalInformationInput = z.input<typeof legalInformationSchema>;
export type GrantCatalogInput = z.input<typeof grantCatalogSchema>;
export type PatronageCatalogInput = z.input<typeof patronageCatalogSchema>;
export type PlatformEmailTemplateInput = z.input<typeof platformEmailTemplateSchema>;
export type AiSettingsInput = z.input<typeof aiSettingsSchema>;
export type RagDocumentInput = z.input<typeof ragDocumentSchema>;
