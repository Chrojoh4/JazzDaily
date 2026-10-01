import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyJournal,validateJournal} from '../public/core.js';
import {historicallyPaid} from '../public/workflow-core.js';
import {defaultProfile,createRun,ytdFor} from '../public/payroll.js';
function fixture(){const d=emptyJournal();d.staff=[{id:'s',name:'Staff',code:'S',active:true,paidThrough:'2026-09-26',rates:[{effective:'2026-01-01',kind:'commission',cents:5000}],payroll:{...defaultProfile(),startDate:'2025-01-01',confirmed:true,vacationAgreement:true}}];return d;}
test('historical payment cutoff includes Saturday but not the new week',()=>{const d=fixture();assert.equal(historicallyPaid(d,{staffId:'s',date:'2026-09-26'}),true);assert.equal(historicallyPaid(d,{staffId:'s',date:'2026-09-27'}),false);d.staff[0].paidThrough='2026-02-30';assert.throws(()=>validateJournal(d));});
test('accepted historical commission retains unknown hours only within paid history',()=>{const d=fixture();d.timecards=[{id:'c',staffId:'s',date:'2026-09-26',minutes:null,hoursMissing:true,sales:52500,start:'',end:'',note:'Owner accepted',status:'approved'}];assert.ok(validateJournal(d));d.timecards[0].date='2026-09-27';assert.throws(()=>validateJournal(d));});
test('historical weeks cannot be paid again and opening balances must follow cutoff',()=>{const d=fixture();assert.throws(()=>createRun(d,'s',{start:'2026-09-20'},'r'),/already confirmed paid/);assert.throws(()=>ytdFor(d,'s','2026-10-03'),/actual earlier-pay balances/);d.staff[0].payroll.openingDate='2026-09-27';assert.ok(ytdFor(d,'s','2026-10-03'));assert.equal(d.payrollPayments.length,0);});
