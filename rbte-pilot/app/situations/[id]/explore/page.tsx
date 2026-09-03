import Link from "next/link";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getSituationAction } from "@/app/actions/situations";
import { profileLabels, stepRoute } from "@/lib/rbte";
import { generateStubQuestions } from "@/lib/ai-stub";

export default async function ExploreStep({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sit = await getSituationAction(id);
  if (!sit) return <div className="container-x py-10">Ситуация не найдена или не принадлежит тебе.</div>;

  const stub = await generateStubQuestions("STEP_42", sit.profile as any, sit.signal);

  const assertionKinds = [
    ["OBSERVATION", "Наблюдение с источником", "Кто, что, когда, где, при каких условиях."],
    ["EXPLANATION", "Объяснение / конкурирующее объяснение", "Ты или другие люди объясняете происходящее."],
    ["UNKNOWN", "Неизвестное", "Чего сейчас не знаешь и хотел(а) бы проверить."],
    ["SIDE_GOAL", "Цель стороны", "Явная и неявная цель каждого участника."],
    ["SIDE_NEED", "Потребность стороны", "Зачем нужна цель — базовые потребности."],
    ["CONFLICTING_ACTION", "Конфликтующее действие", "Два действия, которые трудно совместить."],
    ["LOGIC_LINK", "Логическая связь", "Если A то B; предпосылки и следствия."],
    ["BELIEF_PERSON", "Убеждение конкретного человека", "⚠ только применительно к человеку."],
    ["COMPANY_ASSUMPTION", "Предположение компании", "⚠ только применительно к организации."],
    ["ARTIFACT_ASSUMPTION", "Допущение метода/артефакта", "⚠ только применительно к проекту, процессу, методу."],
    ["PAST_EXPERIENCE", "Прежний опыт решения сходных задач", "Ресурс или фильтр устойчивой модели."],
    ["ACTION_GAP", "Разрыв: текущее действие ↔ требуемое", "Наблюдаемый разрыв в способности действовать."],
    ["READINESS", "Готовность к самостоятельной работе и поддержка", "Не зависит от возраста или должности."],
  ];

  const STEPS = [
    { key: "STEP_41", n: "4.1", label: "Создание" },
    { key: "STEP_42", n: "4.2", label: "Исследование" },
    { key: "STEP_43", n: "4.3", label: "Туча" },
    { key: "STEP_44", n: "4.4", label: "Решение" },
    { key: "STEP_45", n: "4.5", label: "Проба" },
    { key: "STEP_46", n: "4.6", label: "Результат" },
    { key: "STEP_47", n: "4.7", label: "ОС" },
  ];
  const currentIdx = 1;

  return (
    <div className="container-x py-10">
      <nav className="mb-6">
        <div className="breadcrumb mb-4" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
          <Link href="/dashboard">Мои ситуации</Link>
          <span className="sep">/</span>
          <Link href={`/situations/${id}/explore`} style={{ color: "var(--text-strong)", fontWeight: 700 }}>{sit.title}</Link>
          <span className="sep">/</span>
          <span style={{ fontWeight: 700, color: "var(--orange)" }}>Шаг 4.2 Исследование</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, idx) => {
            const cls =
              idx < currentIdx ? "done" : idx === currentIdx ? "active" : "upcoming";
            return (
              <Link
                key={s.key}
                href={`/situations/${id}/${idx === 0 ? "new" : STEPS[idx].key === "STEP_42" ? "explore" : STEPS[idx].key === "STEP_43" ? "cloud" : STEPS[idx].key === "STEP_44" ? "decision" : STEPS[idx].key === "STEP_45" ? "trial" : STEPS[idx].key === "STEP_46" ? "result" : "feedback"}`}
                className={`step-pill ${cls} no-underline`}
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

      <div className="grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-5">
          <header className="card p-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge">{profileLabels[sit.profile as keyof typeof profileLabels]}</span>
              <span className="badge" style={{ background: "#eef2ff" }}>
                {sit.sensitivity}
              </span>
              <span className="badge">Шаг 4.2 · Исследование</span>
            </div>
            <h1 className="text-2xl font-bold">{sit.title}</h1>
            <p className="text-sm text-[#6b7280] mt-2 whitespace-pre-wrap">
              {sit.signal}
            </p>
            {sit.aiAttemptBaseline ? (
              <details className="mt-4 border border-[#e5e7eb] rounded-lg p-3 bg-white/50">
                <summary className="cursor-pointer text-sm font-semibold">
                  Исходная самостоятельная попытка (до ИИ-поддержки)
                </summary>
                <div className="mt-2 text-sm text-[#374151] whitespace-pre-wrap">
                  {sit.aiAttemptBaseline}
                </div>
              </details>
            ) : null}
          </header>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Каждое утверждение — с типом, автором, статусом</h2>
              <span className="text-xs text-[#6b7280]">
                Триада ТЗ 6.4: <b>убеждения</b> = люди, <b>предположения компании</b> = орг, <b>допущения</b> = артефакт/метод
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {assertionKinds.map(([k, t, d]) => (
                <div key={k} className="border border-[#eef0f6] rounded-lg p-3 hover:border-[var(--color-brand-300)] transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">{t}</div>
                    <span className="text-[10px] uppercase tracking-wide text-[#6b7280]">{k}</span>
                  </div>
                  <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">{d}</p>
                  <textarea className="mt-3 w-full rounded-md border border-[#d1d5db] text-sm p-2 min-h-[72px]" placeholder="Добавь элемент..." />
                  <div className="mt-2 flex gap-2 justify-end">
                    <button className="btn btn-ghost text-xs px-3 py-1.5">Сохранить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="badge mb-2">🤖 ИИ-поддержка (provider=stub)</div>
            <div className="font-semibold mb-2">3 содержательных вопроса на шаг</div>
            <ol className="space-y-2 text-sm text-[#111827] list-decimal pl-5">
              {stub.questions.map((q, i) => (
                <li key={i} className="leading-relaxed">{q.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
            <p className="text-[11px] text-[#6b7280] mt-3 leading-relaxed">{stub.disclaimer}</p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <button className="btn btn-ghost text-xs px-3 py-1.5">✏️ Принять</button>
              <button className="btn btn-ghost text-xs px-3 py-1.5">🔧 Изменить</button>
              <button className="btn btn-ghost text-xs px-3 py-1.5">❌ Отклонить</button>
            </div>
          </div>

          <div className="card p-5">
            <div className="font-semibold mb-2">Далее по маршруту</div>
            <p className="text-sm text-[#6b7280] mb-3 leading-relaxed">
              После исследования сформулируй тучу: общая цель, две потребности,
              два конфликтующих действия и связи с предположениями и вопросами
              проверки.
            </p>
            <Link href={`/situations/${id}/cloud`} className="btn btn-primary w-full">
              → Шаг 4.3 Туча
            </Link>
            <Link href={`/situations/${id}/decision`} className="btn btn-ghost w-full mt-2">
              Пропустить → 4.4 Решение
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
