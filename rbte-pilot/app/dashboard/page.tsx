import Link from "next/link";
import { listMySituationsAction } from "@/app/actions/situations";
import { roleLabels, profileLabels } from "@/lib/rbte";
import { requireUser } from "@/lib/session";

export default async function Dashboard() {
  const me = await requireUser();

  const rows = await listMySituationsAction();

  return (
    <div className="container-x py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="badge mb-2">
            {roleLabels[me.role]}{me.name?.trim() ? ` · ${me.name.trim()}` : ""}
          </div>
          <h1 className="text-2xl font-bold">Мои ситуации</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Ситуации доступны только вам. Совместный доступ пока не включён.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/situations/new" className="btn btn-primary">
            + Новая ситуация
          </Link>
        </div>
      </div>

      <section className="mt-8 card p-5">
        {!rows || rows.length === 0 ? (
          <div className="text-sm text-[#6b7280]">
            Пока нет ни одной ситуации.{" "}
            <Link href="/situations/new" className="text-[var(--color-brand-700)] font-semibold">
              Создать первую ситуацию →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#eef0f6] -mx-5 -my-5">
            {rows.map((r: any) => (
              <li key={r.id} className="px-5 py-4 hover:bg-[#fafbff] transition">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="badge">{profileLabels[r.profile as keyof typeof profileLabels]}</span>
                      <span className="badge" style={{ background: "#eef2ff" }}>
                        {r.sensitivity} чувствительность
                      </span>
                      <span className="text-xs text-[#6b7280]">
                        #{r.currentRevisionId?.slice(0, 6)} · обн. {new Date(r.updatedAt).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <Link
                      href={`/situations/${r.id}/${r.profile==='DILEMMA'?r.resumeStep:'cloud'}`}
                      className="font-semibold text-[#111827] hover:text-[var(--color-brand-700)] break-words"
                    >
                      {r.title}
                    </Link>
                    <p className="text-sm text-[#6b7280] line-clamp-2 mt-1">
                      {r.signal}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.profile==='DILEMMA'?<><Link href={`/situations/${r.id}/${r.resumeStep}`} className="btn btn-primary text-sm">{r.resumeStep==='summary'?'Разбор завершён':'Продолжить'}</Link><Link href={`/situations/${r.id}/summary`} className="btn btn-ghost text-sm">Посмотреть разбор</Link></>:<>
                    <Link href={`/situations/${r.id}/summary`} className="btn btn-primary text-sm">Итог ситуации</Link>
                    <Link href={`/situations/${r.id}/${r.profile==='DILEMMA'?r.resumeStep:'cloud'}`} className="btn btn-ghost text-sm">
                      Шаг 4.2 Исследование
                    </Link>
                    <Link href={`/situations/${r.id}/${r.profile==='DILEMMA'?r.resumeStep:'cloud'}`} className="btn btn-ghost text-sm">
                      4.3 Туча
                    </Link>
                    <Link href={`/situations/${r.id}/trial`} className="btn btn-ghost text-sm">
                      4.5 Проба
                    </Link></>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
