// Shared workflow helpers. No storage or network access.
export const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const weekStart=date=>addDays(date,-new Date(date+'T12:00:00Z').getUTCDay());
export const holidays2026=Object.freeze({'2026-01-01':"New Year’s Day",'2026-02-16':'Family Day','2026-04-03':'Good Friday','2026-05-18':'Victoria Day','2026-07-01':'Canada Day','2026-08-03':'BC Day','2026-09-07':'Labour Day','2026-09-30':'National Day for Truth and Reconciliation','2026-10-12':'Thanksgiving','2026-11-11':'Remembrance Day','2026-12-25':'Christmas Day'});
export function rolesFor(staff){return [{id:'default',name:staff.mainJob||'Main job',rates:staff.rates},...(staff.roles??[])];}
export function rateForCard(db,card){const s=db.staff.find(s=>s.id===card.staffId);return s?rolesFor(s).find(r=>r.id===(card.roleId||'default'))?.rates.filter(r=>r.effective<=card.date).sort((a,b)=>b.effective.localeCompare(a.effective))[0]??null:null;}
export function allocateCents(total,weights){
  const entries=Object.entries(weights).sort(([a],[b])=>a.localeCompare(b));
  if(!entries.length)return {};
  const sum=entries.reduce((s,[,v])=>s+v,0),denominator=sum||entries.length;
  const portions=entries.map(([date,w])=>{const exact=total*(sum?w:1)/denominator;return {date,value:Math.floor(exact),fraction:exact-Math.floor(exact)};});
  let remainder=total-portions.reduce((s,p)=>s+p.value,0);
  for(const p of [...portions].sort((a,b)=>b.fraction-a.fraction||a.date.localeCompare(b.date))){if(remainder-->0)p.value++;}
  return Object.fromEntries(portions.map(p=>[p.date,p.value]));
}
export function payrollCostDays(db,staffId,start,end,earn){
  const cards=db.timecards.filter(c=>c.staffId===staffId&&c.status==='approved'&&c.date>=start&&c.date<=end),weights={};
  for(const c of cards)weights[c.date]=(weights[c.date]??0)+(earn(db,c)??0);
  if(!Object.keys(weights).length){for(let d=start;d<=end;d=addDays(d,1)){if(['worked','planned'].includes(db.months[d.slice(0,7)]?.days[d]?.status))weights[d]=1;}}
  if(!Object.keys(weights).length)weights[end]=1;
  return weights;
}
export function periodLocked(db,staffId,date){return (db.payrollRuns??[]).some(r=>r.staffId===staffId&&r.status!=='void'&&r.input.start<=date&&date<=r.input.end);}
export function historicallyPaid(db,card){const through=db.staff.find(s=>s.id===card.staffId)?.paidThrough;return !!through&&card.date<=through;}
export function holidayEvidence(db,staffId,date){return JSON.stringify({start:db.staff.find(s=>s.id===staffId)?.payroll?.startDate??'',cards:db.timecards.filter(c=>c.staffId===staffId&&c.date>=addDays(date,-30)&&c.date<=date&&c.status!=='rejected').map(c=>[c.id,c.date,c.minutes,c.status]).sort((a,b)=>a[0].localeCompare(b[0]))});}
export function holidayReviewed(db,staffId,date){return (db.holidayReviews??[]).some(r=>r.staffId===staffId&&r.date===date&&r.evidence===holidayEvidence(db,staffId,date));}
export function payrollAlerts(db,staffId,start,end){
  const cards=db.timecards.filter(c=>c.staffId===staffId&&c.status!=='rejected'),inPeriod=cards.filter(c=>c.date>=start&&c.date<=end),days={},weeks={};
  // A BC overtime week is Sunday–Saturday, even when the pay period starts elsewhere.
  for(const c of cards){days[c.date]=(days[c.date]??0)+c.minutes;const w=weekStart(c.date);weeks[w]=(weeks[w]??0)+c.minutes;}
  const overtime=Object.entries(days).filter(([d,n])=>d>=start&&d<=end&&n>480).map(([d,n])=>`${d}: ${(n/60).toFixed(2)} hours in one day`);
  for(const [w,n]of Object.entries(weeks))if(w<=end&&addDays(w,6)>=start&&n>2400)overtime.push(`Week starting ${w}: ${(n/60).toFixed(2)} hours`);
  const holidays=Object.entries(holidays2026).filter(([d])=>d>=start&&d<=end).map(([date,name])=>{const prior=cards.filter(c=>c.status==='approved'&&c.date>=addDays(date,-30)&&c.date<date);return {date,name,recordedDays:new Set(prior.map(c=>c.date)).size,worked:inPeriod.some(c=>c.date===date)};});
  return {overtime,holidays,pending:inPeriod.filter(c=>c.status==='pending').length,unknownYear:start.slice(0,4)!=='2026'||end.slice(0,4)!=='2026'};
}
