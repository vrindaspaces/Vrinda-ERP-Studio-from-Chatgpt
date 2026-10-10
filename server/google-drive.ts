import {encryptPassword,decryptPassword} from './mail-service';
const utf=new TextEncoder();const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const transport=(env:any)=>env.DRIVE_FETCH||fetch;
const json=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function getCallbackUrl(request: Request, env: any) {
  if (env.APP_URL && !env.APP_URL.includes('MY_APP_URL')) {
    return `${env.APP_URL.replace(/\/$/, '')}/api/google-drive/callback`;
  }
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || (url.protocol.startsWith('https') ? 'https' : 'http');
  return `${proto}://${host}/api/google-drive/callback`;
}
export async function driveToken(env:any,credential:any){
 const response=await transport(env)('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id:credential.clientId,client_secret:credential.clientSecret,refresh_token:credential.refreshToken}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Google connection expired or was revoked. Ask the Owner to reconnect Google Drive.');const result=await response.json();if(!result.access_token)throw Error('Google authentication failed.');return result.access_token;
}
async function api(env:any,token:string,path:string,options:any={}){
 const response=await transport(env)('https://www.googleapis.com/'+path,{...options,headers:{Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Google Drive could not complete the request. Check Drive access and try again.');return response;
}
export async function driveSettings(env:any){return (await env.DB.prepare("SELECT * FROM erp_drive_settings WHERE id='google'").all()).results[0];}
async function connection(env:any){const settings=await driveSettings(env);if(!settings)throw Error('The Owner must connect the official Google Shared Drive in Company & GST Account before uploading.');return{settings,token:await driveToken(env,JSON.parse(await decryptPassword(env,settings.credential)))};}
export async function driveApi(request:Request,env:any,actor:any){
 if(!actor)return json({error:'Please sign in.'},401);if(actor.role!=='Owner')return json({error:'Only the Owner can connect Google Drive.'},403);
 const config=(await env.DB.prepare("SELECT credential FROM erp_drive_oauth WHERE id='google'").all()).results[0];
 if(request.method==='GET'){const settings=await driveSettings(env);return json({configured:!!config,authorized:!!settings,connected:!!settings?.root_id,rootId:settings?.root_id||'',email:settings?.email||'',redirectUri:getCallbackUrl(request,env)});}
 if(request.method==='POST'){
  try{const body:any=await request.json();
   if(body.action==='configure'){
    if(typeof body.clientId!=='string'||!body.clientId.endsWith('.apps.googleusercontent.com')||typeof body.clientSecret!=='string'||!body.clientSecret.trim()||body.clientSecret.length>500)return json({error:'Enter the Google OAuth client ID and client secret.'},400);
    const credential=await encryptPassword(env,JSON.stringify({clientId:body.clientId.trim(),clientSecret:body.clientSecret.trim()}));
    await env.DB.prepare("INSERT INTO erp_drive_oauth (id,credential) VALUES ('google',?) ON CONFLICT(id) DO UPDATE SET credential=excluded.credential").bind(credential).run();return json({success:true});
   }
   if(body.action==='start'){
    if(!config)return json({error:'Save the Google OAuth client details first.'},400);
    const credential=JSON.parse(await decryptPassword(env,config.credential));const state=crypto.randomUUID()+crypto.randomUUID();const verifier=crypto.randomUUID()+crypto.randomUUID();
    const digest=async(value:string)=>base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',utf.encode(value))));
    const session=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('erp_session='))?.slice(12)||'';
    const sessionHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',utf.encode(session)))).map(v=>v.toString(16).padStart(2,'0')).join('');
    await env.DB.prepare('DELETE FROM erp_drive_states WHERE expires_at<?').bind(Date.now()).run();
    await env.DB.prepare('INSERT INTO erp_drive_states (hash,session_hash,credential,verifier,expires_at) VALUES (?,?,?,?,?)').bind(await digest(state),sessionHash,config.credential,verifier,Date.now()+600000).run();
    const callbackUri = getCallbackUrl(request, env);
    const response=json({url:'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:credential.clientId,redirect_uri:callbackUri,response_type:'code',scope:'openid email https://www.googleapis.com/auth/drive',access_type:'offline',prompt:'consent',state,code_challenge:await digest(verifier),code_challenge_method:'S256'})});
    response.headers.set('Set-Cookie','erp_drive_state='+state+'; Path=/api/google-drive; HttpOnly; Secure; SameSite=Lax; Max-Age=600');return response;
   }
   const match=String(body.root||'').match(/(?:\/folders\/)?([a-zA-Z0-9_-]{10,})(?:[/?].*)?$/);if(!match)return json({error:'Enter the Shared Drive parent-folder ID or link.'},400);
   const {settings,token}=await connection(env);const folder=await(await api(env,token,'drive/v3/files/'+match[1]+'?supportsAllDrives=true&fields=id,name,mimeType,driveId,capabilities')).json();
   if(!folder.driveId||folder.mimeType!=='application/vnd.google-apps.folder'||!folder.capabilities?.canAddChildren)return json({error:'Choose a folder in a Google Shared Drive where your connected account can add files.'},400);
   await env.DB.prepare("UPDATE erp_drive_settings SET root_id=?,drive_id=? WHERE id='google'").bind(folder.id,folder.driveId).run();return json({success:true,folder:folder.name});
  }catch{return json({error:'Google Drive connection failed. Check the account, folder access and OAuth settings.'},400);}
 }
 return json({error:'Method not allowed'},405);
}
export async function driveCallback(request:Request,env:any,platformUser:any){
 const url=new URL(request.url);const state=url.searchParams.get('state')||'';const browserState=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('erp_drive_state='))?.slice(16);
 const fail=()=>json({error:'Google connection could not be completed. Return to ERP Company & GST Account and reconnect.'},400);
 if(!state||state!==browserState||platformUser?.role!=='Owner')return fail();
 const hash=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',utf.encode(state))));
 const pending=(await env.DB.prepare('SELECT * FROM erp_drive_states WHERE hash=?').bind(hash).all()).results[0];
 if(!pending||pending.expires_at<Date.now())return fail();
 const session=(await env.DB.prepare('SELECT employee_id,platform_email,expires_at FROM erp_sessions WHERE token_hash=?').bind(pending.session_hash).all()).results[0];
 if(!session||session.expires_at<Date.now())return fail();
 const activeConfig=(await env.DB.prepare("SELECT credential FROM erp_drive_oauth WHERE id='google'").all()).results[0];if(activeConfig?.credential!==pending.credential)return fail();
 const consumed=await env.DB.prepare('DELETE FROM erp_drive_states WHERE hash=?').bind(hash).run();if(!consumed.meta.changes)return fail();
 try{
  if(!url.searchParams.get('code')||url.searchParams.get('error'))return fail();
  const credential=JSON.parse(await decryptPassword(env,pending.credential));
  const callbackUri = getCallbackUrl(request, env);
  const response=await transport(env)('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',code:url.searchParams.get('code')!,redirect_uri:callbackUri,client_id:credential.clientId,client_secret:credential.clientSecret,code_verifier:pending.verifier}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)return fail();const result=await response.json();if(!result.refresh_token||!result.access_token||!String(result.scope||'').split(' ').includes('https://www.googleapis.com/auth/drive'))return fail();
  const info=await transport(env)('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+result.access_token},signal:AbortSignal.timeout(15000)});if(!info.ok)return fail();const user=await info.json();if(!user.email||user.email_verified!==true)return fail();
  const previous=await driveSettings(env);const same=previous?.email===user.email;
  await env.DB.prepare("INSERT INTO erp_drive_settings (id,root_id,drive_id,email,credential) VALUES ('google',?,?,?,?) ON CONFLICT(id) DO UPDATE SET root_id=excluded.root_id,drive_id=excluded.drive_id,email=excluded.email,credential=excluded.credential").bind(same?previous.root_id:'',same?previous.drive_id:'',user.email,await encryptPassword(env,JSON.stringify({...credential,refreshToken:result.refresh_token}))).run();
  return new Response(null,{status:302,headers:{Location:'/?drive=connected','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':'erp_drive_state=; Path=/api/google-drive; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
 }catch{return fail();}
}
export async function uploadToDrive(env:any,project:any,task:any,id:string,file:File){
 const {settings,token}=await connection(env);if(!settings.root_id)throw Error('The Owner must select the Google Shared Drive folder before uploading.');const key=JSON.stringify([settings.root_id,project.id]);
 await env.DB.prepare('INSERT OR IGNORE INTO erp_drive_folders (key,lease_until) VALUES (?,0)').bind(key).run();
 let folder=(await env.DB.prepare('SELECT folder_id FROM erp_drive_folders WHERE key=?').bind(key).all()).results[0]?.folder_id;
 if(!folder){const lock=await env.DB.prepare('UPDATE erp_drive_folders SET lease_until=? WHERE key=? AND folder_id IS NULL AND lease_until<?').bind(Date.now()+120000,key,Date.now()).run();if(!lock.meta.changes)throw Error('The project folder is being prepared. Please retry shortly.');
  try{const query="'"+settings.root_id+"' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='erpProjectId' and value='"+String(project.id).replaceAll('\\','\\\\').replaceAll("'","\\'")+"' }";
   const found=await(await api(env,token,'drive/v3/files?'+new URLSearchParams({q:query,corpora:'drive',driveId:settings.drive_id,includeItemsFromAllDrives:'true',supportsAllDrives:'true',fields:'files(id)',pageSize:'100'}))).json();folder=found.files?.[0]?.id;
   if(!folder){const created=await(await api(env,token,'drive/v3/files?supportsAllDrives=true&fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:project.title+' ['+project.id+']',mimeType:'application/vnd.google-apps.folder',parents:[settings.root_id],appProperties:{erpProjectId:project.id}})})).json();folder=created.id;}
   if(!folder)throw Error('Google did not confirm the project folder. Please retry.');await env.DB.prepare('UPDATE erp_drive_folders SET folder_id=?,lease_until=0 WHERE key=?').bind(folder,key).run();
  }finally{await env.DB.prepare('UPDATE erp_drive_folders SET lease_until=0 WHERE key=?').bind(key).run();}
 }
 const boundary='erp-'+crypto.randomUUID();const metadata={name:file.name,parents:[folder],appProperties:{erpProjectId:project.id,erpTaskId:task.id,erpFileId:id}};
 const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: '+(/^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(file.type)?file.type:'application/octet-stream')+'\r\n\r\n',await file.arrayBuffer(),'\r\n--'+boundary+'--\r\n']);
 const uploaded=await(await api(env,token,'upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body})).json();if(!uploaded.id)throw Error('Google did not confirm the upload. Please retry.');return {driveFileId:uploaded.id,driveFolderId:folder};
}
export async function readDriveFile(env:any,id:string,thumbnail=false){const {token}=await connection(env);
 if(thumbnail){try{
  const file=await(await api(env,token,'drive/v3/files/'+encodeURIComponent(id)+'?supportsAllDrives=true&fields=thumbnailLink,mimeType')).json();
  // Original raster photos remain available before Google generates a thumbnail.
  if(!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.mimeType)&&file.thumbnailLink){
   let url=new URL(file.thumbnailLink);
   for(let hop=0;hop<4;hop++){
    if(url.protocol!=='https:'||url.username||url.password||url.port||!(url.hostname.endsWith('.googleusercontent.com')||url.hostname==='drive.google.com'))break;
    const response=await transport(env)(url.href,{redirect:'manual',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
    if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('Location');if(!location)break;url=new URL(location,url);continue;}
    if(response.ok&&response.headers.get('Content-Type')?.startsWith('image/'))return response;
    break;
   }
  }
 }catch{
  // Thumbnail links can expire or redirect. Do not fail an available original.
 }}
 return api(env,token,'drive/v3/files/'+encodeURIComponent(id)+'?alt=media&supportsAllDrives=true');
}

export async function deleteDriveFile(env:any,id:string){const {token}=await connection(env);await api(env,token,'drive/v3/files/'+encodeURIComponent(id)+'?supportsAllDrives=true',{method:'DELETE'});}
