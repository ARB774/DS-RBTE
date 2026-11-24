import 'server-only';
import { tocSourceIds, tocSources } from './pack-toc';
import { retrievePackTocEvidence } from './pack-toc-mcp';
import type { Profile } from './cloud-method';

export async function getTocEvidence(profile: Profile, step: string) {
  const ids = tocSourceIds(profile, step);
  const { evidence } = await retrievePackTocEvidence(ids);
  return evidence.map(({ id, excerpt: text }) => {
    const start = Math.max(0, text.search(/^### TOCT\.\d+:4 -|^## Порядок построения|^## 12-шаговый алгоритм|^## Критерии качества|^## Минимум опознания/m));
    return {
      ...tocSources[id],
      excerpt: text.slice(start, start + Math.min(1800, Math.floor(12000 / ids.length))),
    };
  });
}
