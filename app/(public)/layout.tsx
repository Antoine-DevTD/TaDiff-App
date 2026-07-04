import { PublicHeader } from "@/components/layout/public-header";
import { TheatreThemeSwitcher } from "@/components/theme/theatre-theme-switcher";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <TheatreThemeSwitcher />
      {children}
    </div>
  );
}
