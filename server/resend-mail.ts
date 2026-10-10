export const validEmail=(s:unknown):s is string=>typeof s==='string'&&s.length<255&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(s);
export class MailError extends Error {
 constructor(public uncertain=false,public permanent=false,message='Resend could not send the notification. Please retry.'){super(message);}
}
export async function resendMail(sender:string,apiKey:string,message:{id:string;to:string;subject:string;body:string},transport:typeof fetch=fetch){
 if(!validEmail(sender)||!validEmail(message.to))throw new MailError(false,true,'Enter valid sender and recipient email addresses.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(message.id)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 let response:Response;
 try{response=await transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'erp-'+hash},body:JSON.stringify({from:'Vrinda Spaces ERP <'+sender+'>',to:[message.to],subject:message.subject,text:message.body}),signal:AbortSignal.timeout(12000)});}
 catch{throw new MailError(true,false,'Resend acceptance could not be confirmed. Check the Resend email log before retrying.');}
 if(!response.ok){
  const messages:Record<number,string>={401:'The Resend API key is invalid. Update the connection.',403:'Resend denied sending. Check the API key permissions and verify the sender domain.',409:'Resend could not safely retry this message. Check its email log before retrying.',422:'Resend rejected this email. Check the sender domain and recipient address.',429:'Resend rate limit reached. The notification will be retried.'};
  throw new MailError(response.status>=500,response.status>=400&&response.status<500&&response.status!==429,messages[response.status]||'Resend could not confirm sending. Check the email log.');
 }
 let result:any;try{result=await response.json();}catch{throw new MailError(true);}
 if(typeof result.id!=='string'||!result.id)throw new MailError(true);
 return result.id;
}
