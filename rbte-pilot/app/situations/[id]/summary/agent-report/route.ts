import { z } from 'zod';
import { getSituationAction } from '@/app/actions/situations';
import { readAgentReport } from '@/lib/agent-report';
import { buildAgentWordReport } from '@/lib/agent-word-report';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 if (!z.string().uuid().safeParse(id).success) return new Response(null, { status: 404 });
 const situation = await getSituationAction(id);
 if (!situation || (situation.profile !== 'CONFLICT' && situation.profile !== 'DILEMMA')) return new Response(null, { status: 404 });
 const report = await readAgentReport(situation.id);
 if (report === null) return new Response(null, { status: 404 });
 const document = await buildAgentWordReport(situation.title, report);
 return new Response(new Uint8Array(document), {
  headers: {
   'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'Content-Disposition': 'attachment; filename="pilot-agent-report.docx"',
   'Cache-Control': 'private, no-store',
   'X-Content-Type-Options': 'nosniff',
  },
 });
}
