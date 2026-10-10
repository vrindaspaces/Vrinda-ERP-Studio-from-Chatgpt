import {exportErpBackup, restoreErpBackup} from './erp-backup';
import {storageUsage} from './storage-usage';
import {inventoryForReceipts} from './po-inventory';
import {supplierInvoices} from './supplier-invoices';
import * as seed from '../src/data/initialData';
import assets from './assets.generated';
import {authorizeWrite,visibleRecords,canReviewLeave} from './access';
import {hashPassword,verifyPassword} from './passwords';
import {mailEvents,leaveRequestRecipients} from './mail-events';
import {mailApi,processMail} from './mail-service';
import {validEmail} from './resend-mail';
import {taskFiles} from './task-files';
import {driveApi,driveCallback} from './google-drive';
import {companyLogo} from './logo';

export const initialRecords: Record<string, unknown> = {
  companyProfile: seed.initialCompanyProfile,
  employees: [{...seed.initialEmployees.find(e => e.role === 'Owner')!, name: 'Praveen Anantha', email: 'praveen.anantha@vrindaspaces.com', assignedProjectIds: []}],
  clients: [],
  projects: [],
  tasks: [],
  leaveRequests: [],
  attendance: [],
  payslips: [],
  vendors: [],
  purchaseOrders: [],
  supplierInvoices: [],
  inventory: [],
  quotations: [],
  invoices: [],
  clientPayments: [],
  expenses: [],
  notifications: [],
  manpower: []
};
interface Statement {
 bind(...args: unknown[]): Statement;
 all(): Promise<{results: any[]}>;
 run(): Promise<{meta:{changes:number}}>;
}
interface Env { FILES?:any; SITE_OWNER_EMAIL?:string; EMAIL_SETTINGS_KEY?:string; DB: {prepare(sql:string):Statement; batch(statements:Statement[]):Promise<any[]>} }
function db(env:Env) { if(!env.DB) throw new Error('Shared database unavailable'); return env.DB; }
const json = (body:unknown, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const tokenHash=async(token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(v=>v.toString(16).padStart(2,'0')).join('');
function platformEmployee(request:Request,env:Env,data:any) {
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 if(!email)return null;
 // The platform owner's identity is separate from their editable ERP work email.
 if(email===env.SITE_OWNER_EMAIL?.trim().toLowerCase())return data.employees.find((e:any)=>e.role==='Owner'&&e.status==='Active')||null;
 return data.employees.find((e:any)=>e.email.trim().toLowerCase()===email&&e.status==='Active')||null;
}
const sessionToken=(request:Request)=>request.headers.get('x-erp-session')||request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('erp_session='))?.slice(12)||'';
const cookie=(token:string,url:URL,maxAge=28800)=>`erp_session=${token}; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=${maxAge}`;
const isOriginAllowed=(o:string|null,url:URL)=>!o||o===url.origin||o.includes('.run.app')||o.includes('localhost')||o.includes('127.0.0.1');
export default {
 async fetch(request:Request, env:Env,ctx?:{waitUntil(promise:Promise<unknown>):void}) {
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/')) {
   const asset=assets[url.pathname === '/' ? '/index.html' : url.pathname];
   if(!asset) return new Response('Not found',{status:404});
   return new Response(asset.base64?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff'}});
  }
  try {
   const database=db(env);
   const origin=request.headers.get('origin');
   if(!['GET','HEAD'].includes(request.method)&&origin&&!isOriginAllowed(origin,url))return json({error:'Invalid request origin'},403);
   if(url.pathname!=='/api/storage-usage')await database.batch(Object.entries(initialRecords).map(([key,value])=>database.prepare('INSERT OR IGNORE INTO erp_collections (key,value,revision) VALUES (?,?,0)').bind(key,JSON.stringify(value))));
   const rows=await database.prepare('SELECT key,value,revision FROM erp_collections').all();
   const data=Object.fromEntries(rows.results.map(r=>[r.key,JSON.parse(r.value)]));
   const platformUser=platformEmployee(request,env,data);
   const token=sessionToken(request);
   const sessions=token?await database.prepare('SELECT employee_id,platform_email,expires_at FROM erp_sessions WHERE token_hash=?').bind(await tokenHash(token)).all():{results:[]};
   const session=sessions.results[0] as any;
   const sessionActor=session&&session.expires_at>Date.now()?(data.employees.find((e:any)=>e.id===session.employee_id&&e.status==='Active')||null):null;
   const actor=sessionActor||(platformUser&&session?.employee_id===platformUser.id&&session?.expires_at>Date.now()?platformUser:null);
   if(url.pathname==='/api/storage-usage')return await storageUsage(request,env,actor);
   if(url.pathname==='/api/erp-backup'&&request.method==='GET')return exportErpBackup(actor,rows.results);
   if(url.pathname==='/api/erp-backup'&&request.method==='POST')return await restoreErpBackup(request,env,actor);
   if(url.pathname.startsWith('/api/supplier-invoices'))return await supplierInvoices(request,env,actor,data);
   if(url.pathname==='/api/company-logo')return await companyLogo(request,env,actor);
   if(url.pathname==='/api/google-drive/callback'&&request.method==='GET')return await driveCallback(request,env,platformUser);
   if(url.pathname==='/api/google-drive')return await driveApi(request,env,actor);
   const dispatch=async()=>{const promise=processMail(env).catch(()=>console.error('Email queue temporarily unavailable'));if(ctx)ctx.waitUntil(promise);else await promise;};
   if(url.pathname.startsWith('/api/task-files/')||/^\/api\/tasks\/[^/]+\/files$/.test(url.pathname))return await taskFiles(request,env,actor,data,dispatch);
   if(url.pathname==='/api/email-settings'){const response=await mailApi(request,env,actor);if(response.ok&&request.method==='POST')await dispatch();return response;}
   if(url.pathname==='/api/login'&&request.method==='POST'){
    const {email,password}=await request.json() as any;
    const supplied=typeof email==='string'?email.trim().toLowerCase():'';
    const isOwnerAlias=['praveen@vrindaspaces.com','praveen.anantha@vrindaspaces.com',env.SITE_OWNER_EMAIL?.toLowerCase()].filter(Boolean).includes(supplied);
    const candidateEmployee=(platformUser&&(isOwnerAlias||supplied===platformUser.email.trim().toLowerCase()))?platformUser:data.employees.find((e:any)=>((isOwnerAlias&&e.role==='Owner')||e.email.trim().toLowerCase()===supplied)&&e.status==='Active');
    if(!candidateEmployee||!await verifyPassword(password,candidateEmployee.password||'vrinda123'))return json({error:'Use your registered email and password.'},403);
    const fresh=crypto.randomUUID()+crypto.randomUUID();
    const platformEmail=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase()||(candidateEmployee.role==='Owner'&&env.SITE_OWNER_EMAIL?env.SITE_OWNER_EMAIL.trim().toLowerCase():candidateEmployee.email.trim().toLowerCase());
    await database.prepare('DELETE FROM erp_sessions WHERE expires_at<?').bind(Date.now()).run();
    await database.prepare('INSERT INTO erp_sessions (token_hash,employee_id,platform_email,expires_at) VALUES (?,?,?,?)').bind(await tokenHash(fresh),candidateEmployee.id,platformEmail,Date.now()+28800000).run();
    const response=json({success:true,token:fresh});response.headers.set('Set-Cookie',cookie(fresh,url));return response;
   }
   if(url.pathname==='/api/logout'&&request.method==='POST'){
    if(token)await database.prepare('DELETE FROM erp_sessions WHERE token_hash=?').bind(await tokenHash(token)).run();
    const response=json({success:true});response.headers.set('Set-Cookie',cookie('',url,0));return response;
   }
   if(url.pathname==='/api/password'&&request.method==='POST'){
    if(!actor)return json({error:'Please sign in.'},401);
    const {currentPassword,newPassword}=await request.json() as any;
    if(!await verifyPassword(currentPassword,actor.password||'vrinda123'))return json({error:'The current password is incorrect.'},403);
    if(typeof newPassword!=='string'||newPassword.length<8||newPassword.length>128)return json({error:'Use a password between 8 and 128 characters.'},400);
    if(newPassword===currentPassword)return json({error:'Choose a different password.'},400);
    const employees=data.employees.map((e:any)=>({...e}));const employee=employees.find((e:any)=>e.id===actor.id);employee.password=await hashPassword(newPassword);
    const revision=rows.results.find(r=>r.key==='employees')!.revision;
    const result=await database.prepare("UPDATE erp_collections SET value=?,revision=revision+1 WHERE key='employees' AND revision=?").bind(JSON.stringify(employees),revision).run();
    if(!result.meta.changes)return json({error:'Your profile changed. Please retry.'},409);
    await database.prepare('DELETE FROM erp_sessions WHERE employee_id=? AND token_hash<>?').bind(actor.id,await tokenHash(token)).run();
    return json({success:true});
   }
   if(url.pathname==='/api/records' && request.method==='GET') {
    if(actor)await dispatch();
    const visible=visibleRecords(actor,data);
    return json({...Object.fromEntries(rows.results.map(r=>[r.key,{value:visible[r.key],revision:r.revision}])),__identity:{value:actor?{...actor,password:''}:null,revision:0}});
   }
   if(url.pathname.startsWith('/api/records/') && request.method==='PUT') {
    if(!actor)return json({error:'Please sign in with your own team account.'},401);
    const origin=request.headers.get('origin');
    if(origin && !isOriginAllowed(origin,url)) return json({error:'Invalid request origin'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'JSON required'},415);
    const key=decodeURIComponent(url.pathname.slice('/api/records/'.length));
    if(key==='supplierInvoices')return json({error:'Use the supplier invoice form to edit invoices.'},403);
    if(!Object.hasOwn(initialRecords,key)) return json({error:'Unknown collection'},404);
    const raw=await request.text(); if(raw.length>2_000_000) return json({error:'Record payload too large'},413);
    let {value,revision}=JSON.parse(raw);
    if(!Number.isSafeInteger(revision) || revision<0 || (key==='companyProfile' ? !value || typeof value!=='object' || Array.isArray(value) : !Array.isArray(value))) return json({error:'Invalid record payload'},400);
    if(key==='companyProfile'){value={...value};if(data.companyProfile.logoHidden!==undefined)value.logoHidden=data.companyProfile.logoHidden;else delete value.logoHidden;if(data.companyProfile.logoBrandVersion)value.logoBrandVersion=data.companyProfile.logoBrandVersion;else delete value.logoBrandVersion;if(data.companyProfile.logoId)value.logoId=data.companyProfile.logoId;else delete value.logoId;}
    if(key==='tasks'&&Array.isArray(value))value=value.map((task:any)=>{if(!task)return task;const original=data.tasks.find((t:any)=>t.id===task.id);const next={...task};if(original?.attachments)next.attachments=original.attachments;else delete next.attachments;return next;});
    try {value=authorizeWrite(actor,key,value,data)}catch(error){return json({error:error instanceof Error?error.message:'Access denied'},403)}
    if(key==='employees')for(const employee of value){const previous=data.employees.find((e:any)=>e.id===employee.id);if(employee.password!==previous?.password)employee.password=await hashPassword(employee.password);}
    let syncedInventory:any[]|null=null;
    if(key==='purchaseOrders')try{syncedInventory=inventoryForReceipts(data.purchaseOrders,value,data.inventory);}catch(error){return json({error:error instanceof Error?error.message:'Unable to sync inventory.'},400);}
    let syncedProjects:any[]|null=null;
    let syncedExpenses:any[]|null=null;
    if(key==='manpower'){
      const manpowerList=value as any[];
      const nonManpowerExpenses=(data.expenses||[]).filter((e:any)=>!e.id?.startsWith('exp-mp-'));
      const wageExpenses=manpowerList.filter((m:any)=>m.assignedProjectId&&((m.wageAmount||m.dailyRate)>0)).map((m:any)=>{
        const proj=(data.projects||[]).find((p:any)=>p.id===m.assignedProjectId);
        const amount=m.wageAmount!==undefined?m.wageAmount:(m.dailyRate||0);
        return {
          id:`exp-mp-${m.id}`,
          projectId:m.assignedProjectId,
          projectTitle:proj?.title||m.assignedProjectTitle||'Project',
          category:'Labour Wages',
          description:`Manpower: ${m.name} (${m.skill}) — ${m.wageType||'Daily Wage'}`,
          amount,
          date:new Date().toISOString().slice(0,10),
          paidTo:m.name,
          paymentMethod:'Direct Wage Transfer'
        };
      });
      syncedExpenses=[...wageExpenses,...nonManpowerExpenses];
      syncedProjects=(data.projects||[]).map((proj:any)=>{
        const assigned=manpowerList.filter((m:any)=>m.assignedProjectId===proj.id);
        const labourCost=assigned.reduce((sum:number,m:any)=>sum+(m.wageAmount!==undefined?m.wageAmount:(m.dailyRate||0)),0);
        const materialsCost=(data.purchaseOrders||[]).filter((po:any)=>po.projectId===proj.id).reduce((sum:number,po:any)=>{
          const itemsSum=po.items.reduce((s:number,i:any)=>s+(i.orderedQty*i.unitPrice),0);
          return sum+(po.applyGst?itemsSum*(1+po.gstRate/100):itemsSum);
        },0);
        const otherExpensesCost=nonManpowerExpenses.filter((e:any)=>e.projectId===proj.id).reduce((sum:number,e:any)=>sum+(e.amount||0),0);
        const totalProjectCost=labourCost+materialsCost+otherExpensesCost;
        return {
          ...proj,
          labourCost,
          materialsCost,
          otherExpensesCost,
          totalProjectCost
        };
      });
    }
    const inventoryRow=rows.results.find(r=>r.key==='inventory');
    const projectsRow=rows.results.find(r=>r.key==='projects');
    const expensesRow=rows.results.find(r=>r.key==='expenses');
    const events=mailEvents(key,value,data,actor,revision);
    const serialized=JSON.stringify(value);
    const inventorySerialized=JSON.stringify(syncedInventory);
    const statements=syncedInventory?[
     db(env).prepare("UPDATE erp_collections SET value=?,revision=revision+1 WHERE key='inventory' AND revision=? AND EXISTS (SELECT 1 FROM erp_collections WHERE key='purchaseOrders' AND revision=?)").bind(inventorySerialized,inventoryRow!.revision,revision),
     db(env).prepare("UPDATE erp_collections SET value=?,revision=revision+1 WHERE key='purchaseOrders' AND revision=? AND EXISTS (SELECT 1 FROM erp_collections WHERE key='inventory' AND revision=? AND value=?)").bind(serialized,revision,inventoryRow!.revision+1,inventorySerialized)
    ]:(syncedProjects&&syncedExpenses?[
     db(env).prepare('UPDATE erp_collections SET value=?,revision=revision+1 WHERE key=? AND revision=?').bind(serialized,'manpower',revision),
     db(env).prepare('UPDATE erp_collections SET value=?,revision=revision+1 WHERE key=? AND revision=?').bind(JSON.stringify(syncedProjects),'projects',projectsRow!.revision),
     db(env).prepare('UPDATE erp_collections SET value=?,revision=revision+1 WHERE key=? AND revision=?').bind(JSON.stringify(syncedExpenses),'expenses',expensesRow!.revision)
    ]:[db(env).prepare('UPDATE erp_collections SET value=?,revision=revision+1 WHERE key=? AND revision=?').bind(serialized,key,revision)]);
    for(const event of events){const recipient=data.employees.find((e:any)=>e.id===event.toId&&e.status==='Active');if(!recipient||!validEmail(recipient.email))continue;
     statements.push(db(env).prepare("INSERT OR IGNORE INTO erp_mail_outbox (id,recipient_id,recipient_email,subject,body,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM erp_collections WHERE key=? AND revision=? AND value=?)").bind(event.id,recipient.id,recipient.email,event.subject,event.body,Date.now(),key,revision+1,serialized));}
    const results=await db(env).batch(statements);const result=results[syncedInventory?1:0];
    if(!result.meta.changes) return json({error:'Records changed in another session; refresh and retry'},409);
    if(events.length)await dispatch();
    if(key==='leaveRequests'){
     const previous=new Map(data.leaveRequests.map((l:any)=>[l.id,l]));
     const alerts:any[]=[];
     for(const leave of value){
      const prior=previous.get(leave.id) as any;
      if(prior?.status===leave.status)continue;
      const recipients=!prior?leaveRequestRecipients(leave,data):leave.status==='Pending PM Approval'?data.employees.filter((e:any)=>canReviewLeave(e,leave,data)):
       leave.status==='Pending Owner Approval'?data.employees.filter((e:any)=>e.role==='Owner'&&e.status==='Active'):
       data.employees.filter((e:any)=>e.id===leave.employeeId);
      for(const recipient of recipients)alerts.push({id:'notif-'+crypto.randomUUID(),type:prior?'leave_reviewed':'leave_requested',title:'Leave: '+leave.status,message:leave.employeeName+' — '+leave.fromDate+' to '+leave.toDate+'. '+leave.status+'.',targetAudience:'Assignee',targetUserId:recipient.id,targetRole:recipient.role,timestamp:new Date().toISOString(),read:false,priority:'Medium'});
     }
     if(alerts.length){
      // Re-read and CAS so concurrent notification updates are preserved.
      for(let attempt=0;attempt<5;attempt++){
       const latest=(await database.prepare("SELECT key,value,revision FROM erp_collections WHERE key='notifications'").all()).results[0];
       const saved=await database.prepare("UPDATE erp_collections SET value=?,revision=revision+1 WHERE key='notifications' AND revision=?").bind(JSON.stringify([...alerts,...JSON.parse(latest.value)]),latest.revision).run();
       if(saved.meta.changes)break;
      }
     }
    }
    return json({
      value:visibleRecords(actor,{...data,[key]:value})[key],
      revision:revision+1,
      ...(syncedInventory?{related:{inventory:{value:visibleRecords(actor,{...data,inventory:syncedInventory}).inventory,revision:inventoryRow!.revision+1}}}:
        (syncedProjects&&syncedExpenses?{related:{
          projects:{value:visibleRecords(actor,{...data,projects:syncedProjects}).projects,revision:projectsRow!.revision+1},
          expenses:{value:visibleRecords(actor,{...data,expenses:syncedExpenses}).expenses,revision:expensesRow!.revision+1}
        }}:{})
      )
    });
   }
   return json({error:'Not found'},404);
  } catch(error) { console.error('ERP database request failed',error); return json({error:'Shared records are temporarily unavailable. Please retry.'},503); }
 }
};
