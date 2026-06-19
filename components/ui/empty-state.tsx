import { ButtonLink } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-panel/70 p-8 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-panel-strong text-accent">
        +
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      {actionLabel && actionHref ? (
        <ButtonLink className="mt-5" href={actionHref}>
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}
