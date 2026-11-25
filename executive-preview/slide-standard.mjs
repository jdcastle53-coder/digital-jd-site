
const primaryTargets = {1:2,2:3,3:4,4:5,5:6,6:7,7:9,8:7,9:12,10:12,11:9,12:13,14:15,15:18,16:17,17:15,18:19,19:20,20:34,21:22,22:23,23:28,24:25,25:24,28:29,31:17,35:21,40:21,45:46};
const panelFrames = {
  1: [[188,172,550,323],[772,172,562,323]],
  2: [[188,172,550,438],[772,172,562,438]],
  3: [[312,172,490,358],[830,172,504,358]],
  4: [[188,172,1146,226],[188,416,1146,194]],
  5: [[188,172,1146,205],[188,396,550,214],[772,396,562,214]],
  6: [[184,173,557,362],[769,173,566,362]],
  7: [[188,172,1146,391]],
  8: [[69,143,681,189],[770,143,682,189],[69,349,681,190],[770,349,682,190]],
  9: [[188,172,550,438],[772,172,562,438]],
  10: [[308,172,550,438],[892,172,562,438]],
  11: [[238,153,1044,480]],
  12: [[308,172,550,438],[892,172,562,438]],
  14: [[287,153,1186,476]],
  15: [[287,153,1186,472]],
  16: [[282,172,376,438],[688,172,780,438]],
  17: [[287,153,1186,144],[287,329,1186,157],[287,495,1186,134]],
  18: [[287,258,1186,365]],
  19: [[308,172,550,383],[892,172,562,383]],
  20: [[308,172,550,438],[892,172,562,438]],
  21: [[282,172,602,438],[908,172,560,438]],
  22: [[478,172,976,438]],
  23: [[308,172,1146,424]],
  24: [[305,173,630,221],[305,411,630,211],[963,173,492,449]],
  25: [[308,172,550,438],[892,172,562,219],[892,408,562,202]],
  26: [[814,198,510,426]],
  28: [[422,210,916,318]],
  29: [[308,172,1146,393]],
  30: [[282,172,1186,438]],
  31: [[308,172,1146,129],[656,336,204,273],[1238,336,218,273]],
  32: [[282,172,1186,438]],
  33: [[282,172,602,438],[908,172,560,438]],
  34: [[282,172,1186,438]],
  35: [[282,172,1186,438]],
  36: [[282,172,1186,438]],
  37: [[282,172,1186,438]],
  38: [[282,172,1186,438]],
  39: [[282,172,1186,438]],
  40: [[282,172,1186,438]],
  41: [[282,172,1186,438]],
  42: [[282,172,1186,438]],
  43: [[282,172,1186,438]],
  44: [[282,172,1186,438]],
  45: [[308,172,550,438],[892,172,562,438]],
  46: [[282,172,1186,438]],
  47: [[308,172,550,438],[892,172,562,438]],
  48: [[282,172,1186,438]],
  49: [[308,172,550,438],[892,172,562,438]],
  50: [[282,172,1186,438]],
  51: [[308,172,550,438],[892,172,562,438]],
  52: [[282,172,1186,438]],
  53: [[308,172,550,438],[892,172,562,438]],
  54: [[282,172,1186,438]],
  55: [[308,172,550,438],[892,172,562,438]],
  56: [[282,172,1186,438]],
  57: [[308,172,550,438],[892,172,562,438]],
  58: [[282,172,1186,438]],
  59: [[308,172,550,438],[892,172,562,438]],
  60: [[282,172,1186,438]],
  61: [[308,172,550,438],[892,172,562,438]],
  62: [[282,172,1186,438]],
  63: [[308,172,550,438],[892,172,562,438]],
  64: [[282,172,1186,438]],
  65: [[308,172,550,438],[892,172,562,438]],
  66: [[282,172,1186,438]],
  67: [[308,172,550,438],[892,172,562,438]],
  68: [[282,172,1186,438]],
  69: [[308,172,550,438],[892,172,562,438]],
  70: [[282,172,1186,438]],
  71: [[308,172,550,438],[892,172,562,438]],
  72: [[282,172,1186,438]],
  73: [[308,172,550,438],[892,172,562,438]],
  74: [[282,172,1186,438]],
  75: [[308,172,550,438],[892,172,562,438]],
  76: [[282,172,1186,438]],
  77: [[308,172,550,438],[892,172,562,438]],
  78: [[282,172,1186,438]],
  79: [[308,172,550,438],[892,172,562,438]],
  80: [[282,172,1186,438]],
  83: [[282,172,376,438],[688,172,780,438]],
  84: [[282,172,376,438],[688,172,780,438]],
  85: [[287,153,1186,476]],
  86: [[287,153,1186,476]],
  87: [[287,153,1186,476]],
  88: [[287,153,1186,476]],
  89: [[287,153,1186,476]],
  90: [[287,153,1186,476]],
  91: [[287,153,1186,476]],
  92: [[287,153,1186,476]],
  93: [[287,153,1186,476]],
  94: [[287,153,1186,476]],
  95: [[287,153,1186,476]],
  96: [[287,153,1186,476]],
  97: [[287,153,1186,476]],
  98: [[287,153,1186,476]],
  99: [[287,153,1186,476]],
  100: [[287,153,1186,476]],
  101: [[287,153,1186,476]],
  102: [[188,172,550,438],[772,172,562,438]],
  103: [[188,172,1146,205],[188,396,550,214],[772,396,562,214]],
  104: [[188,172,1146,391]],
  105: [[188,172,550,438],[772,172,562,438]],
  106: [[308,172,550,438],[892,172,562,438]],
  107: [[288,152,1186,478]],
  108: [[308,172,550,383],[892,172,562,383]],
  109: [[305,173,630,221],[305,411,630,211],[963,173,492,449]],
};
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
 for (const [x,y,width,height] of panelFrames[number] || []) {
   const frame = element('span','standard-evidence-frame');
   Object.assign(frame.style,{left:x*100/1520+'%',top:y*100/720+'%',width:width*100/1520+'%',height:height*100/720+'%'});
   controls.append(frame);
 }
 const bottom = entries.filter(({link}) => link.rect[1] >= 85 && link.rect[1] < 94);
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

 if ([1,30,41,44].includes(number)) return;
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
