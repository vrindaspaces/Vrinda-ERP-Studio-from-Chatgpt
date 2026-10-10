const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,'0')).join('');
async function derive(password:string,salt:Uint8Array){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:salt as BufferSource,iterations:100000,hash:'SHA-256'},key,256));
}
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));return 'pbkdf2$'+hex(salt.buffer)+'$'+await derive(password,salt);}
export async function verifyPassword(password:unknown,stored:string){
 if(typeof password!=='string'||!password)return false;
 if(!stored.startsWith('pbkdf2$'))return password===stored;
 const [,salt,expected]=stored.split('$');if(!salt||!expected||salt.length!==32)return false;
 const actual=await derive(password,Uint8Array.from(salt.match(/../g)!.map(v=>parseInt(v,16))));
 let difference=actual.length^expected.length;for(let i=0;i<actual.length;i++)difference|=actual.charCodeAt(i)^expected.charCodeAt(i);return difference===0;
}
