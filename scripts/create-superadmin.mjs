import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Les variables peuvent aussi etre fournies directement par l'environnement.
  }
}

loadLocalEnv();

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Usage: npm run admin:create -- votre@email.fr");
  process.exit(1);
}

if (!url || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const password = `Aa1!${randomBytes(18).toString("base64url")}`;
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Super admin TaDiff" },
});

if (error || !data.user) {
  console.error(error?.message ?? "Compte non cree.");
  process.exit(1);
}

const { error: profileError } = await supabase.from("profiles").upsert(
  {
    id: data.user.id,
    company_id: null,
    full_name: "Super admin TaDiff",
    role: "owner",
    is_super_admin: true,
  },
  { onConflict: "id" },
);

if (profileError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error(`Profil superadmin non cree : ${profileError.message}`);
  process.exit(1);
}

console.log(`Superadmin cree : ${email}`);
console.log(`Mot de passe temporaire : ${password}`);
console.log("Connectez-vous puis remplacez immediatement ce mot de passe via Mot de passe oublie.");
