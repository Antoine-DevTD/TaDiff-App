import Link from "next/link";
import { SignupForm } from "@/components/forms/signup-form";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted">Creation espace</p>
        <h1 className="mt-2 text-2xl font-semibold">Configurer une compagnie demo</h1>
      </div>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Deja un compte ?{" "}
        <Link href="/login" className="font-medium text-accent">
          Se connecter
        </Link>
      </p>
    </Card>
  );
}
