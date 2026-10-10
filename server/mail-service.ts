import {resendMail,MailError,validEmail} from './resend-mail';
export {decryptPassword};
const utf=new TextEncoder();
async function cipherKey(env:any){if(!env.EMAIL_SETTINGS_KEY)throw new Error('Email setup unavailable.');return crypto.subtle.importKey('raw',Uint8Array.from(atob(env.EMAIL_SETTINGS_KEY),c=>c.charCodeAt(0)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encryptPassword(env:any,password:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await cipherKey(env),utf.encode(password));return btoa(String.fromCharCode(...iv,...new Uint8Array(encrypted)));}
async function decryptPassword(env:any,password:string){const bytes=Uint8Array.from(atob(password),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await cipherKey(env),bytes.slice(12)));}
export async function mailSettings(env:any){return (await env.DB.prepare("SELECT sender,password FROM erp_mail_settings WHERE id='resend'").all()).results[0];}
export async function processMail(env:any){
 const settings=await mailSettings(env);if(!settings)return;
 const password=await decryptPassword(env,settings.password);
 // A crashed send is ambiguous: do not resend automatically.
 await env.DB.prepare("UPDATE erp_mail_outbox SET status='uncertain',error='Sending stopped before confirmation. Check the Resend email log before retrying.' WHERE status='sending' AND lease_until<?").bind(Date.now()).run();
 const rows=(await env.DB.prepare("SELECT * FROM erp_mail_outbox WHERE status='pending' AND next_attempt_at<=? ORDER BY created_at LIMIT 2").bind(Date.now()).all()).results;
 for(const row of rows){
  const claim=await env.DB.prepare("UPDATE erp_mail_outbox SET status='sending',attempts=attempts+1,lease_until=? WHERE id=? AND status='pending'").bind(Date.now()+60000,row.id).run();if(!claim.meta.changes)continue;
  let accepted=false;
  try{await resendMail(settings.sender,password,{id:row.id,to:row.recipient_email,subject:row.subject,body:row.body},env.RESEND_FETCH);accepted=true;
   await env.DB.prepare("UPDATE erp_mail_outbox SET status='sent',error='',sent_at=? WHERE id=?").bind(Date.now(),row.id).run();
  }catch(error){const uncertain=accepted||error instanceof MailError&&error.uncertain;const attempts=row.attempts+1;
   const permanent=error instanceof MailError&&error.permanent;
   await env.DB.prepare('UPDATE erp_mail_outbox SET status=?,error=?,next_attempt_at=? WHERE id=?').bind(uncertain?'uncertain':permanent||attempts>=5?'failed':'pending',uncertain?'Resend acceptance could not be confirmed. Check the Resend email log before retrying.':error instanceof MailError?error.message:'Resend sending failed. Check the connection.',Date.now()+Math.min(3600000,60000*2**attempts),row.id).run();}
 }
}
export async function mailApi(request:Request,env:any,actor:any){
 if(!actor)return Response.json({error:'Please sign in.'},{status:401});
 if(actor.role!=='Owner')return Response.json({error:'Only the Owner can manage email settings.'},{status:403});
 const json=(value:any,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method==='GET'){
  const settings=await mailSettings(env);const rows=(await env.DB.prepare('SELECT id,recipient_email,subject,status,attempts,error,created_at,sent_at FROM erp_mail_outbox ORDER BY created_at DESC LIMIT 50').all()).results;
  return json({provider:'resend',connected:!!settings,sender:settings?.sender||'',messages:rows});
 }
 if(request.method==='DELETE'){await env.DB.prepare("DELETE FROM erp_mail_settings WHERE id IN ('resend','google')").run();return json({success:true});}
 if(request.method==='POST'){
  const payload:any=await request.json();
  if(payload.action==='retry'){
   // Uncertain messages require an explicit, individual retry after checking Sent mail.
   if(payload.id)await env.DB.prepare("UPDATE erp_mail_outbox SET status='pending',next_attempt_at=0 WHERE id=? AND status IN ('failed','uncertain')").bind(payload.id).run();
   else await env.DB.prepare("UPDATE erp_mail_outbox SET status='pending',next_attempt_at=0 WHERE status IN ('pending','failed')").run();
   return json({success:true});
  }
  const sender=typeof payload.sender==='string'?payload.sender.trim().toLowerCase():'';
  const password=typeof payload.apiKey==='string'?payload.apiKey.trim():'';
  if(!validEmail(sender)||!/^re_[A-Za-z0-9_-]{10,200}$/.test(password))return json({error:'Enter a verified sender email and a valid Resend API key starting with re_.'},400);
  if(!validEmail(actor.email))return json({error:'Save a valid Owner email in Team Members before connecting.'},400);
  try{const encrypted=await encryptPassword(env,password);
   await resendMail(sender,password,{id:'setup-'+crypto.randomUUID(),to:actor.email,subject:'Vrinda Spaces ERP — Resend connected',body:'Your ERP notification connection to Resend is working. Task and project assignments will notify the selected team members. Assignee updates will notify the person who assigned the work.\n\nhttps://erpstudio.vrindaspaces.com/'},env.RESEND_FETCH);
   await env.DB.batch([env.DB.prepare("INSERT INTO erp_mail_settings (id,sender,password) VALUES ('resend',?,?) ON CONFLICT(id) DO UPDATE SET sender=excluded.sender,password=excluded.password").bind(sender,encrypted),env.DB.prepare("DELETE FROM erp_mail_settings WHERE id='google'")]);return json({success:true});
  }catch(error){return json({error:error instanceof MailError?error.message:'Could not save the Resend connection. Please retry.'},400);}
 }
 return json({error:'Method not allowed'},405);
}
