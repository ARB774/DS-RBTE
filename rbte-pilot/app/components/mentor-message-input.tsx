'use client';
import { useEffect, useState } from 'react';

export function MentorMessageInput({ projectId, submissionId, savedIds }: { projectId: string; submissionId: string; savedIds: string[] }) {
  const [content, setContent] = useState('');
  const [id, setId] = useState(submissionId);
  const key = `pilot-mentor-draft:${projectId}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) { setContent(''); setId(submissionId); return; }
      const draft = JSON.parse(raw);
      if (savedIds.includes(draft.id)) { sessionStorage.removeItem(key); setContent(''); setId(submissionId); }
      else if (typeof draft.content === 'string' && typeof draft.id === 'string') { setContent(draft.content); setId(draft.id); }
    } catch { /* Storage denial must not prevent sending. */ }
  }, [key, submissionId, savedIds]);
  return <>
    <input type="hidden" name="submissionId" value={id} />
    <textarea id="content" name="content" required rows={6} maxLength={8000} value={content}
      onChange={event => { const value = event.target.value; setContent(value); try { sessionStorage.setItem(key, JSON.stringify({ id, content: value })); } catch {} }}
      placeholder="Можно ответить на вопрос, попросить объяснение или исправить принятое содержание."
      className="w-full rounded-xl border border-[#d6dbe5] p-3" />
  </>;
}
