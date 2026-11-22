import { PANELS } from './case-panels.mjs';

const status = document.querySelector('#status');
const review = document.querySelector('#review');
const artwork = document.querySelector('#artwork');
const controls = document.querySelector('#controls');
const picker = document.querySelector('#screen-picker');
const scope = document.querySelector('.scope');
let screens;
let draftPrefix;
let current = 1;
const returnStack = [];
const drafts = new Map();
let insightRequest;
const insights = new Map();
let discussionAnswers = [];

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

function fieldValue(screen, index = 0) {
  return readDraft(draftPrefix + ':' + screen + ':' + index).trim();
}

async function askJD(body, signal) {
  const { data } = await window.Auth.client.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Sign in again to get your DJD insight.');
  const response = await fetch('/api/jd-brain-gateway', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ ...body, caseScoped: true }),
    signal,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Digital JD could not prepare this screen.');
  if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('Digital JD returned an empty response.');
  return result.reply.trim();
}

function showCasePanels(number) {
  const spec = number === 4 ? {
    mode: 'executive_opening',
    slots: [{ key: 'reply', label: 'Digital JD insight', rect: [204, 232, 1115, 152], fill: '#eaf1f9' }]
  } : PANELS[number];
  if (!spec) return;
  const regions = spec.slots.map(slot => {
    const node = document.createElement('section');
    node.className = 'deck-insight';
    if (number >= 7) node.classList.add('deck-insight-compact');
    node.setAttribute('aria-label', slot.label);
    if (slot === spec.slots[0]) node.setAttribute('aria-live', 'polite');
    node.style.backgroundColor = slot.fill;
    place(node, slot.rect.map((v, i) => v * 100 / (i % 2 ? 720 : 1520)));
    controls.append(node);
    return node;
  });
  const first = regions[0];
  const updateButton = number === 5 ? controls.querySelector('[data-conversation-action="update"]') : null;
  const confirmButton = number === 5 ? controls.querySelector('[data-conversation-action="confirm"]') : null;

  function showConversationPending(pending) {
    if (!updateButton || !confirmButton) return;
    updateButton.disabled = pending;
    confirmButton.disabled = pending;
    updateButton.textContent = pending ? 'Updating...' : '';
    updateButton.classList.toggle('deck-action-pending', pending);
  }

  async function generate() {
    const situation = fieldValue(2);
    const objective = fieldValue(2, 1);
    const depth = readDraft(draftPrefix + ':depth') || 'Snapshot';
    if (!situation || !objective) {
      first.textContent = 'Enter your situation and objective on Executive Input first.';
      return;
    }
    const answer = fieldValue(4);
    const submitted = number === 5 ? fieldValue(5) : '';
    const correctionKey = JSON.stringify([situation, objective, depth, answer]);
    const pendingCorrection = readDraft(draftPrefix + ':correction-context') === correctionKey
      ? readDraft(draftPrefix + ':latest-correction') : '';
    const question = fieldValue(10);
    const evidence = fieldValue(15, 3);
    if (number === 5 && !answer) {
      first.textContent = 'Go back to Our Conversation and answer JD?s question first.';
      return;
    }
    if (spec.needsQuestion && !question) {
      first.textContent = 'Enter a question above, then click Ask another question.';
      return;
    }
    if (spec.requiresEvidence && !evidence) {
      if (number === 23) first.textContent = objective;
      const message = 'No actual result has been recorded. Add evidence on Task Progress Update before confirming the outcome.';
      (regions[1] || first).textContent = message;
      if (number === 19) first.textContent = 'Progress cannot be assessed until a result and evidence are recorded.';
      return;
    }
    const caseKey = JSON.stringify([situation, objective, depth]);
    const opening = insights.get(4);
    const understanding = insights.get(5);
    const useUnderstanding = number > 5 && understanding?.caseKey === caseKey && understanding.answer === answer &&
      understanding.correction === pendingCorrection;
    const options = insights.get(9);
    const plan = insights.get(12);
    const planNotes = fieldValue(12);
    const decision = readDraft(draftPrefix + ':decision');
    const context = [
      'Situation: ' + situation.slice(0, 4000),
      'Objective: ' + objective.slice(0, 3000),
      number > 4 && opening?.caseKey === caseKey && 'JD opening: ' + opening.values.reply,
      number > 4 && answer && 'Client answer to the opening question: ' + answer.slice(0, 4000),
      number > 4 && pendingCorrection && 'Latest client correction or answer: ' + pendingCorrection.slice(0, 3000),
      useUnderstanding && 'Updated understanding: ' + understanding.values.understanding,
      number > 9 && options?.caseKey === caseKey && 'Options considered: ' + JSON.stringify(options.values).slice(0, 2000),
      number > 12 && plan?.caseKey === caseKey && 'Proposed plan: ' + JSON.stringify(plan.values).slice(0, 2000),
      number > 11 && 'Recent client discussion: ' + JSON.stringify(discussionAnswers.filter(entry => entry.caseKey === caseKey).slice(-2)).slice(0, 2000),
      number >= 12 && planNotes && 'Client plan notes: ' + planNotes.slice(0, 1500),
      number >= 17 && evidence && 'Reported actual result and evidence: ' + evidence.slice(0, 3000),
      number >= 13 && readDraft(draftPrefix + ':plan-confirmed') === correctionKey && 'Client confirmed the proposed plan.',
      number >= 20 && decision && 'Client selected next move: ' + decision,
      spec.needsQuestion && 'Client question: ' + question.slice(0, 3000),
    ].filter(Boolean);
    function display(values) {
      regions.forEach((node, i) => { node.textContent = values[spec.slots[i].key] || 'Not established for this case.'; });
    }
    const fingerprint = JSON.stringify([number, depth, context]);
    const saved = insights.get(number);
    if (saved?.fingerprint === fingerprint) {
      display(saved.values);
      return;
    }
    const controller = new AbortController();
    insightRequest = controller;
    first.setAttribute('aria-busy', 'true');
    showConversationPending(true);
    first.textContent = number === 5 && pendingCorrection
      ? 'Digital JD is updating its understanding from your answer...'
      : 'Digital JD is working from your case...';
    try {
      const reply = await askJD({
        message: context.join('\n\n'),
        mode: spec.mode,
        depth,
        stage: number,
      }, controller.signal);
      if (controller.signal.aborted) return;
      const values = number === 4 ? { reply } : JSON.parse(reply.replace(/^```(?:json)?s*|s*```$/gi, ''));
      if (!values || !spec.slots.some(slot => typeof values[slot.key] === 'string' && values[slot.key].trim())) {
        throw new Error('Digital JD did not return the information for this screen.');
      }
      const clean = Object.fromEntries(spec.slots.map(slot => [
        slot.key, typeof values[slot.key] === 'string' ? values[slot.key].trim() : '',
      ]));
      insights.set(number, { fingerprint, values: clean, caseKey, answer, correction: pendingCorrection });
      if (number === 10) discussionAnswers = [...discussionAnswers, { caseKey, question, answer: clean.reply }].slice(-4);
      display(clean);
      if (number === 5 && submitted && pendingCorrection.endsWith(submitted)) {
        const input = controls.querySelector('.deck-input');
        if (input?.value.trim() === submitted) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        status.textContent = 'Understanding updated. You can answer the next question or confirm.';
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      first.textContent = error instanceof SyntaxError ? 'Digital JD could not format this response. Try again.' : error.message;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'insight-retry';
      retry.textContent = 'Try again';
      retry.addEventListener('click', generate);
      first.append(retry);
    } finally {
      if (insightRequest === controller) insightRequest = null;
      first.removeAttribute('aria-busy');
      showConversationPending(false);
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
  status.textContent = '';
  artwork.alt = screen.title;
  artwork.src = 'executive-approved/screen-' + String(number).padStart(3, '0') + '.png';
  picker.value = String(number);
  controls.replaceChildren();
  for (const link of screen.links) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', link.label);
    if (number === 5 && link.label === 'Update understanding') button.dataset.conversationAction = 'update';
    if (number === 5 && link.label === 'Confirm understanding') button.dataset.conversationAction = 'confirm';
    place(button, link.rect);
    button.addEventListener('click', () => {
      if (current === 3 && ['Select Snapshot', 'Select In-depth'].includes(link.label)) {
        saveDraft(draftPrefix + ':depth', link.label.slice(7));
      }
      if (current === 5 && link.label === 'Update understanding') {
        const correction = fieldValue(5);
        if (!correction) { status.textContent = 'Enter your answer or correction first.'; return; }
        const depth = readDraft(draftPrefix + ':depth') || 'Snapshot';
        const key = JSON.stringify([fieldValue(2), fieldValue(2, 1), depth, fieldValue(4)]);
        const previous = readDraft(draftPrefix + ':correction-context') === key
          ? readDraft(draftPrefix + ':latest-correction') : '';
        saveDraft(draftPrefix + ':correction-context', key);
        if (correction !== previous.split('\n').at(-1)) {
          saveDraft(draftPrefix + ':latest-correction', [previous, correction].filter(Boolean).join('\n').slice(-3000));
        }
      }
      if (current === 12 && link.target === 13 && link.label.startsWith('Confirm')) {
        const depth = readDraft(draftPrefix + ':depth') || 'Snapshot';
        saveDraft(draftPrefix + ':plan-confirmed', JSON.stringify([fieldValue(2), fieldValue(2, 1), depth, fieldValue(4)]));
      }
      if (current === 6 && /^(10|[1-9])$/.test(link.label)) saveDraft(draftPrefix + ':clarity', link.label);
      if (current === 34 && link.target >= 36 && link.target <= 40) saveDraft(draftPrefix + ':decision', link.label);
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
  showCasePanels(number);
  scope.textContent = number === 4 || PANELS[number] || [1, 2, 3, 6, 8].includes(number)
    ? 'Executive evaluation. Use sample information.'
    : 'Design and navigation preview. Example values on this screen are not results from your case.';
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
