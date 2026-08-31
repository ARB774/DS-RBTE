import Link from "next/link";

const profiles = [
  { id: "01", name: "Личная дилемма", desc: "Разобрать выбор одного человека и основания двух несовместимых действий." },
  { id: "02", name: "Конфликт сторон", desc: "Разделить подтверждённую позицию другой стороны и собственные предположения о ней." },
  { id: "03", name: "Туча лейтенанта", desc: "Исследовать состоявшийся эпизод и механизм повторяющегося тушения пожаров." },
  { id: "04", name: "Иммунитет к изменениям", desc: "Увидеть цель, препятствующее поведение и защищаемую ценность человека." },
];

const steps = [
  { n: "4.1", t: "Создание ситуации", d: "Сигнал, рабочая задача и самостоятельная попытка — до помощи ИИ." },
  { n: "4.2", t: "Исследование", d: "Наблюдения, объяснения, неизвестные и способы проверки." },
  { n: "4.3", t: "Туча", d: "Цель, потребности, конфликтующие действия и связи между ними." },
  { n: "4.4", t: "Решение", d: "Не менее двух вариантов. Основной вариант выбирает участник." },
  { n: "4.5", t: "Рабочая проба", d: "Гипотеза, действие, граница полномочий и наблюдаемые признаки." },
  { n: "4.6", t: "Результат", d: "Фактическое действие, наблюдение и независимые уровни эффекта." },
  { n: "4.7", t: "Предъявление", d: "Выбранная редакция и обратная связь по известным критериям." },
];

const principles = [
  ["01", "Закрыто по умолчанию", "Черновики и диалог с ИИ не раскрываются автоматически."],
  ["02", "Факты отдельно от выводов", "Наблюдение, объяснение, гипотеза и решение имеют разные статусы."],
  ["03", "ИИ не принимает решение", "Модель задаёт вопросы и предлагает гипотезы; автором выбора остаётся человек."],
  ["04", "Результат — вне формы", "Заполненная форма и удовлетворённость не доказывают перенос или рабочий эффект."],
];

export default function Home() {
  return (
    <div>
      <section className="container-x pt-10 sm:pt-16">
        <div className="grid overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-soft)] lg:grid-cols-[1.18fr_0.82fr]">
          <div className="p-6 sm:p-10 lg:p-14">
            <div className="badge badge-orange mb-6">Пилот · курс «Лидер трансформации»</div>
            <h1 className="max-w-3xl text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-[3.6rem]">
              От сложной рабочей ситуации — к проверяемой пробе.
            </h1>
            <p className="mt-6 max-w-2xl text-[0.98rem] leading-7 text-[var(--text)] sm:text-[1.05rem]">
              RBTE помогает исследовать реальные управленческие ситуации, отделять факты от объяснений, строить варианты и возвращаться с наблюдаемым результатом. ИИ поддерживает мышление, но не подменяет авторство решения.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/situations/new" className="btn btn-primary">Создать закрытую ситуацию</Link>
              <Link href="/login" className="btn btn-ghost">Войти в рабочую среду</Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--border-soft)] pt-6 text-xs font-semibold text-[var(--navy-500)]">
              <span>7 последовательных шагов</span>
              <span>4 профиля ситуаций</span>
              <span>4 уровня качества без баллов</span>
            </div>
          </div>

          <div className="surface-grid relative border-t border-[var(--border-soft)] bg-[var(--navy)] p-6 text-white sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <div className="relative z-10">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/55">Рабочий маршрут</div>
              <div className="mt-2 text-2xl font-bold leading-tight text-white">Ситуация не превращается в вывод одним кликом.</div>
              <p className="mt-3 text-sm leading-relaxed text-white/65">Каждый переход сохраняет основания, зависимые связи и историю редакций.</p>

              <div className="route-rail mt-8 space-y-4">
                {steps.slice(0, 5).map((step) => (
                  <div key={step.n} className="route-node">
                    <span className="route-node-number !border-[var(--navy)] !bg-[var(--orange)]">{step.n}</span>
                    <div className="pt-1.5">
                      <div className="text-sm font-bold text-white">{step.t}</div>
                      <div className="mt-0.5 text-[0.72rem] text-white/55">{step.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.06] p-4 text-xs leading-relaxed text-white/70">
                Завершение формы не считается результатом. Проверка продолжается в реальном действии и наблюдении.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
          <div>
            <div className="badge mb-4">Принципы среды</div>
            <h2 className="text-3xl font-extrabold leading-tight">Поддержка без подмены действия участника.</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--text)]">
              Интерфейс показывает границы приватности, роль ИИ и статус материала именно в тот момент, когда это влияет на следующий шаг.
            </p>
            <Link href="/help" className="mt-6 inline-flex text-sm font-bold text-[var(--orange-dark)] hover:underline">Как устроены права и безопасность →</Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {principles.map(([n, title, text]) => (
              <article key={n} className="card p-5 shadow-none">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[var(--orange-dark)]">{n}</span>
                  <span className="h-px w-12 bg-[var(--border)]" />
                </div>
                <h3 className="text-[0.98rem] font-extrabold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--text)]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border-soft)] bg-[rgba(255,253,249,0.62)]">
        <div className="container-x py-16 sm:py-20">
          <div className="mb-8 max-w-2xl">
            <div className="badge badge-orange mb-4">4 профиля</div>
            <h2 className="text-3xl font-extrabold leading-tight">Один маршрут — разные типы исходной ситуации.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text)]">Профиль задаёт правила проверки и подсказки, но не становится готовым диагнозом ситуации пользователя.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {profiles.map((profile) => (
              <article key={profile.id} className="card card-hover flex gap-4 p-5 shadow-none sm:p-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--navy)] text-xs font-extrabold text-white">{profile.id}</span>
                <div>
                  <h3 className="font-extrabold">{profile.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text)]">{profile.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="badge mb-4">Маршрут 4.1–4.7</div>
            <h2 className="text-3xl font-extrabold leading-tight">Семь рабочих областей вместо одной длинной анкеты.</h2>
          </div>
          <Link href="/situations/new" className="btn btn-navy">Начать маршрут</Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.n} className={`card p-5 shadow-none ${index === steps.length - 1 ? "lg:col-start-4" : ""}`}>
              <div className="mb-4 flex items-center justify-between">
                <span className="badge badge-orange">{step.n}</span>
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text)]">шаг</span>
              </div>
              <h3 className="text-sm font-extrabold">{step.t}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--text)]">{step.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-x pb-4">
        <div className="rounded-[1.5rem] bg-[var(--navy)] px-6 py-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-10">
          <div>
            <div className="text-xl font-extrabold text-white">Готовы разобрать реальную ситуацию?</div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Создайте закрытый черновик. Вы сами решите, какую редакцию и кому предъявлять.</p>
          </div>
          <Link href="/situations/new" className="btn btn-primary mt-5 shrink-0 sm:mt-0">Создать ситуацию</Link>
        </div>
      </section>
    </div>
  );
}
