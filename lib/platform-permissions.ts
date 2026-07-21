export const platformPermissionValues = [
  "view_companies", "view_beta", "view_access", "manage_feedback",
  "view_audience", "manage_legal", "manage_catalogs",
  "manage_email_templates", "manage_ai",
] as const;

export type PlatformPermission = (typeof platformPermissionValues)[number];
