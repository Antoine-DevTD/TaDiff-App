import {
  CalendarDays,
  CircleHelp,
  Clapperboard,
  FolderOpen,
  Gauge,
  HeartHandshake,
  Landmark,
  ListChecks,
  Megaphone,
  ReceiptText,
  Route,
  ScrollText,
  Settings,
  UsersRound,
  WalletCards,
} from "lucide-react";

function resolveIconHref(href: string | null | undefined) {
  if (!href) return "";

  const iconHrefs = [
    "/subventions",
    "/campaigns",
    "/contracts",
    "/documents",
    "/calendar",
    "/contacts",
    "/finances",
    "/mecenat",
    "/pipeline",
    "/reminders",
    "/settings",
    "/billing",
    "/shows",
    "/dashboard",
  ];

  return iconHrefs.find((itemHref) => href === itemHref || (itemHref !== "/dashboard" && href.startsWith(itemHref)));
}

export function DashboardNavIcon({
  className,
  href,
  strokeWidth = 1.9,
}: {
  className?: string;
  href: string | null | undefined;
  strokeWidth?: number;
}) {
  const iconHref = resolveIconHref(href);
  const props = { "aria-hidden": true, className, strokeWidth } as const;

  switch (iconHref) {
    case "/billing":
      return <ReceiptText {...props} />;
    case "/calendar":
      return <CalendarDays {...props} />;
    case "/campaigns":
      return <Megaphone {...props} />;
    case "/contacts":
      return <UsersRound {...props} />;
    case "/contracts":
      return <ScrollText {...props} />;
    case "/dashboard":
      return <Gauge {...props} />;
    case "/documents":
      return <FolderOpen {...props} />;
    case "/finances":
      return <WalletCards {...props} />;
    case "/mecenat":
      return <HeartHandshake {...props} />;
    case "/pipeline":
      return <Route {...props} />;
    case "/reminders":
      return <ListChecks {...props} />;
    case "/settings":
      return <Settings {...props} />;
    case "/shows":
      return <Clapperboard {...props} />;
    case "/subventions":
      return <Landmark {...props} />;
    default:
      return <CircleHelp {...props} />;
  }
}
