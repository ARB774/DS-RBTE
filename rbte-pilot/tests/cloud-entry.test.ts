import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudEntryFields,MANUAL_CLOUD_VERSION } from '../lib/cloud-entry';
import { parseStepFields } from '../lib/steps';
test('all profiles start empty instead of importing an old saved cloud',()=>{
 for(const profile of ['DILEMMA','CONFLICT','LT_CLOUD','IMMUNITY']){
  const old={goal:'Прежняя цель',needA:'Потребность',actionA:'Действие'};
  const entry=cloudEntryFields('cloud',old);
  const fields=parseStepFields('cloud',entry,profile);
  for(const key of ['goal','needA','needB','actionA','actionB'])assert.equal(fields[key],'');
  assert.equal(old.goal,'Прежняя цель'); // Read-only transition retains previous content.
 }
});
test('manual saved answers survive reopening; old practice starts empty too',()=>{
 const manual={goal:'Моя цель',__cloudEntry:MANUAL_CLOUD_VERSION};
 assert.equal(cloudEntryFields('cloud',manual),manual);
 assert.deepEqual(cloudEntryFields('practice',{goal:'Старый пример'}),{});
 const logic={ab:'Моя проверка'};
 assert.equal(cloudEntryFields('logic',logic),logic);
});
