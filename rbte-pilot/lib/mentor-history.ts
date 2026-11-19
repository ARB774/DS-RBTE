import { readMentorNotice } from './mentor-delivery';

// Keep the complete audit in the DB, but show one current failure notice.
export function visibleMentorTurns<T extends { id: string; authorRole: string; content: string }>(turns: T[]): T[] {
  const lastNotice = turns.filter(t => t.authorRole === 'SERVICE').at(-1);
  if (!lastNotice) return turns;
  const at = turns.findIndex(t => t.id === lastNotice.id);
  const resolved = turns.slice(at + 1).some(t => t.authorRole === 'MENTOR');
  return turns.filter(t => t.authorRole !== 'SERVICE' || (!resolved && t.id === lastNotice.id && readMentorNotice(t.content)));
}
