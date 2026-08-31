import Link from "next/link";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getSituationAction } from "@/app/actions/situations";
import { stepRoute } from "@/lib/rbte";
import { generateStubQuestions } from "@/lib/ai-stub";

export default async function DecisionStep({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sit = await getSituationAction(id);
  if (!sit) return <div className="container-x py-10">Ситуация не найдена.</div>;
  const stub = await generateStubQuestions("STEP_44", sit.profile as any, sit.signal);

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
  const currentIdx = 3;

  return (
    <div className="container-x py-10">
      <nav className="mb-6">
        <div className="breadcrumb mb-4" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
          <Link href="/dashboard">Мои ситуации</Link>
          <span className="sep">/</span>
          <Link href={`/situations/${id}/explore`} style={{ fontWeight: 600, color: "var(--navy)" }}>{sit.title}</Link>
          <span className="sep">/</span>
          <span style={{ fontWeight: 700, color: "var(--orange)" }}>Шаг 4.4 Решение</span>
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
        <div className="badge mb-2">Шаг 4.4 · Решение</div>
        <h1 className="text-2xl font-bold">Варианты решения — ≥ 2, твой выбор</h1>
        <p className="text-sm text-[#6b7280] mt-1 max-w-3xl">
          ИИ НЕ выбирает вариант автоматически. Ты формулируешь ≥1; он помогает
          сгенерировать минимум второй, даже противоречащий первому по механизму.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-5">
        <section className="md:col-span-2 space-y-5">
          {[1, 2].map((n) => (
            <div key={n} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold">Вариант #{n}</div>
                <span className="badge">{n === 1 ? "Первый — твой основной" : "Второй — альтернатива"}</span>
              </div>
              <div className="space-y-3">
                <div className="field">
                  <label>Краткое название варианта</label>
                  <input placeholder={n === 1 ? "Например: «Прямой разговор с руководителем в понедельник»" : "Например: «Создать небольшой пилот в своём отделе на 2 недели»"} />
                </div>
                <div className="field">
                  <label>Механизм изменения ситуации</label>
                  <textarea rows={2} placeholder="Как именно ситуация изменится — последовательность, рычаги." />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="field">
                    <label>Какое убеждение / предположение компании преодолеваем?</label>
                    <textarea rows={2} placeholder="Свяжи с элементом тучи или утверждением." />
                  </div>
                  <div className="field">
                    <label>Какие существенные условия мы сохраняем?</label>
                    <textarea rows={2} placeholder="Что не трогаем, чтобы не обрушить систему." />
                  </div>
                  <div className="field">
                    <label>Необходимые изменения контекста</label>
                    <textarea rows={2} placeholder="Люди, бюджет, время, полномочия, данные." />
                  </div>
                  <div className="field">
                    <label>Риски и неизвестные</label>
                    <textarea rows={2} placeholder="Вероятность / влияние / что уменьшает риск." />
                  </div>
                </div>
                <div className="flex gap-2 items-center pt-2 flex-wrap">
                  <div className="text-xs text-[#6b7280] mr-auto">Ты выбираешь — ИИ НЕ решает за тебя.</div>
                  <label className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#d1d5db] cursor-pointer">
                    <input type="radio" name="chosen" disabled={false} /> Выбран этот вариант
                  </label>
                  <label className="text-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#d1d5db] cursor-pointer">
                    <input type="radio" name="rejected" /> Отказ от выбора с указанием причины
                  </label>
                </div>
                <textarea rows={2} className="text-sm" placeholder="Если отказ — почему? Если выбран — краткое обоснование." />
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost">+ Добавить вариант #3</button>
            <Link href={`/situations/${id}/trial`} className="btn btn-primary">
              Сохранить → 4.5 Рабочая проба
            </Link>
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
          <div className="card p-5 border-l-4 border-l-[var(--color-warn-500)]">
            <div className="font-semibold mb-2">⚠️ Ограничения ИИ на этом шаге</div>
            <ul className="text-xs text-[#374151] space-y-1.5">
              <li>❌ Не назначает ограничивающее убеждение</li>
              <li>❌ Не утверждает позицию отсутствующей стороны как факт</li>
              <li>❌ Не принимает решение за пользователя</li>
              <li>✅ Предлагает формулировки только как гипотезы</li>
              <li>✅ Обязательно указывает использованный элемент ситуации</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
