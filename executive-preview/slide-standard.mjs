import { artworkPanelBounds } from './panel-frames.mjs?v=panel-trim-1';
﻿
const primaryTargets = {1:2,2:3,3:4,4:5,5:6,6:7,7:9,8:7,9:12,10:12,11:9,12:13,14:15,15:18,16:17,17:15,18:19,19:20,20:34,21:22,22:23,23:28,24:25,25:24,28:29,31:17,35:21,40:21,45:46};
const shortcuts = [
 ['Discuss with Digital JD',null], ['Facing a Hurdle',16], ['Task Tracker',18],
 ['Review My Plan',12], ['Progress Dashboard',17], ['Decisions & Status',20],
];
const sections = [
 [4,5,6,10,45,47,49,51,53,55,57,59,61,63,65,67,69,71,73,75,77,79],
 [16,32,38,83,84], [14,15,18,31,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101],
 [7,8,9,11,12,13,37,46], [17,19], [20,21,22,23,24,25,27,28,29,33,34,35,36,39,40],
];
function element(tag, name, text) {
 const node = document.createElement(tag);
 if (name) node.className = name;
 if (text) node.textContent = text;
 return node;
}
export function askButton(open) {
 const button = element('button','standard-action standard-ask');
 button.type = 'button';
 button.setAttribute('aria-label','Ask me: talk directly with Digital JD');
 const brand = element('span','standard-ask-brand');
 const face = element('img');
 face.src = 'images/digital-jd-head-icon.png';
 face.alt = '';
 brand.append(face,element('span',null,'Digital JD'));
 button.append(brand,element('span','standard-ask-bubble','Ask me'));
 button.addEventListener('click',() => open(button));
 return button;
}
export function decorateSlide({number, screen, controls, entries, openHelp, go, unavailable}) {
 controls.append(element('span','standard-header-glow'));
 controls.append(element('h1','standard-slide-title',screen.title));
 const bounds = artworkPanelBounds[number];
 if (bounds) {
   const layer = element('div','standard-panel-artwork');
   layer.setAttribute('aria-hidden','true');
   const artworkUrl = 'executive-approved/screen-' + String(number).padStart(3,'0') + '.png';
   for (const [x,y,width,height] of bounds) {
     const mask = element('div','standard-panel-artwork-mask');
     const panel = element('div','standard-panel-artwork-frame');
     const margin = 3;
     Object.assign(mask.style,{left:(x-margin)/15.2+'%',top:(y-margin)/7.2+'%',
       width:(width+2*margin)/15.2+'%',height:(height+2*margin)/7.2+'%'});
     if (number === 26) mask.classList.add('standard-panel-artwork-modal');
     const inset = 2;
     Object.assign(panel.style,{
       left:(x+inset)/15.2+'%',top:(y+inset)/7.2+'%',width:(width-2*inset)/15.2+'%',height:(height-2*inset)/7.2+'%',
       backgroundImage:'url("'+artworkUrl+'")',
       backgroundSize:1520/(width-2*inset)*100+'% '+720/(height-2*inset)*100+'%',
       backgroundPosition:(x+inset)/(1520-width+2*inset)*100+'% '+(y+inset)/(720-height+2*inset)*100+'%',
     });
     layer.append(mask,panel);
   }
   controls.prepend(layer);
 }
 const bottom = entries.filter(({link}) => link.rect[1] >= 85 && link.rect[1] < 94);
 const footer = new Set(bottom);
 const topStyles = number === 3 ? 'Choose your depth of analysis' : number === 30 ? 'Your cases' : '';
 if (number === 3) controls.append(element('span','analysis-depth-mask'));
 if (topStyles) {
   const plaque = element('aside',number === 3 ? 'analysis-depth-plaque' : 'case-index-plaque');
   plaque.append(element('strong',null,topStyles));
   if (number === 30) plaque.append(element('span',null,'Each case keeps its own records.'));
   controls.append(plaque);
 }
 for (const entry of entries) {
   const {link,button} = entry;
   if (!button || footer.has(entry) || (link.rect[0] < 3 && link.rect[1] > 28 && link.rect[1] < 78 && link.label !== 'My Cases')) continue;
   button.classList.add('standard-in-panel');
   if (number === 3 && link.label === 'Select Snapshot' || number === 30 && link.label === 'Open current case') button.classList.add('standard-in-panel-primary');
   if (link.rect[2] < 6) button.classList.add('standard-in-panel-compact');
   if (link.label === 'My Cases / Switch') {
     const mask = element('span','standard-case-switch-mask');
     controls.append(mask);
     button.classList.add('standard-in-panel-switch');
   }
   if (['Next 6 actions','Previous 6 actions'].includes(link.label)) {
     const [x,y,w,h] = link.rect;
     const mask = element('span','standard-pagination-mask');
     Object.assign(mask.style,{left:x-.25+'%',top:y-.2+'%',width:w+.5+'%',height:h+.65+'%'});
     controls.append(mask);
     button.style.top = y-.54+'%';
     button.style.height = h-.35+'%';
   }
   const label = button.firstElementChild;
   if (label) label.className = 'standard-in-panel-label';
   else button.textContent = link.clientLabel || link.label;
   if (link.label === 'My Cases / Switch' && label) {
     label.textContent = 'View or switch cases';
   }
   if (['Next 6 actions','Previous 6 actions'].includes(link.label)) {
     button.classList.add('standard-in-panel-pagination');
     (label || button).textContent = link.label;
   }
 }
 const row = element('div','standard-action-row');
 const primary = bottom.find(({link,button}) => button && link.target === primaryTargets[number] && !/back|cancel|other/i.test(link.label));
 if (bottom.length) {
   const mask = element('span','standard-button-mask');
   const left = Math.min(14, ...bottom.map(({link})=>link.rect[0]-.6));
   const top = Math.min(...bottom.map(({link})=>link.rect[1]-.6));
   const right = Math.max(96.6, ...bottom.map(({link})=>link.rect[0]+link.rect[2]+.6));
   const edge = Math.max(...bottom.map(({link})=>link.rect[1]+link.rect[3]+.9));
   Object.assign(mask.style,{left:left+'%',top:top+'%',width:right-left+'%',height:edge-top+'%'});
   controls.append(mask);
 }
 for (const entry of bottom) {
   const {link,button} = entry;
   if (!button) continue;
   if (number === 6 && link.label === 'Return to the Conversation') { button.remove(); continue; }
   button.removeAttribute('style');
   button.classList.add('standard-action', entry === primary ? 'standard-primary' : 'standard-secondary');
   const label = button.firstElementChild;
   if (label) label.className = 'standard-action-label';
   else button.textContent = button.getAttribute('aria-label') || link.label;
   row.append(button);
 }
 if (number === 5) {
   const advice = controls.querySelector('.conversation-advice-button');
   if (advice) {
     advice.removeAttribute('style');
     advice.classList.add('standard-action','standard-secondary');
     row.insertBefore(advice,primary?.button || null);
   }
 }
 if (!bottom.length) row.classList.add('standard-solo-action');
 row.append(askButton(openHelp));
 controls.append(row);

 if ([1,8,30,41,44].includes(number)) return;
 const hasRail = entries.some(({link}) => link.rect[0] < 3 && link.label === 'Task Tracker');
 const rail = element('nav',hasRail ? 'standard-shortcuts' : 'standard-shortcuts standard-shortcuts-narrow');
 rail.setAttribute('aria-label','Case shortcuts');
 rail.append(element('strong',null,'Case Shortcuts'));
 const readOnly = [42,43].includes(number);
 const active = sections.findIndex(group => group.includes(number));
 shortcuts.forEach(([label,target],index) => {
   const existing = entries.find(({link}) => link.rect[0] < 3 && link.rect[1] >= 29 && link.rect[1] <= 77 &&
     (index === 0 ? link.label === 'Discuss with DJD' : link.target === target));
   if (existing) {
     existing.button.remove();
   }
   const button = element('button','standard-action standard-secondary',label);
   button.type = 'button';
   if (active === index) button.setAttribute('aria-current','location');
   button.addEventListener('click',() => {
     if (readOnly) unavailable(label,number);
     else if (index === 0) openHelp(button);
     else if (existing) existing.button.click();
     else go(target,index === 1);
   });
   rail.append(button);
 });
 controls.append(rail);
}
