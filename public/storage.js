import {validateJournal} from './core.js';
export class JournalStore {
  constructor(onStatus) { this.handle=null;this.baseline=null;this.queue=Promise.resolve();this.onStatus=onStatus;this.dirty=false;this.conflict=false; }
  async open(handle) {
    await this.queue;
    const text=await (await handle.getFile()).text();
    const db=validateJournal(JSON.parse(text));
    this.handle=handle;this.baseline=text;this.dirty=false;this.conflict=false;
    this.onStatus(`Saved · ${handle.name}`,false);return db;
  }
  detach(){this.handle=null;this.baseline=null;this.conflict=false;this.dirty=true;}
  save(db) {
    this.dirty=true;
    const text=JSON.stringify(db,null,2), handle=this.handle;
    if(!handle){this.onStatus('Browser draft only · choose a file to autosave',true);return Promise.resolve(false);}
    this.onStatus('Saving…',false);
    this.queue=this.queue.then(async()=>{
      if(this.conflict)throw new Error('File changed elsewhere. Export a backup, then reopen the synced file.');
      if(this.handle!==handle)return false;
      const disk=await (await handle.getFile()).text();
      if(disk!==this.baseline){this.conflict=true;throw new Error('File changed elsewhere. Autosave stopped; export a backup before reopening.');}
      const stream=await handle.createWritable();
      try {await stream.write(text);await stream.close();}catch(e){try{await stream.abort();}catch{}throw e;}
      this.baseline=text;this.dirty=false;
      this.onStatus(`Saved ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${handle.name}`,false);return true;
    }).catch(e=>{this.dirty=true;this.onStatus(e.message||'Save failed. Export a backup.',true);return false;});
    return this.queue;
  }
  async saveAs(db,handle) {
    await this.queue;
    this.handle=handle;this.baseline=await (await handle.getFile()).text();this.conflict=false;
    return this.save(db);
  }
}
export function download(text,name,type='application/json') {
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
