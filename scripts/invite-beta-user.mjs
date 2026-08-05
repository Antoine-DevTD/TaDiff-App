import { createClient } from "@supabase/supabase-js";

const [emailInput, fullNameInput = "", companyNameInput = ""] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
const fullName = fullNameInput.trim();
const companyName = companyNameInput.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()
  || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://tadiff.com").replace(/\/$/, "");

if (!email || !email.includes("@")) {
  console.error('Usage : npm run beta:invite -- "email@compagnie.fr" "Prenom Nom" "Nom de la compagnie"');
  process.exit(1);
}

if (!supabaseUrl || !secretKey) {
  console.error("Variables requises : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password?next=/welcome")}`;
const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  data: {
    company_name: companyName,
    full_name: fullName,
  },
  redirectTo,
});

if (error) {
  console.error(`Invitation non envoyee : ${error.message}`);
  process.exit(1);
}

console.log(`Invitation envoyee a ${email}. Utilisateur Supabase : ${data.user.id}`);
