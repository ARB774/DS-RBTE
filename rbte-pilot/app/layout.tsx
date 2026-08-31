import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const siteUrl = "https://pilot.rbte.pro";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RBTE Pilot — рабочая среда мышления",
    template: "%s · RBTE Pilot",
  },
  description:
    "Среда взрослого обучения: от реальной рабочей ситуации к проверяемой пробе, результату и следующей итерации.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName: "RBTE Pilot",
    title: "RBTE Pilot",
    description: "От рабочей ситуации к проверяемой пробе.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "RBTE Pilot — маршрут от ситуации к рабочей пробе" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RBTE Pilot",
    description: "От рабочей ситуации к проверяемой пробе.",
    images: ["/og.png"],
  },
};

const navigation = [
  { href: "/dashboard", label: "Мои ситуации" },
  { href: "/situations/new", label: "Новая ситуация", accent: true },
  { href: "/help", label: "Помощь и безопасность" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only rounded-lg bg-[var(--orange)] px-4 py-2 font-semibold text-white shadow-lg"
        >
          К основному содержанию
        </a>

        <header className="app-header">
          <div className="container-x flex min-h-[4.5rem] items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="RBTE Pilot — на главную">
              <span className="brand-mark" aria-hidden="true">R</span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[0.94rem] font-extrabold tracking-[-0.02em] text-[var(--text-strong)]">
                  RBTE <span className="font-medium text-[var(--text)]">pilot</span>
                </span>
                <span className="hidden text-[0.66rem] font-medium text-[var(--text)] sm:block">
                  рабочая среда взрослого обучения
                </span>
              </span>
            </Link>

            <nav className="desktop-nav flex items-center gap-6" aria-label="Основная навигация">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-nav-link ${item.accent ? "app-nav-link-accent" : ""}`}
                >
                  {item.accent ? "+ " : ""}{item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <span className="hidden badge badge-ok lg:inline-flex">Закрыто по умолчанию</span>
              <Link href="/login" className="btn btn-navy !min-h-[2.35rem] !px-4 !py-2">
                Войти
              </Link>
            </div>
          </div>

          <nav className="mobile-nav container-x items-center gap-5 py-2.5" aria-label="Мобильная навигация">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav-link ${item.accent ? "app-nav-link-accent" : ""}`}
              >
                {item.accent ? "+ " : ""}{item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main id="main" className="min-h-[calc(100vh-15rem)]">{children}</main>

        <footer className="mt-20 border-t border-[var(--border-soft)] bg-[rgba(250,249,245,0.7)]">
          <div className="container-x grid gap-6 py-8 text-xs text-[var(--text)] md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="mb-2 font-extrabold text-[var(--text-strong)]">RBTE Pilot</div>
              <p className="max-w-xl leading-relaxed">
                Материалы закрыты по умолчанию. ИИ помогает исследовать ситуацию, но решение и ответственность остаются у участника.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
              <Link href="/help" className="font-semibold hover:text-[var(--orange-dark)]">Правила и безопасность</Link>
              <span>© {year} RBTE</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
