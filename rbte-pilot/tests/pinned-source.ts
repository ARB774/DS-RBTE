import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// A newer working-tree document must not replace a reproducibly pinned source.
export async function readPinnedSource(source: { repo: string; path: string; commit: string; sha256: string }) {
  const path = source.repo === 'ARB774/DS-RBTE' ? `../${source.path}` : `knowledge/pack-toc/${source.path}`;
  const current = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
  if (createHash('sha256').update(current).digest('hex') === source.sha256) return current;
  if (source.repo !== 'ARB774/DS-RBTE') throw new Error('Pinned Pack-TOC snapshot differs');
  return execFileSync('git', ['show', `${source.commit}:${source.path}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replace(/\r\n/g, '\n');
}
