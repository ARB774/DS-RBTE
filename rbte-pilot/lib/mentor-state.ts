import { z } from 'zod';
import { valuePropositionStageSchema, type ValuePropositionStage } from './value-proposition-route';

export const admissionKeys = ['scope', 'role', 'data', 'privacy', 'result'] as const;
export type AdmissionKey = typeof admissionKeys[number];
export const admissionLabels: Record<AdmissionKey, string> = {
  scope: 'Одно B2B-поле проекта', role: 'Роль и полномочия участника', data: 'Доступный материал и путь проверки',
  privacy: 'Допустимый режим данных', result: 'Результат обучения',
};
export const admissionQuestions: Record<AdmissionKey, string> = {
  scope: 'Какую одну услугу вашей компании для организаций берём в работу?',
  role: 'Что вы можете делать в этом проекте и кто утверждает предложение?',
  data: 'На какие беседы, случаи или профессиональный опыт о клиентах вы можете опереться?',
  privacy: 'Можно ли работать с обезличенными описаниями случаев, без имён, контактов и закрытых документов?',
  result: 'Какой результат разработки предложения ценности вы хотите научиться получать самостоятельно?',
};
const factSchema = z.object({ key: z.enum(admissionKeys), value: z.string().min(1).max(2000), quote: z.string().min(1).max(2000) });
export const admissionUpdateSchema = z.array(factSchema).max(5);
const productSchema = z.object({ stage: valuePropositionStageSchema, version: z.number().int().positive(), text: z.string(),
  status: z.enum(['draft', 'confirmed']), ready: z.boolean().default(false), unknowns: z.array(z.string()), sourceIds: z.array(z.string()), visualization: z.unknown().optional() });
const packetSchema = z.object({ from: valuePropositionStageSchema, to: valuePropositionStageSchema, product: productSchema,
  decisions: z.array(z.string()), unknowns: z.array(z.string()), assistance: z.string(), independentAction: z.string() });
export const mentorStateSchema = z.object({
  version: z.literal(2), admission: z.array(factSchema).default([]), products: z.array(productSchema).default([]),
  packets: z.array(packetSchema).default([]), pending: productSchema.nullable().default(null),
  lastQuestion: z.string().default(''), lastGapKey: z.string().default(''), repeats: z.number().default(0),
  legacyEvidence: z.unknown().optional(),
});
export type MentorState = z.infer<typeof mentorStateSchema>;
export function readMentorState(value: unknown): MentorState {
  const parsed = mentorStateSchema.safeParse(value);
  return parsed.success ? parsed.data : { version: 2, admission: [], products: [], packets: [], pending: null,
    lastQuestion: '', lastGapKey: '', repeats: 0, legacyEvidence: value ?? [] };
}
export function mergeAdmission(state: MentorState, updates: z.infer<typeof admissionUpdateSchema>, learnerTexts: string[]) {
  const next = new Map(state.admission.map(f => [f.key, f]));
  for (const update of updates) {
    // Mentor prose is never accepted as evidence of a participant decision.
    if (!learnerTexts.some(text => text.includes(update.quote))) throw new Error('Источник принятого пункта не найден в словах участника.');
    next.set(update.key, update);
  }
  return { ...state, admission: [...next.values()] };
}
export function missingAdmission(state: MentorState) { return admissionKeys.filter(key => !state.admission.some(f => f.key === key)); }
export function admissionProduct(state: MentorState) { return state.admission.map(f => `${admissionLabels[f.key]}: ${f.value}`).join('\n'); }
export function normalizeQuestion(text: string) { return text.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
export type MentorIntent = 'answer' | 'sources' | 'explanation' | 'confirm';
export function mentorIntent(text: string, explicit?: string): MentorIntent {
  if (explicit === 'answer') return 'answer';
  if (explicit === 'confirm') return 'confirm';
  if (explicit === 'sources' || /(?:какие|какими|откуда|каким).{0,55}(?:документ|источник|материал)|(?:используешь|доступны).{0,25}(?:документ|источник)|\bmcp\b/iu.test(text)) return 'sources';
  if (explicit === 'explanation' || /непонятно|не понимаю|переформулируй|поясни|что входит в границ|что (?:такое|значит)/iu.test(text)) return 'explanation';
  if (/^(?:да|подтверждаю|согласовано|принимаю|всё верно|все верно)[.!\s]*$/iu.test(text.trim())) return 'confirm';
  return 'answer';
}
export function activeProduct(state: MentorState, stage: ValuePropositionStage) { return state.products.filter(p => p.stage === stage).at(-1); }
