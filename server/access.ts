// All authorization uses the employee fetched from D1 for the trusted Site identity.
type RecordValue=Record<string,any>;
export const roles=['Owner','Project Manager','Site Engineer','Designer','Front Office','Marketing'];
const same=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
const fail=(message='Your designation does not allow this change.')=>{throw new Error(message)};
const safeEmployee=(e:any)=>({...e,password:''});
export function projectIds(actor:any,data:RecordValue):Set<string> {
 if(['Owner','Front Office','Marketing'].includes(actor.role))return new Set(data.projects.map((p:any)=>p.id));
 return new Set(data.projects.filter((p:any)=>[p.projectManagerId,p.siteEngineerId,p.designerId].includes(actor.id)||actor.assignedProjectIds?.includes(p.id)).map((p:any)=>p.id));
}
export function canReviewLeave(actor:any,leave:any,data:RecordValue) {
 if(actor.role!=='Project Manager'||actor.id===leave.employeeId)return false;
 const employee=data.employees.find((e:any)=>e.id===leave.employeeId);
 const managers=new Set(data.projects.filter((p:any)=>[p.projectManagerId,p.siteEngineerId,p.designerId].includes(leave.employeeId)||employee?.assignedProjectIds?.includes(p.id)).map((p:any)=>p.projectManagerId).filter((id:any)=>id&&id!==leave.employeeId&&data.employees.some((e:any)=>e.id===id&&e.role==='Project Manager'&&e.status==='Active')));
 return managers.size?managers.has(actor.id):true;
}
export function visibleRecords(actor:any,data:RecordValue):RecordValue {
 if(!actor)return Object.fromEntries(Object.entries(data).map(([key,v])=>[key,Array.isArray(v)?[]:{}]));
 if(actor.role==='Owner')return {...data,employees:data.employees.map(safeEmployee)};
 const ids=projectIds(actor,data),sales=['Front Office','Marketing'].includes(actor.role),ops=['Project Manager','Site Engineer'].includes(actor.role);
 const projects=data.projects.filter((p:any)=>ids.has(p.id)).map((p:any)=>sales?p:{...p,totalContractValue:0,totalReceivedAmount:0,budgetAllocation:Object.fromEntries(Object.keys(p.budgetAllocation).map(k=>[k,0])),milestones:p.milestones.map((m:any)=>({...m,paymentAmount:0,paymentReceived:0,paymentDuePct:0,isBilled:false}))});
 const clientIds=new Set(projects.map((p:any)=>p.clientId));
 return {
  companyProfile:{...data.companyProfile,bankName:'',accountName:'',accountNumber:'',ifscCode:'',branch:'',panNumber:''},
  employees:data.employees.map((e:any)=>e.id===actor.id?safeEmployee(e):{id:e.id,name:e.name,role:e.role,status:e.status,email:'',phone:'',joiningDate:'',baseSalary:0,bankAccount:'',ifsc:'',pan:'',uan:'',assignedProjectIds:[]}),
  clients:sales?data.clients:data.clients.filter((c:any)=>clientIds.has(c.id)),projects,
  tasks:data.tasks.filter((t:any)=>ids.has(t.projectId)||t.assignedUserId===actor.id),
  leaveRequests:data.leaveRequests.filter((l:any)=>l.employeeId===actor.id||canReviewLeave(actor,l,data)),
  attendance:data.attendance.filter((r:any)=>r.employeeId===actor.id),payslips:data.payslips.filter((r:any)=>r.employeeId===actor.id),
  vendors:ops?data.vendors:[],purchaseOrders:ops?data.purchaseOrders.filter((p:any)=>ids.has(p.projectId)):[],inventory:ops?data.inventory:[],
  quotations:sales?data.quotations:[],invoices:actor.role==='Front Office'?data.invoices:[],clientPayments:actor.role==='Front Office'?data.clientPayments:[],expenses:[],supplierInvoices:[],
  notifications:data.notifications.filter((n:any)=>n.targetUserId?n.targetUserId===actor.id:n.targetRole===actor.role),
  manpower:ops||actor.role==='Owner'?(data.manpower||[]):[],
 };
}
function limitedFields(before:any,after:any,allowed:string[]) {
 for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(!same(before[key],after[key])&&!allowed.includes(key))fail();
}
function validateLeave(actor:any,before:any,next:any,data:RecordValue) {
 const employee=data.employees.find((e:any)=>e.id===next.employeeId);if(!employee)fail('Unknown leave applicant.');
 if(!before){
  if(actor.role!=='Owner'&&next.employeeId!==actor.id)fail('You can apply for your own leave only.');
  if(next.status!=='Pending PM Approval'||next.pmApproval||next.ownerApproval)fail('Leave must start with Project Manager approval.');
  if(!next.fromDate||!next.toDate||next.toDate<next.fromDate||!Number.isFinite(next.days)||next.days<=0||!next.reason?.trim())fail('Enter valid leave dates, days and reason.');
  return {...next,employeeName:employee.name,employeeRole:employee.role};
 }
 const decision=!same(before.pmApproval,next.pmApproval)||!same(before.ownerApproval,next.ownerApproval)||before.status!==next.status;
 if(!decision){if(actor.role!=='Owner')fail('Only the Owner can correct a leave request.');return next;}
 limitedFields(before,next,['status','pmApproval','ownerApproval']);
 const date=new Date().toISOString().slice(0,10);
 if(!same(before.pmApproval,next.pmApproval)){
  if(!canReviewLeave(actor,before,data)||before.status!=='Pending PM Approval'||before.pmApproval||next.ownerApproval||typeof next.pmApproval?.approved!=='boolean')fail('Only the assigned Project Manager can review a pending request.');
  const approved=next.pmApproval.approved;
  if(next.status!==(approved?'Pending Owner Approval':'Rejected'))fail('Invalid Project Manager decision.');
  return {...before,status:next.status,pmApproval:{approved,date,approvedBy:actor.name+' (Project Manager)',notes:next.pmApproval.notes||''}};
 }
 if(actor.role!=='Owner'||before.status!=='Pending Owner Approval'||before.pmApproval?.approved!==true||before.ownerApproval||typeof next.ownerApproval?.approved!=='boolean')fail('Owner approval requires completed Project Manager approval.');
 const approved=next.ownerApproval.approved;
 if(next.status!==(approved?'Approved':'Rejected'))fail('Invalid Owner decision.');
 return {...before,status:next.status,ownerApproval:{approved,date,approvedBy:actor.name+' (Owner)',notes:next.ownerApproval.notes||''}};
}
export function authorizeWrite(actor:any,key:string,value:any,data:RecordValue) {
 const before=data[key],visible=visibleRecords(actor,data)[key];
 if(!actor)fail('Please sign in.');
 if(key==='companyProfile'){if(actor.role!=='Owner')fail();return value;}
 if(!Array.isArray(value))fail('Invalid records.');
 const old=new Map<string,any>(visible.map((r:any)=>[r.id,r]));
 const full=new Map<string,any>(before.map((r:any)=>[r.id,r]));
 const next=new Map<string,any>();
 for(let row of value){
  if(!row?.id||next.has(row.id))fail('Duplicate or missing record ID.');
  const previous=old.get(row.id),original=full.get(row.id);
  if(original&&!previous)fail();
  if(previous&&same(previous,row)){next.set(row.id,original);continue;}
  if(key==='projects'){
   for(const [idField,nameField,designation] of [['projectManagerId','projectManagerName','Project Manager'],['siteEngineerId','siteEngineerName','Site Engineer'],['designerId','designerName','Designer']]){
    if(!original||original[idField]!==row[idField]){
     const employee=row[idField]?data.employees.find((e:any)=>e.id===row[idField]&&e.role===designation&&e.status==='Active'):null;
     if(row[idField]&&!employee)fail('Choose an existing '+designation+' from your team.');
     row={...row,[nameField]:employee?.name||'Unassigned'};
    }
   }
  }
  if(key==='tasks'&&(!original||original.assignedUserId!==row.assignedUserId)){
   const employee=data.employees.find((e:any)=>e.id===row.assignedUserId&&e.status==='Active');
   if(!employee)fail('Choose an existing team member for this task.');
   if(!data.projects.some((p:any)=>p.id===row.projectId))fail('Choose an existing project.');
   row={...row,assignedUserName:employee.name};
  }
  if(key==='leaveRequests')row=validateLeave(actor,original,row,data);
  else if(actor.role!=='Owner'){
   if(key==='employees'||key==='payslips'||key==='expenses'||key==='vendors'||key==='purchaseOrders'||key==='inventory')fail();
   else if(key==='attendance'){
    if(row.employeeId!==actor.id||original?.employeeId!==undefined&&original.employeeId!==actor.id)fail();
    if(previous)limitedFields(previous,row,['punchOut']);
    if(!original&&row.date!==new Date().toISOString().slice(0,10))fail('Attendance must be for today.');
    row={...row,employeeName:actor.name};
   } else if(key==='projects'){
    if(actor.role==='Front Office'){
     if(!previous)fail();limitedFields(previous,row,['totalReceivedAmount']);
     next.set(row.id,{...original,totalReceivedAmount:row.totalReceivedAmount});continue;
    }
    if(!previous||!['Project Manager','Site Engineer','Designer'].includes(actor.role))fail();
    limitedFields(previous,row,actor.role==='Designer'?['moodBoards','documents']:['status','milestones','vendorMilestones','handoverChecklist','documents','notes','labourCost','totalProjectCost','materialsCost','otherExpensesCost']);
    const priorMilestones=new Map<string,any>(original.milestones.map((m:any)=>[m.id,m]));
    row={...original,...Object.fromEntries(Object.keys(row).filter(k=>!same(previous[k],row[k])).map(k=>[k,row[k]]))};
    if(row.milestones.length!==original.milestones.length)fail();
    row.milestones=row.milestones.map((m:any)=>{const prior=priorMilestones.get(m.id);if(!prior)fail();return {...m,paymentAmount:prior.paymentAmount,paymentReceived:prior.paymentReceived,paymentDuePct:prior.paymentDuePct,isBilled:prior.isBilled}});
   } else if(key==='tasks'){
    if(!projectIds(actor,data).has(row.projectId)&&row.assignedUserId!==actor.id)fail();
    if(actor.role!=='Project Manager'){
     if(!previous||previous.assignedUserId!==actor.id)fail();limitedFields(previous,row,['status','photos','comments']);
    }
   } else if(key==='clients'||key==='quotations') {if(!['Marketing','Front Office'].includes(actor.role))fail();}
   else if(key==='invoices'||key==='clientPayments') {if(actor.role!=='Front Office')fail();}
   else if(key==='notifications') {
    if(!previous){if(actor.role!=='Project Manager'||row.type!=='task_assigned'||!projectIds(actor,data).has(row.projectId)||!data.employees.some((e:any)=>e.id===row.targetUserId))fail();}
    else limitedFields(previous,row,['read']);
   }
   else if(key==='manpower') {
    if(!['Owner','Project Manager','Site Engineer'].includes(actor.role))fail('Only Owner, Project Manager, or Site Engineer can manage manpower.');
   }
   else fail();
  }
  if(key==='employees'){
   if(!roles.includes(row.role)||typeof row.name!=='string'||!row.name.trim()||typeof row.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)||!Array.isArray(row.assignedProjectIds)||!['Active','On Leave'].includes(row.status)||typeof row.password!=='string'&&row.password!==undefined)fail('Choose a valid designation, status and email.');
   row={...row,password:row.password||original?.password||'vrinda123'};
  }
  next.set(row.id,row);
 }
 for(const [id,previous] of old)if(!next.has(id)){
  if(actor.role!=='Owner'&&!(key==='notifications'||key==='tasks'&&actor.role==='Project Manager'))fail('Your designation does not allow deleting these records.');
 }
 const result=before.filter((r:any)=>!old.has(r.id)||next.has(r.id)).map((r:any)=>next.get(r.id)||r);
 for(const [id,row] of next)if(!full.has(id))result.push(row);
 if(key==='employees'){
  if(!result.some((e:any)=>e.role==='Owner'&&e.status==='Active'))fail('Keep at least one active Owner.');
  const emails=result.map((e:any)=>e.email.trim().toLowerCase());if(new Set(emails).size!==emails.length)fail('Each team member needs a unique email.');
 }
 return result;
}
