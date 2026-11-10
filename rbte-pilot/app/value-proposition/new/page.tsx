import Link from "next/link";
import { createValuePropositionProjectAction } from "@/app/actions/value-proposition";
import { requireUser } from "@/lib/session";
import { valuePropositionRoute, valuePropositionStages } from "@/lib/value-proposition-route";

export default async function NewValuePropositionPage() {
  await requireUser();
  return <div className="container-x py-10">
    <div className="badge mb-2">Маршрут S0–S11</div>
    <h1 className="text-2xl font-bold">Проект предложения ценности</h1>
    <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">Можно начать новый проект или продолжить существующий: выберите фактический этап и вставьте сохранённый контекст. Наставник не будет начинать маршрут заново.</p>
    <form action={createValuePropositionProjectAction} className="card p-6 mt-6 space-y-5">
      <div className="field"><label>Название проекта</label><input required name="name" minLength={3} maxLength={200} placeholder="Например: Интернет-маркетинг для B2B-компаний" /></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="field"><label>Роль участника</label><input name="ownerRole" maxLength={200} placeholder="Кто разрабатывает предложение" /></div>
        <div className="field"><label>Конфиденциальность</label><input name="confidentiality" maxLength={2000} placeholder="Что обезличиваем или не фиксируем" /></div>
      </div>
      <div className="field"><label>Предполагаемая клиентская система</label><textarea required name="systemBoundary" rows={3} maxLength={4000} placeholder="Кто принимает решение и чья рабочая ситуация должна измениться?" /></div>
      <div className="field"><label>Ожидаемый результат тренировки</label><textarea required name="trainingResult" rows={3} minLength={10} maxLength={4000} placeholder="Какой проверяемый результат вы хотите получить?" /></div>
      <div className="field">
        <label htmlFor="startState">С какого этапа продолжить</label>
        <select id="startState" name="startState" defaultValue="S0" className="w-full rounded-xl border border-[#d6dbe5] p-3 bg-white">
          {valuePropositionStages.map((stage) => <option key={stage} value={stage}>{stage} · {valuePropositionRoute[stage].label}</option>)}
        </select>
        <small className="text-[#6b7280]">Для нового проекта оставьте S0. Для уже начатого выберите этап последнего принятого рабочего продукта.</small>
      </div>
      <div className="field">
        <label htmlFor="existingContext">Сохранённый контекст продолжения</label>
        <textarea id="existingContext" name="existingContext" rows={10} maxLength={30000} placeholder="Вставьте карточку проекта, принятые формулировки, перечень неизвестного и последний открытый вопрос. Для нового проекта поле можно оставить пустым." />
      </div>
      <div className="flex justify-between gap-3"><Link href="/value-proposition" className="btn btn-ghost">Отмена</Link><button className="btn btn-primary" type="submit">Создать рабочее пространство →</button></div>
    </form>
  </div>;
}
