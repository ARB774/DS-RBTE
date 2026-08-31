import Link from "next/link";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getSituationAction } from "@/app/actions/situations";
import { stepRoute } from "@/lib/rbte";
import { generateStubQuestions } from "@/lib/ai-stub";

export default async function TrialStep({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sit = await getSituationAction(id);
  if (!sit) return <div className="container-x py-10">Ситуация не найдена.</div>;
  const stub = await generateStubQuestions("STEP_45", sit.profile as any, sit.signal);

  const STEPS = [
    { key: "STEP_41", n: "4.1", label: "Создание" },
    { key: "STEP_42", n: "4.2", label: "Исследование" },
    { key: "STEP_43", n: "4.3", label: "Туча" },
    { key: "STEP_44", n: "4.4", label: "Решение" },
    { key: "STEP_45", n: "4.5", label: "Проба" },
    { key: "STEP_46", n: "4.6", label: "Результат" },
    { key: "STEP_47", n: "4.7", label: "ОС" },
  ];
  const STEP_URLS = ["new", "explore", "cloud", "decision", "trial", "result", "feedback"];
  const currentIdx = 4;

  return (
    <div className="container-x py-10">
      <nav className="mb-6">
        <div className="breadcrumb mb-4" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
          <Link href="/dashboard">Мои ситуации</Link>
          <span className="sep">/</span>
          <Link href={`/situations/${id}/explore`} style={{ fontWeight: 600, color: "var(--navy)" }}>{sit.title}</Link>
          <span className="sep">/</span>
          <span style={{ fontWeight: 700, color: "var(--orange)" }}>Шаг 4.5 Проба</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, idx) => {
            const cls =
              idx < currentIdx ? "done" : idx === currentIdx ? "active" : "upcoming";
            return (
              <Link
                key={s.key}
                href={`/situations/${id}/${STEP_URLS[idx]}`}
                className={`step-pill ${cls}`}
                style={{ fontFamily: "Manrope, Inter, sans-serif", textDecoration: "none" }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "20px",
                    height: "20px",
                    borderRadius: "9999px",
                    background: idx <= currentIdx ? "rgba(255,255,255,0.22)" : "rgba(34,50,88,0.08)",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {idx < currentIdx ? "✓" : s.n}
                </span>
                <span>{s.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <header className="mb-5">
        <div className="badge mb-2">Шаг 4.5 · Рабочая проба</div>
        <h1 className="text-2xl font-bold">Рабочая проба — гипотеза, действие, границы, признаки</h1>
        <p className="text-sm text-[#6b7280] mt-1 max-w-3xl leading-relaxed">
          Система не создаёт фиктивный результат. Одна удачная проба не объявляется устойчивым переносом —
          планируй следующую пробу в другом времени или контексте.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        <section className="md:col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold mb-3">План пробы (№1)</h2>
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="field">
                  <label>Номер пробы</label>
                  <input defaultValue="1" />
                </div>
                <div className="field">
                  <label>Связь с предыдущей пробой</label>
                  <select><option>Первая (нет предыдущей)</option><option>Следующая после #...</option><option>Повторная после #...</option></select>
                </div>
              </div>

              <div className="field">
                <label>Гипотеза — что ты проверяешь?</label>
                <textarea rows={2} placeholder="Если я выполню X в условиях Y, то я ожидаю наблюдать Z, потому что механизм M." />
              </div>

              <div className="field">
                <label>Конкретное действие (план)</label>
                <textarea rows={3} placeholder="Что именно ты будешь делать, кому, когда, где, в каком порядке." />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="field">
                  <label>Граница полномочий</label>
                  <textarea rows={2} placeholder="Что ты точно не будешь делать без отдельного решения/согласования." />
                </div>
                <div className="field">
                  <label>Допустимый риск · меры защиты</label>
                  <textarea rows={2} placeholder="Какие риски и как они ограничены; кто ещё вовлечён как защита." />
                </div>
                <div className="field">
                  <label>Ожидаемое наблюдение</label>
                  <textarea rows={2} placeholder="Что ты увидишь / услышишь / измеришь при успехе." />
                </div>
                <div className="field">
                  <label>Срок или событие обратной связи</label>
                  <input type="text" placeholder="Например: пятница 18:00 / после встречи 1:1 с руководителем." />
                </div>
                <div className="field">
                  <label>Признак, который ПОДДЕРЖИТ гипотезу</label>
                  <textarea rows={2} placeholder="Наблюдаемый + признак." />
                </div>
                <div className="field">
                  <label>Признак, который ОСЛАБИТ гипотезу</label>
                  <textarea rows={2} placeholder="Наблюдаемый - признак." />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="field">
                  <label>Условия среды, которые поддерживают или блокируют перенос</label>
                  <textarea rows={2} placeholder="Поддержка руководителя, коллег, время, ресурсы, KPI." />
                </div>
                <div className="field">
                  <label>Необходимая поддержка (руководитель, наставник, другая сторона)</label>
                  <textarea rows={2} placeholder="Кто, в какой момент и как именно поддержит." />
                </div>
                <div className="field md:col-span-2">
                  <label>Как отличить выполнение учебного шага от применения в работе и от фактического эффекта?</label>
                  <textarea rows={2} placeholder="Опиши разницу явно — её спрашивают на шаге 4.6." />
                </div>
                <div className="field md:col-span-2">
                  <label>Условие СЛЕДУЮЩЕЙ или ПОВТОРНОЙ пробы для проверки переноса и устойчивости</label>
                  <textarea rows={2} placeholder="Когда, где, с кем, с какой вариацией ты повторишь, чтобы доказать перенос." />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5 border-l-4 border-l-[var(--color-warn-500)]">
            <h2 className="font-semibold mb-2">Если проба невозможна</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="field">
                <label>Статус</label>
                <select><option>ПРОБА ВОЗМОЖНА</option><option>Препятствие</option><option>Требуется мандат</option><option>Требуется период наблюдения</option></select>
              </div>
              <div className="field md:col-span-2">
                <label>Причина · срок следующей проверки</label>
                <textarea rows={2} placeholder="Фиксируется честно — фиктивный результат не создаётся." />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link href={`/situations/${id}/decision`} className="btn btn-ghost">← 4.4 Решение</Link>
            <Link href={`/situations/${id}/result`} className="btn btn-primary">Сохранить пробу → 4.6 Возврат с результатом</Link>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="badge mb-2">🤖 ИИ-поддержка (stub)</div>
            <ol className="space-y-2 text-sm list-decimal pl-5">
              {stub.questions.map((q, i) => (
                <li key={i} className="leading-relaxed">{q.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
            <p className="text-[11px] text-[#6b7280] mt-3">{stub.disclaimer}</p>
          </div>
          <div className="card p-5">
            <div className="font-semibold mb-2">🔒 RBTE-гарантии на этом шаге</div>
            <ul className="text-xs text-[#374151] space-y-1.5">
              <li>✅ ИИ НЕ подтверждает успешность без наблюдаемых данных</li>
              <li>✅ Одна проба ≠ устойчивый перенос</li>
              <li>✅ План проби ≠ факт выполнения (проверяется на 4.6)</li>
              <li>✅ Граница полномочий и риск сохраняются явно</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
