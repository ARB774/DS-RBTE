import { z } from 'zod';

const noticeSchema = z.object({ message: z.string(), participantId: z.string().uuid(), intent: z.string(), dataMode: z.string() });
export function readMentorNotice(content: string) {
  try { return noticeSchema.parse(JSON.parse(content)); } catch { return null; }
}

// Saving the learner's attempt is deliberately outside the reply transaction.
// Provider/validation failures must never roll back their independent work.
export async function deliverSavedMentorTurn<T>(steps: {
  saveParticipant: () => Promise<void>;
  generate: () => Promise<T>;
  saveReply: (reply: T) => Promise<void>;
  saveFailure: () => Promise<void>;
}) {
  await steps.saveParticipant();
  try {
    const reply = await steps.generate();
    await steps.saveReply(reply);
    return true;
  } catch (error) {
    console.error('mentor-reply-failed', error instanceof Error ? error.name : 'UnknownError');
    try { await steps.saveFailure(); } catch { console.error('mentor-failure-notice-unavailable'); }
    return false;
  }
}
