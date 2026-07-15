import Link from "next/link";
import { TadiffMark } from "@/components/brand/tadiff-mark";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <TadiffMark className="h-8 w-8" />
          TaDiff
        </Link>
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Demo privee</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold">
            Un espace unique pour piloter les dates et la production.
          </h1>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </section>
    </main>
  );
}
