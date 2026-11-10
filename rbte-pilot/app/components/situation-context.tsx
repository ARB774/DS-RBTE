'use client';
import { useState } from 'react';
import { profileLabels } from '@/lib/profiles';
import type { Profile } from '@/lib/cloud-method';
const prompts:Record<Profile,string>={
 DILEMMA:'Опишите недавний эпизод: кто, что, когда, где? Что хотелось сделать и к какому действию вы чувствовали себя вынужденными?',
 CONFLICT:'Кто участвует в конфликте? Что предлагает сделать другая сторона, что предлагаете вы? Когда и где возникло разногласие?',
 LT_CLOUD:'Когда пришлось нарушать правила или регламент? Что вы сделали, что предписывали правила и какая проблема возникла?',
 IMMUNITY:'Что вы давно хотите изменить в работе? Что вы фактически делаете или не делаете, что мешает этому изменению? Приведите конкретный эпизод.'
};
export function SituationContext(){const [profile,setProfile]=useState<Profile>('DILEMMA');return <><div className="field"><label htmlFor="profile">Профиль ситуации</label><select id="profile" name="profile" value={profile} onChange={e=>setProfile(e.target.value as Profile)}>{Object.entries(profileLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="field"><label htmlFor="signal">Описание конкретной ситуации</label><p id="signal-prompt" className="text-sm mb-2">{prompts[profile]}</p><textarea id="signal" name="signal" rows={5} minLength={10} maxLength={2000} required aria-describedby="signal-prompt"/></div></>;}
