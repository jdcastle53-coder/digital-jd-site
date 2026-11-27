import { registerBrowserKey, signedBetaHeaders } from './executive-beta-device.mjs';

const byId=id=>document.getElementById(id);
const token=new URLSearchParams(location.hash.slice(1)).get('invite');
const callback=new URLSearchParams(location.search).get('verify')==='1';
if(token) history.replaceState(null,'',location.pathname);
const result=byId('result');
async function request(action,body={},accessToken) {
 const res=await fetch('/api/executive-beta?action='+action,{
   method:'POST',headers:{'Content-Type':'application/json',...(action==='resume'?await signedBetaHeaders(action,body):{}),...(accessToken?{Authorization:'Bearer '+accessToken}:{})},body:JSON.stringify(body)
 });
 const data=await res.json();
 if(!res.ok)throw Error(data.error||'Unable to continue.');
 return data;
}
function busy(button,operation) {
 button.disabled=true;
 operation().catch(error=>{result.textContent=error.message;}).finally(()=>{button.disabled=false;});
}
byId('resume').addEventListener('click',()=>busy(byId('resume'),async()=>{
 const data=await request('resume');location.assign(data.workspace);
}));
if(token) {
 byId('verify').hidden=false;
 byId('verify').addEventListener('click',()=>busy(byId('verify'),async()=>{
  await request('start',{invite:token});
  result.textContent='Check the email address assigned to your invitation. Open the verification link in this same browser.';
 }));
}
if(callback) {
 byId('instructions').textContent='Verifying your email and registering this browser.';
 (async()=>{
  const session=await window.Auth.client.auth.getSession();
  if(!session.data?.session?.access_token)throw Error('The verification link is missing or expired. Reopen your invitation and request a new email.');
  const data=await request('activate',{publicKey:await registerBrowserKey()},session.data.session.access_token);
  location.replace(data.workspace);
 })().catch(error=>{byId('instructions').textContent='Registration could not be completed.';result.textContent=error.message;});
}
