import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { deliverSavedMentorTurn } from '../lib/mentor-delivery';

test('provider and reply-transaction errors retain the participant answer without changing the product', async () => {
  const db = new PGlite();
  try {
    await db.exec("create table attempts(id int primary key, content text); create table product(value text); insert into product values ('previous'); create table notices(id int);");
    for (const failure of ['provider', 'persistence']) {
      const id = failure === 'provider' ? 1 : 2;
      const ok = await deliverSavedMentorTurn({
        saveParticipant: async () => { await db.query('insert into attempts values ($1,$2) on conflict do nothing', [id, 'Самостоятельный ответ участника']); },
        generate: async () => { if (failure === 'provider') throw new Error('Invalid provider response'); return 'candidate'; },
        saveReply: async () => { await db.transaction(async tx => { await tx.query("update product set value='changed'"); throw new Error('Concurrent update'); }); },
        saveFailure: async () => { await db.query('insert into notices values ($1)', [id]); },
      });
      assert.equal(ok, false);
      assert.equal((await db.query<{ content: string }>('select content from attempts where id=$1', [id])).rows[0].content, 'Самостоятельный ответ участника');
      assert.equal((await db.query<{ value: string }>('select value from product')).rows[0].value, 'previous');
    }
    assert.equal((await db.query('select * from notices')).rows.length, 2);
  } finally { await db.close(); }
});

test('successful delivery runs generation only after the independent answer has been saved', async () => {
  const order: string[] = [];
  assert.equal(await deliverSavedMentorTurn({ saveParticipant: async () => { order.push('saved'); },
    generate: async () => { assert.deepEqual(order, ['saved']); order.push('generated'); return 'reply'; },
    saveReply: async reply => { assert.equal(reply, 'reply'); order.push('committed'); },
    saveFailure: async () => { throw new Error('Unexpected failure'); },
  }), true);
  assert.deepEqual(order, ['saved', 'generated', 'committed']);
});

test('a failure while writing the service notice does not propagate a provider crash', async () => {
  let saved = false;
  const ok = await deliverSavedMentorTurn({ saveParticipant: async () => { saved = true; },
    generate: async () => { throw new Error('Provider unavailable'); },
    saveReply: async () => { throw new Error('Should not run'); },
    saveFailure: async () => { throw new Error('Notice write unavailable'); },
  });
  assert.equal(saved, true);
  assert.equal(ok, false);
});
