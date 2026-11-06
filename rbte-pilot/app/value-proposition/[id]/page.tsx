import Link from "next/link";
import { notFound } from "next/navigation";
import { addValuePropositionTurnAction, getValuePropositionProjectAction } from "@/app/actions/value-proposition";
import { requireUser } from "@/lib/session";

export default async function ValuePropositionProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const data = await getValuePropositionProjectAction(id);
  if (!data) notFound();
  const { project, turns } = data;
  const submit = addValuePropositionTurnAction.bind(null, id);
  return <div className="container-x py-10">
    <div className="flex justify-between gap-4 flex-wrap"><div><Link href="/value-proposition" className="text-sm text-[var(--color-brand-700)]">← Все проекты</Link><div className="badge mt-3 mb-2">{project.currentState} · Наставник Pilot</div><h1 className="text-2xl font-bold">{project.name}</h1></div><div className="text-sm text-[#6b7280] max-w-xs">{project.nextStep}</div></div>
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-6">
      <section className="card p-5 space-y-4">
        {turns.map((turn) => <article key={turn.id} className={turn.authorRole === "MENTOR" ? "rounded-xl bg-[#f4f7fb] p-4" : "rounded-xl border border-[#e5e7eb] p-4"}>
          <div className="text-xs font-semibold text-[#6b7280] mb-1">{turn.authorRole === "MENTOR" ? "Наставник" : "Ваша попытка"} · {turn.stage}</div><p className="whitespace-pre-wrap text-sm leading-6">{turn.content}</p>
        </article>)}
        <form action={submit} className="pt-2 space-y-3"><label className="text-sm font-semibold" htmlFor="content">Самостоятельная попытка</label><textarea id="content" name="content" required rows={6} maxLength={8000} placeholder="Ответьте на вопрос наставника своими словами." className="w-full rounded-xl border border-[#d6dbe5] p-3" /><button className="btn btn-primary" type="submit">Сохранить ответ</button></form>
      </section>
      <aside className="card p-5 h-fit space-y-4"><h2 className="font-bold">Карточка проекта</h2><dl className="text-sm space-y-3"><div><dt className="text-[#6b7280]">Граница клиента</dt><dd>{project.systemBoundary || "Не установлена"}</dd></div><div><dt className="text-[#6b7280]">Результат тренировки</dt><dd>{project.trainingResult}</dd></div><div><dt className="text-[#6b7280]">Открытый разрыв</dt><dd>{project.openGap}</dd></div><div><dt className="text-[#6b7280]">Метод</dt><dd>{project.method}</dd></div></dl></aside>
    </div>
  </div>;
}
