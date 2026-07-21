"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSetPlatformAdminAccess } from "@/app/(dashboard)/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  type AdminAiAccount,
  type AdminPlatformAdmin,
} from "@/lib/supabase/admin";
import { platformPermissionValues, type PlatformPermission } from "@/lib/platform-permissions";

const labels: Record<PlatformPermission, string> = {
  view_companies: "Voir les compagnies",
  view_beta: "Voir les inscriptions beta",
  view_access: "Voir les acces authentifies",
  manage_feedback: "Traiter les retours",
  view_audience: "Voir l'audience publique",
  manage_legal: "Modifier les informations legales",
  manage_catalogs: "Gerer les catalogues",
  manage_email_templates: "Gerer les modeles d'emails",
  manage_ai: "Configurer William et son corpus",
};

export function PlatformAdminManager({
  accounts,
  admins,
}: {
  accounts: AdminAiAccount[];
  admins: AdminPlatformAdmin[];
}) {
  const router = useRouter();
  const candidates = useMemo(
    () => accounts.filter((account) => !account.isSuperAdmin),
    [accounts],
  );
  const [userId, setUserId] = useState(candidates[0]?.userId ?? "");
  const initial = admins.find((admin) => admin.userId === userId)?.permissions ?? [];
  const [permissions, setPermissions] = useState<PlatformPermission[]>(initial);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function selectAccount(nextUserId: string) {
    setUserId(nextUserId);
    setPermissions(admins.find((admin) => admin.userId === nextUserId)?.permissions ?? []);
    setMessage("");
  }

  function toggle(permission: PlatformPermission) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  }

  function save() {
    startTransition(async () => {
      const result = await adminSetPlatformAdminAccess(userId, permissions);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-md border border-border bg-panel p-5">
      <div>
        <h3 className="font-semibold">Administrateurs delegues</h3>
        <p className="mt-1 text-sm text-muted">
          Donnez seulement les acces utiles. La facturation, les comptes offerts, les fondateurs et la maintenance restent reserves au super-admin.
        </p>
      </div>
      {candidates.length === 0 ? (
        <p className="text-sm text-muted">Aucun compte utilisateur disponible.</p>
      ) : (
        <>
          <label className="block max-w-xl text-sm font-medium">
            Compte
            <Select className="mt-2" value={userId} onChange={(event) => selectAccount(event.target.value)}>
              {candidates.map((account) => (
                <option key={account.userId} value={account.userId}>
                  {account.fullName || account.email} - {account.companyName || "Sans compagnie"}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {platformPermissionValues.map((permission) => (
              <label key={permission} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={() => toggle(permission)}
                />
                <span>{labels[permission]}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" disabled={!userId || isPending} onClick={save}>
              Enregistrer les droits
            </Button>
            {message ? <p className="text-sm text-muted">{message}</p> : null}
          </div>
        </>
      )}
    </section>
  );
}
