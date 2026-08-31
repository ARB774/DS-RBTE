import Link from "next/link";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getSituationAction } from "@/app/actions/situations";
import { profileLabels, stepRoute } from "@/lib/rbte";
import { generateStubQuestions } from "@/lib/ai-stub";

const profileHelp = {
  DILEMMA: "Две стороны выбора одного человека: каждая сторона = цель + потребности + конфликтное действие.",
  CONFLICT: "Разные стороны: подтверждённая позиция отдельно от предполагаемой позиции второй стороны.",
  LT_CLOUD: "Состоявшийся эпизод + механизм повторения (петля: сигнал → тушение → пропуск причины → повтор).",
  IMMUNITY: "Цель · препятствующее поведение · конкурирующее обязательство · защищаемая ценность · базовое убеждение.",
};

export default async function CloudStep({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sit = await getSituationAction(id);
  if (!sit) return <div className="container-x py-10">Ситуация не найдена.</div>;
  const stub = await generateStubQuestions("STEP_43", sit.profile as any, sit.signal);

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
  const currentIdx = 2;

  return (
    <div className="container-x py-10">
      <nav className="mb-6">
        <div className="breadcrumb mb-4" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
          <Link href="/dashboard">Мои ситуации</Link>
          <span className="sep">/</span>
          <Link href={`/situations/${id}/explore`} style={{ fontWeight: 600, color: "var(--navy)" }}>{sit.title}</Link>
          <span className="sep">/</span>
          <span style={{ fontWeight: 700, color: "var(--orange)" }}>Шаг 4.3 Туча</span>
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

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="badge mb-2">{profileLabels[sit.profile as keyof typeof profileLabels]}</div>
          <h1 className="text-2xl font-bold">Шаг 4.3 · Построение тучи</h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-3xl leading-relaxed">
            {profileHelp[sit.profile as keyof typeof profileHelp]}
          </p>
        </div>
        <Link href={`/situations/${id}/decision`} className="btn btn-primary">→ 4.4 Решение</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <section className="md:col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Структура тучи (обязательный минимум)</h2>
            <div className="space-y-3">
              <div className="field">
                <label>1. Общая цель</label>
                <textarea rows={2} placeholder="К чему в итоге стремимся — обе стороны." />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="field">
                  <label>2. Потребность стороны А</label>
                  <textarea rows={2} placeholder="Зачем нужен этот путь." />
                </div>
                <div className="field">
                  <label>2. Потребность стороны Б</label>
                  <textarea rows={2} placeholder="Конкурирующая." />
                </div>
                <div className="field">
                  <label>3. Конфликтующее действие А</label>
                  <textarea rows={2} placeholder="Что одно действие блокирует второе." />
                </div>
                <div className="field">
                  <label>3. Конфликтующее действие Б</label>
                  <textarea rows={2} placeholder="И наоборот." />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-3">Связи: предположения и вопросы проверки</h2>
            <p className="text-xs text-[#6b7280] mb-4">
              Для каждой стрелки (потребность ← цель / действие ← потребность / конфликт ↔): одно предположение
              и один вопрос, на который можно ответить наблюдаемыми данными.
            </p>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-[#e5e7eb] rounded-lg p-4">
                  <div className="text-xs font-semibold text-[#6b7280] uppercase mb-2">Связь #{i}</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="field">
                      <label>Откуда → куда</label>
                      <input placeholder="Например: Потребность А → Действие Б блокируется" />
                    </div>
                    <div className="field">
                      <label>Сила связи · уверенность</label>
                      <select><option>Предположение</option><option>Подтверждено</option><option>Сомнительно</option></select>
                    </div>
                    <div className="field md:col-span-2">
                      <label>Предположение (то, что стоит за стрелкой)</label>
                      <textarea rows={2} placeholder="Если X то Y, потому что..." />
                    </div>
                    <div className="field md:col-span-2">
                      <label>Вопрос проверки — на что ответить данными/опытом</label>
                      <textarea rows={2} placeholder="Какой самый короткий способ проверить — не через ещё одну дискуссию?" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn btn-primary">Сохранить тучу →</button>
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
            <div className="font-semibold mb-2">Подсказка по профилю</div>
            <p className="text-sm text-[#374151] leading-relaxed">
              {profileHelp[sit.profile as keyof typeof profileHelp]}
            </p>
          </div>

          <div className="card p-5">
            <div className="font-semibold mb-2">Шпаргалка типов утверждений</div>
            <ul className="text-xs text-[#374151] space-y-1">
              <li>🧍 <b>Убеждение</b> — относится к <i>конкретному человеку</i></li>
              <li>🏢 <b>Предположение компании</b> — <i>организация/коллектив</i></li>
              <li>🛠️ <b>Допущение</b> — <i>метод/проект/артефакт/процесс</i></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
