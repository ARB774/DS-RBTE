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

function evidenceForStage(stage: string, includeGlobal = true) {
  return sources.filter(source => (includeGlobal && source.stages.includes('*')) || source.stages.includes(stage)).map(({ stages: _stages, ...source }) => ({
    ...source,
    url: `https://github.com/${source.repo}/blob/${source.commit}/${source.path.split('/').map(encodeURIComponent).join('/')}`,
  }));
}

// Bundled, revision-pinned excerpts: available in standalone builds without
// runtime GitHub credentials, network access, or working-directory assumptions.
export function valuePropositionEvidence(stage: ValuePropositionStage) {
  const evidence = evidenceForStage(stage);
  if (!evidence.some(source => source.id === `DS-RBTE.${stage}`)) {
    throw new Error('Методические материалы текущего этапа недоступны.');
  }
  return evidence;
}

export function dilemmaAssistantEvidence(step: string) {
  const evidence = evidenceForStage(`DILEMMA.${step}`, false);
  if (!evidence.some(source => source.id === 'DS-RBTE.DILEMMA.ACCEPTANCE') ||
      !evidence.some(source => source.id === 'DS-RBTE.DILEMMA.AI-ROLE') ||
      !evidence.some(source => source.id === 'DS-RBTE.DILEMMA.KNOWLEDGE')) {
    throw new Error('Документация ИИ-помощника по личной дилемме недоступна.');
  }
  return evidence;
}
