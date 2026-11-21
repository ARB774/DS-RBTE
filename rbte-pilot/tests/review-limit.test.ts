import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewDailyLimit } from '../lib/review-store';

test('daily AI review limit is disabled unless the server explicitly enables it',()=>{
 assert.equal(reviewDailyLimit(undefined),null);
 assert.equal(reviewDailyLimit(''),null);
 assert.equal(reviewDailyLimit('0'),null);
 assert.equal(reviewDailyLimit('-1'),null);
 assert.equal(reviewDailyLimit('20'),20);
});
