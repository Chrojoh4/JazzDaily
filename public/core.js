export const uid = () => crypto.randomUUID();
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const sum = a => a.reduce((x,y) => x+y, 0);
export const money = n => new Intl.NumberFormat('en-CA', {style:'currency', currency:'CAD'}).format(n/100);
export function cents(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) throw new Error('Enter a non-negative amount with at most two decimal places.');
  const n = Math.round(Number(value)*100);
  if (!Number.isSafeInteger(n) || n > 1e11) throw new Error('Amount is too large.');
  return n;
}
export function validDate(s) { if(typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s; }
export function dates(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid month.');
  return Array.from({length:new Date(+month.slice(0,4),+month.slice(5),0).getDate()}, (_,i) => `${month}-${String(i+1).padStart(2,'0')}`);
}
export const weekday = date => new Date(date+'T12:00:00').getDay();
export function emptyJournal() {
  return { format:'monthly-journal', version:1, id:uid(), name:'My business', updatedAt:null,
    settings:{weekdays:[1,2,3,4,5], allocation:'remaining', google:{clientId:'',sheetId:'',range:"'Form Responses 1'!A:Z",dateOrder:'MDY'}},
    staff:[], billTemplates:[], months:{}, timecards:[], payrollPayments:[], importKeys:[] };
}
export function ensureMonth(db, month) {
  if (db.months[month]) return db.months[month];
  const days = Object.fromEntries(dates(month).map(date => [date, {status:db.settings.weekdays.includes(weekday(date))?'planned':'off',sales:null,lockedAllowance:null,note:''}]));
  const bills = db.billTemplates.filter(b=>b.start<=month && (!b.end||b.end>=month)).map(b=>({id:uid(),templateId:b.id,company:b.company,label:b.label,category:b.category,amount:b.amount,due:`${month}-${String(Math.min(b.day,dates(month).length)).padStart(2,'0')}`,paid:0}));
  return db.months[month] = {days,bills,expenses:[]};
}
function spread(amount, keys) {
  const base = Math.trunc(amount/keys.length), rem = amount-base*keys.length;
  return Object.fromEntries(keys.map((key,i)=>[key,base+(i<Math.abs(rem)?Math.sign(rem):0)]));
}
export function allocations(db, month) {
  const m=db.months[month], total=sum(m.bills.map(b=>b.amount));
  const active=Object.keys(m.days).filter(d=>['planned','worked'].includes(m.days[d].status)).sort();
  let values={}, outstanding=total;
  if(db.settings.allocation==='remaining') {
    const fixed=active.filter(d=>m.days[d].status==='worked' && m.days[d].lockedAllowance!==null);
    for(const d of fixed) values[d]=m.days[d].lockedAllowance;
    outstanding-=sum(Object.values(values));
    const remaining=active.filter(d=>!fixed.includes(d));
    if(remaining.length) { Object.assign(values,spread(outstanding,remaining)); outstanding=0; }
  } else if(active.length) { values=spread(total,active); outstanding=0; }
  return {values,total,outstanding,active:active.length};
}
export function setDayStatus(db,month,date,status) {
  const day=db.months[month].days[date];
  if(!['planned','worked','cancelled','off'].includes(status)) throw new Error('Invalid day status.');
  if(status==='worked' && day.status!=='worked') {
    day.status='planned'; day.lockedAllowance=null;
    day.lockedAllowance=allocations(db,month).values[date]??0;
  } else if(status!=='worked') day.lockedAllowance=null;
  day.status=status;
}
export function rateFor(db,staffId,date) {
  const staff=db.staff.find(s=>s.id===staffId);
  return staff?.rates.filter(r=>r.effective<=date).sort((a,b)=>b.effective.localeCompare(a.effective))[0]?.cents??null;
}
export function earned(db,card) { const rate=rateFor(db,card.staffId,card.date); return rate===null?null:Math.round(card.minutes*rate/60); }
export function dayTotals(db,month,date) {
  const m=db.months[month], day=m.days[date], cards=db.timecards.filter(t=>t.date===date&&t.status==='approved');
  const wages=cards.map(c=>earned(db,c)), missing=wages.some(x=>x===null);
  const expenses=sum(m.expenses.filter(e=>e.date===date).map(e=>e.amount));
  const allowance=allocations(db,month).values[date]??0;
  const wage=missing?null:sum(wages);
  return {sales:day.sales,wages:wage,expenses,allowance,clear:day.sales===null||missing?null:day.sales-wage-expenses-allowance};
}
export function totals(db,month) {
  const m=db.months[month], all=Object.keys(m.days).map(d=>dayTotals(db,month,d));
  const wages=all.some(d=>d.wages===null)?null:sum(all.map(d=>d.wages));
  return { sales:sum(all.map(d=>d.sales??0)),wages,bills:sum(m.bills.map(b=>b.amount)),expenses:sum(m.expenses.map(e=>e.amount)),
    clear:all.some(d=>d.sales!==null&&d.clear===null)?null:sum(all.filter(d=>d.sales!==null).map(d=>d.clear)),
    paid:sum(m.bills.map(b=>b.paid)),personal:sum(m.bills.filter(b=>b.category==='personal').map(b=>b.amount)),business:sum(m.bills.filter(b=>b.category==='business').map(b=>b.amount)),
    payrollPaid:sum(db.payrollPayments.filter(p=>p.date.startsWith(month)).map(p=>p.amount)),entered:all.filter(d=>d.sales!==null).length };
}
export function shiftMinutes(start,end,breakMinutes) {
  const parse=s=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new Error('Use a valid start and end time.');return +s.slice(0,2)*60 + +s.slice(3);};
  const a=parse(start), b=parse(end), pause=Number(breakMinutes);
  if(b<=a) throw new Error('End must be after start. Split overnight shifts at midnight using separate dated hours entries.');
  if(!Number.isInteger(pause)||pause<0||pause>=b-a) throw new Error('Unpaid break must be shorter than the shift.');
  return b-a-pause;
}
export function cardIssue(db,card) {
  if(!db.staff.some(s=>s.id===card.staffId)) return 'Select a matching employee.';
  if(!validDate(card.date)) return 'Invalid work date.';
  if(!Number.isInteger(card.minutes)||card.minutes<=0||card.minutes>1440) return 'Hours must be greater than zero and no more than 24.';
  if(rateFor(db,card.staffId,card.date)===null) return 'No wage rate covers this work date.';
  const others=db.timecards.filter(t=>t.id!==card.id&&t.staffId===card.staffId&&t.date===card.date&&t.status==='approved');
  if(sum(others.map(t=>t.minutes))+card.minutes>1440) return 'Approved hours would exceed 24 for this day.';
  if(others.some(t=>!t.start||!card.start||(card.start<t.end&&card.end>t.start))) return 'Possible duplicate or overlapping shift. Review existing time cards first.';
  return '';
}
export function parseCSV(text) {
  const rows=[]; let row=[], field='', quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted&&text[i+1]==='"') {field+='"';i++;} else quoted=!quoted; }
    else if(c===','&&!quoted) {row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted) {if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('CSV contains an unclosed quoted field.');
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function importDate(s,order='MDY') {
  s=s.trim(); if(validDate(s))return s;
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m)throw new Error('Use YYYY-MM-DD or slash dates matching the selected date order.');
  const date=`${m[3]}-${(order==='MDY'?m[1]:m[2]).padStart(2,'0')}-${(order==='MDY'?m[2]:m[1]).padStart(2,'0')}`;
  if(!validDate(date))throw new Error('Invalid date.');return date;
}
export function importTime(value) {
  const m=value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if(!m)throw new Error('Invalid time. Use HH:mm or a time such as 9:00 AM.');
  let h=+m[1];const min=+m[2],sec=+(m[3]||0),period=m[4]?.toUpperCase();
  if(min>59||sec!==0||h>23||(period&&(h<1||h>12)))throw new Error('Time must be valid and use whole minutes.');
  if(period)h=h%12+(period==='PM'?12:0);
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}
export function prepareImport(db,rows,mapping,dateOrder) {
  const seen=new Set(db.importKeys), output=[];
  rows.slice(1).forEach((row,index)=>{
    if(!row.some(v=>String(v).trim()))return;
    const get=k=>String(row[mapping[k]]??'').trim();
    const key=JSON.stringify(['form-v1',get('timestamp'),get('employee').toLowerCase(),get('date'),get('hours'),get('start'),get('end'),get('break')]);
    if(seen.has(key)) { output.push({row:index+2,duplicate:true});return; }
    seen.add(key);
    try {
      const staff=db.staff.filter(s=>s.code.toLowerCase()===get('employee').toLowerCase()||s.name.toLowerCase()===get('employee').toLowerCase());
      if(staff.length!==1)throw new Error('Employee does not match one unique staff name or code.');
      const date=importDate(get('date'),dateOrder);
      let minutes,start='',end='';
      if(get('hours')) { const hours=Number(get('hours')); if(!Number.isFinite(hours))throw new Error('Invalid hours.'); minutes=Math.round(hours*60); }
      else {start=importTime(get('start'));end=importTime(get('end'));minutes=shiftMinutes(start,end,get('break')||0);}
      if(minutes<=0||minutes>1440)throw new Error('Hours must be greater than zero and no more than 24.');
      const card={id:uid(),staffId:staff[0].id,date,minutes,start,end,status:'pending',sourceKey:key,note:get('note')};
      output.push({row:index+2,card,warning:cardIssue(db,card)});
    } catch(e) {output.push({row:index+2,error:e.message});}
  });return output;
}
export function validateJournal(db) {
  const fail=()=>{throw new Error('This file is not a valid version 1 Monthly journal. The current journal has not been replaced.');};
  const str=x=>typeof x==='string'&&x.length<10000, num=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e11;
  if(!db||db.format!=='monthly-journal'||db.version!==1||!str(db.id)||!str(db.name)||!db.settings||!['remaining','whole'].includes(db.settings.allocation)||!Array.isArray(db.settings.weekdays)||db.settings.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||!db.settings.google)fail();
  for(const key of ['staff','billTemplates','timecards','payrollPayments','importKeys'])if(!Array.isArray(db[key]))fail();
  if(!db.months||typeof db.months!=='object'||Array.isArray(db.months))fail();
  const ids=new Set(); const unique=x=>{if(!str(x.id)||!x.id||ids.has(x.id))fail();ids.add(x.id);};
  for(const s of db.staff) {unique(s);if(!str(s.name)||!str(s.code)||!Array.isArray(s.rates)||typeof s.active!=='boolean')fail();const datesSeen=new Set();for(const r of s.rates){if(!validDate(r.effective)||!num(r.cents)||datesSeen.has(r.effective))fail();datesSeen.add(r.effective);}}
  if(new Set(db.staff.map(s=>s.code.toLowerCase())).size!==db.staff.length)fail();
  const bill=b=>{unique(b);if(!str(b.company)||!str(b.label)||!['personal','business'].includes(b.category)||!num(b.amount))fail();};
  for(const b of db.billTemplates){bill(b);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.start)||!Number.isInteger(b.day)||b.day<1||b.day>31||(b.end&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.end)))fail();}
  for(const [month,m] of Object.entries(db.months)) {
    let keys;try{keys=dates(month);}catch{fail();}
    if(!m||!m.days||Object.keys(m.days).length!==keys.length||!Array.isArray(m.bills)||!Array.isArray(m.expenses))fail();
    for(const d of keys){const day=m.days[d];if(!day||!['off','planned','worked','cancelled'].includes(day.status)||(day.sales!==null&&!num(day.sales))||(day.lockedAllowance!==null&&(!Number.isSafeInteger(day.lockedAllowance)||Math.abs(day.lockedAllowance)>1e11))||!str(day.note))fail();}
    for(const b of m.bills){bill(b);if(!num(b.paid)||!validDate(b.due)||!b.due.startsWith(month))fail();}
    for(const e of m.expenses){unique(e);if(!validDate(e.date)||!e.date.startsWith(month)||!num(e.amount)||!str(e.description)||!['personal','business'].includes(e.category))fail();}
  }
  for(const c of db.timecards){unique(c);if(!db.staff.some(s=>s.id===c.staffId)||!validDate(c.date)||!Number.isInteger(c.minutes)||c.minutes<=0||c.minutes>1440||!['pending','approved','rejected'].includes(c.status)||!str(c.note)||!str(c.start)||!str(c.end)||(c.start&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start))||(c.end&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.end)))fail();}
  for(const p of db.payrollPayments){unique(p);if(!db.staff.some(s=>s.id===p.staffId)||!validDate(p.date)||!num(p.amount)||!str(p.note))fail();}
  if(db.importKeys.some(k=>!str(k)))fail();
  for(const k of ['clientId','sheetId','range','dateOrder'])if(!str(db.settings.google[k]))fail();
  return db;
}
