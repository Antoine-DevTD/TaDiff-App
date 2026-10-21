import { PasswordResetEntry } from "@/components/forms/reusable-password-reset-form";
import { Card } from "@/components/ui/card";

export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params?.next?.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/dashboard";

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted">Nouveau mot de passe</p>
        <h1 className="mt-2 text-2xl font-semibold">Choisissez un nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-muted">
          Votre mot de passe sera remplacé lorsque vous validerez le formulaire.
        </p>
      </div>
      <PasswordResetEntry nextPath={nextPath} />
    </Card>
  );
}
