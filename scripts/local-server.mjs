import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import worker from '../dist/server/index.js';
const database=new DatabaseSync(process.env.TEST_DB||'../erp-test.sqlite');
const fileDirectory=(process.env.TEST_DB||'../erp-test.sqlite')+'.files';mkdirSync(fileDirectory,{recursive:true});
const filePath=key=>fileDirectory+'/'+createHash('sha256').update(key).digest('hex');
const FILES={put:async(key,body)=>writeFileSync(filePath(key),Buffer.from(await new Response(body).arrayBuffer())),get:async(key)=>existsSync(filePath(key))?{body:readFileSync(filePath(key))}:null,delete:async(key)=>{if(existsSync(filePath(key)))unlinkSync(filePath(key));}};
database.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql'))) {
 if(!database.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name)) {
  database.exec(readFileSync('drizzle/'+name,'utf8')); database.prepare('INSERT INTO _local_migrations VALUES (?)').run(name);
 }
}
function statement(sql,args=[]) {return {bind:(...values)=>statement(sql,values),all:async()=>({results:database.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(database.prepare(sql).run(...args).changes)}})}};
const DB={prepare:sql=>statement(sql),batch:async statements=>{database.exec('BEGIN');try {const result=[];for(const s of statements)result.push(await s.run());database.exec('COMMIT');return result;}catch(e){database.exec('ROLLBACK');throw e}}};
createServer(async(req,res)=>{try {
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 // This server listens on loopback only. Production identity comes from Sites.
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-email',req.headers['x-test-identity']||'praveen123456@gmail.com');
 const response=await worker.fetch(new Request('http://127.0.0.1:4174'+req.url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})}),{DB,FILES,SITE_OWNER_EMAIL:'praveen123456@gmail.com'});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(e){console.error(e);res.writeHead(500);res.end('Server error')}}).listen(4174,'127.0.0.1',()=>console.log('ERP test database server http://127.0.0.1:4174'));
