import type { Metadata } from "next";
import "./globals.css";
import { getCurrentSession } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "RBTE Pilot — Лидер трансформации",
  description:
    "Разбор рабочих ситуаций: от исследования проблемы до проверки решения на практике.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, status } = await getCurrentSession();
  const year = new Date().getFullYear();
  return (
    <html lang="ru">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-white focus:rounded focus:shadow"
        >
          К основному содержанию
        </a>

        <header className="border-b border-[#eef0f6] bg-white/80 backdrop-blur sticky top-0 z-40">
          <div className="container-x flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-600)] text-white font-bold grid place-items-center">
                R
              </div>
              <div className="leading-tight">
                <div className="font-bold text-[0.95rem] text-[#111827]">
                  RBTE <span className="text-[#6b7280] font-medium">/ pilot</span>
                </div>
                <div className="text-[0.72rem] text-[#6b7280]">
                  Разбор рабочих ситуаций
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-5 text-sm text-[#374151]">
              <a href="/dashboard" className="hover:text-[var(--color-brand-700)]">
                Мои ситуации
              </a>
              <a href="/value-proposition" className="hover:text-[var(--color-brand-700)]">
                Предложение ценности
              </a>
              <a
                href="/situations/new"
                className="hover:text-[var(--color-brand-700)]"
              >
                + Новая ситуация
              </a>
              <a href="/help" className="hover:text-[var(--color-brand-700)]">
                Помощь и безопасность
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <span className="badge hidden sm:inline-flex">
                🔒 Закрыто по умолчанию
              </span>
              {user ? (
                <form action={logoutAction}>
                  <button type="submit" className="btn btn-ghost">Выйти</button>
                </form>
              ) : status === 'unavailable' ? (
                <a href="/auth/unavailable" className="btn btn-ghost">Проверка входа недоступна</a>
              ) : status === 'forbidden' ? (
                <a href="/auth/denied" className="btn btn-ghost">Доступ закрыт</a>
              ) : (
                <a href="/login" className="btn btn-ghost">Войти</a>
              )}
            </div>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="border-t border-[#eef0f6] mt-16">
          <div className="container-x py-6 text-xs text-[#6b7280] flex flex-wrap items-center justify-between gap-3">
            <div>
              © {year} RBTE Pilot · материалы закрыты по умолчанию ·
              Удовлетворённость ≠ доказательство переноса.
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/ARB774/DS-RBTE"
                target="_blank"
                rel="noreferrer"
              >
                DS-RBTE на GitHub
              </a>
              <a
                href="https://github.com/ARB774/PACK-adult-learning"
                target="_blank"
                rel="noreferrer"
              >
                PACK-adult-learning
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
