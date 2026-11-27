import { registerBrowserKey } from './executive-beta-device.mjs';

const byId=id=>document.getElementById(id);
const result=byId('result');
let working=false;
async function request(action,body={}) {
 const session=await window.Auth.client.auth.getSession();
 const token=session.data?.session?.access_token;
 if(!token)throw Error('Sign in to your Digital JD owner account to continue.');
 const response=await fetch('/api/executive-beta?action='+action,{method:'POST',headers:{
   'Content-Type':'application/json',Authorization:'Bearer '+token,
 },body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Unable to continue.');
 return data;
}
function run(operation) {
 if(working)return;
 working=true;
 result.textContent='';
 operation().catch(error=>{result.textContent=error.message;}).finally(()=>{working=false;});
}
function showLink(url) {
 byId('new-link').hidden=!url;
 byId('invitation-url').value=url||'';
 if(url) {byId('invitation-url').focus();byId('invitation-url').select();}
}
function action(text,callback) {
 const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>run(callback));return b;
}
function date(value) {return value?new Date(value*1000).toLocaleString():'Not yet';}
async function refresh(){
 const {invitations}=await request('admin-list');
 byId('admin').hidden=false;
 const records=byId('records');
 records.replaceChildren();
 for(const row of invitations) {
  const card=document.createElement('article');
  const heading=document.createElement('h3');
  heading.textContent=row.email;
  const details=document.createElement('p');
  details.textContent=row.status+' | expires '+date(row.expiresAt)+' | last active '+date(row.lastSeen)+' | '+row.used+' of '+row.limit+' AI requests today';
  const fields=document.createElement('label');fields.textContent='Days to extend / new daily request limit';
  const value=document.createElement('input');value.type='number';value.min=1;value.max=1000;value.value=30;fields.append(value);
  card.append(heading,details,fields,
    action('Extend access',async()=>{await request('admin-extend',{id:row.id,days:Number(value.value)});await refresh();result.textContent='Access extended.';}),
    action('Change AI limit',async()=>{await request('admin-limit',{id:row.id,limit:Number(value.value)});await refresh();result.textContent='AI limit changed.';}),
    action('Revoke access',async()=>{if(!confirm('Revoke this tester?s access?'))return;await request('admin-revoke',{id:row.id});await refresh();result.textContent='Access revoked.';}),
    action('Reset invitation and browser',async()=>{if(!confirm('Invalidate the old link and browser registration?'))return;const data=await request('admin-reset',{id:row.id});await refresh();showLink(data.url);result.textContent='New single-use link created.';}));
  records.append(card);
 }
}
byId('issue').addEventListener('submit',e=>{
 e.preventDefault();
 const form=new FormData(e.currentTarget);
 run(async()=>{const data=await request('admin-issue',{email:form.get('email'),limit:Number(form.get('limit'))});await refresh();showLink(data.url);result.textContent='Invitation issued. Share it with the assigned tester.';});
});
byId('refresh').addEventListener('click',()=>run(refresh));
byId('workspace').addEventListener('click',()=>run(async()=>{const data=await request('owner',{publicKey:await registerBrowserKey()});location.assign(data.workspace);}));
run(refresh);
