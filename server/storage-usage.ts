const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const bytes=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;

export async function storageUsage(request:Request,env:any,actor:any){
 if(!actor)return json({error:'Please sign in.'},401);
 if(actor.role!=='Owner')return json({error:'Only the Owner can view Storage & Usage.'},403);
 if(request.method!=='GET')return json({error:'Method not allowed.'},405);
 let databaseBytes:number|null=null;
 try{
  const result=await env.DB.prepare('SELECT 1 AS storage_probe').all();
  if(bytes(result.meta?.size_after))databaseBytes=result.meta.size_after;
 }catch{}
 if(databaseBytes===null){
  try{
   const result=await env.DB.batch([env.DB.prepare('PRAGMA page_count'),env.DB.prepare('PRAGMA page_size')]);
   const count=result[0]?.results?.[0]?.page_count,size=result[1]?.results?.[0]?.page_size;
   if(bytes(count)&&bytes(size)&&size>0&&bytes(count*size))databaseBytes=count*size;
  }catch{}
 }
 const files:{bytes:number|null;objects:number|null;complete:boolean;observedBytes:number;observedObjects:number;reason:string|null}={bytes:null,objects:null,complete:false,observedBytes:0,observedObjects:0,reason:null};
 if(!env.FILES?.list)files.reason='File storage metrics are unavailable.';
 else{
  try{
   let cursor:string|undefined;
   for(let page=0;page<30;page++){
    const result=await env.FILES.list({limit:1000,...(cursor?{cursor}:{})});
    if(!Array.isArray(result.objects))throw Error('Invalid listing');
    for(const object of result.objects){if(!bytes(object.size))throw Error('Invalid object size');files.observedBytes+=object.size;files.observedObjects++;}
    if(result.truncated===false){files.complete=true;files.bytes=files.observedBytes;files.objects=files.observedObjects;break;}
    if(result.truncated!==true||!result.cursor||result.cursor===cursor)throw Error('Incomplete listing');
    cursor=result.cursor;
   }
   if(!files.complete)files.reason='The listing exceeded the scan limit. Observed values are partial; totals are unavailable.';
  }catch{files.reason='File storage could not be fully measured. Retry to refresh the totals.';}
 }
 const referenceLimitBytes=10_000_000_000;
 return json({measuredAt:new Date().toISOString(),database:{bytes:databaseBytes,reason:databaseBytes===null?'The hosting service did not return a database size.':null,confirmedLimitBytes:null,referenceLimitBytes,remainingAgainstReferenceBytes:databaseBytes===null?null:Math.max(0,referenceLimitBytes-databaseBytes)},files,plan:{name:null,databaseAllowance:null,fileAllowance:null},googleDrive:{bytes:null,reason:'Google Shared Drive photos and documents are stored separately and are not included in R2 totals.'}});
}
