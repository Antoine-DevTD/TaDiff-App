import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Card } from "@/components/ui/card";

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
          Vous arrivez ici depuis le lien recu par email. Le nouveau mot de passe remplace
          l&apos;ancien immediatement.
        </p>
      </div>
      <ResetPasswordForm nextPath={nextPath} />
    </Card>
  );
}
