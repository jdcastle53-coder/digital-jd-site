
const primaryTargets = {1:2,2:3,3:4,4:5,5:6,6:7,7:9,8:7,9:12,10:12,11:9,12:13,14:15,15:18,16:17,17:15,18:19,19:20,20:34,21:22,22:23,23:28,24:25,25:24,28:29,31:17,35:21,40:21,45:46};
const panelFrames = {
  "5": [
    [
      183,
      173,
      1153,
      203
    ],
    [
      183,
      397,
      558,
      212
    ],
    [
      769,
      397,
      567,
      212
    ]
  ],
  "7": [
    [
      185,
      173,
      1150,
      390
    ]
  ],
  "9": [
    [
      185,
      173,
      555,
      435
    ],
    [
      770,
      173,
      565,
      435
    ]
  ],
  "12": [
    [
      305,
      173,
      555,
      435
    ],
    [
      890,
      173,
      565,
      435
    ]
  ],
  "18": [
    [
      287,
      258,
      1185,
      365
    ]
  ],
  "19": [
    [
      305,
      173,
      555,
      380
    ],
    [
      890,
      173,
      565,
      380
    ]
  ],
  "20": [
    [
      305,
      173,
      555,
      435
    ],
    [
      890,
      173,
      565,
      435
    ]
  ],
  "23": [
    [
      305,
      173,
      1150,
      422
    ]
  ],
  "24": [
    [
      305,
      173,
      630,
      221
    ],
    [
      305,
      411,
      630,
      211
    ],
    [
      963,
      173,
      492,
      449
    ]
  ],
  "25": [
    [
      305,
      173,
      555,
      435
    ],
    [
      890,
      173,
      565,
      217
    ],
    [
      890,
      409,
      565,
      199
    ]
  ]
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
 const bottom = entries.filter(({link}) => link.rect[0] >= 16 && link.rect[1] >= 85 && link.rect[1] < 94);
 const row = element('div','standard-action-row');
 const primary = bottom.find(({link,button}) => button && link.target === primaryTargets[number] && !/back|cancel|other/i.test(link.label));
 for (const entry of bottom) {
   const {link,button} = entry;
   const [left,top,width,height] = link.rect;
   const mask = element('span','standard-button-mask');
   Object.assign(mask.style, {left:left-.2+'%',top:top-.2+'%',width:width+.45+'%',height:height+.75+'%'});
   controls.append(mask);
   if (!button) continue;
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
