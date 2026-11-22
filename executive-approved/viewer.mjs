const status = document.querySelector('#status');
const review = document.querySelector('#review');
const artwork = document.querySelector('#artwork');
const controls = document.querySelector('#controls');
const picker = document.querySelector('#screen-picker');
let screens;
let draftPrefix;
let current = 1;
const returnStack = [];

function place(node, rect) {
  const [left, top, width, height] = rect.map(value => value + '%');
  Object.assign(node.style, { left, top, width, height });
}

function addDictation(field, index, number) {
  const key = draftPrefix + ':' + number + ':' + index;
  const input = document.createElement('textarea');
  input.className = 'deck-input';
  input.setAttribute('aria-label', field.label);
  input.maxLength = 8000;
  input.style.backgroundColor = field.fill;
  place(input, field.field);
  try {
    input.value = localStorage.getItem(key) || '';
  } catch {}
  input.toggleAttribute('data-filled', Boolean(input.value));
  input.addEventListener('input', () => {
    input.toggleAttribute('data-filled', Boolean(input.value));
    try {
      if (input.value) localStorage.setItem(key, input.value);
      else localStorage.removeItem(key);
    } catch {
      status.textContent = 'This browser could not save the text locally.';
    }
  });
  const mic = document.createElement('button');
  mic.type = 'button';
  mic.className = 'mic-hit';
  mic.setAttribute('aria-label', 'Dictate: ' + field.label);
  place(mic, field.button);
  mic.addEventListener('click', () => input.focus({ preventScroll: true }));
  window.JDDictation.attach(mic, input);
  mic.setAttribute('aria-label', 'Dictate: ' + field.label);
  controls.append(input, mic);
}

function render(number) {
  const screen = screens[number - 1];
  if (!screen) return;
  window.JDDictation?.stop(true);
  current = number;
  artwork.alt = screen.title;
  artwork.src = 'executive-approved/screen-' + String(number).padStart(3, '0') + '.png';
  picker.value = String(number);
  controls.replaceChildren();
  for (const link of screen.links) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', link.label);
    place(button, link.rect);
    button.addEventListener('click', () => {
      if (link.kind === 'return') render(returnStack.pop() || 1);
      else {
        if (link.kind === 'show') returnStack.push(current);
        render(link.target);
      }
      controls.querySelector('button')?.focus({ preventScroll: true });
    });
    controls.append(button);
  }
  if (window.JDDictation) screen.microphones?.forEach((field, index) => addDictation(field, index, number));
}

function jump(number) {
  returnStack.length = 0;
  render(number);
}

window.addEventListener('pagehide', () => window.JDDictation?.stop(true));

try {
  if (!window.Auth) throw new Error('Sign-in is unavailable. Refresh and try again.');
  const session = await window.Auth.requireActiveSession({
    onMissing: () => { location.href = 'signin.html?next=executive-workspace.html'; },
  });
  if (session) {
    if (session.user.user_metadata?.plan !== 'executive') {
      throw new Error('Sign in with an Executive account to open the design review.');
    }
    draftPrefix = 'digital-jd:executive-design-draft:' + session.user.id;
    const response = await fetch('executive-approved/navigation.json');
    if (!response.ok) throw new Error('The approved screens could not be loaded. Refresh and try again.');
    screens = await response.json();
    for (const [index, screen] of screens.entries()) {
      picker.add(new Option((index + 1) + ' ? ' + screen.title, String(index + 1)));
    }
    picker.addEventListener('change', () => jump(Number(picker.value)));
    document.querySelector('#begin').addEventListener('click', () => jump(1));
    artwork.addEventListener('error', () => { status.textContent = 'This image could not be loaded. Refresh and try again.'; });
    artwork.addEventListener('load', () => { status.textContent = ''; });
    render(1);
    review.hidden = false;
    status.textContent = '';
  }
} catch (error) {
  status.textContent = error.message;
}
