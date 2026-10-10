// Identity and ownership are stamped here, never trusted from the browser.
import {canReviewLeave} from './access';
export function leaveRequestRecipients(leave:any,data:any){
 return data.employees.filter((employee:any)=>employee.status==='Active'&&(employee.role==='Owner'||canReviewLeave(employee,leave,data)));
}
export function mailEvents(key:string,value:any[],data:any,actor:any,revision:number){
 const events:{id:string;toId:string;subject:string;body:string}[]=[];
 if(key==='leaveRequests'){
  for(const leave of value){
   if(data.leaveRequests.some((prior:any)=>prior.id===leave.id)||leave.status!=='Pending PM Approval')continue;
   for(const recipient of leaveRequestRecipients(leave,data))events.push({id:[key,revision+1,leave.id,recipient.id].join('-'),toId:recipient.id,
    subject:'Leave request: '+leave.employeeName+' — '+leave.fromDate+' to '+leave.toDate,
    body:leave.employeeName+' has requested leave.\n\nDates: '+leave.fromDate+' to '+leave.toDate+'\nDays: '+leave.days+(leave.type?'\nLeave type: '+leave.type:'')+'\nReason: '+leave.reason+'\n\nStatus: Pending Project Manager approval. Project Manager approval is required before Owner approval.\n\nOpen ERP → HRMS & Leaves to review the request:\nhttps://erpstudio.vrindaspaces.com/'});
  }
  return events;
 }
 if(!['tasks','projects'].includes(key))return events;
 const roles=key==='tasks'?['assignedUserId']:['projectManagerId','siteEngineerId','designerId'];
 const owner=data.employees.filter((e:any)=>e.role==='Owner'&&e.status==='Active');
 for(const item of value){
  const prior=data[key].find((r:any)=>r.id===item.id);
  const legacy=prior?.createdById||data.employees.find((e:any)=>e.name===prior?.createdBy)?.id||(owner.length===1?owner[0].id:undefined);
  item.createdById=prior?legacy:actor.id;
  item.assignmentOwners={...(prior?.assignmentOwners||{})};
  const recipients=new Map<string,{subject:string;body:string}>();
  const title=item.title||item.name||item.projectName||'Untitled';
  const kind=key==='tasks'?'Task':'Project';
  const link='https://erpstudio.vrindaspaces.com/';
  for(const role of roles){
   const assignee=item[role];
   const changed=assignee&&assignee!==prior?.[role];
   if(changed){item.assignmentOwners[role]=actor.id;recipients.set(assignee,{subject:kind+' assigned: '+title,body:actor.name+' assigned you '+kind.toLowerCase()+' "'+title+'".\n\nOpen ERP to view the details:\n'+link});}
   else if(assignee&&!item.assignmentOwners[role])item.assignmentOwners[role]=legacy;
   if(prior&&prior[role]===actor.id){
    const fields=Object.keys(item).filter(k=>!['createdById','assignmentOwners','assignedById'].includes(k)&&JSON.stringify(item[k])!==JSON.stringify(prior[k]));
    const assignedBy=prior.assignmentOwners?.[role]||legacy;
    if(fields.length&&assignedBy&&assignedBy!==actor.id)recipients.set(assignedBy,{subject:kind+' updated: '+title,body:actor.name+' updated '+kind.toLowerCase()+' "'+title+'".\nChanged: '+fields.join(', ')+(item.status?'\nStatus: '+item.status:'')+'\n\nOpen ERP to view the update:\n'+link});
   }
  }
  for(const [toId,email]of recipients)events.push({id:[key,revision+1,item.id,toId].join('-'),toId,...email});
 }
 return events;
}
