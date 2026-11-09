import 'server-only';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { valuePropositionEvidence } from './value-proposition-evidence';
import type { ValuePropositionStage } from './value-proposition-route';

export type MentorMethodSource = ReturnType<typeof valuePropositionEvidence>[number] & {
  origin: 'github' | 'verified-cache'; fetchedAt: string; excerptSha256: string;
};
export async function retrieveMentorMethods(stage: ValuePropositionStage): Promise<MentorMethodSource[]> {
  const root = existsSync(join(process.cwd(), 'scripts/mentor-method-mcp.mjs')) ? process.cwd() : resolve(process.cwd(), '../..');
  const client = new Client({ name: 'pilot-value-proposition', version: '2.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, 'scripts/mentor-method-mcp.mjs')], cwd: root,
    env: { NODE_ENV: 'production', ...((process.env.GITHUB_READ_TOKEN || process.env.PILOT_GITHUB_MCP_TOKEN) ? { GITHUB_READ_TOKEN: process.env.GITHUB_READ_TOKEN || process.env.PILOT_GITHUB_MCP_TOKEN! } : {}), ...(process.env.MENTOR_KNOWLEDGE_CACHE ? { MENTOR_KNOWLEDGE_CACHE: process.env.MENTOR_KNOWLEDGE_CACHE } : {}) }, stderr: 'pipe' });
  transport.stderr?.on('data', () => {});
  async function call(name: string, args: Record<string, string>) {
    const response = await client.callTool({ name, arguments: args }, { timeout: 20000 });
    const text = response.content?.filter((x: any) => x.type === 'text').map((x: any) => x.text).join('') || '';
    if (response.isError) throw new Error('MCP method retrieval failed: ' + text.slice(0, 500));
    if (text.length > 300000) throw new Error('MCP response exceeds budget');
    return JSON.parse(text);
  }
  try {
    await client.connect(transport, { timeout: 10000 });
    const expected = valuePropositionEvidence(stage);
    const found = await call('search_mentor_methods', { stage });
    if (!expected.every(e => found.sources?.some((s: any) => s.id === e.id && s.commit === e.commit))) throw new Error('Missing stage sources');
    const sources: MentorMethodSource[] = [];
    for (const e of expected) {
      const { source } = await call('get_mentor_method', { id: e.id });
      if (source.commit !== e.commit || source.sha256 !== e.sha256 || source.path !== e.path || source.text !== e.text ||
        !['github', 'verified-cache'].includes(source.origin) || createHash('sha256').update(source.text).digest('hex') !== source.excerptSha256) throw new Error('Unverified source');
      sources.push({ ...e, origin: source.origin, fetchedAt: source.fetchedAt, excerptSha256: source.excerptSha256 });
    }
    return sources;
  } catch (error) {
    console.error('mentor-method-retrieval', stage, error instanceof Error ? error.message : 'Unknown retrieval error');
    throw new Error('Методические источники через MCP недоступны или не прошли проверку. Ход не изменён; повторите позже.');
  } finally { await client.close(); await transport.close(); }
}
