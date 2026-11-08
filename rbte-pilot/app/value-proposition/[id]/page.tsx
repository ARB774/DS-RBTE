import Link from "next/link";
import { notFound } from "next/navigation";
import { addValuePropositionTurnAction, getValuePropositionProjectAction } from "@/app/actions/value-proposition";
import { ValuePropositionDiagramView } from "@/app/components/value-proposition-diagram";
import { requireUser } from "@/lib/session";
import { valuePropositionRoute, valuePropositionStageSchema } from "@/lib/value-proposition-route";
import { parseValuePropositionDiagram } from "@/lib/value-proposition-visualization";

export default async function ValuePropositionProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const data = await getValuePropositionProjectAction(id);
  if (!data) notFound();
  const { project, turns } = data;
  const stage = valuePropositionStageSchema.parse(project.currentState);
  const stageDefinition = valuePropositionRoute[stage];
  const diagram = parseValuePropositionDiagram(project.visualization);
  const submit = addValuePropositionTurnAction.bind(null, id);

  return <div className="container-x py-8">
    <header className="flex justify-between gap-5 flex-wrap">
      <div>
        <Link href="/value-proposition" className="text-sm text-[var(--color-brand-700)]">← Все проекты</Link>
        <div className="badge mt-3 mb-2">{stage} · {stageDefinition.label}</div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-sm text-[#526072] mt-2 max-w-3xl"><strong>Цель этапа:</strong> {stageDefinition.goal}</p>
      </div>
      <div className="text-sm text-[#526072] max-w-sm"><strong>Результат для перехода:</strong><br />{stageDefinition.acceptance}</div>
    </header>

    <section className="card p-5 mt-6">
      {diagram
        ? <ValuePropositionDiagramView diagram={diagram} />
        : <div className="min-h-52 flex flex-col justify-center items-center text-center rounded-xl border border-dashed border-[#b8c1d1] bg-[#fbfcff] p-8">
          <h2 className="font-bold">{stageDefinition.diagram}</h2>
          <p className="text-sm text-[#526072] mt-2 max-w-xl">Схема появится здесь после следующей содержательной попытки. Наставник восстановит только те элементы, которые есть в сохранённом контексте, а неизвестные места покажет как разрывы.</p>
        </div>}
    </section>

    <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-6">
      <section className="card p-5 space-y-4">
        <h2 className="font-bold text-lg">Диалог с наставником</h2>
        {turns.map((turn) => turn.authorRole === "CONTEXT"
          ? <details key={turn.id} className="rounded-xl border border-[#d9dfeb] p-4 text-sm"><summary className="font-semibold cursor-pointer">Контекст продолжения проекта</summary><p className="whitespace-pre-wrap leading-6 mt-3">{turn.content}</p></details>
          : <article key={turn.id} className={turn.authorRole === "MENTOR" ? "rounded-xl bg-[#f4f7fb] p-4" : "rounded-xl border border-[#e5e7eb] p-4"}>
            <div className="text-xs font-semibold text-[#6b7280] mb-1">{turn.authorRole === "MENTOR" ? "Наставник" : "Ваша попытка"} · {turn.stage}</div>
            <p className="whitespace-pre-wrap text-sm leading-6">{turn.content}</p>
          </article>)}
        <form action={submit} className="pt-2 space-y-3">
          <label className="text-sm font-semibold" htmlFor="content">Новая самостоятельная попытка</label>
          <textarea id="content" name="content" required rows={6} maxLength={8000} placeholder="Ответьте на последний вопрос наставника своими словами." className="w-full rounded-xl border border-[#d6dbe5] p-3" />
          <button className="btn btn-primary" type="submit">Передать наставнику</button>
        </form>
      </section>

      <aside className="space-y-4 h-fit xl:sticky xl:top-5">
        <section className="card p-5 space-y-4">
          <h2 className="font-bold">Учебный фокус</h2>
          <dl className="text-sm space-y-3">
            <div><dt className="text-[#6b7280]">Что учится делать участник</dt><dd>{project.model || stageDefinition.workProduct}</dd></div>
            <div><dt className="text-[#6b7280]">Критерий текущей пробы</dt><dd>{project.assessment || stageDefinition.acceptance}</dd></div>
            <div><dt className="text-[#6b7280]">Главный открытый разрыв</dt><dd>{project.openGap}</dd></div>
            <div><dt className="text-[#6b7280]">Следующий ход</dt><dd>{project.nextStep}</dd></div>
          </dl>
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="font-bold">Карточка проекта</h2>
          <dl className="text-sm space-y-3">
            <div><dt className="text-[#6b7280]">Граница клиента</dt><dd>{project.systemBoundary || "Не установлена"}</dd></div>
            <div><dt className="text-[#6b7280]">Результат тренировки</dt><dd>{project.trainingResult}</dd></div>
            <div><dt className="text-[#6b7280]">Метод</dt><dd>{project.method}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  </div>;
}
