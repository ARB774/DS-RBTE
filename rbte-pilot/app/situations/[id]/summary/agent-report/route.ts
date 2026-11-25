import { z } from 'zod';
import { getSituationAction } from '@/app/actions/situations';
import { readAgentReport } from '@/lib/agent-report';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 if (!z.string().uuid().safeParse(id).success) return new Response(null, { status: 404 });
 const situation = await getSituationAction(id);
 if (situation?.profile !== 'CONFLICT') return new Response(null, { status: 404 });
 const report = await readAgentReport(situation.id);
 if (report === null) return new Response(null, { status: 404 });
 return new Response(report, {
  headers: {
   'Content-Type': 'text/plain; charset=utf-8',
   'Content-Disposition': 'attachment; filename="pilot-agent-report.txt"',
   'Cache-Control': 'private, no-store',
   'X-Content-Type-Options': 'nosniff',
  },
 });
}
