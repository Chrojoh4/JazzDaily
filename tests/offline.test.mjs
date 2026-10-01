import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('offline shell includes every imported module and does not intercept private journal requests',async()=>{
  const handlers={},stored=new Map(),scope='https://example.test/JazzDaily/';
  const cache={async addAll(paths){for(const p of paths){const file=p==='./'?'index.html':p.slice(2);await fs.access(new URL('../public/'+file,import.meta.url));stored.set(new URL(p,scope).href,{file});}},async put(){}};
  const caches={async open(){return cache;},async match(request){return stored.get(request.url);},async keys(){return ['monthly-shell-v1','another-app'];},async delete(key){assert.equal(key,'monthly-shell-v1');}};
  vm.runInNewContext(await fs.readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{URL,caches,self:{registration:{scope},addEventListener(name,fn){handlers[name]=fn;}},fetch:async()=>{throw Error('Offline');}});
  let pending;handlers.install({waitUntil(p){pending=p;}});await pending;
  handlers.activate({waitUntil(p){pending=p;}});await pending;
  for(const name of ['index.html','app.js','easy-ui.js','payroll-ui.js','workflow-core.js','install.js','manifest.json']){
    let response;handlers.fetch({request:{method:'GET',url:scope+name},respondWith(p){response=p;}});assert.equal((await response).file,name);
  }
  for(const [url,method] of [[scope+'private.journal.json','GET'],['https://drive.google.com/data','GET'],[scope+'app.js','POST']]){
    handlers.fetch({request:{url,method},respondWith(){assert.fail('Private or modifying requests must not be cached');}});
  }
  for(const [url,{file}] of stored){if(!file.endsWith('.js'))continue;const source=await fs.readFile(new URL('../public/'+file,import.meta.url),'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+)['"]/g))assert.ok(stored.has(new URL(match[1],url).href),'Missing offline dependency '+match[1]);}
});
