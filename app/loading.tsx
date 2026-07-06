export default function Loading() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Orbes fantomatiques qui derivent autour de la servante */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2">
        <span className="servante-orb servante-orb-a left-10 top-24 h-4 w-4" />
        <span className="servante-orb servante-orb-b left-32 top-28 h-6 w-6" />
        <span className="servante-orb servante-orb-c left-20 top-20 h-3 w-3" />
        <span className="servante-orb servante-orb-b left-40 top-16 h-3.5 w-3.5" />
      </div>

      {/* La servante : pied + tige + ampoule qui s'allume */}
      <div className="relative flex flex-col items-center">
        <div className="relative">
          {/* halo lumineux */}
          <span className="servante-halo absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(253,224,150,0.55),rgba(253,224,150,0)_70%)]" />
          {/* ampoule */}
          <span className="servante-bulb relative block h-5 w-5 rounded-full bg-[#ffe8a3] shadow-[0_0_22px_8px_rgba(253,224,150,0.6)]" />
        </div>
        {/* tige */}
        <span className="mt-1 h-24 w-[3px] rounded bg-foreground/50" />
        {/* pied */}
        <span className="h-[3px] w-16 rounded bg-foreground/50" />
        <span className="mt-[3px] h-[3px] w-10 rounded bg-foreground/30" />
      </div>

      <p className="mt-10 text-xs uppercase tracking-[0.24em] text-muted">Chargement</p>
    </div>
  );
}
