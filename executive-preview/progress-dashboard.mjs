
function node(tag,text,className) {
  const element=document.createElement(tag);
  if (text) element.textContent=text;
  if (className) element.className=className;
  return element;
}

function dashboardPanel(title,rect,items) {
  const panel=node('section',null,'progress-review-panel');
  panel.setAttribute('aria-label',title);
  const [x,y,w,h]=rect;
  Object.assign(panel.style,{left:x/15.2+'%',top:y/7.2+'%',width:w/15.2+'%',height:h/7.2+'%'});
  const heading=node('h2',title);
  const content=node('div',null,'progress-review-content');
  content.tabIndex=0;
  content.setAttribute('aria-label',title+' details');
  for(const item of items)content.append(node('p',item));
  const actions=node('div',null,'progress-review-scroll');
  const buttons=[['?','Scroll up',-1],['?','Scroll down',1]].map(([symbol,label,direction])=>{
    const button=node('button',symbol);
    button.type='button';
    button.setAttribute('aria-label',label+' in '+title);
    button.title=label;
    button.addEventListener('click',()=>content.scrollBy({top:direction*Math.max(24,content.clientHeight*.7)}));
    actions.append(button);
    return button;
  });
  function update() {
    const overflow=content.scrollHeight-content.clientHeight;
    actions.hidden=overflow<=1;
    buttons[0].disabled=content.scrollTop<=1;
    buttons[1].disabled=content.scrollTop>=overflow-1;
  }
  const body=node('div',null,'progress-review-body');
  body.append(content,actions);
  panel.append(heading,body);
  content.addEventListener('scroll',update);
  requestAnimationFrame(update);
  window.addEventListener('resize',update,{passive:true,signal:panelLifecycle.signal});
  return panel;
}
let panelLifecycle=new AbortController();

export function renderProgressDashboard(controls,{sections,evidence,hurdles}) {
  panelLifecycle.abort();
  panelLifecycle=new AbortController();
  const tasks=sections.flatMap(section=>section.tasks);
  const done=tasks.filter(task=>task.status==='Complete').length;
  const result=[
    tasks.length ? done+' of '+tasks.length+' roadmap tasks marked complete.' : 'Open the action roadmap to generate a plan for this case.',
    evidence ? 'Latest reported result: '+evidence : 'No result or evidence has been recorded for this case.',
  ];
  const phases=sections.length ? sections.map((section,index)=>{
    const complete=section.tasks.filter(task=>task.status==='Complete').length;
    return (section.name || 'Section '+(index+1))+' ? '+complete+' of '+section.tasks.length+' tasks complete';
  }) : ['Your roadmap sections will appear here once a plan is available.'];
  const priorities=hurdles.filter(hurdle=>hurdle.note&&!hurdle.resolved).map(hurdle=>hurdle.id+' ? '+hurdle.note);
  if(!evidence)priorities.push('Record a progress update with an actual result and the evidence behind it.');
  if(!priorities.length)priorities.push('Review the reported result against the target and confirm whether anything needs attention.');
  const surface=node('div',null,'progress-review-surface');
  controls.append(surface,
    dashboardPanel('Case progress',[287,153,1186,144],result),
    dashboardPanel('Progress by section',[287,329,1186,157],phases),
    dashboardPanel('Priorities and next actions',[287,495,1186,133],priorities));
}
