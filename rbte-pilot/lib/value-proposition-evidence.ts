import sources from './value-proposition-evidence.json';
import type { ValuePropositionStage } from './value-proposition-route';

function singleCommit(repo: string) {
  const commits = [...new Set(sources.filter(source => source.repo === repo).map(source => source.commit))];
  if (commits.length !== 1) throw new Error(`Методические источники ${repo} имеют разные редакции.`);
  return commits[0];
}

export const mentorDocumentationVersion = Object.freeze({
  dsRbte: singleCommit('ARB774/DS-RBTE'),
  packToc: singleCommit('Victor57618/Pack-TOC'),
  sourceCount: sources.length,
});

export const rbteApplicationVersion =
  process.env.RBTE_APP_COMMIT
  ?? process.env.GIT_COMMIT
  ?? process.env.VERCEL_GIT_COMMIT_SHA
  ?? 'unknown';

export const shortRevision = (revision: string) => revision === 'unknown' ? 'не указана' : revision.slice(0, 7);

// Bundled, revision-pinned excerpts: available in standalone builds without
// runtime GitHub credentials, network access, or working-directory assumptions.
export function valuePropositionEvidence(stage: ValuePropositionStage) {
  const evidence = sources.filter(source => source.stages.includes('*') || source.stages.includes(stage));
  if (!evidence.some(source => source.id === `DS-RBTE.${stage}`)) {
    throw new Error('Методические материалы текущего этапа недоступны.');
  }
  return evidence.map(({ stages: _stages, ...source }) => ({
    ...source,
    url: `https://github.com/${source.repo}/blob/${source.commit}/${source.path.split('/').map(encodeURIComponent).join('/')}`,
  }));
}
