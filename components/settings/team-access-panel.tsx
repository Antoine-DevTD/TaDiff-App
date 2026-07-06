"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  joinCompanyByCode,
  regenerateInviteCode,
  setMemberRole,
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CompanyMember } from "@/types";

const roleOptions: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Membre" },
  { value: "readonly", label: "Lecture seule" },
];

function roleLabel(role: string) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

export function TeamAccessPanel({
  members,
  inviteCode,
  canManage,
}: {
  members: CompanyMember[];
  inviteCode: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = useState(inviteCode ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  function onRoleChange(userId: string, role: string) {
    startTransition(async () => {
      const result = await setMemberRole(userId, role);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  }

  function onCopy() {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onRegenerate() {
    startTransition(async () => {
      const result = await regenerateInviteCode();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok && result.code) setCode(result.code);
    });
  }

  function onJoin() {
    if (!joinCode.trim()) return;
    startTransition(async () => {
      const result = await joinCompanyByCode(joinCode.trim());
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setJoinCode("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong/35 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {member.fullName}
                {member.isSelf ? " (vous)" : ""}
              </p>
              <p className="truncate text-xs text-muted">{member.email}</p>
            </div>
            {canManage ? (
              <Select
                className="w-40"
                value={member.role}
                disabled={isPending}
                onChange={(event) => onRoleChange(member.id, event.target.value)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Badge tone={member.role === "readonly" ? "warning" : "info"}>
                {roleLabel(member.role)}
              </Badge>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
        <p className="text-sm font-semibold">Inviter un membre</p>
        <p className="mt-1 text-xs text-muted">
          Partagez ce code : la personne crée son compte puis le saisit ci-dessous pour rejoindre
          la compagnie.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md border border-border bg-panel px-3 py-2 text-sm font-semibold tracking-widest">
            {code || "—"}
          </code>
          <Button type="button" variant="secondary" onClick={onCopy} disabled={!code}>
            {copied ? "Copié !" : "Copier"}
          </Button>
          {canManage ? (
            <Button type="button" variant="ghost" onClick={onRegenerate} disabled={isPending}>
              Regenerer
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel-strong/35 p-4">
        <p className="text-sm font-semibold">Rejoindre une autre compagnie</p>
        <p className="mt-1 text-xs text-muted">
          Saisissez un code d&apos;invitation pour rejoindre une compagnie existante.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            className="w-44"
            placeholder="Code d'invitation"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
          />
          <Button type="button" variant="secondary" onClick={onJoin} disabled={isPending}>
            Rejoindre
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={
            message.ok
              ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
