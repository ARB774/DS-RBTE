import Link from "next/link";
import { listMySituationsAction } from "@/app/actions/situations";
import { logoutAction } from "@/app/actions/auth";
import { roleLabels, profileLabels, nowIso } from "@/lib/rbte";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const me = await requireUser();
  const rows = await listMySituationsAction();

  return (
    <div className="container-x py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="hidden sm:grid w-14 h-14 place-items-center rounded-2xl text-2xl shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--navy) 0%, #2c3f6c 100%)",
              boxShadow: "0 6px 18px rgba(34,50,88,0.22)",
            }}
          >
            👋
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge badge-orange">
                {roleLabels[me.role]}
              </span>
              <span className="badge">{me.email}</span>
            </div>
            <h1
              className="text-2xl sm:text-[1.8rem] font-extrabold"
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            >
              Мои ситуации
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text)", fontFamily: "Manrope, Inter, sans-serif" }}
            >
              Закрыто по умолчанию. Для раскрытия — отдельное явное действие на шаге 4.7.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/situations/new" className="btn btn-primary"
            style={{
              fontFamily: "Manrope, Inter, sans-serif",
              padding: "0.75rem 1.35rem",
              fontSize: "0.92rem",
            }}
          >
            + Новая ситуация
          </Link>
          <form action={logoutAction} className="flex">
            <button
              className="btn btn-ghost"
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            >
              Выйти
            </button>
          </form>
        </div>
      </div>

      {!rows || rows.length === 0 ? (
        <div className="card p-10 text-center">
          <div
            className="mx-auto w-16 h-16 grid place-items-center rounded-2xl text-3xl mb-4"
            style={{ background: "var(--orange-50)", color: "var(--orange-dark)" }}
          >
            🚀
          </div>
          <h2
            className="text-xl font-extrabold"
            style={{ fontFamily: "Manrope, Inter, sans-serif" }}
          >
            Пока нет ни одной ситуации
          </h2>
          <p
            className="mt-2 text-sm max-w-md mx-auto"
            style={{ color: "var(--text)" }}
          >
            Создай первую закрытую рабочую ситуацию и пройди 7 шагов RBTE — от
            сигнала до фактической рабочей пробы и возврата с результатом.
          </p>
          <Link
            href="/situations/new"
            className="btn btn-primary mt-6"
            style={{ fontFamily: "Manrope, Inter, sans-serif" }}
          >
            → Создать первую ситуацию
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((r: any) => (
            <article
              key={r.id}
              className="row-item card p-5 card-hover"
            >
              <div className="flex items-start justify-between gap-5 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="badge">
                    {profileLabels[r.profile as keyof typeof profileLabels]}
                  </span>
                  <span className="badge badge-orange">
                    {r.sensitivity} чувствительность
                  </span>
                  <span
                    className="text-[0.76rem] font-bold"
                    style={{ color: "var(--text)" }}
                  >
                    #{r.currentRevisionId?.slice(0, 6)} · обновлено{" "}
                    {new Date(r.updatedAt).toLocaleString("ru-RU")}
                  </span>
                </div>
                  <Link
                    href={`/situations/${r.id}/explore`}
                    className="font-extrabold text-[1.08rem] hover:text-[var(--orange)] transition-colors break-words block"
                    style={{
                      fontFamily: "Manrope, Inter, sans-serif",
                      color: "var(--text-strong)",
                    }}
                  >
                    {r.title}
                  </Link>
                  <p
                    className="mt-2 text-sm leading-relaxed line-clamp-2"
                    style={{ color: "var(--text)" }}
                  >
                    {r.signal}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <Link
                    href={`/situations/${r.id}/explore`}
                    className="btn btn-ghost text-sm"
                    style={{ fontFamily: "Manrope, Inter, sans-serif" }}
                  >
                    4.2 Исследование
                  </Link>
                  <Link
                    href={`/situations/${r.id}/cloud`}
                    className="btn btn-ghost text-sm"
                    style={{ fontFamily: "Manrope, Inter, sans-serif" }}
                  >
                    4.3 Туча
                  </Link>
                  <Link
                    href={`/situations/${r.id}/trial`}
                    className="btn text-sm"
                    style={{
                      fontFamily: "Manrope, Inter, sans-serif",
                      background: "var(--navy-50)",
                      color: "var(--navy)",
                      border: "2px solid var(--border-soft)",
                    }}
                  >
                    4.5 Проба
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
