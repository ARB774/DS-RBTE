import { valuePropositionRoute, type ValuePropositionStage } from './value-proposition-route';
import type { MentorMethodSource } from './mentor-method-client';
import type { MentorState } from './mentor-state';

export function activeMentorModule(stage: ValuePropositionStage, state: MentorState, sources: MentorMethodSource[]) {
  const sourceId = `DS-RBTE.${stage}`;
  const procedure = sources.find(s => s.id === sourceId);
  if (!procedure) throw new Error('Не прочитана процедура активного модуля.');
  const route = valuePropositionRoute[stage];
  return {
    id: stage, title: route.label, purpose: route.goal,
    input: state.packets.at(-1)?.product ?? state.products.at(-1) ?? 'Карточка проекта и самостоятельный материал участника',
    output: route.workProduct, completion: route.acceptance,
    procedure: { sourceId, commit: procedure.commit, range: procedure.range, text: procedure.text },
  };
}
