import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyJournal,ensureMonth,moveBill,allocations} from '../public/core.js';
test('moving a bill preserves category, amounts, other accounts, templates and coverage',()=>{
 const db=emptyJournal();ensureMonth(db,'2026-09');
 db.months['2026-09'].bills=[{id:'home',company:'Telus',label:'Home',category:'personal',amount:10000,paid:5000,due:'2026-09-11'},{id:'shop',company:'Telus',label:'Shop',category:'business',amount:15000,paid:0,due:'2026-09-11'}];
 const before=structuredClone(db),coverage=allocations(db,'2026-09');
 assert.equal(moveBill(db,'2026-09','home','2026-09-14'),true);
 const expected=structuredClone(before);expected.months['2026-09'].bills[0].due='2026-09-14';
 assert.deepEqual(db,expected);assert.deepEqual(allocations(db,'2026-09'),coverage);
 assert.equal(moveBill(db,'2026-09','home','2026-09-14'),false);
 for(const date of ['2026-10-01','2026-09-31','invalid'])assert.throws(()=>moveBill(db,'2026-09','home',date));
 assert.throws(()=>moveBill(db,'2026-09','missing','2026-09-14'));assert.deepEqual(db,expected);
});
