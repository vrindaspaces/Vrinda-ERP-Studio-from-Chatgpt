import {useEffect,useState} from 'react';
export function EmailSettings(){
 const [state,setState]=useState<any>({connected:false,messages:[]});const [sender,setSender]=useState('');const [apiKey,setApiKey]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function load(){const response=await fetch('/api/email-settings');if(response.ok){const data=await response.json();setState(data);setSender(s=>s||data.sender);}}
 useEffect(()=>{load();const timer=setInterval(load,15000);return()=>clearInterval(timer);},[]);
 async function action(method:string,payload?:any){setBusy(true);setMessage('');try{const response=await fetch('/api/email-settings',{method,headers:{'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error);setApiKey('');setMessage(method==='DELETE'?'Resend disconnected. New emails remain queued.':payload?.action==='retry'?'Queued emails will be retried.':'Resend connected. A test email was accepted for your Owner email. Queued notifications will now be sent.');await load();}catch(error){setMessage(error instanceof Error?error.message:'Please retry.');}finally{setBusy(false);}}
 return <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
  <h2 className="font-bold text-slate-900">Email notifications</h2>
  <p>{state.connected?'Connected to Resend: '+state.sender:'Resend not connected. Notifications are saved in the email queue until you connect Resend.'}</p>
  <p className="text-xs text-slate-500">Assignments go to the email saved on the team member’s profile. Updates by an assignee go to the person who assigned the task or project.</p>
  <p className="text-xs text-slate-500">New leave requests notify the relevant Project Manager approver and Owner.</p>
  <form className="flex flex-wrap gap-3 items-end" onSubmit={e=>{e.preventDefault();action('POST',{sender,apiKey});}}>
   <label className="flex flex-col gap-1">Verified sender email<input required type="email" autoComplete="off" className="border rounded p-2" value={sender} onChange={e=>setSender(e.target.value)}/></label>
   <label className="flex flex-col gap-1">Resend API key<input required type="password" autoComplete="new-password" className="border rounded p-2" value={apiKey} onChange={e=>setApiKey(e.target.value)}/></label>
   <button disabled={busy} className="bg-indigo-600 text-white rounded px-4 py-2">{busy?'Connecting…':state.connected?'Update & send test email':'Connect & send test email'}</button>
  </form>
  <p className="text-xs text-slate-500">Use an address on your verified Resend domain and an API key with sending permission for that domain. Connecting sends a test email to your saved Owner email. The key is encrypted and never displayed. <a target="_blank" rel="noreferrer" className="underline text-indigo-600" href="https://resend.com/api-keys">Resend API keys</a></p>
  <div className="flex gap-3"><button disabled={busy||!state.connected} onClick={()=>action('POST',{action:'retry'})} className="border rounded px-3 py-2">Retry queued emails</button>{state.connected&&<button disabled={busy} onClick={()=>action('DELETE')} className="border rounded px-3 py-2">Disconnect Resend</button>}</div>
  {message&&<p role="status">{message}</p>}
  <p className="text-xs text-slate-500">“Sent” means the email provider accepted the message; it does not confirm inbox delivery. Pending emails retry while the application is active.</p>
  <div className="overflow-auto max-h-72"><table className="w-full text-xs text-left"><thead><tr><th>Recipient</th><th>Notification</th><th>Status</th></tr></thead><tbody>{state.messages.map((mail:any)=><tr key={mail.id} className="border-t"><td className="p-2">{mail.recipient_email}</td><td className="p-2">{mail.subject}</td><td className="p-2"><span>{mail.status}</span>{mail.error&&<p className="text-amber-700">{mail.error}</p>}{mail.status==='uncertain'&&<button disabled={busy} className="underline" onClick={()=>{if(window.confirm('Check the email provider’s log first. Retry only if this notification was not sent.'))action('POST',{action:'retry',id:mail.id});}}>Checked email log — retry</button>}</td></tr>)}</tbody></table>{!state.messages.length&&<p className="p-2 text-slate-500">No notification emails yet.</p>}</div>
 </section>;
}
