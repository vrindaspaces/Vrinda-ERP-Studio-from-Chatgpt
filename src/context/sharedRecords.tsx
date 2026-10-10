import React, {useEffect, useState, useSyncExternalStore} from 'react';
type Row={value:any;revision:number};
type Change={before:any;after:any};
let rows:Record<string,Row>={};
let loaded=false;
let error='';
const listeners=new Set<()=>void>();
const queues=new Map<string,Change[]>();
const working=new Set<string>();
const emit=()=>listeners.forEach(fn=>fn());
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}};
export function useSharedIdentity(){return useSyncExternalStore(subscribe,()=>rows.__identity?.value??null);}
export const refreshSharedRecords=()=>refresh();
const clone=(value:any)=>structuredClone(value);
// Rebase changed records/fields against the latest revision without replacing
// unrelated edits made in another browser.
export function mergeRecordChanges(before:any,after:any,current:any):any {
 if(JSON.stringify(before)===JSON.stringify(after)) return current;
 if(Array.isArray(before)&&Array.isArray(after)&&before.every(x=>x?.id)&&after.every(x=>x?.id)&&Array.isArray(current)) {
  const old=new Map(before.map(x=>[x.id,x])); const next=new Map(after.map(x=>[x.id,x]));
  const result=current.filter(x=>!old.has(x.id)||next.has(x.id)).map(x=>old.has(x.id)&&next.has(x.id)?mergeRecordChanges(old.get(x.id),next.get(x.id),x):x);
  for(const x of after) if(!old.has(x.id)&&!result.some(r=>r.id===x.id)) result.push(x);
  return result;
 }
 if(before&&after&&current&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)) {
  const result={...current};
  for(const key of new Set([...Object.keys(before),...Object.keys(after)])) {
   if(JSON.stringify(before[key])===JSON.stringify(after[key])) continue;
   if(!(key in after)) delete result[key]; else result[key]=mergeRecordChanges(before[key],after[key],current[key]);
  }
  return result;
 }
 return clone(after);
}
export function authHeaders(): Record<string, string> {
 const token = typeof localStorage !== 'undefined' ? localStorage.getItem('erp_session') : null;
 return token ? {'x-erp-session': token, 'Authorization': `Bearer ${token}`} : {};
}
async function read():Promise<Record<string,Row>> {
 const response=await fetch('/api/records',{cache:'no-store',headers:{...authHeaders()}});
 if(!response.ok) throw new Error('Cannot load shared records. Please retry.');
 return response.json();
}
async function drain(key:string) {
 if(working.has(key)) return; working.add(key);
 try {
  const queue=queues.get(key)!;
  while(queue.length) {
   const remote=(await read())[key];
   const value=mergeRecordChanges(queue[0].before,queue[0].after,remote.value);
   const response=await fetch('/api/records/'+encodeURIComponent(key),{method:'PUT',headers:{'Content-Type':'application/json',...authHeaders()},body:JSON.stringify({value,revision:remote.revision})});
   if(response.status===409) continue;
   if(!response.ok) {
    const body=await response.json().catch(()=>({}));
    if(response.status===401||response.status===403){queue.length=0;rows=await read();}
    throw new Error(body.error||'Changes have not been saved. Keep this page open and retry.');
   }
   const saved:Row&{related?:Record<string,Row>}=await response.json(); queue.shift();
   for(const [relatedKey,relatedRow] of Object.entries(saved.related||{}))if(!queues.get(relatedKey)?.length&&!working.has(relatedKey))rows={...rows,[relatedKey]:relatedRow};
   const optimistic=queue.reduce((v,change)=>mergeRecordChanges(change.before,change.after,v),saved.value);
   rows={...rows,[key]:{...saved,value:optimistic}};
   if(![...queues.values()].some(q=>q.length)) error='';
   emit();
  }
 } catch(e) {error=e instanceof Error?e.message:'Cannot save changes';emit();}
 finally {working.delete(key);}
}
async function refresh() {
 try {
  const remote=await read();
  for(const key of Object.keys(remote)) if(!queues.get(key)?.length&&!working.has(key)) rows={...rows,[key]:remote[key]};
  loaded=true; if(![...queues.values()].some(q=>q.length)) error=''; emit();
 } catch(e) {error=e instanceof Error?e.message:'Cannot load records';emit();}
}
export function useSharedRecords<T>(key:string,initial:T):[T,React.Dispatch<React.SetStateAction<T>>] {
 const row=useSyncExternalStore(subscribe,()=>rows[key]);
 return [row?.value??initial,(action)=>{
  const before=rows[key].value; const after=typeof action==='function'?(action as (v:T)=>T)(clone(before)):action;
  if(JSON.stringify(before)===JSON.stringify(after)) return;
  rows={...rows,[key]:{...rows[key],value:after}};
  if(!queues.has(key)) queues.set(key,[]);
  queues.get(key)!.push({before:clone(before),after:clone(after)});emit();void drain(key);
 }];
}
export function useSharedSaveState() {
 return useSyncExternalStore(subscribe,()=>error?'error':[...queues.values()].some(q=>q.length)?'saving':'saved');
}
export function retryPendingSaves() {void refresh();for(const key of queues.keys())void drain(key);}
export function SharedRecordsGate({children}:{children:React.ReactNode}) {
 const [,render]=useState(0);
 useEffect(()=>{const unsub=subscribe(()=>render(v=>v+1));void refresh();const timer=setInterval(()=>void refresh(),5000);
 const unload=(e:BeforeUnloadEvent)=>{if([...queues.values()].some(q=>q.length)){e.preventDefault();e.returnValue='';}};
 window.addEventListener('beforeunload',unload);
 return()=>{unsub();clearInterval(timer);window.removeEventListener('beforeunload',unload)};
 },[]);
 const pending=[...queues.values()].some(q=>q.length);
 return <>{(error||!loaded||pending)&&<div role={error?'alert':'status'} className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-900">{error||(!loaded?'Loading shared ERP records…':'Saving changes…')}{error&&<button className="ml-3 font-bold underline" onClick={()=>{void refresh();for(const key of queues.keys())void drain(key)}}>Retry</button>}</div>}{loaded?children:null}</>;
}
