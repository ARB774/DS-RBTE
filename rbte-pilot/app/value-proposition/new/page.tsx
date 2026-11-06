import Link from "next/link";
import { createValuePropositionProjectAction } from "@/app/actions/value-proposition";
import { requireUser } from "@/lib/session";

export default async function NewValuePropositionPage() {
  await requireUser();
  return <div className="container-x py-10">
    <div className="badge mb-2">S0 · Допустимый проект</div>
    <h1 className="text-2xl font-bold">Новый проект предложения ценности</h1>
    <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">Сначала зафиксируем результат, клиентскую систему, доступ к данным и конфиденциальность. Не начинаем с рекламного текста.</p>
    <form action={createValuePropositionProjectAction} className="card p-6 mt-6 space-y-5">
      <div className="field"><label>Название проекта</label><input required name="name" minLength={3} maxLength={200} placeholder="Например: Интернет-маркетинг для B2B-компаний" /></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="field"><label>Роль участника</label><input name="ownerRole" maxLength={200} placeholder="Кто разрабатывает предложение" /></div>
        <div className="field"><label>Конфиденциальность</label><input name="confidentiality" maxLength={2000} placeholder="Что обезличиваем или не фиксируем" /></div>
      </div>
      <div className="field"><label>Предполагаемая клиентская система</label><textarea required name="systemBoundary" rows={3} maxLength={4000} placeholder="Кто принимает решение и чья рабочая ситуация должна измениться?" /></div>
      <div className="field"><label>Ожидаемый результат тренировки</label><textarea required name="trainingResult" rows={3} minLength={10} maxLength={4000} placeholder="Какой проверяемый результат вы хотите получить?" /></div>
      <div className="flex justify-between gap-3"><Link href="/value-proposition" className="btn btn-ghost">Отмена</Link><button className="btn btn-primary" type="submit">Создать и начать S0 →</button></div>
    </form>
  </div>;
}
