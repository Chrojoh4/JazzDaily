// CRA T4127 122nd/123rd editions, Option 1, BC, 2026.
// Amounts at the public boundary are integer cents. No network calls or personal identifiers.
export const RULES = 'BC-2026-option1-v1';
export const PDOC = 'https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-businesses/payroll-deductions-online-calculator.html';
const positive = x => Math.max(0,x);
const round = x => Math.round((x + Number.EPSILON)*100)/100;
const cent = x => Math.round((x + Number.EPSILON)*100);
const dateOK = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const amount = (x,label) => {if(!Number.isSafeInteger(x)||x<0||x>1e10)throw Error('Invalid '+label+'. Use a non-negative amount with two decimal places.');return x/100;};
export const YTD_KEYS=['gross','pensionable','insurable','cpp','cpp2','ei','tax','bonus','bonusEnhanced','bonusCpp','bonusEi'];
export const zeroYTD=()=>Object.fromEntries(YTD_KEYS.map(k=>[k,0]));
export function defaultProfile(){return {year:2026,periods:52,cpp:true,cppMonths:12,ei:true,exemptionReason:'',federalClaim:null,bcClaim:1321600,extraTax:0,vacationPercent:4,vacationAgreement:false,startDate:'',openingDate:'2026-01-01',opening:zeroYTD(),confirmed:false};}
export function validateProfile(p){
  if(!p||p.year!==2026||![52,53].includes(p.periods)||typeof p.cpp!=='boolean'||typeof p.ei!=='boolean'||!Number.isInteger(p.cppMonths)||p.cppMonths<1||p.cppMonths>12)throw Error('Complete the 2026 BC weekly payroll settings.');
  if(typeof p.exemptionReason!=='string'||((!p.cpp||!p.ei||p.cppMonths!==12)&&!p.exemptionReason.trim()))throw Error('Record the reason for CPP/EI exemption or CPP proration. Family status alone does not set an exemption.');
  if(p.federalClaim!==null)amount(p.federalClaim,'federal TD1 claim');amount(p.bcClaim,'BC TD1 claim');amount(p.extraTax,'additional tax');
  if(!Number.isFinite(p.vacationPercent)||p.vacationPercent<4||p.vacationPercent>25||typeof p.vacationAgreement!=='boolean')throw Error('Vacation rate must be 4%–25%.');
  if(!dateOK(p.startDate)||!dateOK(p.openingDate)||!p.openingDate.startsWith('2026-'))throw Error('Enter the employment start date and a 2026 opening-balance date.');
  if(!p.opening)throw Error('Enter opening year-to-date balances.');
  YTD_KEYS.forEach(k=>amount(p.opening[k],k+' opening balance'));
  if(p.opening.cpp>423045*p.cppMonths/12+.5||p.opening.cpp2>41600*p.cppMonths/12+.5||p.opening.ei>112307)throw Error('Opening CPP, CPP2 or EI exceeds the selected annual maximum. Resolve this before estimating payroll.');
  if(p.opening.bonusEnhanced>p.opening.bonus||p.opening.bonus>p.opening.gross||p.opening.bonusCpp>p.opening.cpp||p.opening.bonusEi>p.opening.ei||p.opening.pensionable>p.opening.gross||p.opening.insurable>p.opening.gross)throw Error('Opening earnings and contribution balances do not reconcile.');
  return p;
}
function bracket(a,thresholds,rates,constants){let i=thresholds.findLastIndex(t=>a>t);if(i<0)i=0;return rates[i]*a-constants[i];}
export function annualTax(a,gross,creditCpp,creditEi,p,july){
  const claim=p.federalClaim===null?round(a<=181440?16452:a>=258482?14829:16452-(a-181440)*1623/77042):p.federalClaim/100;
  const federal=round(positive(bracket(a,[0,58523,117045,181440,258482],[.14,.205,.26,.29,.33],[0,3804,10241,15685,26024])-.14*claim-.14*(creditCpp+creditEi)-.14*Math.min(gross,1501)));
  const low=july?.0614:.0506;
  const basic=positive(bracket(a,[0,50363,100728,115648,140430,190405,265545],[low,.077,.105,.1229,.147,.168,.205],july?[0,786,3606,5676,9061,13059,22884]:[0,1330,4150,6220,9604,13603,23428])-low*(p.bcClaim/100+creditCpp+creditEi));
  const reduction=a>(july?44952:41722)?0:Math.min(basic,positive((july?805:575)-positive(a-25570)*.0356));
  return {federal,bc:round(positive(basic-reduction)),claim};
}
export function calculatePayroll(input,p,ytd){
  validateProfile(p);if(!p.confirmed)throw Error('Review and confirm the employee payroll settings first.');
  if(!dateOK(input.payDate)||!input.payDate.startsWith('2026-'))throw Error('Only 2026 pay dates are supported. New tax-year rules are required for other years.');
  if(!dateOK(input.start)||!dateOK(input.end)||(Date.parse(input.end)-Date.parse(input.start))/86400000!==6||input.payDate<input.end||input.end<p.startDate)throw Error('Use a seven-day period, a pay date on or after its end, and a period including employment.');
  if(input.payDate<p.openingDate)throw Error('Pay date precedes the opening year-to-date balances.');
  if(!input.reviewed)throw Error('Review earnings, overtime, minimum wage, holidays and the calculation scope first.');
  YTD_KEYS.forEach(k=>amount(ytd[k],k+' year-to-date balance'));
  const regular=amount(input.regular,'regular earnings'),stat=amount(input.stat,'statutory holiday earnings'),other=amount(input.other,'other current-period wages');
  const I=round(regular+stat+other),vacBase=amount(input.vacationBase,'vacation eligible wages');
  if(vacBase<I)throw Error('Vacation-eligible wages cannot be less than this period’s regular, holiday and other wages.');
  if(!p.vacationAgreement)throw Error('Confirm the written agreement to pay vacation on each cheque in employee settings.');
  const anniversary=p.startDate.replace(/^\d{4}/,String(+p.startDate.slice(0,4)+5));
  if(input.end>=anniversary&&p.vacationPercent<6)throw Error('Review vacation entitlement: this employee has reached five years. Select at least 6% in their payroll settings.');
  const B=round(vacBase*p.vacationPercent/100),gross=round(I+B);
  if(I<=0)throw Error('Enter positive current-period wages. Vacation-only and termination payments need a separate CRA calculation.');
  const P=p.periods,july=input.payDate>='2026-07-01',maxCpp=round(4230.45*p.cppMonths/12),maxCpp2=round(416*p.cppMonths/12);
  const D=ytd.cpp/100,D2=ytd.cpp2/100,D1=ytd.ei/100,priorPI=ytd.pensionable/100;
  if(D>maxCpp||D2>maxCpp2||D1>1123.07)throw Error('Year-to-date contributions exceed the selected annual limits. Review employee settings and prior payroll.');
  // Weekly regular remuneration including scheduled commission; one CPP exemption for combined pay.
  const cppFor=g=>p.cpp?round(positive(Math.min(maxCpp-D,.0595*(g-Math.floor(350000/P)/100)))):0;
  const cpp=cppFor(gross),regularCpp=cppFor(I),bonusCpp=round(cpp-regularCpp);
  const cpp2=p.cpp?round(positive(Math.min(maxCpp2-D2,(priorPI+gross-Math.max(priorPI,74600*p.cppMonths/12))*.04))):0;
  const eiFor=g=>p.ei?round(positive(Math.min(1123.07-D1,.0163*g))):0;
  const ei=eiFor(gross),regularEi=eiFor(I),bonusEi=round(ei-regularEi);
  const enhanced=round(cpp*.01/.0595+cpp2),f5a=round(enhanced*I/gross),f5b=round(enhanced*B/gross);
  const A=round(P*(I-f5a));
  const baseCap=3519.45*p.cppMonths/12;
  const cppCredit=contributions=>Math.min(baseCap,Math.max(D*.0495/.0595,contributions*.0495/.0595));
  const eiCredit=premiums=>Math.min(1123.07,Math.max(D1,premiums));
  const regularCredits={cpp:cppCredit(D+cpp>=maxCpp?maxCpp:P*regularCpp),ei:eiCredit(D1+ei>=1123.07?1123.07:P*regularEi)};
  const regularTax=annualTax(A,P*I,regularCredits.cpp,regularCredits.ei,p,july);
  const oldBonus=ytd.bonus/100,oldF5=ytd.bonusEnhanced/100;
  const beforeA=round(A+positive(oldBonus-oldF5)),afterA=round(beforeA+positive(B-f5b));
  const before=annualTax(beforeA,P*I+oldBonus,cppCredit(P*regularCpp+ytd.bonusCpp/100),eiCredit(P*regularEi+ytd.bonusEi/100),p,july);
  const after=annualTax(afterA,P*I+oldBonus+B,cppCredit(P*regularCpp+ytd.bonusCpp/100+bonusCpp),eiCredit(P*regularEi+ytd.bonusEi/100+bonusEi),p,july);
  // T4127 low-income rule: 15% total tax on the current non-periodic payment.
  const bonusFederal=B?(afterA<=5000?round(B*.15):round(positive(after.federal-before.federal))):0;
  const bonusBC=B&&afterA>5000?round(positive(after.bc-before.bc)):0;
  const federal=round(regularTax.federal/P+bonusFederal),bc=round(regularTax.bc/P+bonusBC),extraTax=p.extraTax/100;
  const tax=round((regularTax.federal+regularTax.bc)/P+bonusFederal+bonusBC+extraTax);
  const net=round(gross-cpp-cpp2-ei-tax);
  if(net<0)throw Error('Deductions exceed gross pay. Review additional tax and the CRA calculation.');
  const employerCpp=round(cpp+cpp2),employerEi=round(ei*1.4),remittance=round(tax+cpp+cpp2+ei+employerCpp+employerEi);
  const values={regular:I,vacation:B,gross,cpp,cpp2,ei,federal,bc,extraTax,tax,net,employerCpp,employerEi,remittance,employerCost:round(gross+employerCpp+employerEi),bonusEnhanced:f5b,bonusCpp,bonusEi,annualTaxable:A,bonusFederal,bonusBC};
  return {...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,cent(v)])),pensionable:p.cpp?cent(gross):0,insurable:p.ei?cent(gross):0,rules:RULES,table:july?'July–December 2026':'January–June 2026'};
}
export function ytdFor(db,staffId,payDate){
  const staff=db.staff.find(s=>s.id===staffId);validateProfile(staff?.payroll);
  const p=staff.payroll,runs=(db.payrollRuns??[]).filter(r=>r.staffId===staffId&&r.status!=='void');
  if(staff.paidThrough&&p.openingDate<=staff.paidThrough)throw Error('Enter actual earlier-pay balances and a first new pay date after '+staff.paidThrough+'. Earlier pay is already confirmed paid.');
  if(runs.some(r=>r.status==='draft'))throw Error('Verify or discard the existing estimate for this employee first.');
  if(runs.some(r=>r.input.payDate>=payDate))throw Error('Prepare payroll in pay-date order. Void later records first to correct an earlier one.');
  const y={...p.opening};
  for(const r of runs.filter(r=>r.input.payDate>=p.openingDate&&r.input.payDate<payDate)){
    const a=r.actual,e=r.estimate;
    for(const k of ['gross','pensionable','insurable'])y[k]+=e[k];
    for(const k of ['cpp','cpp2','ei','tax'])y[k]+=a[k];
    y.bonus+=e.vacation;y.bonusEnhanced+=a.bonusEnhanced;y.bonusCpp+=a.bonusCpp;y.bonusEi+=a.bonusEi;
  }return y;
}
export function createRun(db,staffId,input,id){
  const staff=db.staff.find(s=>s.id===staffId);if(!staff)throw Error('Choose an employee.');
  if(staff.paidThrough&&input.start<=staff.paidThrough)throw Error('This employee is already confirmed paid through '+staff.paidThrough+'. Start the next payroll after that date.');
  if((db.payrollRuns??[]).some(r=>r.staffId===staffId&&r.status!=='void'&&r.input.start<=input.end&&r.input.end>=input.start))throw Error('This employee already has payroll covering these work dates.');
  if(db.timecards.some(c=>c.staffId===staffId&&c.date>=input.start&&c.date<=input.end&&c.status==='pending'))throw Error('Review pending time cards in this period first.');
  const ytd=ytdFor(db,staffId,input.payDate),profile=structuredClone(staff.payroll),estimate=calculatePayroll(input,profile,ytd);
  if(input.costDays)validateCostDays(input);
  return {id,staffId,employeeName:staff.name,input:structuredClone(input),profile,ytd,estimate,status:'draft',createdAt:new Date().toISOString()};
}
export function verifyRun(run,actual,note){
  if(run.status!=='draft')throw Error('Only an unverified estimate can be verified.');
  for(const k of ['cpp','cpp2','ei','tax','bonusEnhanced','bonusCpp','bonusEi'])amount(actual[k],k);
  if(!note?.trim())throw Error('Enter a CRA comparison note or reference.');
  if(actual.bonusCpp>actual.cpp||actual.bonusEi>actual.ei||actual.bonusEnhanced>run.estimate.vacation)throw Error('Vacation contribution portions do not reconcile.');
  if(actual.cpp+run.ytd.cpp>Math.round(423045*run.profile.cppMonths/12)||actual.cpp2+run.ytd.cpp2>Math.round(41600*run.profile.cppMonths/12)||actual.ei+run.ytd.ei>112307)throw Error('Corrected deductions exceed the annual limits. Check opening balances and prior payroll.');
  if((!run.profile.cpp&&(actual.cpp||actual.cpp2))||(!run.profile.ei&&actual.ei))throw Error('Corrected deductions conflict with the saved exemption. Discard this estimate and correct employee settings first.');
  const net=run.estimate.gross-actual.cpp-actual.cpp2-actual.ei-actual.tax;
  if(net<0)throw Error('Deductions exceed gross pay.');
  const employerCpp=actual.cpp+actual.cpp2,employerEi=Math.round(actual.ei*1.4);
  run.actual={...Object.fromEntries(['cpp','cpp2','ei','tax','bonusEnhanced','bonusCpp','bonusEi'].map(k=>[k,actual[k]])),net,employerCpp,employerEi,remittance:actual.tax+actual.cpp+actual.cpp2+actual.ei+employerCpp+employerEi};
  run.status='verified';run.verifiedAt=new Date().toISOString();run.verificationNote=note.trim();
}
export function voidRun(db,id,reason){
  const r=db.payrollRuns.find(r=>r.id===id);if(!r||r.status==='void')throw Error('Select an active payroll record.');
  if(!reason?.trim())throw Error('Enter a reason for discarding or voiding payroll.');
  if(db.payrollPayments.some(p=>p.runId===id))throw Error('This payroll has a recorded payment. Remove the payment record in payment history before voiding payroll; this does not reverse a bank payment.');
  if(db.payrollRuns.some(x=>x.staffId===r.staffId&&x.status!=='void'&&x.input.payDate>r.input.payDate))throw Error('Void later payroll records for this employee first, so year-to-date amounts stay correct.');
  r.status='void';r.voidReason=reason.trim();r.voidedAt=new Date().toISOString();
}
export function validatePayrollData(db){
  for(const s of db.staff)if(s.payroll)validateProfile(s.payroll);
  if(db.payrollRuns===undefined)return;
  if(!Array.isArray(db.payrollRuns))throw Error('Invalid payroll records.');
  const ids=new Set();
  for(const r of db.payrollRuns){
    if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!db.staff.some(s=>s.id===r.staffId)||!['draft','verified','void'].includes(r.status)||typeof r.employeeName!=='string')throw Error('Invalid payroll record.');ids.add(r.id);
    const expected=calculatePayroll(r.input,r.profile,r.ytd);
    if(r.input.costDays)validateCostDays(r.input);
    for(const [k,v]of Object.entries(expected))if(r.estimate?.[k]!==v)throw Error('Payroll estimate does not match its saved inputs.');
    if(r.actual){const check={...r,status:'draft'};verifyRun(check,r.actual,r.verificationNote);for(const [k,v]of Object.entries(check.actual))if(r.actual[k]!==v)throw Error('Invalid verified payroll totals.');}
    if(r.status==='verified'&&!r.actual)throw Error('Missing verified payroll totals.');
  }
}
function validateCostDays(input){if(typeof input.costDays!=='object'||Array.isArray(input.costDays)||!Object.keys(input.costDays).length)throw Error('Invalid staffing cost dates.');for(const [date,weight]of Object.entries(input.costDays))if(!dateOK(date)||date<input.start||date>input.end||!Number.isSafeInteger(weight)||weight<0||weight>1e11)throw Error('Invalid staffing cost allocation.');}
export function recordPayrollPayment(db,id,paymentId){const r=(db.payrollRuns??[]).find(r=>r.id===id);if(!r||r.status!=='verified')throw Error('Check this payroll with CRA first.');if(db.payrollPayments.some(p=>p.runId===id))throw Error('This payment is already recorded.');if(db.payrollPayments.some(p=>p.staffId===r.staffId&&p.date===r.input.payDate))throw Error('A payment already exists for this employee and date. Review payment history first to avoid recording it twice.');db.payrollPayments.push({id:paymentId,staffId:r.staffId,date:r.input.payDate,amount:r.actual.net,note:'Weekly payroll payment',runId:id});}
