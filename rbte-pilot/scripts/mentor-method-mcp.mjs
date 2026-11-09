// Read-only GitHub knowledge MCP. No learner data, model keys or DB credentials.
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const records = JSON.parse(await readFile(join(root, 'lib/value-proposition-evidence.json'), 'utf8'));
const cache = process.env.MENTOR_KNOWLEDGE_CACHE || join(tmpdir(), 'pilot-mentor-knowledge-' + (process.getuid?.() ?? 'windows'));
const digest = text => createHash('sha256').update(text).digest('hex');
const normalize = text => text.replace(/\r\n/g, '\n');
const pending = new Map();
async function document(source) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(source.repo) || !/^[a-f0-9]{40}$/.test(source.commit)) throw new Error('Invalid source');
  const key = source.sha256;
  if (pending.has(key)) return pending.get(key);
  const promise = (async () => {
    const file = join(cache, key + '.json');
    try {
      const stored = JSON.parse(await readFile(file, 'utf8'));
      if (digest(stored.text) === key) return { ...stored, origin: 'verified-cache' };
    } catch { /* A missing or corrupt cache requires a genuine GitHub retrieval. */ }
    const privatePack = source.repo === 'Victor57618/Pack-TOC';
    const path = source.path.split('/').map(encodeURIComponent).join('/');
    const url = privatePack
      ? `https://api.github.com/repos/${source.repo}/contents/${path}?ref=${source.commit}`
      : `https://raw.githubusercontent.com/${source.repo}/${source.commit}/${path}`;
    if (privatePack && !process.env.GITHUB_READ_TOKEN) throw new Error('Private Pack-TOC requires configured GITHUB_READ_TOKEN');
    const headers = privatePack ? { Accept: 'application/vnd.github.raw+json', Authorization: `Bearer ${process.env.GITHUB_READ_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'pilot-mentor-methods' } : {};
    const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('GitHub source unavailable');
    const raw = await response.text();
    if (raw.length > 700000) throw new Error('Source too large');
    const text = normalize(raw);
    if (digest(text) !== key) throw new Error('Source revision/integrity mismatch');
    const stored = { text, fetchedAt: new Date().toISOString(), origin: 'github' };
    await mkdir(cache, { recursive: true });
    await writeFile(file, JSON.stringify(stored), { mode: 0o600 });
    return stored;
  })();
  pending.set(key, promise);
  return promise;
}
const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
serveStdio(() => {
  const server = new McpServer({ name: 'pilot-mentor-methods', version: '2.0.0' });
  server.registerTool('search_mentor_methods', {
    description: 'List exact DS-RBTE and Pack-TOC sources for one declared training stage.',
    inputSchema: z.object({ stage: z.string().regex(/^S(?:[0-9]|10|11|6\.[123])$/) }), annotations,
  }, async ({ stage }) => result({ sources: records.filter(s => s.stages.includes('*') || s.stages.includes(stage)).map(({ text, ...s }) => s) }));
  server.registerTool('get_mentor_method', {
    description: 'Read a pinned method from GitHub or its SHA-256 verified cache. Never silently substitutes a prompt snapshot.',
    inputSchema: z.object({ id: z.string().max(100) }), annotations,
  }, async ({ id }) => {
    const source = records.find(s => s.id === id);
    if (!source) return { ...result({ error: 'Unknown source ID' }), isError: true };
    try {
      const doc = await document(source);
      const match = /^L(\d+)-L(\d+)$/.exec(source.range);
      const text = match ? doc.text.split('\n').slice(Number(match[1]) - 1, Number(match[2])).join('\n') : doc.text;
      if (text !== source.text) throw new Error('Excerpt mismatch');
      return result({ source: { ...source, text, excerptSha256: digest(text), origin: doc.origin, fetchedAt: doc.fetchedAt } });
    } catch (error) {
      return { ...result({ error: `Method ${id} unavailable or not verified: ${error.message}` }), isError: true };
    }
  });
  return server;
});
