import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted">Mot de passe oublie</p>
        <h1 className="mt-2 text-2xl font-semibold">Recevoir un lien de reinitialisation</h1>
        <p className="mt-2 text-sm text-muted">
          Entrez l&apos;email de votre compte : le lien recu vous permettra de choisir un nouveau
          mot de passe.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent">
          Retour a la connexion
        </Link>
      </p>
    </Card>
  );
}
