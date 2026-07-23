import type { ReactNode } from "react";

export function LegalPage({ eyebrow, title, introduction, children }: {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-background px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-border pb-8">
          <p className="text-sm font-semibold text-accent">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold text-foreground sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted">{introduction}</p>
          <p className="mt-4 text-sm text-muted">Derniere mise à jour : 15 juillet 2026</p>
        </header>
        <div className="mt-10 space-y-10">{children}</div>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 md:grid-cols-[220px_1fr] md:gap-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-4 text-sm leading-7 text-muted">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export function LegalNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-accent/25 bg-accent/5 px-5 py-4 text-sm leading-6 text-foreground">
      {children}
    </div>
  );
}
