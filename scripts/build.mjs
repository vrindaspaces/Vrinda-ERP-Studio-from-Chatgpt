import { build as viteBuild } from 'vite';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
await import('./edit-schema.mjs');
await viteBuild();
const assets={};
function collect(dir) {
 for(const entry of readdirSync(dir,{withFileTypes:true})) {
  const filename=path.join(dir,entry.name);
  if(entry.isDirectory()) { if(entry.name!=='server' && entry.name!=='.openai') collect(filename); continue; }
  const url='/'+path.relative('dist',filename).replaceAll('\\','/');
  const type=filename.endsWith('.html')?'text/html; charset=utf-8':filename.endsWith('.js')?'text/javascript; charset=utf-8':filename.endsWith('.css')?'text/css; charset=utf-8':'text/plain';
  const imageTypes={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon'};const imageType=imageTypes[path.extname(filename)];assets[url]=imageType?{body:readFileSync(filename).toString('base64'),type:imageType,base64:true}:{body:readFileSync(filename,'utf8'),type};
 }
}
collect('dist');
writeFileSync('server/assets.generated.ts','export default '+JSON.stringify(assets)+' as Record<string,{body:string;type:string;base64?:boolean}>;\n');
await viteBuild({configFile:false,build:{outDir:'dist/server',emptyOutDir:false,target:'es2022',lib:{entry:path.resolve('server/worker.ts'),formats:['es'],fileName:()=> 'index.js'}}});
mkdirSync('dist/.openai',{recursive:true});
writeFileSync('dist/.openai/hosting.json',readFileSync('.openai/hosting.json'));
