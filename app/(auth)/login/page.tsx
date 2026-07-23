import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted">Connexion</p>
        <h1 className="mt-2 text-2xl font-semibold">Retour dans votre espace</h1>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/beta" className="font-medium text-accent">
          Rejoindre la bêta
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        <Link href="/forgot-password" className="font-medium text-accent">
          Mot de passe oublie ?
        </Link>
      </p>
    </Card>
  );
}
