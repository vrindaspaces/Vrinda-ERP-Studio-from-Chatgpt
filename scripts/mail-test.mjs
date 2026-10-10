import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker from '../dist/server/index.js';
const sql=new DatabaseSync(':memory:');for(const file of readdirSync('./drizzle').filter(f=>f.endsWith('.sql')))sql.exec(readFileSync('./drizzle/'+file,'utf8'));
function statement(query,args=[]){return{bind:(...values)=>statement(query,values),all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}})};}
const DB={prepare:query=>statement(query),batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const stmt of statements)results.push(await stmt.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const sent=[];let mode='ok';
const accepted=new Map();let setupEmails=0;const keys=[];
async function RESEND_FETCH(url,options){
 assert.equal(url,'https://api.resend.com/emails');assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer re_mock_key_123456789');
 const body=JSON.parse(options.body);const key=options.headers['Idempotency-Key'];assert.match(key,/^erp-[a-f0-9]{64}$/);keys.push(key);
 if(mode==='authFail')return Response.json({message:'invalid key'},{status:401});
 if(mode==='reject')return Response.json({message:'rate limit'},{status:429});
 if(mode==='uncertain')throw new Error('Connection lost');
 if(!accepted.has(key)){accepted.set(key,{id:'resend-'+accepted.size,body});if(body.subject.includes('Resend connected'))setupEmails++;else sent.push(body);}
 else assert.deepEqual(body,accepted.get(key).body);
 if(mode==='acceptedLost')throw new Error('Response lost after acceptance');
 return Response.json({id:accepted.get(key).id});
}
const env={DB,SITE_OWNER_EMAIL:'owner@chatgpt.test',EMAIL_SETTINGS_KEY:btoa('x'.repeat(32)),RESEND_FETCH};
const cookies={};async function request(path,method='GET',payload,identity='owner@chatgpt.test'){const response=await worker.fetch(new Request('https://erpstudio.vrindaspaces.com'+path,{method,headers:{'oai-authenticated-user-email':identity,'Content-Type':'application/json',...(cookies[identity]?{cookie:cookies[identity]}:{})},...(payload?{body:JSON.stringify(payload)}:{})}),env);const cookie=response.headers.get('set-cookie');if(cookie){const name=cookie.split('=')[0];cookies[identity]=[...(cookies[identity]||'').split('; ').filter(c=>c&&!c.startsWith(name+'=')),cookie.split(';')[0]].join('; ');}return{status:response.status,body:await response.json()};}
const login=async(email,identity='owner@chatgpt.test')=>assert.equal((await request('/api/login','POST',{email,password:'vrinda123'},identity)).status,200);
const records=async(identity)=> (await request('/api/records','GET',undefined,identity)).body;
const put=async(key,value,identity)=>{const data=await records(identity);const result=await request('/api/records/'+key,'PUT',{value,revision:data[key].revision},identity);assert.equal(result.status,200,JSON.stringify(result.body));return result;};
assert.equal((await request('/api/email-settings')).status,401);await login('praveen.anantha@vrindaspaces.com');let data=await records();const owner=data.employees.value[0];const staff={...owner,id:'email-staff',name:'Email staff',role:'Site Engineer',email:'staff@vrindaspaces.test',password:'vrinda123',assignedProjectIds:[]};const pm={...staff,id:'email-pm',name:'Email PM',email:'pm@vrindaspaces.test',role:'Project Manager'};await put('employees',[owner,staff,pm]);
const project={id:'email-project',title:'Actual project',clientId:'c',clientName:'Client',clientPhone:'',clientAddress:'',propertyType:'Apartment',bhkType:'2 BHK',projectManagerId:pm.id,projectManagerName:pm.name,siteEngineerId:staff.id,siteEngineerName:staff.name,designerId:'',designerName:'Unassigned',status:'Planning',startDate:'2026-10-05',targetDate:'2026-11-05',totalContractValue:0,totalReceivedAmount:0,budgetAllocation:{civil:0},milestones:[],vendorMilestones:[],handoverChecklist:[],moodBoards:[],documents:[]};
await put('projects',[project]);let mails=sql.prepare('SELECT * FROM erp_mail_outbox').all();assert.equal(mails.length,2);assert(mails.every(m=>m.status==='pending'));assert.deepEqual(new Set(mails.map(m=>m.recipient_email)),new Set([staff.email,pm.email]));assert.equal(sent.length,0);
await login(staff.email,staff.email);assert.equal((await request('/api/email-settings','GET',undefined,staff.email)).status,403);assert.equal((await request('/api/email-settings','POST',{sender:'notify@vrindaspaces.test',apiKey:'re_mock_key_123456789'},staff.email)).status,403);
const connect=await request('/api/email-settings','POST',{sender:'notify@vrindaspaces.test',apiKey:'re_mock_key_123456789'});assert.equal(connect.status,200);assert.equal(setupEmails,1);assert.equal(sql.prepare("SELECT count(*) n FROM erp_mail_settings WHERE id='google'").get().n,0);assert.equal(sent.length,2);assert(sql.prepare('SELECT password FROM erp_mail_settings').get().password!=='re_mock_key_123456789');assert(!JSON.stringify((await request('/api/email-settings')).body).includes('re_mock_key_123456789'));
data=await records();const current=data.projects.value[0];assert.equal(current.assignmentOwners.siteEngineerId,owner.id);assert.equal(current.createdById,owner.id);
await put('projects',[current]);assert.equal(sent.length,2,'No-op must not send');
let own=await records(staff.email);await put('projects',[{...own.projects.value[0],status:'Execution'}],staff.email);assert.equal(sent.length,3);assert(sent.at(-1).to.includes(owner.email));
const task={id:'email-task',title:'Real task',projectId:project.id,assignedUserId:staff.id,assignedUserName:staff.name,createdBy:pm.name,status:'Pending',photos:[],comments:[],createdAt:'2026-10-05',priority:'Medium'};await login(pm.email,pm.email);await put('tasks',[task],pm.email);
assert.equal(sent.length,4);own=await records(staff.email);await put('tasks',[{...own.tasks.value[0],status:'In Progress'}],staff.email);assert.equal(sent.length,5);assert(sent.at(-1).to.includes(pm.email));
data=await records();const stale=await request('/api/records/tasks','PUT',{revision:0,value:[{...data.tasks.value[0],assignedUserId:pm.id}]});assert.equal(stale.status,409);assert.equal(sent.length,5);
await put('tasks',[{...data.tasks.value[0],createdById:'spoof',assignmentOwners:{assignedUserId:'spoof'}}]);data=await records();assert.equal(data.tasks.value[0].assignmentOwners.assignedUserId,pm.id);assert.equal(data.tasks.value[0].createdById,pm.id);assert.equal(sent.length,5);
mode='reject';await put('tasks',[{...data.tasks.value[0],assignedUserId:pm.id}]);mails=sql.prepare("SELECT * FROM erp_mail_outbox WHERE status='pending'").all();assert.equal(mails.length,1);assert.equal(sent.length,5);
mode='ok';await request('/api/email-settings','POST',{action:'retry'});assert.equal(sent.length,6);
mode='uncertain';data=await records();await put('tasks',[{...data.tasks.value[0],assignedUserId:staff.id}]);assert.equal(sql.prepare("SELECT count(*) n FROM erp_mail_outbox WHERE status='uncertain'").get().n,1);mode='ok';await request('/api/email-settings','POST',{action:'retry'});assert.equal(sent.length,6,'Ambiguous sends must not automatically retry');
await request('/api/email-settings','DELETE');assert.equal((await request('/api/email-settings')).body.connected,false);
mode='ok';await request('/api/email-settings','POST',{sender:'notify@vrindaspaces.test',apiKey:'re_mock_key_123456789'});
const connectionBefore=sql.prepare("SELECT * FROM erp_mail_settings WHERE id='resend'").get();mode='authFail';assert.equal((await request('/api/email-settings','POST',{sender:'different@vrindaspaces.test',apiKey:'re_mock_key_123456789'})).status,400);assert.deepEqual(sql.prepare("SELECT * FROM erp_mail_settings WHERE id='resend'").get(),connectionBefore);
mode='ok';data=await records();mode='acceptedLost';await put('tasks',[{...data.tasks.value[0],assignedUserId:pm.id}]);const acceptedCount=sent.length;const ambiguous=sql.prepare("SELECT id FROM erp_mail_outbox WHERE status='uncertain' ORDER BY created_at DESC LIMIT 1").get();assert(ambiguous);mode='ok';await request('/api/email-settings','POST',{action:'retry',id:ambiguous.id});assert.equal(sent.length,acceptedCount,'Resend idempotency must prevent a duplicate after a lost acceptance response');assert.equal(sql.prepare('SELECT status FROM erp_mail_outbox WHERE id=?').get(ambiguous.id).status,'sent');
const leaveMailStart=sent.length;
const unrelatedManager={...pm,id:'unrelated-pm',name:'Other PM',email:'other-pm@vrindaspaces.test'};data=await records();await put('employees',[...data.employees.value,unrelatedManager]);
const leave={id:'leave-email-test',employeeId:staff.id,employeeName:'spoofed applicant',employeeRole:'Owner',fromDate:'2026-10-10',toDate:'2026-10-11',days:2,reason:'Family commitment',type:'Casual',status:'Pending PM Approval'};
await put('leaveRequests',[leave],staff.email);
assert.equal(sent.length,leaveMailStart+2);const leaveEmails=sent.slice(leaveMailStart);assert.deepEqual(new Set(leaveEmails.flatMap(e=>e.to)),new Set([owner.email,pm.email]));assert(leaveEmails.every(e=>e.subject.includes(staff.name)&&e.text.includes('2026-10-10')&&e.text.includes('Family commitment')&&!e.text.includes('spoofed applicant')));
let ownLeave=await records(staff.email);await put('leaveRequests',ownLeave.leaveRequests.value,staff.email);assert.equal(sent.length,leaveMailStart+2,'No-op leave save must not send another request email');
assert.equal((await request('/api/records/leaveRequests','PUT',{revision:0,value:[...ownLeave.leaveRequests.value,{...leave,id:'stale-leave'}]},staff.email)).status,409);assert.equal(sent.length,leaveMailStart+2,'Rejected stale leave request must not send');
data=await records();assert.equal(data.notifications.value.filter(n=>n.type==='leave_requested'&&n.message.includes('2026-10-10')).length,2);
await put('leaveRequests',data.leaveRequests.value.map(l=>({...l,reason:'Corrected family commitment'})));assert.equal(sent.length,leaveMailStart+2,'Owner correction must not repeat a new-request email');
console.log('PASS Resend assignment notifications and leave request emails: relevant PM plus Owner, actual applicant identity, unrelated PM excluded, durable queue, no-op/stale-save duplicate protection and targeted in-app notifications.');
const driveFolders=[],driveUploads=[];let driveFailure=false;let previewMode='normal';const previewPng=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhN0AAAAASUVORK5CYII=','base64'));let thumbnailCalls=0;
env.DRIVE_FETCH=async(url,options={})=>{
 const address=new URL(url);
 if(address.hostname==='oauth2.googleapis.com'){const body=options.body;assert.equal(body.get('client_id'),'mock.apps.googleusercontent.com');assert.equal(body.get('client_secret'),'mock-secret');if(body.get('grant_type')==='authorization_code'){assert(body.get('code_verifier'));assert.equal(body.get('redirect_uri'),'https://erpstudio.vrindaspaces.com/api/google-drive/callback');return Response.json({access_token:'mock-access',refresh_token:'mock-refresh',scope:'openid email https://www.googleapis.com/auth/drive'});}assert.equal(body.get('refresh_token'),'mock-refresh');return Response.json({access_token:'mock-access'});}
 assert.equal(options.headers.Authorization,'Bearer mock-access');
 if(address.hostname==='openidconnect.googleapis.com')return Response.json({email:'owner@vrindaspaces.test',email_verified:true});
 if(address.hostname==='drive.google.com'){assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:previewMode==='unsafe'?'https://untrusted.test/thumbnail':'https://lh3.googleusercontent.com/mock-thumbnail'}});}
 if(address.hostname==='lh3.googleusercontent.com'){thumbnailCalls++;if(previewMode==='throw')throw Error('Thumbnail temporarily unavailable');return new Response(previewPng,{headers:{'Content-Type':'image/png'}});}
 if(driveFailure)return Response.json({error:'Google unavailable'},{status:503});
 if(address.pathname.startsWith('/upload/')){const body=await options.body.text();const metadata=JSON.parse(body.split('\r\n\r\n')[1].split('\r\n--')[0]);driveUploads.push(metadata);return Response.json({id:'drive-file-'+driveUploads.length});}
 if(address.pathname==='/drive/v3/files'&&options.method==='POST'){const folder=JSON.parse(options.body);driveFolders.push(folder);return Response.json({id:'project-folder-'+driveFolders.length});}
 if(address.pathname==='/drive/v3/files')return Response.json({files:[]});
 if(address.searchParams.get('alt')==='media')return new Response(previewMode==='normal'?'actual file contents':previewPng);
 if(address.searchParams.get('fields')==='thumbnailLink,mimeType')return Response.json({mimeType:previewMode==='photo'?'image/png':'application/pdf',thumbnailLink:previewMode==='redirect'||previewMode==='unsafe'?'https://drive.google.com/thumbnail?id=mock':'https://lh3.googleusercontent.com/mock-thumbnail'});
 if(options.method==='DELETE')return new Response(null,{status:204});
 if(address.pathname.endsWith('/notsharedfolder'))return Response.json({id:'notsharedfolder',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}});
 return Response.json({id:'shared-root-id',name:'ERP Project Files',driveId:'shared-drive-id',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}});
};
assert.equal((await request('/api/google-drive')).body.connected,false);
assert.equal((await request('/api/google-drive','POST',{action:'configure',clientId:'mock.apps.googleusercontent.com',clientSecret:'mock-secret'},staff.email)).status,403);
assert.equal((await request('/api/google-drive','POST',{action:'configure',clientId:'mock.apps.googleusercontent.com',clientSecret:'mock-secret'})).status,200);
assert(!sql.prepare('SELECT credential FROM erp_drive_oauth').get().credential.includes('mock-secret'));
const start=await request('/api/google-drive','POST',{action:'start'});assert.equal(start.status,200);const oauth=new URL(start.body.url);assert.equal(oauth.searchParams.get('code_challenge_method'),'S256');assert.equal(oauth.searchParams.get('access_type'),'offline');
const callbackPath='/api/google-drive/callback?state='+oauth.searchParams.get('state')+'&code=mock-code';
async function callback(identity='owner@chatgpt.test',cookie=cookies['owner@chatgpt.test']){return worker.fetch(new Request('https://erpstudio.vrindaspaces.com'+callbackPath,{headers:{'oai-authenticated-user-email':identity,cookie}}),env);}
assert.equal((await callback('owner@chatgpt.test','erp_drive_state=wrong')).status,400);
assert.equal((await callback(staff.email)).status,400);
const callbackResult=await callback();assert.equal(callbackResult.status,302);assert.equal(callbackResult.headers.get('location'),'/?drive=connected');assert.equal((await callback()).status,400,'OAuth state must be one-use');
// The helper captures Set-Cookie; restore the ERP session after the OAuth start response.
await login('praveen.anantha@vrindaspaces.com');
const safeDrive=(await request('/api/google-drive')).body;assert(safeDrive.authorized&&!safeDrive.connected);assert(!JSON.stringify(safeDrive).includes('mock-secret'));assert(!JSON.stringify(safeDrive).includes('mock-refresh'));assert(!sql.prepare('SELECT credential FROM erp_drive_settings').get().credential.includes('mock-refresh'));
assert.equal((await request('/api/google-drive','POST',{root:'notsharedfolder'})).status,400);
assert.equal((await request('/api/google-drive','POST',{root:'https://drive.google.com/drive/folders/shared-root-id'})).status,200);
console.log('PASS Owner-only OAuth configuration, encrypted credentials, PKCE, browser-bound one-use state, original session/identity checks and Shared Drive folder validation.');
const blobs=new Map();env.FILES={put:async(key,body)=>blobs.set(key,await new Response(body).arrayBuffer()),get:async(key)=>blobs.has(key)?{body:blobs.get(key)}:null,delete:async(key)=>blobs.delete(key)};
async function uploadFile(identity,name='drawing.pdf',contents='actual file contents'){const form=new FormData();form.append('file',new File([contents],name,{type:'application/pdf'}));return worker.fetch(new Request('https://erpstudio.vrindaspaces.com/api/tasks/'+task.id+'/files',{method:'POST',headers:{'oai-authenticated-user-email':identity,cookie:cookies[identity]},body:form}),env);}
assert.equal((await uploadFile(staff.email)).status,403);assert.equal(blobs.size,0);
const upload=await uploadFile(pm.email);assert.equal(upload.status,200);const attachment=(await upload.json()).attachment;assert.equal(attachment.name,'drawing.pdf');assert.equal(attachment.uploadedBy,pm.name);assert.equal(driveUploads.length,1);
const download=await worker.fetch(new Request('https://erpstudio.vrindaspaces.com'+attachment.url,{headers:{'oai-authenticated-user-email':'owner@chatgpt.test',cookie:cookies['owner@chatgpt.test']}}),env);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.equal(await download.text(),'actual file contents');
const outsider={...staff,id:'outsider',name:'Outsider',email:'outsider@vrindaspaces.test',role:'Designer'};data=await records();await put('employees',[...data.employees.value,outsider]);await login(outsider.email,outsider.email);const forbidden=await worker.fetch(new Request('https://erpstudio.vrindaspaces.com'+attachment.url,{headers:{'oai-authenticated-user-email':outsider.email,cookie:cookies[outsider.email]}}),env);assert.equal(forbidden.status,404);
data=await records();await put('tasks',data.tasks.value.map(t=>({...t,attachments:[{...attachment,url:'https://spoofed.test/file'}]})));data=await records();assert.equal(data.tasks.value[0].attachments[0].url,attachment.url,'Attachment metadata cannot be replaced through ordinary record writes');
assert.equal((await uploadFile(pm.email,'empty.pdf','')).status,400);assert.equal(driveUploads.length,1);
console.log('PASS task file bytes stored in Google Shared Drive, authorized upload/download, unrelated-user access denied, attachment metadata protected and empty upload rejected.');


const thumb=await worker.fetch(new Request('https://erpstudio.vrindaspaces.com'+attachment.url+'?preview=1',{headers:{'oai-authenticated-user-email':'owner@chatgpt.test',cookie:cookies['owner@chatgpt.test']}}),env);assert.equal(thumb.status,200);assert.equal(thumb.headers.get('content-type'),'image/png');
 for(const mode of ['redirect','throw','photo','unsafe']){previewMode=mode;const callsBefore=thumbnailCalls;const result=await worker.fetch(new Request('https://erpstudio.vrindaspaces.com'+attachment.url+'?preview=1',{headers:{'oai-authenticated-user-email':'owner@chatgpt.test',cookie:cookies['owner@chatgpt.test']}}),env);assert.equal(result.status,200,mode);assert.equal(result.headers.get('content-type'),'image/png');assert(!result.headers.has('content-security-policy'));assert.deepEqual(new Uint8Array(await result.arrayBuffer()),previewPng);if(mode==='photo'||mode==='unsafe')assert.equal(thumbnailCalls,callsBefore);}
 previewMode='normal';console.log('PASS thumbnail redirects, transient thumbnail failure fallback, original photo preview and blocked untrusted redirect.');
assert.equal((await uploadFile(pm.email)).status,200);assert.equal(driveFolders.length,1,'Same project must reuse its folder');assert.equal(driveUploads[0].parents[0],driveUploads[1].parents[0]);
data=await records();await put('projects',[...data.projects.value,{...project,id:'second-project',title:'Second project'}]);data=await records();await put('tasks',[...data.tasks.value,{...task,id:'second-task',projectId:'second-project'}]);
const secondForm=new FormData();secondForm.append('file',new File(['second-file'],'image.png',{type:'image/png'}));const second=await worker.fetch(new Request('https://erpstudio.vrindaspaces.com/api/tasks/second-task/files',{method:'POST',headers:{'oai-authenticated-user-email':'owner@chatgpt.test',cookie:cookies['owner@chatgpt.test']},body:secondForm}),env);assert.equal(second.status,200);assert.equal(driveFolders.length,2);assert.notEqual(driveUploads[0].parents[0],driveUploads[2].parents[0]);assert.equal(driveUploads[2].appProperties.erpProjectId,'second-project');assert.equal(driveUploads[2].appProperties.erpTaskId,'second-task');
const beforeFailure=(await records()).tasks.value[0].attachments.length;driveFailure=true;assert.equal((await uploadFile(pm.email)).status,503);driveFailure=false;assert.equal((await records()).tasks.value[0].attachments.length,beforeFailure,'Failed Drive upload must not create a saved ERP file');
async function logoUpload(identity,contents){const form=new FormData();form.append('file',new File([contents],'logo.png',{type:'image/png'}));return worker.fetch(new Request('https://erpstudio.vrindaspaces.com/api/company-logo',{method:'POST',headers:{'oai-authenticated-user-email':identity,cookie:cookies[identity]},body:form}),env);}
assert.equal((await logoUpload(staff.email,'invalid')).status,403);assert.equal((await logoUpload('owner@chatgpt.test','<svg/>')).status,400);const logoBytes=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0]);assert.equal((await logoUpload('owner@chatgpt.test',logoBytes)).status,200);
const publicLogo=await worker.fetch(new Request('https://erpstudio.vrindaspaces.com/api/company-logo'),env);assert.equal(publicLogo.status,200);assert.deepEqual(new Uint8Array(await publicLogo.arrayBuffer()),logoBytes);data=await records();const realLogoId=data.companyProfile.value.logoId;await put('companyProfile',{...data.companyProfile.value,logoId:'spoofed'});assert.equal((await records()).companyProfile.value.logoId,realLogoId);
console.log('PASS project folder reuse/isolation, authenticated thumbnail proxy, failed upload handling, Owner-only persisted logo upload and protected logo metadata.');

