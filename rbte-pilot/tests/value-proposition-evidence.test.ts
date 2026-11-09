import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valuePropositionEvidence } from '../lib/value-proposition-evidence';
import { valuePropositionStages } from '../lib/value-proposition-route';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('bundled excerpts match the pinned repository documents without invented method text', async () => {
  const checked = new Set<string>();
  for (const stage of valuePropositionStages) for (const source of valuePropositionEvidence(stage)) {
    if (checked.has(source.id)) continue;
    checked.add(source.id);
    const path = source.repo === 'ARB774/DS-RBTE' ? `../${source.path}` : `knowledge/pack-toc/${source.path}`;
    const text = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(text).digest('hex'), source.sha256);
    assert.ok(text.includes(source.text));
  }
});

test('each mentor stage receives substantive pinned DS-RBTE evidence', () => {
  for (const stage of valuePropositionStages) {
    const evidence = valuePropositionEvidence(stage);
    assert.ok(evidence.some(s => s.id === 'DS-RBTE.CORE'));
    assert.ok(evidence.some(s => s.id === `DS-RBTE.${stage.startsWith('S6.') ? 'S6' : stage}`));
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
