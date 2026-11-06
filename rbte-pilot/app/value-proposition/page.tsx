import Link from "next/link";
import { listValuePropositionProjectsAction } from "@/app/actions/value-proposition";
import { requireUser } from "@/lib/session";

export default async function ValuePropositionPage() {
  await requireUser();
  const projects = await listValuePropositionProjectsAction();
  return <div className="container-x py-10">
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="badge mb-2">Pack-TOC · DS-RBTE</div>
        <h1 className="text-2xl font-bold">Предложение ценности</h1>
        <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">Наставнический маршрут S0–S10: от профиля клиента и НЖЯ до проверенной границы обещания.</p>
      </div>
      <Link href="/value-proposition/new" className="btn btn-primary">+ Новый проект</Link>
    </div>
    <section className="mt-8 card p-5">
      {projects.length === 0 ? <p className="text-sm text-[#6b7280]">Проектов пока нет. Создайте первый, чтобы начать с S0.</p> :
        <ul className="divide-y divide-[#eef0f6] -mx-5 -my-5">{projects.map((project) => <li key={project.id} className="px-5 py-4">
          <Link className="font-semibold hover:text-[var(--color-brand-700)]" href={`/value-proposition/${project.id}`}>{project.name}</Link>
          <div className="text-xs text-[#6b7280] mt-1">{project.currentState} · обновлён {new Date(project.updatedAt).toLocaleString("ru-RU")}</div>
        </li>)}</ul>}
    </section>
  </div>;
}
