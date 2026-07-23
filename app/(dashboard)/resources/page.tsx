import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getPlatformResources } from "@/lib/supabase/queries";

export default async function ResourcesPage() {
  const resources = await getPlatformResources();
  const categories = [...new Set(resources.map((resource) => resource.category))];
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Boite a outils</p>
        <h2 className="mt-2 text-3xl font-semibold">Ressources utiles</h2>
        <p className="mt-2 text-sm text-muted">Les organismes et outils de référence pour administrer, produire et diffuser un spectacle.</p>
      </div>
      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <h3 className="text-lg font-semibold">{category}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resources.filter((resource) => resource.category === category).map((resource) => (
              <a key={resource.id} href={resource.url} rel="noreferrer" target="_blank" className="group">
                <Card className="h-full p-4 transition group-hover:border-accent/45 group-hover:bg-panel-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{resource.title}</p><p className="mt-2 text-sm leading-6 text-muted">{resource.description}</p></div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted group-hover:text-accent" />
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
