import { getCurrentSession } from '@/lib/session';
import { authReturnPath,sessionDestination } from '@/lib/session-check';
import { redirect } from 'next/navigation';
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}){
 const next=authReturnPath((await searchParams).next),session=await getCurrentSession();
 if(session.user) redirect(next);
 if(session.status!=='anonymous') redirect(sessionDestination(session,next)!);
 return <main className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-semibold">Вход в Pilot</h1><p className="my-4">Используйте учётную запись портала RBTE. Доступ к Pilot разрешает администратор портала.</p><a href={'/auth/start?next='+encodeURIComponent(next)} className="underline">Войти через rbte.pro</a></main>;
}
