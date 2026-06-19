import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Page introuvable</h1>
      <ButtonLink href="/" className="mt-6">
        Retour accueil
      </ButtonLink>
    </main>
  );
}
