import Link from "next/link";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getSituationAction } from "@/app/actions/situations";
import { fourLevelLabels, stepRoute } from "@/lib/rbte";
import { generateStubQuestions } from "@/lib/ai-stub";

export default async function ResultStep({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sit = await getSituationAction(id);
  if (!sit) return <div className="container-x py-10">Ситуация не найдена.</div>;
  const stub = await generateStubQuestions("STEP_46", sit.profile as any, sit.signal);

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
  const currentIdx = 5;

  return (
    <div className="container-x py-10">
      <nav className="mb-6">
        <div className="breadcrumb mb-4" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
          <Link href="/dashboard">Мои ситуации</Link>
          <span className="sep">/</span>
          <Link href={`/situations/${id}/explore`} style={{ fontWeight: 600, color: "var(--navy)" }}>{sit.title}</Link>
          <span className="sep">/</span>
          <span style={{ fontWeight: 700, color: "var(--orange)" }}>Шаг 4.6 Результат</span>
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
        <div className="badge mb-2">Шаг 4.6 · Возврат с результатом</div>
        <h1 className="text-2xl font-bold">Факт, наблюдение, интерпретация — и 4 независимых уровня</h1>
        <p className="text-sm text-[#6b7280] mt-1 max-w-3xl leading-relaxed">
          4 уровня эффекта взрослого обучения: (1) прохождение, (2) освоение способа, (3) перенос в работу,
          (4) фактический эффект. Удовлетворённость не считается доказательством. Ни один не выводится
          автоматически из другого. Возврат создаёт НОВУЮ редакцию, не стирая прежнюю.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        <section className="md:col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold mb-3">
              Раздели явно: запланированное · фактическое · наблюдение · твоя интерпретация
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="field">
                <label>1. Запланированное действие (из пробы)</label>
                <textarea rows={3} placeholder="Копируй или уточни план из шага 4.5." />
              </div>
              <div className="field">
                <label>2. Фактическое действие</label>
                <textarea rows={3} placeholder="Чем реальное действие отличилось? Что добавил / пропустил?" />
              </div>
              <div className="field md:col-span-2">
                <label>3. Наблюдение — что именно ты зафиксировал(а) как результат?</label>
                <textarea rows={3} placeholder="Только факты: кто, что сказал, данные, метрики, цитаты, артефакты." />
              </div>
              <div className="field md:col-span-2">
                <label>4. Твоя интерпретация</label>
                <textarea rows={3} placeholder="Объяснение почему произошло так, а не иначе. Эта часть отдельно от наблюдения — ты можешь ошибиться." />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-3">
              4 независимых уровня — оцени каждый отдельно
            </h2>
            <p className="text-xs text-[#6b7280] mb-4">
              Уровни НЕ складываются в балл. Качество артефакта =/= перенос =/= эффект.
            </p>
            <div className="space-y-4">
              {[
                { k: "capability", n: "2", t: "Освоение способа работы", d: "Участник воспроизводит новый способ самостоятельно и без подсказки." },
                { k: "transfer",   n: "3", t: "Перенос в рабочую практику",  d: "Способ применён в другой задаче, контексте, или позже — не только на обучении." },
                { k: "effect",     n: "4", t: "Фактический рабочий эффект",    d: "Появились данные об улучшении результата (клиента, команды, проекта)." },
              ].map((x) => (
                <div key={x.k} className="border border-[#e5e7eb] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs text-[#6b7280] uppercase tracking-wide">Уровень {x.n}</div>
                      <div className="font-semibold text-sm">{x.t}</div>
                    </div>
                    <select className="text-sm rounded-md border border-[#d1d5db] px-2 py-1.5">
                      {Object.entries(fourLevelLabels).map(([k, l]) => (
                        <option key={k}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-[#6b7280] leading-relaxed mb-2">{x.d}</p>
                  <textarea className="w-full rounded-md border border-[#d1d5db] text-sm p-2 min-h-[64px]" placeholder="Данные / свидетельства / основание для такой оценки." />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-3">Продолжение после возврата</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="field md:col-span-2">
                <label>Выбери одно продолжение (создаёт новую связанную редакцию)</label>
                <select>
                  <option>Сохранить решение и продолжить наблюдение</option>
                  <option>Изменить решение или пробу</option>
                  <option>Вернуться к убеждению, логической связи, границе или контексту</option>
                  <option>Закрыть ситуацию — с указанием основания</option>
                </select>
              </div>
              <div className="field md:col-span-2">
                <label>Основание для закрытия / следующего действия</label>
                <textarea rows={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link href={`/situations/${id}/trial`} className="btn btn-ghost">← 4.5 Проба</Link>
            <Link href={`/situations/${id}/feedback`} className="btn btn-primary">Создать редакцию → 4.7 Предъявление / Обратная связь</Link>
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
            <div className="font-semibold mb-2">Напоминание: уровни независимы</div>
            <ul className="text-xs text-[#374151] space-y-1.5 list-disc pl-4">
              <li>Удовлетворённость ≠ доказательство переноса или эффекта</li>
              <li>Высокое качество артефакта ≠ перенос в работу</li>
              <li>Единичная успешная проба ≠ устойчивый рабочий эффект</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
