const styles = `
:host{font:16px/1.5 system-ui,sans-serif;color:#15284b;background:#f2f5fa;--navy:#12125f;--blue:#2156d9;--border:#c9d7eb}
*{box-sizing:border-box}:host{display:block}
header{background:linear-gradient(120deg,#0c1840,#182961);color:white;padding:1rem max(1.25rem,calc((100% - 1100px)/2));display:flex;gap:1rem;justify-content:space-between;align-items:center}
.roadmap-brand{display:inline-flex;align-items:center;gap:.65rem}.roadmap-brand .standard-ask-brand img{width:2rem;height:2rem}.brand{color:#ffe44c;font-weight:750}.preview{font-size:.85rem;color:#e6ebff}
main{max-width:1140px;margin:auto;padding:1.6rem 1.25rem 1.25rem}
h1,h2,p{margin:0}h1{font:700 clamp(2rem,5vw,3rem) Georgia,serif;color:var(--navy)}
.intro{margin:.45rem 0 1.2rem;color:#435775}.summary{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;background:white;border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1rem}
.summary strong{display:block;color:var(--navy)}.summary span,.meta{color:#435775;font-size:.9rem}
.roadmap{background:white;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.bar{background:var(--blue);color:white;display:flex;align-items:center;justify-content:space-between;gap:.85rem;flex-wrap:wrap;padding:.9rem 1rem}
.actions{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.actions:empty{display:none}
button, input, select{font:inherit}button{border:1px solid #abbfdf;background:white;color:#173474;border-radius:7px;padding:.45rem .7rem;cursor:pointer;font-weight:650}
button:hover{background:#e9f0ff}button:disabled{opacity:.48;cursor:default}
button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #2d6ee1;outline-offset:2px}
.primary{background:#ffdf38;border-color:#dcb600;color:#1a2357}.primary:hover{background:#ffec87}
.section{border-bottom:1px solid var(--border)}.section:last-child{border-bottom:0}summary{cursor:pointer;background:#eef3fd;padding:.85rem 1rem;color:var(--navy)}
summary strong{margin-right:.6rem}summary .meta{white-space:nowrap}
.phase-actions{padding:.65rem 1rem .25rem}.tasks{list-style:none;margin:0;padding:.45rem 1rem .75rem}
.task{display:grid;grid-template-columns:5.4rem 1fr auto;gap:.6rem;align-items:center;padding:.55rem 0;border-bottom:1px solid #e4eaf5}.task:last-child{border-bottom:0}
.task-number{font-weight:700;color:var(--navy);white-space:nowrap}.task strong{display:block}
.task .actions{justify-content:flex-end}.task button{font-size:.88rem}
.empty{color:#435775;padding:.55rem 0}
#status:not(:empty){margin-top:.75rem}
dialog{max-width:min(29rem,calc(100% - 2rem));width:100%;padding:1.25rem;border:1px solid var(--border);border-radius:12px;color:#15284b}
dialog::backdrop{background:#06153188}dialog h2{color:var(--navy);margin-bottom:.5rem}dialog label{display:block;margin-top:.65rem}dialog input,dialog select{width:100%;padding:.45rem;border:1px solid #8299bb;border-radius:6px}dialog .actions{justify-content:flex-end;margin-top:1rem}
dl{display:grid;grid-template-columns:max-content 1fr;gap:.35rem .8rem}dt{font-weight:700}dd{margin:0}
@media(max-width:580px){.task{grid-template-columns:4.9rem 1fr}.task .actions{grid-column:2;justify-content:flex-start}header{align-items:flex-start}}
.navigation{margin:0 0 1rem;justify-content:space-between}
.roadmap-layout{display:grid;grid-template-columns:minmax(8rem,10.5rem) minmax(0,1fr);gap:1.1rem}
.roadmap-case-rail{display:flex;flex-direction:column;gap:.55rem;padding:.75rem;background:#eef3fd;border-radius:10px;align-self:start}
.roadmap-case-rail button{background:linear-gradient(#407fc5,#092e73);color:white;box-shadow:0 2px 3px #14284c55;font-size:.9rem}
.roadmap-case-rail button[aria-current]{border-left:4px solid #ffe34a;background:#141956}
.roadmap{border:2px solid #184986;border-radius:16px;box-shadow:0 3px 6px #00143d30}
.bar{border-bottom:2px solid #f2d03a;border-radius:0;background:linear-gradient(100deg,#071950,#194780)}
button:not(.standard-ask){background:linear-gradient(#4383c9,#12458e 25%,#082b65 75%,#17467e);color:#fff;border-color:#102b72;box-shadow:inset 0 1px 2px #c8e5ff90,0 2px 3px #101f434b}
button.primary{background:linear-gradient(#fff387,#ffdf34 35%,#fac01a);color:#112456;border-color:#bd900b;box-shadow:inset 0 1px 2px #fffac0,0 2px 3px #3a300d4b}
button:not(:disabled):hover{filter:brightness(1.12)} button:not(:disabled):active{transform:translateY(2px);box-shadow:inset 0 2px 2px #04142f66}
.navigation{justify-content:center}.navigation button:active{transform:translateY(2px)}
@media(max-width:650px){.roadmap-layout{grid-template-columns:1fr}.roadmap-case-rail{display:flex;flex-direction:row;flex-wrap:wrap}}
.request{padding:1rem}
.request button{margin-top:.7rem}
`;
const askStyles = "@keyframes standard-logo-glow { 0% { opacity:.25; transform:translate(-5%,3%) scale(.81); } 50% { opacity:.62; } 100% { opacity:.4; transform:translate(10%,-6%) scale(1.14); } }\n.standard-ask-brand {display:grid;justify-items:center;position:relative;isolation:isolate;font:700 .48em/1 Arial,sans-serif;color:#34e1f7;white-space:nowrap;}\n.standard-ask-brand::before {content:\"\";position:absolute;z-index:-1;inset:-.22em;background:radial-gradient(ellipse,#ffc632ba,transparent 67%);animation:standard-logo-glow 6.4s ease-in-out infinite alternate;}\n.standard-ask-brand img {width:2.8em;height:2.6em;object-fit:contain;}\n.standard-ask-bubble {position:relative;white-space:nowrap;border:1px solid #44e6ef;border-radius:.65em;padding:.1em .35em;font-style:italic;}\n.standard-ask-bubble::before {content:\"\";position:absolute;top:43%;left:-.24em;width:.35em;height:.35em;transform:rotate(45deg);border-left:1px solid #44e6ef;border-bottom:1px solid #44e6ef;background:#0a1d39;}";
const markup = `
<header><span class="brand roadmap-brand"><span class="standard-ask-brand"><img src="images/digital-jd-head-icon.png" alt=""></span>Digital JD · Intelligent Leadership System</span><span class="preview">Slide 13</span></header>
<main>
<div class="roadmap-layout"><nav class="roadmap-case-rail" id="roadmap-shortcuts" aria-label="Case shortcuts"></nav><div>
<h1>Execution Plan</h1>
<p class="intro">Digital JD groups the proposed work in chronological order. You can change the sections and tasks to fit your case.</p>
<div class="summary"><div><strong>Agreed outcome</strong><span id="outcome"></span></div><div><strong>Progress</strong><span id="progress"></span></div></div>
<div class="actions navigation" id="roadmap-navigation"></div>
<section class="roadmap" aria-labelledby="roadmap-title">
<div class="bar"><h2 id="roadmap-title">Your Action Roadmap</h2><div class="actions" id="toolbar"></div></div>
<div id="sections"></div>
</section>
<p id="status" role="status"></p>

</div></div>
</main>
<dialog id="dialog" aria-labelledby="dialog-title">
<form id="form">
<h2 id="dialog-title"></h2>
<div id="fields"></div>
<div class="actions"><button type="button" id="close">Cancel</button><button class="primary" id="apply" type="submit"></button></div>
</form>
</dialog>
`;

export function parseSuggestedRoadmap(reply) {
  const plan = JSON.parse(reply);
  if (!Array.isArray(plan.sections) || !plan.sections.length) throw new Error('Digital JD returned no roadmap sections.');
  const sections = plan.sections.map((section, index) => {
    if (!Array.isArray(section?.tasks) || !section.tasks.length) throw new Error('Digital JD returned a section without tasks.');
    return {
      id: 'section-' + index, name: '',
      tasks: section.tasks.map((task, position) => {
        if (typeof task?.name !== 'string' || !task.name.trim()) throw new Error('Digital JD returned a task without a name.');
        return {
          id: 'task-' + index + '-' + position, name: task.name.trim(),
          owner: typeof task.owner === 'string' && task.owner.trim() || 'Unassigned',
          measure: typeof task.measure === 'string' && task.measure.trim() || 'To be defined',
          status: 'Planned',
        };
      }),
    };
  });
  return { outcome: typeof plan.outcome === 'string' ? plan.outcome.trim() : '', sections };
}

export function mountRoadmap(host, {initialSections, outcome, persist, navigation, shortcuts, ask}) {
  const root = host.shadowRoot || host.attachShadow({mode:'open'});
  const style = document.createElement('style');
  style.textContent = styles + askStyles;
  const template = document.createElement('template');
  template.innerHTML = markup;
  root.replaceChildren(style,template.content.cloneNode(true));
  const byId = id => root.getElementById(id);
  let saved = initialSections;
  let draft = null;
  const collapsed = new Set();
  const dialog = byId('dialog');
  let confirmDialog, dialogOpener;
  const newId = () => crypto.randomUUID();
  const active = () => draft || saved;
  const sectionName = section => section.name || 'Section ' + (active().indexOf(section) + 1);

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function button(text, callback, {primary=false, disabled=false} = {}) {
    const element = node('button',text,primary ? 'primary' : '');
    element.type = 'button';
    element.disabled = disabled;
    element.addEventListener('click',callback);
    return element;
  }
  function update(message) { render(); byId('status').textContent = message; }
  function save() {
    saved = draft; draft = null;
    try { persist(saved); }
    catch { update('Roadmap saved for this open preview. Browser storage is unavailable.'); return; }
    update('Roadmap changes saved in this browser.');
    byId('roadmap-navigation').lastElementChild.focus();
  }
  function reorder(index, direction) {
    const [section] = draft.splice(index,1);
    draft.splice(index+direction,0,section);
    update('Section moved to position ' + (index+direction+1) + '.');
    byId(section.id).querySelector('summary').focus();
  }
  function openDialog(title, submit, content, handler) {
    dialogOpener = root.activeElement;
    byId('dialog-title').textContent = title;
    byId('fields').replaceChildren(...content);
    byId('apply').textContent = submit || '';
    byId('apply').hidden = !submit;
    byId('close').textContent = submit ? 'Cancel' : 'Close';
    confirmDialog = handler;
    dialog.showModal();
  }
  byId('close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (dialogOpener?.isConnected) dialogOpener.focus();
    else byId('toolbar').querySelector('button')?.focus();
  });
  byId('form').addEventListener('submit', event => {
    event.preventDefault();
    if (confirmDialog?.() !== false) dialog.close();
  });
  function textField(label,value='') {
    const row = node('label',label);
    const input = node('input');
    input.required = true; input.maxLength = 120; input.value = value;
    input.addEventListener('input', () => input.setCustomValidity(''));
    row.append(input);
    return {row,input};
  }
  function nameDialog(section) {
    const field = textField('Section name',section ? sectionName(section) : '');
    openDialog(section ? 'Rename section' : 'Add section',section ? 'Rename section' : 'Add section',[field.row],() => {
      const name = field.input.value.trim();
      if (!name) { field.input.setCustomValidity('Enter a section name.'); field.input.reportValidity(); return false; }
      if (section) section.name = name;
      else draft.push({id:newId(),name,tasks:[]});
      update(section ? 'Section renamed in the draft.' : 'Section added at the end of the draft.');
    });
  }
  function taskNameDialog(section, task) {
    const field = textField('Task name',task?.name);
    const action = task ? 'Rename task' : 'Add task';
    openDialog(task ? action : 'Add task to ' + sectionName(section),action,[field.row],() => {
      const name = field.input.value.trim();
      if (!name) { field.input.setCustomValidity('Enter a task name.'); field.input.reportValidity(); return false; }
      if (task) task.name = name;
      else section.tasks.push({id:newId(),name,owner:'Unassigned',measure:'To be defined',status:'Planned'});
      update(task ? 'Task renamed in the draft.' : 'Task added to the draft.');
    });
  }
  function selectField(label) {
    const row = node('label',label);
    const select = node('select');
    row.append(select);
    return {row,select};
  }
  function moveTask(section,task,index) {
    const destination = selectField('Move to section'), position = selectField('Position in that section');
    draft.forEach((item,i) => destination.select.add(new Option(item.name ? i+1 + '. ' + item.name : sectionName(item),item.id)));
    destination.select.value = section.id;
    function fillPositions() {
      const target = draft.find(item => item.id === destination.select.value);
      const others = target.tasks.filter(item => item.id !== task.id);
      position.select.replaceChildren();
      others.forEach((item,i) => position.select.add(new Option('Before ' + item.name,i)));
      position.select.add(new Option('At the end',others.length));
      position.select.value = target === section ? index : others.length;
    }
    destination.select.addEventListener('change',fillPositions);
    fillPositions();
    openDialog('Move task','Move task',[node('p',task.name),destination.row,position.row],() => {
      const target = draft.find(item => item.id === destination.select.value);
      section.tasks.splice(index,1);
      target.tasks.splice(Number(position.select.value),0,task);
      collapsed.delete(target.id);
      update('Task moved to ' + sectionName(target) + ' in the draft.');
    });
  }
  function taskDetails(task,number) {
    const details = node('dl');
    for (const [key,value] of [['Status',task.status],['Owner',task.owner],['Success measure',task.measure]]) {
      details.append(node('dt',key),node('dd',value));
    }
    openDialog(number + ' · ' + task.name,null,[details]);
  }
  function render() {
    const working = active();
    for (const control of byId('roadmap-navigation').children) control.disabled = Boolean(draft);
    const tasks = working.flatMap(section => section.tasks);
    byId('progress').textContent = tasks.filter(task => task.status === 'Complete').length + ' of ' + tasks.length + ' tasks complete';
    const toolbar = byId('toolbar');
    toolbar.replaceChildren();
    if(draft) toolbar.append(button('Add section',() => nameDialog()),button('Cancel changes',() => {draft=null;update('Draft changes discarded.');byId('roadmap-navigation').lastElementChild.focus();}),button('Save changes',save,{primary:true}));
    else toolbar.append(button('Edit roadmap',() => {draft=structuredClone(saved);update('Editing the roadmap. Save changes when you are ready.');byId('toolbar').querySelector('button').focus();},{primary:true}));
    const container = byId('sections');
    container.replaceChildren();
    working.forEach((section, index) => {
      const group = node('details',null,'section'); group.id=section.id; group.open=!collapsed.has(section.id);
      group.addEventListener('toggle',() => group.open ? collapsed.delete(section.id) : collapsed.add(section.id));
      const heading = node('summary');
      heading.append(node('strong',section.name ? index+1 + '. ' + section.name : sectionName(section)),
        node('span',section.tasks.length + (section.tasks.length === 1 ? ' task' : ' tasks'),'meta'));
      group.append(heading);
      if(draft) {
        const actions = node('div',null,'actions phase-actions');
        actions.append(button('Rename section',() => nameDialog(section)),
          button('Move section earlier',() => reorder(index,-1),{disabled:index===0}),
          button('Move section later',() => reorder(index,1),{disabled:index===working.length-1}),
          button('Add task',() => taskNameDialog(section)));
        group.append(actions);
      }
      const list = node('ul',null,'tasks');
      if(!section.tasks.length) list.append(node('li','No tasks in this section yet.','empty'));
      section.tasks.forEach((task,taskIndex) => {
        const number = 'Task ' + (index+1) + '.' + (taskIndex+1);
        const row = node('li',null,'task');
        const description = node('div');
        description.append(node('strong',task.name),node('span',task.owner + ' · ' + task.status,'meta'));
        const actions = node('div',null,'actions');
        if (draft) actions.append(button('Rename task',() => taskNameDialog(section,task)),
          button('Move task',() => moveTask(section,task,taskIndex)));
        else actions.append(button('View task',() => taskDetails(task,number)));
        row.append(node('span',number,'task-number'),description,actions); list.append(row);
      });
      group.append(list); container.append(group);
    });
  }

  byId('outcome').textContent = outcome;
  for (const {label, run, primary} of navigation) byId('roadmap-navigation').append(button(label,run,{primary}));
  if (ask) byId('roadmap-navigation').append(ask());
  byId('roadmap-shortcuts').append(node('strong','Case Shortcuts'));
  for (const {label, run} of shortcuts) {
    const shortcut=button(label,run);
    if (label === 'Review My Plan') shortcut.setAttribute('aria-current','location');
    byId('roadmap-shortcuts').append(shortcut);
  }
  render();
  byId('roadmap-title').tabIndex = -1;
  byId('roadmap-title').focus({preventScroll:true});
}
