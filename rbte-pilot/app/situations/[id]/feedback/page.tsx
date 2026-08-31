import Link from "next/link";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getSituationAction } from "@/app/actions/situations";
import { stepRoute, fourLevelLabels } from "@/lib/rbte";
import { generateStubQuestions } from "@/lib/ai-stub";

export default async function FeedbackStep({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sit = await getSituationAction(id);
  if (!sit) return <div className="container-x py-10">Ситуация не найдена.</div>;
  const stub = await generateStubQuestions("STEP_47", sit.profile as any, sit.signal);

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
  const currentIdx = 6;

  return (
    <div className="container-x py-10">
      <nav className="mb-6">
        <div className="breadcrumb mb-4" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
          <Link href="/dashboard">Мои ситуации</Link>
          <span className="sep">/</span>
          <Link href={`/situations/${id}/explore`} style={{ fontWeight: 600, color: "var(--navy)" }}>{sit.title}</Link>
          <span className="sep">/</span>
          <span style={{ fontWeight: 700, color: "var(--orange)" }}>Шаг 4.7 ОС</span>
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
        <div className="badge mb-2">Шаг 4.7 · Предъявление · Обратная связь</div>
        <h1 className="text-2xl font-bold">Раскрой только нужную редакцию. Получи критериальную связь.</h1>
        <p className="text-sm text-[#6b7280] mt-1 max-w-3xl leading-relaxed">
          Перед отправкой показан точный состав раскрываемых данных — чтобы ты явно подтвердил(а),
          что не раскрываешь лишнего. Ведущий оставляет комментарии к элементам: критерий, наблюдаемое
          основание, предлагаемое следующее действие. Три вида: развивающая / оценка качества артефакта /
          утверждение об эффекте. Ты принимаешь / изменяешь / отвергаешь замечание — выбор остаётся за тобой.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        <section className="md:col-span-2 space-y-5">
          <div className="card p-5 border-l-4 border-l-[var(--color-brand-600)]">
            <div className="font-bold mb-2">📤 Точный состав предъявляемой редакции — подтверждает участник</div>
            <ul className="text-sm space-y-2">
              {[
                ["✅", "Заголовок ситуации, профиль, чувствительность"],
                ["✅", "Редакция #1 (4.1-4.2) — наблюдения, объяснения, туча"],
                ["✅", "Редакция #2 (4.3-4.4) — туча подтверждённая, 2 варианта решения, выбор"],
                ["✅", "Редакция #3 (4.5) — план пробы №1 с гипотезой и границами"],
                ["✅", "Редакция #4 (4.6) — возврат, 4-уровневые оценки, свидетельства"],
                ["❌", "Закрытые черновики (невыбранные элементы) — НЕ отправляются"],
                ["❌", "История диалога с ИИ — НЕ отправляется по умолчанию"],
              ].map(([s, t]) => (
                <li key={t} className="flex items-start gap-2">
                  <span>{s}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <div className="field">
                <label>Получатель</label>
                <select>
                  <option>Ведущий курса · Илья (facilitator@rbte.pro)</option>
                  <option>Наставник · Ольга (mentor@rbte.pro)</option>
                  <option>Поддерживающее · Максим (supporter@rbte.pro) — ТОЛЬКО план пробы / результат</option>
                </select>
              </div>
              <div className="field">
                <label>Сообщение для ведущего</label>
                <textarea rows={2} placeholder="На что именно в первую очередь обратить внимание и почему." />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">💬 Образец критериальной обратной связи ведущего</div>
              <span className="badge">3 вида (ТЗ 4.7)</span>
            </div>
            <div className="space-y-3">
              {[
                {
                  kind: "DEVELOPMENTAL",
                  color: "border-l-[var(--color-brand-500)]",
                  title: "Развивающая обратная связь",
                  cr: "Наблюдения с источником (шаг 4.2)",
                  basis:
                    "Ты перечислил 5 наблюдений, но у 3 не указан источник и дата. Из-за этого силу вывода нельзя проверить.",
                  next: "Добавь к каждому наблюдению источник + дату, после этого можно перейти к предъявлению.",
                },
                {
                  kind: "ARTIFACT_QUALITY",
                  color: "border-l-[var(--color-warn-500)]",
                  title: "Оценка качества артефакта",
                  cr: "Структура тучи (шаг 4.3) — достаточность для рабочей пробы",
                  basis:
                    "У каждой из 5 связей есть предположение, но в 3-х нет вопроса проверки. Поэтому туча пока частично допустима, но не убедительна.",
                  next: "Добавь по 1 вопросу проверки на 3 слабые связи — это поднимет уровень до Убедительно.",
                },
                {
                  kind: "EFFECT_CLAIM",
                  color: "border-l-[var(--color-ok-500)]",
                  title: "Утверждение об эффекте",
                  cr: "Перенос в рабочую практику — уровень (ТЗ 2.3)",
                  basis:
                    "Одна проба на той же неделе в той же команде. По критерию переноса этого недостаточно: нужна проба в другом времени / другом контексте.",
                  next: "Запланируй следующую пробу #2 через 2 недели в другом проекте, тогда сможем подтвердить перенос.",
                },
              ].map((f) => (
                <div key={f.kind} className={`border-l-4 ${f.color} bg-[#fafbff] rounded-md p-4`}>
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <span className="badge mr-2">{f.kind}</span>
                      <span className="font-semibold text-sm">{f.title}</span>
                    </div>
                    <span className="text-[11px] text-[#6b7280]">оставлено: Илья Ведущий, 24.08 10:42</span>
                  </div>
                  <ul className="text-xs text-[#374151] space-y-1">
                    <li><b>Критерий:</b> {f.cr}</li>
                    <li><b>Наблюдаемое основание:</b> {f.basis}</li>
                    <li><b>Предлагаемое следующее действие:</b> {f.next}</li>
                  </ul>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button className="btn btn-ghost text-xs px-3 py-1.5">✅ Принять</button>
                    <button className="btn btn-ghost text-xs px-3 py-1.5">🔧 Изменить замечание</button>
                    <button className="btn btn-ghost text-xs px-3 py-1.5">❌ Отвергнуть + аргумент</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="badge mb-2">🤖 Вопросы ИИ (stub)</div>
            <ol className="space-y-2 text-sm list-decimal pl-5">
              {stub.questions.map((q, i) => (
                <li key={i} className="leading-relaxed">{q.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
            <p className="text-[11px] text-[#6b7280] mt-3">{stub.disclaimer}</p>
          </div>

          <div className="card p-5">
            <div className="font-semibold mb-2">📊 Шкала RBTE — твои текущие оценки</div>
            <div className="space-y-2 text-sm">
              {[
                ["Качество артефакта", "Достаточно для рабочей пробы"],
                ["Самостоятельность освоения", "Представлено частично"],
                ["Перенос в работу", "Не представлено — 2-я проба не проведена"],
                ["Рабочий эффект", "Не представлено"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 border-b border-[#eef0f6] pb-2 last:border-none last:pb-0">
                  <div className="font-medium">{k}</div>
                  <div className="text-xs text-[#6b7280] text-right max-w-[60%]">{v}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-[#6b7280] mt-3 leading-relaxed">
              Шкала: {Object.values(fourLevelLabels).join(" · ")}. Баллов нет, рейтинга участников нет.
            </div>
          </div>

          <div className="card p-5">
            <div className="font-semibold mb-2">🏁 Пилот порог 10% фактических проб</div>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              Для 100 участников пилота: требуется ≥10 человек, проверивших пробу в реальной работе
              (возврат с результатом). Удовлетворённость не считается.
            </p>
            <div className="mt-3 h-2 w-full bg-[#eef0f6] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-brand-600)] w-[12%]" />
            </div>
            <div className="text-xs text-[#6b7280] mt-2">Ты — 1-й из 10. 🔒 Учитывается только реальный возврат с данными.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
