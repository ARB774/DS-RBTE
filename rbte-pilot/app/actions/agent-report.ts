'use server';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getSituationAction } from '@/app/actions/situations';
import { agentReportMaxLength, writeAgentReport } from '@/lib/agent-report';

export async function saveAgentReport(id: string, form: FormData) {
 if (!z.string().uuid().safeParse(id).success) notFound();
 const situation = await getSituationAction(id);
 if (!situation || (situation.profile !== 'CONFLICT' && situation.profile !== 'DILEMMA')) notFound();
 const report = z.string().trim().min(1).max(agentReportMaxLength).parse(form.get('report'));
 await writeAgentReport(situation.id, report);
 revalidatePath('/situations/' + id + '/summary');
}
