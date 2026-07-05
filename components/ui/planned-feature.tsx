import type { HTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlannedFeatureKind = "feature" | "demo-data";

const kindLabels: Record<PlannedFeatureKind, string> = {
  feature: "Fonction prevue - non branchee dans cette version",
  "demo-data": "Donnees de demonstration",
};

export function PlannedFeatureBadge({
  kind = "feature",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { kind?: PlannedFeatureKind }) {
  return (
    <Badge tone="warning" {...props}>
      {kindLabels[kind]}
    </Badge>
  );
}

export function PlannedFeatureNotice({
  className,
  detail,
  kind = "feature",
}: {
  className?: string;
  detail: string;
  kind?: PlannedFeatureKind;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted">{detail}</p>
      <PlannedFeatureBadge className="shrink-0 self-start sm:self-center" kind={kind} />
    </div>
  );
}
