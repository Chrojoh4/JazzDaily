let promptEvent;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;});
document.addEventListener('click',async event=>{
  if(!event.target.closest('[data-install]'))return;
  if(promptEvent){await promptEvent.prompt();await promptEvent.userChoice;promptEvent=null;return;}
  const message=document.querySelector('[data-install-help]');
  if(message)message.textContent=matchMedia('(display-mode: standalone)').matches?'JazzDaily is already open as an app.':'Open JazzDaily in Microsoft Edge. Use the app-install icon in the address bar, or Edge’s menu → Apps → Install this site as an app. Internet is needed for installation, CRA checks and updates; your saved journal stays in your chosen folder.';
});
