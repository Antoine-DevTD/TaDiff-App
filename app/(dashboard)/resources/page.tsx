import { ExternalLink } from "lucide-react";
import { ResourceLibrary } from "@/components/resources/resource-library";
import { canEditResources, listPublishedResources } from "@/lib/resources-server";
import { safeResourceLink } from "@/lib/resources";
import { getPlatformResources } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResourcesPage() {
  const [pages, canEdit, resources] = await Promise.all([listPublishedResources(), canEditResources(), getPlatformResources()]);
  const categories = [...new Set(resources.map((resource) => resource.category))];
  return (
    <div className="space-y-8">
      <ResourceLibrary resources={pages.data} error={pages.error} canEdit={canEdit} />
      {resources.length ? <div className="border-t border-border pt-7"><h2 className="text-xl font-semibold">Les sources utiles</h2><p className="mt-2 text-sm leading-6 text-muted">Des organismes et des plateformes pour administrer, produire et diffuser un spectacle.</p></div> : null}
      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <h3 className="text-lg font-semibold">{category}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resources.filter((resource) => resource.category === category).map((resource) => safeResourceLink(resource.url) ? (
              <a key={resource.id} href={safeResourceLink(resource.url)!} rel="noopener noreferrer" target="_blank" className="group h-full rounded-md border border-border bg-panel p-4 hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold text-accent">{resource.title}<span className="sr-only"> (nouvel onglet)</span></p><p className="mt-2 text-sm leading-6 text-muted">{resource.description}</p></div>
                    <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0 text-muted group-hover:text-accent" />
                  </div>
              </a>
            ) : null)}
          </div>
        </section>
      ))}
    </div>
  );
}
