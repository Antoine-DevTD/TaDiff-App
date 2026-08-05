"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void fetch("/api/errors/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: error.message, code: error.digest, route: window.location.pathname, source: "interface" }) }); }, [error]);
  return <html lang="fr"><body><main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6"><h1 className="text-2xl font-semibold">Une erreur a interrompu cette page</h1><p className="mt-3">Elle vient d’être transmise à l’équipe TaDiff. Vous pouvez réessayer sans perdre votre compte.</p><button className="mt-6 min-h-11 rounded-md bg-blue-700 px-4 text-white" onClick={reset}>Réessayer</button></main></body></html>;
}
