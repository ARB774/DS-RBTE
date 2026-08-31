import Link from "next/link";
import { seedUsersAction, loginAction } from "@/app/actions/auth";

type LoginPageProps = {
  searchParams?: Promise<{
    seed?: string | string[];
    count?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const seedStatus = Array.isArray(params.seed) ? params.seed[0] : params.seed;
  const createdCount = Array.isArray(params.count)
    ? params.count[0]
    : params.count;

  return (
    <div>
      <section className="hero">
        <div className="container-x py-14 sm:py-20">
          <div className="max-w-3xl">
            <span
              className="inline-flex items-center gap-2 px-4 py-[0.4rem] text-[0.78rem] font-bold"
              style={{
                background: "rgba(255,99,50,0.22)",
                color: "#fff",
                borderRadius: "9999px",
                border: "1px solid rgba(255,99,50,0.4)",
                fontFamily: "Manrope, Inter, sans-serif",
              }}
            >
              🚀 Пилот-версия · 2026-08-23
            </span>
            <h1
              className="mt-6 text-4xl sm:text-5xl font-extrabold leading-[1.08]"
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            >
              RBTE Pilot
              <span
                className="block mt-3 font-bold"
                style={{
                  color: "var(--orange)",
                  fontSize: "0.55em",
                  letterSpacing: "0.01em",
                }}
              >
                Лидер трансформации · adult learning LMS
              </span>
            </h1>
            <p
              className="mt-6 hero-muted text-[1.02rem] sm:text-[1.08rem] leading-relaxed max-w-2xl"
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            >
              4 независимых уровня эффекта · Закрыто по умолчанию ·
              7 шагов исследования рабочей ситуации · Без подмены выбора ИИ.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-2 px-4 py-[0.5rem] text-[0.82rem] font-bold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--ok)" }}
                />
                VPS 2ГБ RAM · PostgreSQL 16 · Next.js 15
              </div>
              <div
                className="flex items-center gap-2 px-4 py-[0.5rem] text-[0.82rem] font-bold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                🔐 FPF · PACK-adult-learning · Pack-TOC
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x -mt-10 sm:-mt-14 pb-20">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
          <div className="card p-7 sm:p-8 card-hover">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="badge badge-orange">Демо-доступ</span>
                <h2
                  className="mt-3 text-2xl sm:text-[1.7rem] font-extrabold"
                  style={{ fontFamily: "Manrope, Inter, sans-serif" }}
                >
                  Вход в рабочую среду
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--text)" }}>
                  5 тестовых ролей. При первом запуске — создайте пользователей
                  кнопкой Seed.
                </p>
              </div>
              <div
                className="hidden sm:grid w-14 h-14 place-items-center rounded-2xl text-2xl"
                style={{
                  background: "var(--orange-50)",
                  color: "var(--orange-dark)",
                }}
              >
                👋
              </div>
            </div>

            {seedStatus && (
              <div
                className="mt-7 rounded-2xl border-2 p-4 text-sm font-semibold"
                role="status"
                style={{
                  background:
                    seedStatus === "error" ? "#fff1ee" : "#edf9f1",
                  borderColor:
                    seedStatus === "error" ? "#ffb4a1" : "#a9dfba",
                  color: seedStatus === "error" ? "#9b2c12" : "#176334",
                }}
              >
                {seedStatus === "created" &&
                  `Готово: создано пользователей — ${createdCount ?? "5"}. Теперь можно войти.`}
                {seedStatus === "exists" &&
                  "Пять тестовых пользователей уже существуют. Можно войти."}
                {seedStatus === "error" &&
                  "Не удалось создать пользователей. Ошибка записана в журнал сервера."}
              </div>
            )}

            <form
              action={loginAction as any}
              className={seedStatus ? "mt-5 space-y-4" : "mt-7 space-y-4"}
            >
              <div className="field">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="participant@rbte.pro"
                  defaultValue="participant@rbte.pro"
                />
                <span className="hint">
                  Используй демо-аккаунт для первой пробы.
                </span>
              </div>
              <div className="field">
                <label>Пароль</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  defaultValue="rbte1234"
                />
                <span className="hint">Демо-пароль для всех ролей: rbte1234</span>
              </div>
              <button
                className="btn btn-primary w-full"
                type="submit"
                style={{
                  padding: "0.9rem 1.5rem",
                  fontSize: "0.98rem",
                  fontFamily: "Manrope, Inter, sans-serif",
                }}
              >
                Войти в RBTE →
              </button>
            </form>

            <div className="divider my-6" />

            <form action={seedUsersAction as any}>
              <button
                className="btn w-full"
                type="submit"
                style={{
                  background: "var(--navy-50)",
                  color: "var(--navy)",
                  border: "2px solid var(--border-soft)",
                  fontFamily: "Manrope, Inter, sans-serif",
                }}
              >
                🌱 Seed: создать 5 тестовых пользователей
              </button>
              <p
                className="mt-3 text-center text-[0.75rem]"
                style={{ color: "var(--text)" }}
              >
                Запусти один раз после первого деплоя.
              </p>
            </form>
          </div>

          <div className="space-y-5">
            <div className="card p-7" style={{ background: "#fff" }}>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 grid place-items-center rounded-2xl text-lg"
                  style={{
                    background: "var(--navy)",
                    color: "#fff",
                  }}
                >
                  🛡️
                </div>
                <div>
                  <div
                    className="text-[1.05rem] font-extrabold"
                    style={{
                      fontFamily: "Manrope, Inter, sans-serif",
                      color: "var(--navy)",
                    }}
                  >
                    5 ролей RBTE
                  </div>
                  <div className="text-xs" style={{ color: "var(--text)" }}>
                    Раздельные права, закрытость по умолчанию.
                  </div>
                </div>
              </div>

              <ul className="space-y-3">
                {[
                  {
                    name: "Участник",
                    email: "participant@rbte.pro",
                    desc: "Создаёт закрытые ситуации, проходит 7 шагов.",
                    icon: "🧑‍💼",
                  },
                  {
                    name: "Ведущий",
                    email: "facilitator@rbte.pro",
                    desc: "Видит предъявленные редакции, критериальная ОС.",
                    icon: "🎯",
                  },
                  {
                    name: "Наставник",
                    email: "mentor@rbte.pro",
                    desc: "Функции ведущего в учебном сопровождении.",
                    icon: "🧭",
                  },
                  {
                    name: "Поддерживающее",
                    email: "supporter@rbte.pro",
                    desc: "Только раскрытый план/результат пробы.",
                    icon: "🤝",
                  },
                  {
                    name: "Администратор",
                    email: "admin@rbte.pro",
                    desc: "Приглашения, роли, техсобытия. Закрытые — только по основанию.",
                    icon: "⚙️",
                  },
                ].map((r) => (
                  <li
                    key={r.email}
                    className="flex items-start gap-3 p-3 rounded-xl transition duration-150 hover:bg-[var(--navy-50)] hover:border-[var(--orange)]"
                    style={{
                      background: "var(--bg)",
                      border: "2px solid var(--border-soft)",
                    }}
                  >
                    <div
                      className="w-9 h-9 grid place-items-center rounded-xl text-base shrink-0"
                      style={{
                        background: "#fff",
                        border: "2px solid var(--border-soft)",
                      }}
                    >
                      {r.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-extrabold text-[0.9rem]"
                          style={{
                            fontFamily: "Manrope, Inter, sans-serif",
                            color: "var(--text-strong)",
                          }}
                        >
                          {r.name}
                        </span>
                        <span className="tag">{r.email}</span>
                      </div>
                      <p
                        className="mt-1 text-[0.8rem] leading-relaxed"
                        style={{ color: "var(--text)" }}
                      >
                        {r.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="card p-6"
              style={{
                background:
                  "linear-gradient(135deg, var(--navy) 0%, #2c3f6c 100%)",
                color: "#fff",
                border: "none",
              }}
            >
              <div
                className="text-[0.8rem] font-extrabold mb-3"
                style={{
                  fontFamily: "Manrope, Inter, sans-serif",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                ⚠️ Гарантии платформы
              </div>
              <ul
                className="text-[0.85rem] space-y-2 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                <li>✓ Закрытость по умолчанию до твоего решения</li>
                <li>✓ 4 уровня эффекта: прохождение → освоение → перенос → факт</li>
                <li>✓ ИИ — только вопрос, выбор всегда за тобой</li>
                <li>✓ Пак-редакции фиксируются по началу итерации</li>
              </ul>
              <Link
                href="/"
                className="btn mt-5 w-full justify-center"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontFamily: "Manrope, Inter, sans-serif",
                }}
              >
                ← На главную
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
