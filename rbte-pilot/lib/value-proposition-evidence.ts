import sources from './value-proposition-evidence.json';
import type { ValuePropositionStage } from './value-proposition-route';

// Bundled, revision-pinned excerpts: available in standalone builds without
// runtime GitHub credentials, network access, or working-directory assumptions.
export function valuePropositionEvidence(stage: ValuePropositionStage) {
  const evidence = sources.filter(source => source.stages.includes('*') || source.stages.includes(stage));
  if (!evidence.some(source => source.id === `DS-RBTE.${stage.startsWith('S6.') ? 'S6' : stage}`)) {
    throw new Error('Методические материалы текущего этапа недоступны.');
  }
  return evidence.map(({ stages: _stages, ...source }) => ({
    ...source,
    url: `https://github.com/${source.repo}/blob/${source.commit}/${source.path.split('/').map(encodeURIComponent).join('/')}`,
  }));
}
