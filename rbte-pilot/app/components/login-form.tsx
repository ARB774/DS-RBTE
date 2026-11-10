'use client';
import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';
export function LoginForm(){
 const [state,action,pending]=useActionState(loginAction,{error:''});
 return <form action={action} className="space-y-4">
 <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={255} autoComplete="username"/></div>
 <div className="field"><label htmlFor="password">Пароль</label><input id="password" name="password" type="password" required maxLength={128} autoComplete="current-password"/></div>
 <button className="btn btn-primary" disabled={pending}>{pending?'Вход…':'Войти'}</button>
 <p role="alert">{state.error}</p>
 </form>;
}
