export const APP_VERSION='2026.09.30.3';
let promptEvent,updateRegistration;
export function updateControls(){return `<p class="footnote">Program version ${APP_VERSION}</p><button type="button" data-check-update>Check for updates</button><button type="button" data-apply-update hidden>Update and reopen</button><p data-update-help class="footnote" role="status">Updates change the program. Your journal stays in its saved folder.</p>`;}
function waitForInstall(reg){
  if(!reg.installing)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const worker=reg.installing;
    const timer=setTimeout(()=>{worker.removeEventListener('statechange',check);reject(Error('The update is taking longer than expected. Try again shortly.'));},20000);
    function check(){if(['installed','activated','redundant'].includes(worker.state)){clearTimeout(timer);worker.removeEventListener('statechange',check);worker.state==='redundant'?reject(Error('The update could not be downloaded. Try again.')):resolve();}}
    worker.addEventListener('statechange',check);check();
  });
}
document.addEventListener('click',async event=>{
  const check=event.target.closest('[data-check-update]'),apply=event.target.closest('[data-apply-update]');
  if(!check&&!apply)return;
  const message=document.querySelector('[data-update-help]');
  // Update controls are shown only on the closed-journal welcome screen.
  if(!message||document.querySelector('[data-action="close-journal"]'))return;
  if(apply){
    apply.disabled=true;message.textContent='Opening the updated program…';
    if(updateRegistration?.waiting){
      let reloaded=false;const reload=()=>{if(!reloaded){reloaded=true;location.reload();}};
      navigator.serviceWorker.addEventListener('controllerchange',reload,{once:true});
      updateRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
      setTimeout(reload,3000);
    }else location.reload();
    return;
  }
  check.disabled=true;message.textContent='Checking for updates…';
  document.querySelector('[data-apply-update]').hidden=true;
  try{
    const response=await fetch('./version.json?check='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('Could not check for updates. Connect to the internet and try again.');
    const latest=await response.json();if(typeof latest.version!=='string')throw Error('Could not read the available version. Try again shortly.');
    if(latest.version===APP_VERSION){message.textContent='You have the latest program version ('+APP_VERSION+'). To load changed bills or wages, reopen the journal folder where they were saved.';return;}
    if('serviceWorker' in navigator){updateRegistration=await navigator.serviceWorker.getRegistration();if(updateRegistration){await updateRegistration.update();await waitForInstall(updateRegistration);}}
    message.textContent='Version '+latest.version+' is ready. Choose Update and reopen, then open your journal folder.';
    document.querySelector('[data-apply-update]').hidden=false;
  }catch(error){message.textContent=error.message||'Could not check for updates. Connect to the internet and try again.';}
  finally{check.disabled=false;}
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;});
document.addEventListener('click',async event=>{
  if(!event.target.closest('[data-install]'))return;
  if(promptEvent){await promptEvent.prompt();await promptEvent.userChoice;promptEvent=null;return;}
  const message=document.querySelector('[data-install-help]');
  if(message)message.textContent=matchMedia('(display-mode: standalone)').matches?'JazzDaily is already open as an app.':'Open JazzDaily in Microsoft Edge. Use the app-install icon in the address bar, or Edge’s menu → Apps → Install this site as an app. Internet is needed for installation, CRA checks and updates; your saved journal stays in your chosen folder.';
});
