import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreMentorCloud, mentorCloudQuestion } from '../lib/mentor-cloud';
import { valuePropositionS5ExpectedBlock } from '../lib/value-proposition-route';

test('missing cloud shows five unknown blocks and starts with B without inventing facts', () => {
  const cloud = restoreMentorCloud([null, {}]);
  assert.equal(cloud.nodes.length, 5);
  assert.ok(cloud.nodes.every(n => n.status === 'unknown'));
  assert.equal(cloud.activeElementId, 'B');
  assert.match(mentorCloudQuestion(cloud), /необходимое условие/);
});

test('restoration preserves wording and statuses, merges saved snapshots and resumes first unfinished block', () => {
  const cloud = restoreMentorCloud([]);
  cloud.nodes.find(n => n.id === 'B')!.label = 'Стабильный поток обращений';
  cloud.nodes.find(n => n.id === 'B')!.status = 'accepted';
  cloud.nodes.find(n => n.id === 'D')!.label = 'Публикует объявления';
  cloud.nodes.find(n => n.id === 'D')!.status = 'candidate';
  cloud.nodes.find(n => n.id === 'A')!.status = 'accepted';
  const restored = restoreMentorCloud([cloud]);
  assert.deepEqual(restored.nodes, cloud.nodes);
  assert.equal(valuePropositionS5ExpectedBlock(restored), 'D');
  assert.equal(restored.activeElementId, 'D');
  assert.match(mentorCloudQuestion(restored), /делает/);
});
