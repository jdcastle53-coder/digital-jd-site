const status = document.querySelector('#status');
const review = document.querySelector('#review');
const artwork = document.querySelector('#artwork');
const controls = document.querySelector('#controls');
const picker = document.querySelector('#screen-picker');
let screens;
let draftPrefix;
let current = 1;
const returnStack = [];
const drafts = new Map();
let insightRequest;
let lastInsight;

function readDraft(key) {
  if (drafts.has(key)) return drafts.get(key);
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

function saveDraft(key, value) {
  drafts.set(key, value);
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    status.textContent = 'This browser could not save the text locally.';
  }
}

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
  input.value = readDraft(key);
  input.toggleAttribute('data-filled', Boolean(input.value));
  input.addEventListener('input', () => {
    input.toggleAttribute('data-filled', Boolean(input.value));
    saveDraft(key, input.value);
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

function showInsight() {
  const panel = document.createElement('section');
  panel.className = 'deck-insight';
  panel.setAttribute('aria-label', 'Digital JD insight');
  panel.setAttribute('aria-live', 'polite');
  controls.append(panel);

  async function generate() {
    const situation = readDraft(draftPrefix + ':2:0').trim();
    const objective = readDraft(draftPrefix + ':2:1').trim();
    const depth = readDraft(draftPrefix + ':depth') || 'Snapshot';
    if (!situation || !objective) {
      panel.textContent = 'Go back to Executive Input and enter both what is happening and what you want to achieve.';
      return;
    }
    const fingerprint = JSON.stringify([situation, objective, depth]);
    if (lastInsight?.fingerprint === fingerprint) {
      panel.textContent = lastInsight.text;
      return;
    }

    const controller = new AbortController();
    insightRequest = controller;
    panel.setAttribute('aria-busy', 'true');
    panel.textContent = 'Digital JD is reviewing your situation and objective...';
    try {
      const { data } = await window.Auth.client.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('Sign in again to get your DJD insight.');
      const response = await fetch('/api/jd-brain-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          message: 'Situation: ' + situation + '\n\nObjective: ' + objective,
          mode: 'executive_opening',
          caseScoped: true,
          depth,
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Digital JD could not prepare your insight.');
      const insight = typeof result.reply === 'string' ? result.reply.trim() : '';
      if (!insight) throw new Error('Digital JD returned an empty insight.');
      if (controller.signal.aborted) return;
      lastInsight = { fingerprint, text: insight };
      panel.textContent = insight;
    } catch (error) {
      if (controller.signal.aborted) return;
      panel.textContent = error.message;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'insight-retry';
      retry.textContent = 'Try again';
      retry.addEventListener('click', generate);
      panel.append(retry);
    } finally {
      if (insightRequest === controller) insightRequest = null;
      panel.removeAttribute('aria-busy');
    }
  }

  generate();
}

function render(number) {
  const screen = screens[number - 1];
  if (!screen) return;
  window.JDDictation?.stop(true);
  insightRequest?.abort();
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
      if (current === 3 && ['Select Snapshot', 'Select In-depth'].includes(link.label)) {
        saveDraft(draftPrefix + ':depth', link.label.slice(7));
      }
      if (link.kind === 'return') render(returnStack.pop() || 1);
      else {
        if (link.kind === 'show') returnStack.push(current);
        render(link.target);
      }
      controls.querySelector('button')?.focus({ preventScroll: true });
    });
    controls.append(button);
  }
  if (number === 4) showInsight();
  if (window.JDDictation) screen.microphones?.forEach((field, index) => addDictation(field, index, number));
}

function jump(number) {
  returnStack.length = 0;
  render(number);
}

window.addEventListener('pagehide', () => {
  window.JDDictation?.stop(true);
  insightRequest?.abort();
});

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
