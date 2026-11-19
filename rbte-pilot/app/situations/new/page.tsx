import { SituationContext } from '@/app/components/situation-context';
import Link from "next/link";
import { CreationForm } from "@/app/components/creation-form";
import { requireUser } from "@/lib/session";

export default async function NewSituation() {
  await requireUser();

  return (
    <div className="container-x py-10">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="badge mb-2">Шаг 1 · Описание ситуации</div>
          <h1 className="text-2xl font-bold">Новая закрытая ситуация</h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
            Опишите один конкретный эпизод. Затем вы самостоятельно построите грозовую тучу для выбранного профиля.
          </p>
        </div>
        <Link href="/help" className="btn btn-ghost text-sm">
          Правила приватности и безопасности →
        </Link>
      </div>

      <CreationForm>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="field md:col-span-2">
            <label>Название ситуации</label>
            <input required minLength={5} maxLength={160} name="title" placeholder="Например: «Перевод команды на удалёнку без потери доверия»" />
          </div>
          <div className="field">
            <label>Уровень чувствительности материала</label>
            <select name="sensitivity" defaultValue="STANDARD">
              <option value="LOW">Низкий — общая рабочая ситуация</option>
              <option value="STANDARD">Стандарт</option>
              <option value="HIGH">Высокий — персональные данные или люди</option>
              <option value="CRITICAL">Критичный — возможен вред, нужна эскалация</option>
            </select>
          </div>
        </div>

        <SituationContext />

        <details className="creation-extra"><summary className="personal-create-next">Дополнительные сведения — можно заполнить позже</summary>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="field">
            <label>Значимая рабочая задача (не тема, а задача)</label>
            <textarea name="task" rows={3} placeholder="Какую именно рабочую способность ты хочешь сохранить или развить?" />
          </div>
          <div className="field">
            <label>Желаемое изменение собственного действия</label>
            <textarea name="desiredChange" rows={3} placeholder="Что конкретно ты будешь делать по-другому — наблюдаемо, измеримо?" />
          </div>
          <div className="field">
            <label>Относящийся к ситуации опыт — твой ресурс и возможный фильтр</label>
            <textarea name="experience" rows={3} placeholder="Релевантный стаж, кейсы, привычки которые помогут и которые будут мешать." />
          </div>
          <div className="field">
            <label>Доступные полномочия и границы риска</label>
            <textarea name="authority" rows={3} placeholder="Что ты точно можешь решить сам(а); что требует отдельного согласования; граница неприемлемого риска." />
          </div>
          <div className="field">
            <label>Требуемый уровень поддержки</label>
            <select name="supportLevel" defaultValue="MEDIUM">
              <option value="NONE">Без поддержки — самостоятельно</option>
              <option value="LOW">Низкий — проверка ключевых узлов</option>
              <option value="MEDIUM">Средний — регулярные контрольные точки</option>
              <option value="HIGH">Высокий — сопровождение на каждом шаге</option>
            </select>
          </div>
        </div>
        </details>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <div className="text-xs text-[#6b7280] max-w-xl">
            Сохраняя описание, вы соглашаетесь с
            правилами приватности RBTE: твой материал закрыт по умолчанию, ИИ
            не станет автором решения, на каждом шаге ты можешь остановить
            маршрут или обратиться к ведущему.
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="btn btn-ghost">
              Отмена
            </Link>
            <button className="btn btn-primary" type="submit">
              <span className="personal-create-next">Сохранить и перейти к действиям →</span><span className="other-create-next">Сохранить → шаг 2 Построение грозовой тучи</span>
            </button>
          </div>
        </div>
      </CreationForm>
    </div>
  );
}
