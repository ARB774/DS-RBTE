import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { retrieveMentorMethods } from '../lib/mentor-method-client';
import { valuePropositionEvidence } from '../lib/value-proposition-evidence';

test('actual MCP transport reads verified GitHub cache and returns traceable method bodies', async () => {
  const cache = await mkdtemp(join(tmpdir(), 'mentor-mcp-test-'));
  const previous = process.env.MENTOR_KNOWLEDGE_CACHE;
  process.env.MENTOR_KNOWLEDGE_CACHE = cache;
  try {
    for (const source of valuePropositionEvidence('S0')) {
      const text = (await readFile(`../${source.path}`, 'utf8')).replace(/\r\n/g, '\n');
      await writeFile(join(cache, source.sha256 + '.json'), JSON.stringify({ text, fetchedAt: '2026-11-09', origin: 'github' }));
    }
    const sources = await retrieveMentorMethods('S0');
    assert.ok(sources.some(s => s.id === 'DS-RBTE.S0' && s.text.includes('реалистичного')));
    assert.ok(sources.every(s => s.origin === 'verified-cache' && s.excerptSha256.length === 64));
  } finally {
    if (previous === undefined) delete process.env.MENTOR_KNOWLEDGE_CACHE;
    else process.env.MENTOR_KNOWLEDGE_CACHE = previous;
    await rm(cache, { recursive: true, force: true });
  }
});

test('knowledge MCP exposes read-only stage search and exact get; arbitrary paths are rejected', async () => {
  const client = new Client({ name: 'test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(process.cwd(), 'scripts/mentor-method-mcp.mjs')], env: { NODE_ENV: 'test' }, stderr: 'pipe' });
  transport.stderr?.on('data', () => {});
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(t => t.name).sort(), ['get_mentor_method', 'search_mentor_methods']);
    assert.ok(tools.every(t => t.annotations?.readOnlyHint));
    assert.equal((await client.callTool({ name: 'get_mentor_method', arguments: { id: '../../etc/passwd' } })).isError, true);
  } finally { await client.close(); await transport.close(); }
});
