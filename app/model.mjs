import {validateAccountAppearance} from './account-providers.mjs';
export const VERSION = 2;
export const money = n => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(n/100);
export function cents(s, signed=false) {
  if (!(signed?/^-?\d+(\.\d{1,2})?$/:/^\d+(\.\d{1,2})?$/).test(String(s))) throw Error('Use a valid amount with up to two decimal places.');
  const neg=String(s).startsWith('-');const [a,b='']=String(s).replace('-','').split('.');const n=(Number(a)*100+Number(b.padEnd(2,'0')))*(neg?-1:1);
  if(!Number.isSafeInteger(n)||Math.abs(n)>1e12)throw Error('Amount is too large.');return n;
}
export const today = () => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Manila'}).format(new Date());
export function nextDueDate(day,date=today()) {const [y,m]=date.split('-').map(Number);const format=(year,month)=>{const d=Math.min(day,new Date(Date.UTC(year,month,0)).getUTCDate());return year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0');};const current=format(y,m);return current>=date?current:format(m===12?y+1:y,m===12?1:m+1);}
export function initialData() { return {schemaVersion:VERSION,businessName:'My business',accounts:[{id:'cash',name:'Cash wallet',kind:'cash',opening:0,color:'green'},{id:'bank',name:'Bank account',kind:'bank',opening:0,color:'blue'},{id:'wallet',name:'E-wallet',kind:'ewallet',opening:0,color:'purple'}],categories:['Food & drinks','Transport','Bills & utilities','Shopping','Health','Entertainment','Salary','Sales','Supplies','Services','Other'].map((name,i)=>({id:'cat'+i,name})),transactions:[],bills:[],budgets:[]}; }
const assert=(x,m)=>{if(!x)throw Error(m);};
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=100;
const text=(x,n=100)=>typeof x==='string'&&x.trim().length>0&&x.length<=n;
const integer=(x,signed=false)=>Number.isSafeInteger(x)&&Math.abs(x)<=1e12&&(signed||x>=0);
export const isDate=s=>typeof s==='string'&&/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const isMonth=s=>typeof s==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(s);
export const inSpace=(t,space)=>space==='all'||t.allocations?.some(a=>a.space===space);
export function accountBalance(a,txs){return txs.reduce((sum,t)=>sum+(t.accountId===a.id?(t.type==='transfer'||t.type==='expense'?-t.amount:t.amount):0)+(t.type==='transfer'&&t.toAccountId===a.id?t.amount:0),a.opening);}
export const paidAmount=(bill,txs)=>txs.reduce((n,t)=>n+(t.billId===bill.id?t.amount:0)-(t.type==='refund'&&txs.find(o=>o.id===t.originalId)?.billId===bill.id?t.amount:0),0);
export const billStatus=(bill,txs,date=today())=>{const paid=paidAmount(bill,txs);return paid===bill.amount?'Paid':bill.dueDate<date?'Overdue':paid>0?'Partially paid':'Unpaid';};
export function allocatedAmount(t,space='all',categoryId){return (t.allocations||[]).filter(a=>(space==='all'||a.space===space)&&(!categoryId||a.categoryId===categoryId)).reduce((n,a)=>n+a.amount,0);}
export function summary(data,month,space='all') {
  let income=0,expenses=0;const byCategory={};
  for(const t of data.transactions){if(t.date.slice(0,7)!==month)continue;const amount=allocatedAmount(t,space);if(t.type==='income')income+=amount;if(t.type==='expense'||t.type==='refund'){const sign=t.type==='refund'?-1:1;expenses+=amount*sign;for(const a of t.allocations)if(space==='all'||a.space===space)byCategory[a.categoryId]=(byCategory[a.categoryId]||0)+sign*a.amount;}}
  const budget=data.budgets.filter(b=>b.month===month&&(space==='all'||b.space===space)).reduce((n,b)=>n+b.amount,0);
  return {income,expenses,byCategory,budget};
}
export function obligations(data) { const liquid=data.accounts.filter(a=>a.kind!=='credit').reduce((n,a)=>n+accountBalance(a,data.transactions),0);const cardDebt=data.accounts.filter(a=>a.kind==='credit').reduce((n,a)=>n+Math.max(0,-accountBalance(a,data.transactions)),0);const payables=data.bills.filter(b=>b.kind==='payable').reduce((n,b)=>n+b.amount-paidAmount(b,data.transactions),0);return {liquid,cardDebt,payables,after:liquid-cardDebt-payables}; }
export function validateData(d) {
  assert(d&&d.schemaVersion===VERSION,'Unsupported backup format.');assert(text(d.businessName,60),'Enter a business name.');
  for(const [key,max] of [['accounts',100],['categories',200],['transactions',20000],['bills',10000],['budgets',10000]]) {assert(Array.isArray(d[key])&&d[key].length<=max,'Invalid or oversized '+key+'.');if(key!=='budgets')assert(new Set(d[key].map(x=>x.id)).size===d[key].length,'Duplicate '+key+' identifiers.');}
  assert(d.accounts.length>0&&d.categories.length>0,'Keep at least one account and category.');
  const accounts=new Map(d.accounts.map(a=>[a.id,a])),cats=new Set(d.categories.map(c=>c.id)),bills=new Map(d.bills.map(b=>[b.id,b]));
  for(const a of d.accounts){assert(validId(a.id)&&text(a.name,60)&&['cash','bank','ewallet','credit'].includes(a.kind)&&integer(a.opening,true),'Invalid account.');validateAccountAppearance(a);if(a.limit!=null)assert(integer(a.limit),'Invalid credit limit.');for(const day of [a.closingDay,a.dueDay])if(day!=null)assert(Number.isInteger(day)&&day>=1&&day<=31,'Card days must be between 1 and 31.');}
  for(const c of d.categories)assert(validId(c.id)&&text(c.name,60),'Invalid category.');
  for(const b of d.bills){assert(validId(b.id)&&['receivable','payable'].includes(b.kind)&&text(b.party,100)&&text(b.description,300)&&integer(b.amount)&&b.amount>0&&isDate(b.issueDate)&&isDate(b.dueDate)&&b.dueDate>=b.issueDate&&cats.has(b.categoryId),'Invalid bill; check dates, category and amount.');}
  for(const t of d.transactions){
    assert(validId(t.id)&&['income','expense','transfer','refund','adjustment'].includes(t.type)&&integer(t.amount,t.type==='adjustment')&&t.amount!==0&&isDate(t.date)&&accounts.has(t.accountId)&&typeof t.notes==='string'&&t.notes.length<=500,'Invalid transaction.');
    if(['income','expense','refund'].includes(t.type)){assert(Array.isArray(t.allocations)&&t.allocations.length>0&&t.allocations.length<=30,'Add at least one allocation.');for(const a of t.allocations)assert(['personal','business'].includes(a.space)&&cats.has(a.categoryId)&&integer(a.amount)&&a.amount>0,'Invalid allocation.');assert(t.allocations.reduce((n,a)=>n+a.amount,0)===t.amount,'Split amounts must equal the transaction total.');}
    else assert(!t.allocations?.length,'Transfers and adjustments cannot have spending allocations.');
    if(t.type==='transfer')assert(accounts.has(t.toAccountId)&&t.toAccountId!==t.accountId,'Choose a different destination account.');
    if(t.type==='income')assert(accounts.get(t.accountId).kind!=='credit','Record income into cash, a bank account or an e-wallet.');
    if(t.billId){const b=bills.get(t.billId);assert(b&&(b.kind==='receivable'?t.type==='income':t.type==='expense')&&t.allocations.length===1&&t.allocations[0].space==='business'&&t.allocations[0].categoryId===b.categoryId&&t.date>=b.issueDate,'Invalid bill payment.');}
    if(t.type==='refund'){const orig=d.transactions.find(x=>x.id===t.originalId);assert(orig&&orig.type==='expense'&&orig.accountId===t.accountId&&t.date>=orig.date,'Refunds must link to an expense in the same account, on or after the purchase date.');for(const a of t.allocations){const max=orig.allocations.filter(x=>x.space===a.space&&x.categoryId===a.categoryId).reduce((n,x)=>n+x.amount,0);const used=d.transactions.filter(x=>x.type==='refund'&&x.originalId===orig.id).flatMap(x=>x.allocations).filter(x=>x.space===a.space&&x.categoryId===a.categoryId).reduce((n,x)=>n+x.amount,0);assert(used<=max,'Refund exceeds the original purchase allocation.');}}
  }
  assert(d.transactions.reduce((n,t)=>n+Math.abs(t.amount),0)+d.accounts.reduce((n,a)=>n+Math.abs(a.opening),0)+d.bills.reduce((n,b)=>n+b.amount,0)+d.budgets.reduce((n,b)=>n+b.amount,0)<Number.MAX_SAFE_INTEGER/4,'Workspace totals exceed the safe calculation limit.');
  for(const b of d.bills)assert(paidAmount(b,d.transactions)>=0&&paidAmount(b,d.transactions)<=b.amount,'Payment exceeds the remaining bill amount.');
  const keys=new Set();for(const b of d.budgets){assert(isMonth(b.month)&&['personal','business'].includes(b.space)&&cats.has(b.categoryId)&&integer(b.amount)&&b.amount>0,'Invalid budget.');const key=b.month+b.space+b.categoryId;assert(!keys.has(key),'A budget already exists for this category and month.');keys.add(key);}
  return d;
}
export function applyCommand(data,command) {
  const d=structuredClone(data),{type,value,id}=command;assert(validId(id),'Invalid action identifier.');
  if(type==='restore')return validateData(value);
  if(type==='settings'){assert(text(value.businessName,60),'Enter a business name.');d.businessName=value.businessName.trim();}
  else if(type==='putTransaction'){const row={...value,id:value.id||id};const i=d.transactions.findIndex(x=>x.id===row.id);if(i>=0)d.transactions[i]=row;else d.transactions.push(row);}
  else if(type==='deleteTransaction')d.transactions=d.transactions.filter(t=>t.id!==value.id);
  else if(type==='putAccount'){const row={...value,id:value.id||id};const i=d.accounts.findIndex(x=>x.id===row.id);if(i>=0){assert(d.accounts[i].kind===row.kind,'Create a new account to change its type.');d.accounts[i]=row;}else d.accounts.push(row);}
  else if(type==='putCategory'){const row={id:value.id||id,name:value.name.trim()};assert(!d.categories.some(c=>c.id!==row.id&&c.name.toLowerCase()===row.name.toLowerCase()),'That category already exists.');const i=d.categories.findIndex(c=>c.id===row.id);if(i>=0)d.categories[i]=row;else d.categories.push(row);}
  else if(type==='putBill'){const row={...value,id:value.id||id};const i=d.bills.findIndex(x=>x.id===row.id);if(i>=0)d.bills[i]=row;else d.bills.push(row);}
  else if(type==='deleteBill'){assert(!d.transactions.some(t=>t.billId===value.id),'Delete the linked payments before deleting this bill.');d.bills=d.bills.filter(b=>b.id!==value.id);}
  else if(type==='putBudget'){const old=value.previous;if(old)d.budgets=d.budgets.filter(b=>!(b.month===old.month&&b.space===old.space&&b.categoryId===old.categoryId));const budget={month:value.month,space:value.space,categoryId:value.categoryId,amount:value.amount};d.budgets=d.budgets.filter(b=>!(b.month===budget.month&&b.space===budget.space&&b.categoryId===budget.categoryId));d.budgets.push(budget);}
  else if(type==='deleteBudget')d.budgets=d.budgets.filter(b=>!(b.month===value.month&&b.space===value.space&&b.categoryId===value.categoryId));
  else throw Error('Unknown action.');return validateData(d);
}
export function exportCSV(rows,data,space='all') {
  const safe=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
  const lines=[['Date','Type','Account','To account','Space','Category','Amount (PHP)','Notes','Bill ID'],...rows.flatMap(t=>(t.allocations?.length?t.allocations.filter(a=>space==='all'||a.space===space):[{space:'',categoryId:'',amount:t.amount}]).map(a=>[t.date,t.type,data.accounts.find(x=>x.id===t.accountId)?.name||'',data.accounts.find(x=>x.id===t.toAccountId)?.name||'',a.space,data.categories.find(c=>c.id===a.categoryId)?.name||'',(a.amount/100).toFixed(2),t.notes,t.billId||'']))];
  const appearanceHeaders=['Account provider','Account card style','Account bank subtype','To account provider','To account card style','To account bank subtype'];
  lines[0].push(...appearanceHeaders);
  let rowIndex=1;for(const t of rows){const count=t.allocations?.length?t.allocations.filter(a=>space==='all'||a.space===space).length:1;const from=data.accounts.find(a=>a.id===t.accountId),to=data.accounts.find(a=>a.id===t.toAccountId);const values=[from?.providerId,from?.cardStyleId,from?.bankSubtype,to?.providerId,to?.cardStyleId,to?.bankSubtype];for(let i=0;i<count;i++)lines[rowIndex++].push(...values);}
  return '\uFEFF'+lines.map(r=>r.map(safe).join(',')).join('\r\n');
}
export function backup(data){return {app:'Peso',schemaVersion:VERSION,exportedAt:new Date().toISOString(),data};}
export function parseBackup(text){let b;try{b=JSON.parse(text);}catch{throw Error('This file is not valid JSON.');}assert(b.app==='Peso'&&b.schemaVersion===VERSION,'Choose a Peso version 2 backup.');return validateData(b.data);}

