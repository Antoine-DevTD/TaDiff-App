const suggestionsPattern = /<questions_suivantes>\s*([\s\S]*?)\s*<\/questions_suivantes>/i;

export function getWilliamPageContext(pathname: string, tab: string | null, shows: Array<{ id: string; title: string }>) {
  const showId = pathname.match(/^\/shows\/([^/]+)/)?.[1];
  const show = shows.find((item) => item.id === showId);
  if (showId) {
    const subject = show ? `« ${show.title} »` : "ce spectacle";
    const dossier = tab === "files" || tab === "workspace";
    return {
      label: `${dossier ? "Dossier" : "Spectacle"} · ${show?.title ?? "titre à préciser"}`,
      route: `${pathname}${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`,
      questions: dossier ? [
        `Quelles pièces restent à réunir pour le dossier de ${subject} ?`,
        `Prépare une liste de vérification du dossier de ${subject}, en distinguant les informations connues et manquantes.`,
      ] : [
        `Quelle prochaine action préparer pour ${subject} ?`,
        `Propose un brouillon de présentation de ${subject} à relire avant de contacter un lieu.`,
      ],
    };
  }
  const surfaces = [
    { path: "/contacts", label: "Contacts", questions: ["Comment préparer une première relance à partir de mes contacts ?", "Quelles informations vérifier avant de contacter un lieu ?"] },
    { path: "/pipeline", label: "Diffusion", questions: ["Quelle proposition de diffusion mérite une relance ?", "Prépare un brouillon de relance en indiquant les informations à confirmer."] },
    { path: "/campaigns", label: "Emails", questions: ["Prépare un brouillon d’email que je pourrai relire avant envoi.", "Quelles informations manquent pour personnaliser ma prochaine relance ?"] },
    { path: "/finances", label: "Trésorerie", questions: ["Quelles données de trésorerie dois-je actualiser avant de prendre une décision ?", "Quels encaissements restent à confirmer dans les informations disponibles ?"] },
    { path: "/subventions", label: "Dossiers de subvention", questions: ["Quel dossier de subvention préparer en priorité ?", "Liste les pièces à vérifier avant mon prochain dépôt, sans supposer qu’elles sont prêtes."] },
    { path: "/reminders", label: "Relances et actions", questions: ["Quelle relance préparer en premier ?", "Aide-moi à préciser une prochaine action et son échéance."] },
    { path: "/shows", label: "Spectacles", questions: ["Quel spectacle a besoin d’un dossier plus complet ?", "Quelle prochaine action préparer pour mes spectacles ?"] },
    { path: "/calendar", label: "Agenda", questions: ["Quelles échéances préparer cette semaine ?", "Quelles informations confirmer avant ma prochaine représentation ?"] },
  ];
  const surface = surfaces.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return {
    label: surface?.label ?? "Compagnie",
    route: pathname,
    questions: surface?.questions ?? ["Quelles sont mes trois prochaines priorités ?", "Quelle information manque pour préparer ma prochaine relance ?"],
  };
}

export type WilliamResponseContent = {
  text: string;
  suggestedQuestions: string[];
};

export function extractWilliamResponseContent(value: string): WilliamResponseContent {
  const match = value.match(suggestionsPattern);
  if (!match) return { text: value.trim(), suggestedQuestions: [] };

  const text = value.replace(match[0], "").trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return { text: text || value.trim(), suggestedQuestions: [] };
  }

  const validQuestions = Array.isArray(parsed)
    ? parsed
      .filter((question): question is string => typeof question === "string")
      .map((question) => question.replace(/\s+/g, " ").trim())
      .filter((question) => question.length >= 3 && question.length <= 180)
    : [];
  const suggestedQuestions = [...new Set(validQuestions)].slice(0, 3);

  return {
    text: text || value.trim(),
    suggestedQuestions,
  };
}
