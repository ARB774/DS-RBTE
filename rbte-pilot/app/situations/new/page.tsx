import Link from "next/link";
import { createSituationAction } from "@/app/actions/situations";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { profileLabels } from "@/lib/rbte";

const STEPS = [
  { key: "STEP_41", n: "4.1", label: "Создание", url: "/situations/new" },
  { key: "STEP_42", n: "4.2", label: "Исследование", url: "/explore" },
  { key: "STEP_43", n: "4.3", label: "Туча", url: "/cloud" },
  { key: "STEP_44", n: "4.4", label: "Решение", url: "/decision" },
  { key: "STEP_45", n: "4.5", label: "Проба", url: "/trial" },
  { key: "STEP_46", n: "4.6", label: "Результат", url: "/result" },
  { key: "STEP_47", n: "4.7", label: "ОС", url: "/feedback" },
];

export default async function NewSituation() {
  await requireUser();
  const currentIdx = 0;

  return (
    <div className="container-x py-10">
      <nav className="mb-6">
        <div className="breadcrumb mb-4" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
          <Link href="/dashboard">Мои ситуации</Link>
          <span className="sep">/</span>
          <span style={{ color: "var(--text-strong)", fontWeight: 700 }}>Новая ситуация</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, idx) => {
            const cls =
              idx < currentIdx ? "done" : idx === currentIdx ? "active" : "upcoming";
            return (
              <span key={s.key} className={`step-pill ${cls}`} style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "20px",
                    height: "20px",
                    borderRadius: "9999px",
                    background: idx === currentIdx ? "rgba(255,255,255,0.22)" : idx < currentIdx ? "rgba(255,255,255,0.18)" : "rgba(34,50,88,0.08)",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {idx < currentIdx ? "✓" : s.n}
                </span>
                <span>{s.label}</span>
              </span>
            );
          })}
        </div>
      </nav>

      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="badge badge-orange" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
              Шаг 4.1 · Создание ситуации
            </span>
            <span className="badge" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>🔒 Закрыто по умолчанию</span>
          </div>
          <h1
            className="text-2xl sm:text-[1.85rem] font-extrabold"
            style={{ fontFamily: "Manrope, Inter, sans-serif" }}
          >
            Новая закрытая рабочая ситуация
          </h1>
          <p
            className="mt-2 text-sm max-w-3xl leading-relaxed"
            style={{ color: "var(--text)", fontFamily: "Manrope, Inter, sans-serif" }}
          >
            ИИ не будет предлагать содержательные формулировки до того, как ты
            зафиксируешь исходную самостоятельную попытку. Система не создаёт
            фиктивную базовую линию.
          </p>
        </div>
        <Link
          href="/help"
          className="btn btn-ghost text-sm"
          style={{ fontFamily: "Manrope, Inter, sans-serif" }}
        >
          Правила приватности →
        </Link>
      </div>

      <form action={createSituationAction as any} className="card p-6 sm:p-8 space-y-6 card-hover">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="field md:col-span-2">
            <label>Название ситуации</label>
            <input
              name="title"
              placeholder='Например: «Перевод команды на удалёнку без потери доверия»'
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            />
          </div>
          <div className="field">
            <label>Профиль ситуации</label>
            <select name="profile" defaultValue="DILEMMA" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
              {Object.entries(profileLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Уровень чувствительности материала</label>
            <select name="sensitivity" defaultValue="STANDARD" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
              <option value="LOW">Низкий — общая рабочая ситуация</option>
              <option value="STANDARD">Стандарт</option>
              <option value="HIGH">Высокий — персональные данные или люди</option>
              <option value="CRITICAL">Критичный — возможен вред, нужна эскалация</option>
            </select>
          </div>
        </div>

        <div className="divider" />

        <div className="field">
          <label>Исходный сигнал — что конкретно произошло, что ты заметил(а)?</label>
          <textarea
            name="signal"
            rows={3}
            placeholder="Факты, время, место, кто присутствовал — без преждевременных объяснений."
            style={{ fontFamily: "Manrope, Inter, sans-serif" }}
          />
          <span className="hint">Только наблюдаемые данные, без выводов.</span>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="field">
            <label>Значимая рабочая задача (не тема, а задача)</label>
            <textarea
              name="task"
              rows={3}
              placeholder="Какую именно рабочую способность ты хочешь сохранить или развить?"
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            />
          </div>
          <div className="field">
            <label>Желаемое изменение собственного действия</label>
            <textarea
              name="desiredChange"
              rows={3}
              placeholder="Что конкретно ты будешь делать по-другому — наблюдаемо, измеримо?"
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            />
          </div>
          <div className="field">
            <label>Относящийся к ситуации опыт — ресурс и возможный фильтр</label>
            <textarea
              name="experience"
              rows={3}
              placeholder="Релевантный стаж, кейсы, привычки которые помогут и которые будут мешать."
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            />
          </div>
          <div className="field">
            <label>Доступные полномочия и границы риска</label>
            <textarea
              name="authority"
              rows={3}
              placeholder="Что ты точно можешь решить сам(а); что требует отдельного согласования; граница неприемлемого риска."
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            />
          </div>
          <div className="field">
            <label>Требуемый уровень поддержки</label>
            <select name="supportLevel" defaultValue="MEDIUM" style={{ fontFamily: "Manrope, Inter, sans-serif" }}>
              <option value="NONE">Без поддержки — самостоятельно</option>
              <option value="LOW">Низкий — проверка ключевых узлов</option>
              <option value="MEDIUM">Средний — регулярные контрольные точки</option>
              <option value="HIGH">Высокий — сопровождение на каждом шаге</option>
            </select>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background:
              "linear-gradient(135deg, rgba(34,50,88,0.04) 0%, rgba(255,99,50,0.06) 100%)",
            border: "2px solid var(--border-soft)",
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-11 h-11 shrink-0 grid place-items-center rounded-xl text-lg"
              style={{
                background: "var(--navy)",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(34,50,88,0.22)",
              }}
            >
              🛡️
            </div>
            <div>
              <div
                className="text-[1rem] font-extrabold"
                style={{
                  fontFamily: "Manrope, Inter, sans-serif",
                  color: "var(--navy)",
                }}
              >
                Исходная самостоятельная попытка — до содержательной помощи ИИ
              </div>
              <p
                className="mt-1 text-xs max-w-2xl leading-relaxed"
                style={{ color: "var(--text)", fontFamily: "Manrope, Inter, sans-serif" }}
              >
                Сформулируй ситуацию, первое объяснение или решение. Если
                невозможно — укажи причину. Пока это поле не заполнено, ИИ не
                даёт содержательных подсказок.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="field">
              <label>Твоя исходная самостоятельная попытка</label>
              <textarea
                name="baselineAttempt"
                rows={5}
                placeholder="Первая формулировка, объяснение, решение или приложенный артефакт."
                style={{ fontFamily: "Manrope, Inter, sans-serif" }}
              />
            </div>
            <div className="field">
              <label>Если исходная попытка невозможна — укажи причину</label>
              <textarea
                name="baselineReason"
                rows={2}
                placeholder="Мандат / период наблюдения / данные / полномочия."
                style={{ fontFamily: "Manrope, Inter, sans-serif" }}
              />
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
          <div
            className="text-xs max-w-xl leading-relaxed"
            style={{ color: "var(--text)", fontFamily: "Manrope, Inter, sans-serif" }}
          >
            Нажимая «Сохранить и перейти к исследованию», ты соглашаешься с
            правилами приватности RBTE: твой материал закрыт по умолчанию, ИИ
            не станет автором решения, на каждом шаге ты можешь остановить
            маршрут или обратиться к ведущему.
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/dashboard"
              className="btn btn-ghost"
              style={{ fontFamily: "Manrope, Inter, sans-serif" }}
            >
              Отмена
            </Link>
            <button
              className="btn btn-primary"
              type="submit"
              style={{
                fontFamily: "Manrope, Inter, sans-serif",
                padding: "0.85rem 1.5rem",
                fontSize: "0.95rem",
              }}
            >
              Сохранить → шаг 4.2 Исследование
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
