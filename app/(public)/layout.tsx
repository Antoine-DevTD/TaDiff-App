import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { ThemeApplier } from "@/components/theme/theme-applier";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <ThemeApplier />
      <Suspense fallback={null}>
        <PublicAnalyticsTracker />
      </Suspense>
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
import { Suspense } from "react";
import { PublicAnalyticsTracker } from "@/components/analytics/public-analytics-tracker";
