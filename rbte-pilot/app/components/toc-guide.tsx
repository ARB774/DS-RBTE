import { tocContext,TOC_COMMIT } from '@/lib/pack-toc';
import type { Profile } from '@/lib/cloud-method';
export function TocGuide({profile,step}:{profile:Profile;step:string}){
 const context=tocContext(profile,step);
 return <details className="card p-4"><summary>Основания и критерии Pack-TOC · {context.profile.method}</summary><p className="my-3">{context.profile.scope}</p><ul className="space-y-3">{context.criteria.map(c=><li key={c.id}><p>{c.text}</p><p className="text-sm">Основание: {c.sourceIds.map(id=><a className="underline mr-2" key={id} href={context.sources.find(s=>s.id===id)?.url} target="_blank" rel="noreferrer">{id}</a>)}</p></li>)}</ul><p className="text-sm mt-3">Используется зафиксированная редакция {TOC_COMMIT.slice(0,12)}. Это программная адаптация методики; статусы документов и их ограничения сохранены.</p><ul className="text-sm mt-2">{context.sources.map(s=><li key={s.id}><a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.id} · {s.title}</a> · {s.status}</li>)}</ul></details>;
}
