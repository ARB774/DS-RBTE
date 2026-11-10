import { authReturnPath } from '@/lib/session-check';
export const dynamic = 'force-dynamic';
export default async function AuthUnavailable({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
 const next=authReturnPath((await searchParams).next);
 return <section className="mx-auto max-w-lg p-8 space-y-4">
  <h1 className="text-2xl font-semibold">Не удалось проверить вход</h1>
  <p>Сейчас не удалось проверить вход через портал или базу данных. Это не подтверждает, что ваша сессия закончилась. Приложение не сбрасывало вход.</p>
  <p>Черновик сообщения остаётся в этой вкладке. До успешной проверки сообщение не отправляется наставнику.</p>
  <a className="btn btn-primary" href={next}>Повторить проверку и вернуться</a>
  <p className="text-sm">Если проверка снова не проходит, сообщите администратору. Пароль повторно вводить пока не требуется.</p>
 </section>;
}
