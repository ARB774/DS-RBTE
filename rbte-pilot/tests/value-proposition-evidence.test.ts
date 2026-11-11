import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentorDocumentationVersion, valuePropositionEvidence } from '../lib/value-proposition-evidence';
import { valuePropositionStages } from '../lib/value-proposition-route';
import { readPinnedSource } from './pinned-source';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

test('bundled excerpts match the pinned repository documents without invented method text', async () => {
  const checked = new Set<string>();
  for (const stage of valuePropositionStages) for (const source of valuePropositionEvidence(stage)) {
    if (checked.has(source.id)) continue;
    checked.add(source.id);
    const text = await readPinnedSource(source);
    assert.equal(createHash('sha256').update(text).digest('hex'), source.sha256);
    assert.ok(text.includes(source.text));
  }
});

test('each mentor stage receives substantive pinned DS-RBTE evidence', () => {
  for (const stage of valuePropositionStages) {
    const evidence = valuePropositionEvidence(stage);
    assert.ok(evidence.some(s => s.id === 'DS-RBTE.CORE'));
    assert.ok(evidence.some(s => s.id === `DS-RBTE.${stage}`));
    for (const source of evidence) {
      assert.match(source.commit, /^[a-f0-9]{40}$/);
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
      assert.ok(source.text.length > 100);
    }
  }
});

test('cloud and assumptions receive Pack-TOC; S0 gets admission criteria rather than cloud procedure', () => {
  assert.ok(valuePropositionEvidence('S5').some(s => s.id === 'TOC.M.003'));
  assert.ok(valuePropositionEvidence('S6.2').some(s => s.id === 'TOC.WP.003'));
  assert.ok(valuePropositionEvidence('S8').some(s => s.id === 'TOC.WP.006'));
  const admission = valuePropositionEvidence('S0');
  assert.ok(!admission.some(s => s.id.startsWith('TOC.')));
  assert.match(admission.find(s => s.id === 'DS-RBTE.S0')!.text, /доступ|данны/);
});

test('current mentor documentation carries the previously accepted pilot corrections', () => {
  const fieldRules = valuePropositionEvidence('S2').map(source => source.text).join('\n');
  assert.match(fieldRules, /интернет-маркетинг/);
  assert.match(fieldRules, /продукт, предлагаемый рынку/);

  const formulationRules = valuePropositionEvidence('S4').find(source => source.id === 'DS-RBTE.FORMULATION');
  assert.match(formulationRules?.text ?? '', /просит участника переформулировать/);
  assert.match(formulationRules?.text ?? '', /окончательное содержание остаётся\s+за ним/);

  const cloudRules = valuePropositionEvidence('S5').find(source => source.id === 'DS-RBTE.S5');
  assert.match(cloudRules?.text ?? '', /B → D → C → D′ → A/);
  const canonical = [
    'Предложение ценности B2B/Постоянное ядро наставника.md',
    'Предложение ценности B2B/Карточка состояния наставника.md',
    'Предложение ценности B2B/Оперативный модуль работы с Тучей.md',
    'Предложение ценности B2B/Техническое задание на наставничество обучающегося по теме Разработка предложения ценности на B2B-рынке.md',
  ];
  const latestDocumentationCommit = execFileSync('git', ['log', '-1', '--format=%H', '--', ...canonical], { cwd: '..', encoding: 'utf8' }).trim();
  assert.equal(mentorDocumentationVersion.dsRbte, latestDocumentationCommit);
});
