import {uploadToDrive,readDriveFile,deleteDriveFile} from './google-drive';
import {imageType} from './logo';
import {projectIds,visibleRecords} from './access';
import {mailEvents} from './mail-events';
import {validEmail} from './resend-mail';
const json=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function taskFiles(request:Request,env:any,actor:any,data:any,dispatch:()=>Promise<void>){
 if(!actor)return json({error:'Please sign in.'},401);
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/task-files/')&&request.method==='GET'){
  const id=decodeURIComponent(path.slice('/api/task-files/'.length));
  const task=visibleRecords(actor,data).tasks.find((t:any)=>t.attachments?.some((f:any)=>f.id===id));
  const file=task?.attachments.find((f:any)=>f.id===id);if(!file)return json({error:'File not found or access denied.'},404);
  try{
   const preview=new URL(request.url).searchParams.get('preview')==='1';
   const object=file.driveFileId?await readDriveFile(env,file.driveFileId,preview):await env.FILES?.get('tasks/'+task.id+'/'+file.id);if(!object)return json({error:'File is unavailable. Please retry.'},404);
   if(preview){const bytes=new Uint8Array(await (object instanceof Response?object.arrayBuffer():new Response(object.body).arrayBuffer()));const mime=imageType(bytes,true);if(!mime)return new Response(null,{status:204,headers:{'Cache-Control':'private, no-store'}});return new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
   return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox'}});
  }catch{return json({error:'Google Drive file is unavailable. Ask the Owner to check the connection.'},503);}
 }
 const match=path.match(/^\/api\/tasks\/([^/]+)\/files$/);if(!match||request.method!=='POST')return json({error:'Not found'},404);
 const taskId=decodeURIComponent(match[1]);
 const allowed=(task:any)=>task&&(actor.role==='Owner'||task.assignedUserId===actor.id||actor.role==='Project Manager'&&projectIds(actor,data).has(task.projectId));
 const task=data.tasks.find((t:any)=>t.id===taskId);if(!allowed(task))return json({error:'Your designation does not allow uploading to this task.'},403);
 if(Number(request.headers.get('content-length'))>11*1024*1024)return json({error:'Choose a file no larger than 10 MB.'},413);
 const form=await request.formData();const upload=form.get('file');
 if(!(upload instanceof File)||!upload.size||upload.size>10*1024*1024)return json({error:'Choose a file between 1 byte and 10 MB.'},400);
 const project=data.projects.find((p:any)=>p.id===task.projectId);if(!project)return json({error:'Assign this task to a project before uploading.'},400);
 const id=crypto.randomUUID();
 let location:any;try{location=await uploadToDrive(env,project,task,id,upload);}catch(error){return json({error:error instanceof Error?error.message:'Google Drive upload failed.'},503);}
 const attachment={...location,id,name:upload.name.slice(0,200),size:upload.size,type:upload.type||'application/octet-stream',url:'/api/task-files/'+id,uploadedAt:new Date().toISOString(),uploadedBy:actor.name};
 let saved=false;
 try{
  for(let attempt=0;attempt<5;attempt++){
   const row=(await env.DB.prepare("SELECT value,revision FROM erp_collections WHERE key='tasks'").all()).results[0];
   const previous=JSON.parse(row.value);const current=previous.find((t:any)=>t.id===taskId);
   if(!allowed(current)||current.projectId!==task.projectId)return json({error:'The task assignment changed. Refresh and try again.'},403);
   const next=previous.map((t:any)=>t.id===taskId?{...t,attachments:[...(t.attachments||[]),attachment]}:t);
   const events=mailEvents('tasks',next,{...data,tasks:previous},actor,row.revision);const serialized=JSON.stringify(next);
   const statements=[env.DB.prepare("UPDATE erp_collections SET value=?,revision=revision+1 WHERE key='tasks' AND revision=?").bind(serialized,row.revision)];
   for(const event of events){const recipient=data.employees.find((e:any)=>e.id===event.toId&&e.status==='Active');if(!recipient||!validEmail(recipient.email))continue;
    statements.push(env.DB.prepare("INSERT OR IGNORE INTO erp_mail_outbox (id,recipient_id,recipient_email,subject,body,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM erp_collections WHERE key='tasks' AND revision=? AND value=?)").bind(event.id,recipient.id,recipient.email,event.subject,event.body,Date.now(),row.revision+1,serialized));}
   const [result]=await env.DB.batch(statements);if(!result.meta.changes)continue;
   saved=true;if(events.length)await dispatch();return json({attachment});
  }
  return json({error:'The task changed while uploading. Please retry.'},409);
 }finally{if(!saved)try{await deleteDriveFile(env,location.driveFileId);}catch{console.error('Task upload cleanup failed');}}
}
