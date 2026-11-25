import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { stepOrder, steps as workflowSteps } from "@/lib/steps";

const profiles = [
  {
    id: "DILEMMA",
    name: "Личная дилемма",
    desc: "Две стороны выбора одного человека. Потребности, обязательства, ценность.",
    icon: "🧭",
  },
  {
    id: "CONFLICT",
    name: "Конфликт сторон",
    desc: "Разные стороны, подтверждённая и предполагаемая позиция другой стороны.",
    icon: "⚖️",
  },
  {
    id: "LT_CLOUD",
    name: "Тушение пожара",
    desc: "Состоявшийся эпизод и механизм повторяющегося тушения пожаров.",
    icon: "⛈️",
  },
  {
    id: "IMMUNITY",
    name: "Иммунитет к изменениям",
    desc: "Цель, препятствующее поведение, конкурирующее обязательство, защищаемая ценность.",
    icon: "🛡️",
  },
];

const stepDescriptions:Record<string,string> = {
 cloud:'Действия, потребности и общая цель на схеме.',
 logic:'Необходимость связей, конфликт и угрозы потребностям.',
 assumptions:'Какие посылки объясняют связи Тучи?',
 'assumption-check':'Факты, исключения и условия применимости.',
 decision:'Как сохранить обе потребности и продвинуться к общей цели?',
 'negative-branch':'Какие последствия может вызвать решение и как их предотвратить?',
 trial:'Что проверить на практике и по каким наблюдениям судить о результате?',
};

const steps = [
 {n:1,t:'Описание ситуации',d:'Свободное описание и выбор профиля.'},
 ...stepOrder.filter(key=>key!=='actions').map((key,index)=>({
  n:index+2,
  t:workflowSteps[key].title.replace(/^\d+ · /u,''),
  d:stepDescriptions[key],
 })),
];

export default async function Home() {
  const { status } = await getCurrentSession();
  if (status === "anonymous") redirect("/auth/start?next=%2F");

  return (
    <div className="container-x py-10">
      <p className="card p-4 mb-6">PILOT-2 · Pack-TOC: учимся строить грозовую тучу для каждого профиля. Сохраняйте шаги и уточняйте формулировки по вопросам сервиса.</p>
      <section className="grid md:grid-cols-5 gap-8 items-center">
        <div className="md:col-span-3">
          <div className="badge mb-4">PILOT-2 · Pack-TOC · 20.10.2026 · курс «Лидер трансформации»</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Пройди путь от реальной ситуации до
            <span className="text-[var(--color-brand-600)]"> рабочей пробы</span> и
            следующей итерации.
          </h1>
          <p className="mt-4 text-[#374151] leading-relaxed">
            RBTE — рабочая среда взрослого обучения. Структура шагов поддерживает
            мышление вопросами, проверками и вариантами, но не становится автором
            диагноза или решения. Заполненная форма или ответ ИИ сами по себе
            результатом не считаются.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/situations/new" className="btn btn-primary">
              + Создать закрытую ситуацию
            </Link>
            <Link href="/dashboard" className="btn btn-ghost">
              Мои ситуации
            </Link>
          </div>
          <ul className="mt-8 text-sm text-[#374151] grid sm:grid-cols-2 gap-x-6 gap-y-2 marker:text-[var(--color-brand-600)] list-disc pl-5">
            <li>Работа участника закрыта по умолчанию</li>
            <li>Исходная проба — до содержательной помощи ИИ</li>
            <li>Наблюдение, объяснение, гипотеза, решение — разные типы</li>
            <li>Удовлетворённость ≠ доказательство переноса/эффекта</li>
            <li>Четырёхуровневая шкала без баллов</li>
            <li>Порог пилота: 10% участников с фактической пробой</li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="card p-5">
            <div className="font-bold text-[#111827] mb-3">
              4 профиля ситуаций RBTE
            </div>
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="flex gap-3 items-start">
                  <div className="text-2xl">{p.icon}</div>
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-[#6b7280] leading-relaxed mt-0.5">
                      {p.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold">Маршрут PILOT-2</h2>
            <p className="text-sm text-[#6b7280] mt-1">
              Путь участника: от описания ситуации до обратной связи по заранее известным критериям.
            </p>
          </div>
          <Link
            href="https://github.com/ARB774/DS-RBTE/blob/main/WP-45/%D0%A2%D0%97%20%D0%BD%D0%B0%20%D0%BF%D0%B5%D1%80%D0%B2%D1%8B%D0%B9%20%D0%B2%D0%B0%D1%80%D0%B8%D0%B0%D0%BD%D1%82%20RBTE.md"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost text-sm hidden md:inline-flex"
          >
            Читать ТЗ ред.1.1 →
          </Link>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {steps.map((s) => (
            <div key={s.n} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge">Шаг {s.n}</span>
              </div>
              <div className="font-semibold text-sm">{s.t}</div>
              <div className="text-xs text-[#6b7280] mt-1 leading-relaxed">
                {s.d}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 card p-6 md:p-8 bg-gradient-to-br from-[var(--color-brand-50)] to-white">
        <h2 className="text-xl font-bold">Архитектура знаний (ТЗ 6)</h2>
        <p className="text-sm text-[#374151] mt-2">
          4 слоя, не смешиваем назначение. Доступ через MCP-сервер чтения с
          6 операциями и явным «не найдено».
        </p>
        <div className="grid md:grid-cols-4 gap-3 mt-5">
          {[
            { t: "FPF", d: "Типы, переходы, свидетельства, редакции." },
            { t: "Pack-TOC", d: "Испаряющаяся туча, 4 профиля, предположения." },
            { t: "PACK-adult-learning", d: "15 пилотных паттернов AL.P.001–015 · D/M/WP/FM/SC." },
            { t: "Pack-ATB", d: "В будущих версиях — двусторонние трансформации." },
          ].map((x) => (
            <div key={x.t} className="bg-white border border-[#e5e7eb] rounded-lg p-4">
              <div className="font-bold text-[var(--color-brand-700)] text-sm">{x.t}</div>
              <div className="text-xs text-[#374151] mt-1 leading-relaxed">{x.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
