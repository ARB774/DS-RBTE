import 'server-only';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { dilemmaAssistantEvidence, valuePropositionEvidence } from './value-proposition-evidence';
import type { ValuePropositionStage } from './value-proposition-route';
import { retrievePackTocEvidence } from './pack-toc-mcp';
import { z } from 'zod';

export type MentorMethodSource = ReturnType<typeof valuePropositionEvidence>[number] & {
  origin: 'github' | 'verified-cache' | 'mcp'; fetchedAt: string; excerptSha256: string;
};

type FpfSearchHit = {
  filename?: string;
  content?: string;
  source?: string;
  github_url?: string;
  parent_filename?: string;
  parent_content?: string;
};

function toolText(response: any) {
  const value = response.content?.filter((item: any) => item.type === 'text').map((item: any) => item.text).join('') || '';
  if (response.isError) throw new Error(value.slice(0, 500) || 'MCP tool failed');
  if (value.length > 400000) throw new Error('MCP response exceeds budget');
  return JSON.parse(value);
}

function fpfPatternId(filename = '') {
  return /^FPF-Spec\.md::([A-Z](?:\.[0-9A-Z]+)+)(?:\s|$)/.exec(filename)?.[1] || null;
}

function fpfPublicationVersion(hits: FpfSearchHit[]) {
  for (const hit of hits) {
    const version = /^> \*\*Version:\*\*\s*(.+)$/m.exec(hit.parent_content || '')?.[1]?.trim();
    if (version) return version;
  }
  return 'revision-unknown';
}

export async function retrieveFpfMethods(query: string): Promise<MentorMethodSource[]> {
  const endpoint = process.env.RBTE_FPF_MCP_URL?.trim();
  const required = process.env.RBTE_REQUIRE_FPF_MCP === '1';
  if (!endpoint) {
    if (required) throw new Error('Доступ к FPF через MCP обязателен, но RBTE_FPF_MCP_URL не настроен.');
    return [];
  }
  const token = process.env.RBTE_FPF_MCP_TOKEN?.trim();
  if (!token) {
    if (required) throw new Error('Доступ к FPF через MCP обязателен, но серверный токен не настроен.');
    return [];
  }
  const client = new Client({ name: 'rbte-fpf-retrieval', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    authProvider: { token: async () => token },
    requestInit: { redirect: 'error', headers: { 'X-IWE-Tools-Mode': 'knowledge' } },
  });
  async function search(text: string, limit = 5): Promise<FpfSearchHit[]> {
    const response = await client.callTool({ name: 'knowledge_search', arguments: { query: text, source: 'FPF', limit } }, { timeout: 30000 });
    const value = toolText(response);
    if (!Array.isArray(value)) throw new Error('FPF MCP returned an invalid search result');
    return value;
  }
  try {
    await client.connect(transport, { timeout: 15000 });
    const initial = await search(query.slice(0, 12000), 8);
    const patternIds = [...new Set(initial.map(hit => fpfPatternId(hit.filename)).filter((id): id is string => Boolean(id)))].slice(0, 2);
    const sources: MentorMethodSource[] = [];
    for (const patternId of patternIds) {
      const sectionHits = (await Promise.all([
        search(`${patternId} Problem frame`, 5),
        search(`${patternId} Solution`, 5),
        search(`${patternId} Conformance Checklist`, 5),
        search(`${patternId} Anti-patterns and remedies`, 5),
      ])).flat().filter(hit => fpfPatternId(hit.filename) === patternId && hit.content && !hit.content.includes('...[truncated'));
      const unique = [...new Map(sectionHits.map(hit => [hit.filename, hit])).values()];
      const hasFrame = unique.some(hit => /Problem frame|Use this when|Intent/i.test(hit.filename || ''));
      const hasSolution = unique.some(hit => /Solution/i.test(hit.filename || ''));
      const hasCheck = unique.some(hit => /Conformance|Checklist|Anti-pattern/i.test(hit.filename || ''));
      if (!hasFrame || !hasSolution || !hasCheck) continue;
      const text = unique.map(hit => hit.content!.trim()).join('\n\n');
      const version = fpfPublicationVersion([...initial, ...unique]);
      const sha256 = createHash('sha256').update(text).digest('hex');
      sources.push({
        id: `FPF.${patternId}`,
        repo: 'MCP/FPF',
        commit: `publication-${version};index-revision-unknown`,
        path: `FPF-Spec.md::${patternId}`,
        sha256,
        range: 'selected-sections',
        text,
        url: unique.find(hit => hit.github_url)?.github_url || 'https://github.com/ailev/FPF/blob/main/FPF-Spec.md',
        origin: 'mcp',
        fetchedAt: new Date().toISOString(),
        excerptSha256: sha256,
      } as MentorMethodSource);
    }
    if (required && sources.length === 0) throw new Error('MCP не вернул достаточные разделы FPF: условия, решение и проверки.');
    return sources;
  } catch (error) {
    console.error('fpf-method-retrieval', error instanceof Error ? error.message : 'Unknown retrieval error');
    if (required) throw new Error('FPF через MCP недоступен или вернул неполный источник. Содержательный ход не выполнен.');
    return [];
  } finally {
    await client.close();
    await transport.close();
  }
}
async function retrieveMethodSources(stage: string, expected: ReturnType<typeof valuePropositionEvidence>): Promise<MentorMethodSource[]> {
  const root = existsSync(join(process.cwd(), 'scripts/mentor-method-mcp.mjs')) ? process.cwd() : resolve(process.cwd(), '../..');
  const client = new Client({ name: 'pilot-mentor-methods', version: '2.1.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, 'scripts/mentor-method-mcp.mjs')], cwd: root,
    env: { NODE_ENV: 'production', ...((process.env.GITHUB_READ_TOKEN || process.env.PILOT_GITHUB_MCP_TOKEN) ? { GITHUB_READ_TOKEN: process.env.GITHUB_READ_TOKEN || process.env.PILOT_GITHUB_MCP_TOKEN! } : {}), ...(process.env.MENTOR_KNOWLEDGE_CACHE ? { MENTOR_KNOWLEDGE_CACHE: process.env.MENTOR_KNOWLEDGE_CACHE } : {}) }, stderr: 'pipe' });
  transport.stderr?.on('data', () => {});
  async function call(name: string, args: Record<string, string>) {
    const response = await client.callTool({ name, arguments: args }, { timeout: 45000 });
    const text = response.content?.filter((x: any) => x.type === 'text').map((x: any) => x.text).join('') || '';
    if (response.isError) throw new Error('MCP method retrieval failed: ' + text.slice(0, 500));
    if (text.length > 300000) throw new Error('MCP response exceeds budget');
    return JSON.parse(text);
  }
  try {
    await client.connect(transport, { timeout: 10000 });
    const found = await call('search_mentor_methods', { stage });
    if (!expected.every(e => found.sources?.some((s: any) => s.id === e.id && s.commit === e.commit))) throw new Error('Missing stage sources');
    const sources = await Promise.all(expected.map(async e => {
      const { source } = await call('get_mentor_method', { id: e.id });
      if (source.commit !== e.commit || source.sha256 !== e.sha256 || source.path !== e.path || source.text !== e.text ||
        !['github', 'verified-cache'].includes(source.origin) || createHash('sha256').update(source.text).digest('hex') !== source.excerptSha256) throw new Error('Unverified source');
      return { ...e, text: source.text, origin: source.origin, fetchedAt: source.fetchedAt, excerptSha256: source.excerptSha256 } as MentorMethodSource;
    }));
    return sources;
  } catch (error) {
    console.error('mentor-method-retrieval', stage, error instanceof Error ? error.message : 'Unknown retrieval error');
    throw new Error('Методические источники через MCP недоступны или не прошли проверку. Ход не изменён; повторите позже.');
  } finally { await client.close(); await transport.close(); }
}

export async function retrieveMentorMethods(stage: ValuePropositionStage, context = ''): Promise<MentorMethodSource[]> {
  const methods = await retrieveMethodSources(stage, valuePropositionEvidence(stage));
  const fpf = await retrieveFpfMethods(`Работа наставника RBTE, этап ${stage}. ${context}`);
  return [...methods, ...fpf];
}

export async function retrieveDilemmaAssistantMethods(step: string, context = ''): Promise<MentorMethodSource[]> {
  const methods = await retrieveMethodSources(`DILEMMA.${step}`, dilemmaAssistantEvidence(step));
  const fpf = await retrieveFpfMethods(`Помощь в построении личной дилеммы методом Тучи ТОС, текущий шаг ${step}. ${context}`);
  return [...methods, ...fpf];
}

const conflictRules = z.object({
  sources: z.array(z.object({id:z.string(),path:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/),text:z.string().min(1)})).length(3),
});

export async function retrieveConflictAssistantMethods(_step: string, context = ''): Promise<MentorMethodSource[]> {
  const root = existsSync(join(process.cwd(), 'scripts/mentor-method-mcp.mjs')) ? process.cwd() : resolve(process.cwd(), '../..');
  const client = new Client({name:'conflict-assistant',version:'1.0.0'});
  const transport = new StdioClientTransport({command:process.execPath,args:[join(root,'scripts/mentor-method-mcp.mjs')],cwd:root,env:{NODE_ENV:'production'},stderr:'pipe'});
  try {
    await client.connect(transport,{timeout:10000});
    const reply = await client.callTool({name:'get_conflict_assistant_rules',arguments:{}},{timeout:10000});
    const content = reply.content?.[0];
    if (reply.isError || content?.type !== 'text') throw new Error('Conflict rules unavailable');
    const {sources} = conflictRules.parse(JSON.parse(content.text));
    const required = ['DS-RBTE.ASSISTANT-SKILL','DS-RBTE.CONFLICT.ACCEPTANCE','DS-RBTE.CONFLICT.ASSISTANT-SPEC'];
    if (!required.every(id => sources.some(source => source.id === id)) ||
        sources.some(source => createHash('sha256').update(source.text).digest('hex') !== source.sha256)) {
      throw new Error('Unverified conflict rules');
    }
    const {evidence,retrieval} = await retrievePackTocEvidence(['TOCT.14','TOC.M.003','TOC.WP.006']);
    const revision = createHash('sha256').update(sources.map(source=>source.sha256).join('')).digest('hex');
    const fetchedAt = new Date().toISOString();
    const rules = sources.map(source => ({...source,repo:'ARB774/DS-RBTE',commit:revision,range:'full',url:'',origin:'mcp' as const,fetchedAt,excerptSha256:source.sha256}));
    const methods = evidence.map(({excerpt,...source}) => ({...source,text:excerpt,repo:'Victor57618/Pack-TOC',commit:retrieval.commit,range:'full',origin:'mcp' as const,fetchedAt,excerptSha256:source.sha256}));
    const fpf = await retrieveFpfMethods(`Конфликт сторон, проверка масштаба и основания вывода по C.39.SA и C.39.GA. ${context}`);
    return [...rules,...methods,...fpf];
  } catch {
    throw new Error('Методические источники через MCP недоступны или не прошли проверку. Ход не изменён; повторите позже.');
  } finally {
    await client.close();
    await transport.close();
  }
}
