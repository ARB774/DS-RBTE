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
    prohibitedShortcuts: 'Не активировать другой этап до предъявления и подтверждения выходного продукта. Не заменять действие участника готовым решением. Не считать прежний ответ наставника доказательством.',
    insufficientData: 'Сохранить неизвестное, принять допустимую предварительную версию либо назвать конкретную недоступную предпосылку из процедуры. При непонимании объяснить действие, а не повторять анкету.',
    resume: 'Прочитать карточку, последний пакет перехода и принятые версии. Историю использовать только для проверки происхождения.',
  };
}
