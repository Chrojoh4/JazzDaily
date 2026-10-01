import {validateJournal} from './core.js';
export class JournalStore {
  constructor(onStatus) { this.handle=null;this.baseline=null;this.queue=Promise.resolve();this.onStatus=onStatus;this.dirty=false;this.conflict=false;this.revision=0; }
  async open(handle) {
    await this.queue;
    const text=await (await handle.getFile()).text();
    const db=validateJournal(JSON.parse(text));
    this.handle=handle;this.baseline=text;this.dirty=false;this.conflict=false;
    this.onStatus(`Journal opened · ${handle.name}`,false);return db;
  }
  detach(){this.handle=null;this.baseline=null;this.conflict=false;this.dirty=true;}
  save(db) {
    this.dirty=true;
    const text=JSON.stringify(db,null,2), handle=this.handle,revision=++this.revision;
    if(!handle){this.onStatus('Not saved to a file — choose a save file or download a backup',true);return Promise.resolve(false);}
    this.onStatus('Saving…',false);
    this.queue=this.queue.then(async()=>{
      if(this.conflict)throw new Error('File changed elsewhere. Export a backup, then reopen the synced file.');
      if(this.handle!==handle)return false;
      const disk=await (await handle.getFile()).text();
      if(disk!==this.baseline){this.conflict=true;throw new Error('File changed elsewhere. Autosave stopped; export a backup before reopening.');}
      const stream=await handle.createWritable();
      try {await stream.write(text);await stream.close();}catch(e){try{await stream.abort();}catch{}throw e;}
      this.baseline=text;this.dirty=revision!==this.revision;
      if(!this.dirty)this.onStatus(`Saved on this computer · ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${handle.name}`,false);return true;
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
export async function journalFiles(folder){const handles=[];for await(const entry of folder.values())if(entry.kind==='file'&&entry.name.toLowerCase().endsWith('.json')&&!entry.name.toLowerCase().endsWith('.backup.json'))handles.push(entry);return handles.sort((a,b)=>a.name.localeCompare(b.name));}
export async function newJournalFile(folder){const name='JazzDaily.journal.json';try{await folder.getFileHandle(name);throw Error('This folder already has a JazzDaily journal. Open it, or choose an empty folder for a new journal.');}catch(e){if(e.name!=='NotFoundError')throw e;}return folder.getFileHandle(name,{create:true});}
