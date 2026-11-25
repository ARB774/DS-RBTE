import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const agentReportMaxLength = 20_000;

function reportDirectory() {
 return process.env.PILOT_AGENT_REPORT_DIR
  || (process.platform === 'win32'
   ? join(tmpdir(), 'rbte-pilot-agent-reports')
   : '/var/lib/rbte-pilot/agent-reports');
}

export async function readAgentReport(id: string) {
 try {
  return await readFile(join(reportDirectory(), id + '.txt'), 'utf8');
 } catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
  throw error;
 }
}

export async function writeAgentReport(id: string, contents: string) {
 const directory = reportDirectory();
 await mkdir(directory, { recursive: true, mode: 0o700 });
 const target = join(directory, id + '.txt');
 const pending = join(directory, randomUUID() + '.tmp');
 try {
  await writeFile(pending, contents + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(pending, target);
 } finally {
  await rm(pending, { force: true });
 }
}
