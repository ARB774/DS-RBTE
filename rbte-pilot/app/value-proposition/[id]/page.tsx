import Link from "next/link";
import { notFound } from "next/navigation";
import { addValuePropositionTurnAction, getValuePropositionProjectAction } from "@/app/actions/value-proposition";
import { ValuePropositionDiagramPreview, ValuePropositionDiagramView } from "@/app/components/value-proposition-diagram";
import { requireUser } from "@/lib/session";
import { valuePropositionRoute, valuePropositionStageSchema } from "@/lib/value-proposition-route";
import { parseValuePropositionDiagram } from "@/lib/value-proposition-visualization";
import { readMentorState } from '@/lib/mentor-state';
import { readMentorNotice } from '@/lib/mentor-delivery';
import { MentorMessageInput } from '@/app/components/mentor-message-input';
import { UUID } from '@/lib/rbte';
import { visibleMentorTurns } from '@/lib/mentor-history';

export default async function ValuePropositionProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const { id } = await params;
  await requireUser(['PARTICIPANT'], `/value-proposition/${id}`);
  const { notice } = await searchParams;
  const data = await getValuePropositionProjectAction(id);
  if (!data) notFound();
  const { project, turns } = data;
  const stage = valuePropositionStageSchema.parse(project.currentState);
  const stageDefinition = valuePropositionRoute[stage];
  const diagram = parseValuePropositionDiagram(project.visualization);
  const submit = addValuePropositionTurnAction.bind(null, id);
  const memory = readMentorState(project.evidence);
  const product = memory.pending ?? memory.products.at(-1);
  const sources = Array.isArray(project.sources) ? project.sources as Array<Record<string, unknown>> : [];
  const turnDiagrams = new Map(memory.artifacts.map(item => [item.turnId, parseValuePropositionDiagram(item.diagram)]));

  return <div className="container-x pt-8 pb-28">
    {notice === 'mentor-failed' && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4">Ваш ответ сохранён. Наставник пока не смог обработать его; рабочий продукт и этап сохранены.</p>}
    {notice === 'invalid-message' && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4">Введите сообщение от 1 до 8000 символов. Текст черновика остаётся в этой вкладке.</p>}
    <header className="flex justify-between gap-5 flex-wrap">
      <div>
        <Link href="/value-proposition" className="text-sm text-[var(--color-brand-700)]">← Все проекты</Link>
        <div className="badge mt-3 mb-2">{stageDefinition.label}</div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-sm text-[#526072] mt-2 max-w-3xl"><strong>Цель этапа:</strong> {stageDefinition.goal}</p>
      </div>
      <div className="text-sm text-[#526072] max-w-sm"><strong>Результат для перехода:</strong><br />{stageDefinition.acceptance}</div>
    </header>

    <section className="card p-5 mt-6 space-y-3">
      <h2 className="font-bold">Текущий рабочий продукт</h2>
      <p className="whitespace-pre-wrap text-sm">{product?.text || 'Пока не собран. Ранее сообщённые сведения будут восстановлены при следующем содержательном ответе.'}</p>
      {product && <p className="text-sm text-[#526072]">Версия {product.version} · {product.status === 'confirmed' ? 'Подтверждена участником' : 'Черновик'}</p>}
      {memory.pending?.ready && <form action={submit}>
        <input type="hidden" name="content" value="Подтверждаю показанный рабочий продукт" />
        <input type="hidden" name="intent" value="confirm" />
        <button className="btn btn-primary" type="submit">Подтвердить версию и продолжить</button>
      </form>}
      {!!product?.unknowns.length && <p className="text-sm">Пока неизвестно: {product.unknowns.join('; ')}</p>}
    </section>

    <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-6">
      <section className="card p-5 space-y-4 min-w-0">
        <h2 id="mentor-dialogue-start" tabIndex={-1} className="font-bold text-lg scroll-mt-6">Диалог с наставником</h2>
        {visibleMentorTurns(turns).map((turn) => turn.authorRole === 'SERVICE'
          ? <article key={turn.id} className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
              <p>{readMentorNotice(turn.content)?.message || 'Ответ участника сохранён. Наставник временно недоступен.'}</p>
              {turn.id === turns.at(-1)?.id && turn.stage === stage && readMentorNotice(turn.content) && <form action={submit} className="mt-3">
                <input type="hidden" name="content" value="Повторить обработку сохранённого ответа" />
                <input type="hidden" name="retryErrorId" value={turn.id} />
                <button type="submit" className="btn btn-ghost">Повторить обработку</button>
              </form>}
            </article>
          : turn.authorRole === "CONTEXT"
          ? <details key={turn.id} className="rounded-xl border border-[#d9dfeb] p-4 text-sm"><summary className="font-semibold cursor-pointer">Контекст продолжения проекта</summary><p className="whitespace-pre-wrap leading-6 mt-3">{turn.content}</p></details>
          : <article key={turn.id} className={turn.authorRole === "MENTOR" ? "rounded-xl bg-[#f4f7fb] p-4" : "rounded-xl border border-[#e5e7eb] p-4"}>
            <div className="text-xs font-semibold text-[#6b7280] mb-1">{turn.authorRole === "MENTOR" ? "Наставник" : "Ваше сообщение"}</div>
            {turnDiagrams.get(turn.id) && <ValuePropositionDiagramPreview diagram={turnDiagrams.get(turn.id)!} />}
            <p className="whitespace-pre-wrap text-sm leading-6">{turn.content}</p>
          </article>)}
        <form id="mentor-dialogue-end" tabIndex={-1} action={submit} className="pt-2 space-y-3 scroll-mt-6">
          <label className="text-sm font-semibold" htmlFor="content">Ответ, вопрос или исправление</label>
          <select name="intent" className="block rounded-lg border p-2 text-sm" aria-label="Тип сообщения">
            <option value="">Определить по сообщению</option>
            <option value="answer">Ответить или исправить рабочий продукт</option>
            <option value="explanation">Попросить объяснение</option>
            <option value="sources">Спросить об источниках</option>
          </select>
          <MentorMessageInput projectId={id} submissionId={UUID()} savedIds={turns.filter(t => t.authorRole === 'PARTICIPANT').map(t => t.id)} />
          {stage === 'S0' && <label className="flex gap-2 text-sm"><input type="checkbox" name="dataMode" value="anonymized" />Согласен работать только с обезличенными случаями, без имён, контактов и закрытых документов.</label>}
          <button className="btn btn-primary" type="submit">Передать наставнику</button>
        </form>
      </section>

      <aside className="space-y-4 min-w-0 self-stretch">
        <details className="card p-5 group">
          <summary className="font-bold cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Источники текущего этапа</summary>
          <div className="mt-4 space-y-3">
          <p className="text-sm">Материалы читаются через MCP из GitHub или проверенного кэша. Редакция фиксируется для воспроизводимости.</p>
          {sources.map((source, i) => <details key={i} className="text-xs border rounded-lg p-2">
            <summary>{String(source.id || 'Источник')}</summary>
            <p className="break-words mt-2">{String(source.path || '')}</p>
            <p className="break-all">Редакция: {String(source.commit || '')}</p>
            <p>Получение: {source.origin === 'github' ? 'GitHub' : 'Проверенный кэш'}</p>
            <p>Фрагмент: {String(source.range || '')}</p>
          </details>)}
          <form action={submit}>
            <input type="hidden" name="content" value="Какие методические документы тебе доступны?" />
            <input type="hidden" name="intent" value="sources" />
            <button className="btn btn-ghost" type="submit">Показать прочитанные документы</button>
          </form>
          </div>
        </details>
        <details className="card p-5 group">
          <summary className="font-bold cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Учебный фокус</summary>
          <div className="mt-4 space-y-3">
          <dl className="text-sm space-y-3">
            <div><dt className="text-[#6b7280]">Что учится делать участник</dt><dd>{project.model || stageDefinition.workProduct}</dd></div>
            <div><dt className="text-[#6b7280]">Критерий текущей пробы</dt><dd>{project.assessment || stageDefinition.acceptance}</dd></div>
            <div><dt className="text-[#6b7280]">Главный открытый разрыв</dt><dd>{project.openGap}</dd></div>
            <div><dt className="text-[#6b7280]">Следующий ход</dt><dd>{project.nextStep}</dd></div>
          </dl>
          </div>
        </details>
        <details className="card p-5 group">
          <summary className="font-bold cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Карточка проекта</summary>
          <div className="mt-4 space-y-3">
          <dl className="text-sm space-y-3">
            <div><dt className="text-[#6b7280]">Граница клиента</dt><dd>{project.systemBoundary || "Не установлена"}</dd></div>
            <div><dt className="text-[#6b7280]">Результат тренировки</dt><dd>{project.trainingResult}</dd></div>
            <div><dt className="text-[#6b7280]">Метод</dt><dd>{project.method}</dd></div>
          </dl>
          </div>
        </details>
    <section className="card p-5 min-w-0 space-y-3 xl:sticky xl:top-5 xl:max-h-[calc(100dvh-2.5rem)] xl:overflow-y-auto">
      <h2 className="font-bold">Текущий рисунок</h2>
      {diagram
        ? <ValuePropositionDiagramView diagram={diagram} />
        : <div className="min-h-52 flex flex-col justify-center items-center text-center rounded-xl border border-dashed border-[#b8c1d1] bg-[#fbfcff] p-8">
          <h2 className="font-bold">{stageDefinition.diagram}</h2>
          <p className="text-sm text-[#526072] mt-2 max-w-xl">Схема появится здесь после следующей содержательной попытки. Наставник восстановит только те элементы, которые есть в сохранённом контексте, а неизвестные места покажет как разрывы.</p>
        </div>}
    </section>

      </aside>
    </div>
    <nav aria-label="Навигация по диалогу" className="fixed bottom-4 left-4 z-30 flex gap-2 rounded-xl border border-[#d9dfeb] bg-white p-2 shadow-lg">
      <a href="#mentor-dialogue-start" title="К началу диалога" aria-label="К началу диалога" className="btn btn-ghost gap-2"><span aria-hidden="true">↑</span><span className="text-xs">Начало</span></a>
      <a href="#mentor-dialogue-end" title="К последним сообщениям и полю ответа" aria-label="К последним сообщениям и полю ответа" className="btn btn-ghost gap-2"><span aria-hidden="true">↓</span><span className="text-xs">К ответу</span></a>
    </nav>
  </div>;
}
