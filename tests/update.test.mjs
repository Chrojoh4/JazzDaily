import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/install.js',import.meta.url),'utf8').replaceAll('export ','');
function fixture({version='2026.09.30.3',offline=false,open=false}={}){
 const handlers=[],message={textContent:''},apply={hidden:true,disabled:false},check={disabled:false};let reloads=0,activations=0;
 const context={window:{addEventListener(){}},document:{addEventListener:(name,fn)=>handlers.push(fn),querySelector:s=>s==='[data-update-help]'?message:s==='[data-apply-update]'?apply:s==='[data-action="close-journal"]'&&open?{}:null},fetch:async()=>{if(offline)throw Error('Offline');return {ok:true,json:async()=>({version})};},navigator:{serviceWorker:{getRegistration:async()=>({update:async()=>{},waiting:{postMessage:()=>activations++}}),addEventListener(){}}},location:{reload:()=>reloads++},setTimeout:()=>0,clearTimeout(){},Date,matchMedia:()=>({matches:false})};
 vm.runInNewContext(source,context);
 return {message,apply,check,click:async kind=>{for(const h of handlers)await h({target:{closest:s=>s===`[data-${kind}]`?(kind==='check-update'?check:apply):null}});},counts:()=>({reloads,activations})};
}
test('version check never reloads or activates an update without user action',async()=>{const f=fixture({version:'next'});await f.click('check-update');assert.equal(f.apply.hidden,false);assert.deepEqual(f.counts(),{reloads:0,activations:0});await f.click('apply-update');assert.equal(f.counts().activations,1);});
test('current version and offline checks stay on welcome screen',async()=>{for(const options of [{},{offline:true}]){const f=fixture(options);await f.click('check-update');assert.equal(f.apply.hidden,true);assert.equal(f.check.disabled,false);assert.deepEqual(f.counts(),{reloads:0,activations:0});}});
test('updates cannot activate with a journal open',async()=>{const f=fixture({version:'next',open:true});await f.click('check-update');await f.click('apply-update');assert.deepEqual(f.counts(),{reloads:0,activations:0});});
test('published version matches program version',()=>{const version=JSON.parse(fs.readFileSync(new URL('../public/version.json',import.meta.url)));assert.ok(source.includes(`APP_VERSION='${version.version}'`));});
