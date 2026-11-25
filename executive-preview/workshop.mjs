
const categories = [
 ['efficiency','Process efficiency'], ['above','Results beyond the objective'], ['gaps','Remaining gaps or limitations'],
 ['value','Additional value'], ['sustainability','Long-term sustainability'],
];
function ui(tag,text) {
 const node = document.createElement(tag);
 if (text) node.textContent = text;
 return node;
}
export function openWorkshop({opener, send}) {
 const dialog = ui('dialog');
 dialog.className='standard-help';
 dialog.setAttribute('aria-labelledby','workshop-title');
 const title=ui('h2','Ask Digital JD');
 title.id='workshop-title';
 const form=ui('form');
 const label=ui('label','Your question');
 const input=ui('textarea');
 input.required=true;
 input.maxLength=3000;
 label.append(input);
 const microphone = ui('button','Use microphone');
 microphone.type = 'button';
 microphone.className = 'workshop-microphone';
 const dictation = window.JDDictation;
 if (dictation) dictation.attach(microphone,input);
 const answer=ui('div');
 answer.className='help-reply';
 answer.setAttribute('role','status');
 const buttons=ui('menu');
 const submit=ui('button','Send to Digital JD');
 submit.type='submit';
 const close=ui('button','Return to this slide');
 close.type='button';
 let pending;
 const history=[];
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{pending?.abort();dictation?.stop(true);dialog.remove();opener.focus();},{once:true});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  dictation?.stop(true);
  const question=input.value.trim();
  if(!question||pending)return;
  pending=new AbortController();
  submit.disabled=true;
  answer.textContent='Digital JD is preparing a reply...';
  try{
   const reply=await send(question,history.slice(-4),pending.signal);
   if(pending.signal.aborted)return;
   history.push({question,reply});
   input.value='';
   answer.textContent=reply;
  }catch(error){
   if(!pending.signal.aborted)answer.textContent='Digital JD could not respond. '+error.message;
  }finally{
   pending=null;
   submit.disabled=false;
  }
 });
 if (dictation) buttons.append(microphone);
 buttons.append(submit,close);
 form.append(label,buttons);
 dialog.append(title,ui('p','Ask about this screen or get advice. Closing this conversation returns you to your case.'),form,answer);
 document.body.append(dialog);
 dialog.showModal();
}
export function renderOpportunities(panel, values, select) {
 panel.replaceChildren();
 let count=0;
 for(const [key,title] of categories){
  const summary=typeof values[key]==='string'?values[key].trim():'';
  if(!summary)continue;
  count++;
  const item=ui('article');
  const button=ui('button','Explore '+title.toLowerCase());
  button.type='button';
  button.addEventListener('click',()=>select({key,title,summary}));
  item.append(ui('p',summary),button);
  panel.append(item);
 }
 if(!count)panel.textContent='Digital JD found no follow-up opportunity supported by the current record. You can return to the outcome review.';
}
