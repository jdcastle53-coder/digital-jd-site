import { PANELS } from './case-panels.mjs';
import { mountRoadmap, parseSuggestedRoadmap } from './roadmap.mjs';
import { openTrackedTask } from './tracker-task-details.mjs';

const status = document.querySelector('#status');
const review = document.querySelector('#review');
const artwork = document.querySelector('#artwork');
const controls = document.querySelector('#controls');
const picker = document.querySelector('#screen-picker');
const scope = document.querySelector('.scope');
const stage = document.querySelector('#stage');
const roadmap = document.querySelector('#action-roadmap');
let screens;
let draftPrefix;
let current = 1;
const returnStack = [];
const drafts = new Map();
let insightRequest;
let screenEvents;
const insights = new Map();
let discussionAnswers = [];
let planTurns = [];
let planContext;
let planQuestion = '';

function readDraft(key) {
  if (drafts.has(key)) return drafts.get(key);
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

function saveDraft(key, value) {
  drafts.set(key, value);
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
    return true;
  } catch {
    status.textContent = 'This browser could not save the text locally.';
    return false;
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
    if (index === 0 && hurdleScreens.includes(number)) updateHurdleNoteStatus(number);
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

function optionContext() {
  return JSON.stringify([fieldValue(2), fieldValue(2, 1), readDraft(draftPrefix + ':depth') || 'Snapshot',
    fieldValue(4), readDraft(draftPrefix + ':latest-correction')]);
}

function selectedOption() {
  try {
    const selection = JSON.parse(readDraft(draftPrefix + ':selected-option'));
    return selection?.context === optionContext() ? selection : null;
  } catch { return null; }
}

function addOptionChoices(values) {
  controls.querySelectorAll('.deck-option-choice').forEach(button => button.remove());
  const choices = [];
  const selected = selectedOption();
  const buttonWidth = 160;
  for (const [key, label, center] of [
    ['recommended', 'Select recommended option', 462.5],
    ['alternative', 'Select best alternative', 1052.5],
  ]) {
    const title = values[key + 'Title'];
    if (!title) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'deck-option-choice';
    const isSelected = selected?.key === key && selected.title === title;
    button.textContent = isSelected ? 'Selected' : 'Select';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(isSelected));
    place(button, [(center - buttonWidth / 2) * 100 / 1520, 578 * 100 / 720,
      buttonWidth * 100 / 1520, 26 * 100 / 720]);
    button.addEventListener('click', () => {
      const details = Object.fromEntries(['Benefit', 'Risk', 'Resources', 'Timing', 'Rationale']
        .map(field => [field, values[key + field] || '']));
      saveDraft(draftPrefix + ':selected-option', JSON.stringify({ context: optionContext(), key, title, details, options: values }));
      if (selected?.key !== key || selected.title !== title) saveDraft(draftPrefix + ':plan-confirmed', '');
      for (const choice of choices) {
        choice.setAttribute('aria-pressed', String(choice === button));
        choice.textContent = choice === button ? 'Selected' : 'Select';
      }
      status.textContent = title + ' selected. Review proposed plan to continue.';
    });
    choices.push(button);
    controls.append(button);
  }
}

function planRevisionKey() {
  return JSON.stringify([fieldValue(2), fieldValue(2, 1), readDraft(draftPrefix + ':depth'),
    fieldValue(4), readDraft(draftPrefix + ':latest-correction'), selectedOption()?.key]);
}

function approvedPlan() {
  try {
    const revision = JSON.parse(readDraft(draftPrefix + ':plan-revision') || 'null');
    if (revision?.key === planRevisionKey()) return revision.values;
  } catch { return undefined; }
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
  let adviceButton, replyHeading, adviceRequest = '';
  if (number === 5) {
    replyHeading = document.createElement('span');
    replyHeading.className = 'conversation-panel-title';
    replyHeading.textContent = 'Digital JD reply';
    place(replyHeading, [12.5, 55.35, 35.7, 6.05]);
    const inputHeading = document.createElement('span');
    inputHeading.className = 'conversation-panel-title';
    inputHeading.textContent = 'Your answer or question';
    place(inputHeading, [51, 55.35, 36.3, 6.05]);
    regions[1].setAttribute('aria-live', 'polite');
    adviceButton = document.createElement('button');
    adviceButton.type = 'button';
    adviceButton.className = 'conversation-advice-button';
    adviceButton.textContent = 'Get Digital JD advice';
    place(adviceButton, [80, 89.0278, 15.6, 6.1111]);
    adviceButton.addEventListener('click', () => {
      adviceRequest = fieldValue(5);
      if (!adviceRequest) { status.textContent = 'Type or dictate what you would like advice on first.'; return; }
      status.textContent = '';
      generate();
    });
    controls.append(replyHeading, inputHeading, adviceButton);
  }

  function showConversationPending(pending) {
    if (!updateButton || !confirmButton) return;
    updateButton.disabled = pending;
    confirmButton.disabled = pending;
    adviceButton.disabled = pending;
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
    const question = number === 45 ? planQuestion || planTurns.at(-1)?.question : fieldValue(10);
    const evidence = fieldValue(15, 3);
    if (number === 5 && !answer) {
      first.textContent = 'Go back to Our Conversation and answer JD?s question first.';
      return;
    }
    if (spec.needsQuestion && !question) {
      first.textContent = number === 45 ? 'Enter a question or change above, then click Send to DJD.' : 'Type your question in the box above, then click the button below to send it.';
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
    const previousQuestion = number === 5 && understanding?.caseKey === caseKey ? understanding.values.question : '';
    const useUnderstanding = number > 5 && understanding?.caseKey === caseKey && understanding.answer === answer &&
      understanding.correction === pendingCorrection;
    const options = insights.get(9);
    const chosen = number > 9 ? selectedOption() : null;
    const plan = insights.get(12);
    const revisedPlan = approvedPlan();
    const planNotes = fieldValue(12);
    const decision = readDraft(draftPrefix + ':decision');
    const context = [
      'Situation: ' + situation.slice(0, 4000),
      'Objective: ' + objective.slice(0, 3000),
      number > 4 && opening?.caseKey === caseKey && 'JD opening: ' + opening.values.reply,
      number > 4 && answer && 'Client answer to the opening question: ' + answer.slice(0, 4000),
      number > 4 && pendingCorrection && 'Latest client correction or answer: ' + pendingCorrection.slice(0, 3000),
      number === 5 && previousQuestion && 'Previous Digital JD question: ' + previousQuestion.slice(0, 1500),
      number === 5 && submitted && pendingCorrection.endsWith(submitted) && 'Latest client message: ' + submitted.slice(0, 3000),
      number === 5 && adviceRequest && 'Latest client request for advice: ' + adviceRequest.slice(0, 3000),
      useUnderstanding && 'Updated understanding: ' + understanding.values.understanding,
      chosen && 'Client-selected approach: ' + chosen.title + '\nSelected approach details: ' + JSON.stringify(chosen.details).slice(0, 2500),
      number > 9 && options?.caseKey === caseKey && 'Options considered: ' + JSON.stringify(options.values).slice(0, 2000),
      number > 12 && (revisedPlan || plan?.caseKey === caseKey) && 'Proposed plan: ' + JSON.stringify(revisedPlan || plan.values).slice(0, 3000),
      [45, 46].includes(number) && planTurns.length > 0 && 'Plan discussion: ' + JSON.stringify(planTurns.slice(-4)).slice(0, 4000),
      number > 11 && 'Recent client discussion: ' + JSON.stringify(discussionAnswers.filter(entry => entry.caseKey === caseKey).slice(-2)).slice(0, 2000),
      number >= 12 && planNotes && 'Client plan notes: ' + planNotes.slice(0, 1500),
      number >= 17 && evidence && 'Reported actual result and evidence: ' + evidence.slice(0, 3000),
      number >= 13 && ![45, 46].includes(number) && readDraft(draftPrefix + ':plan-confirmed') === correctionKey && 'Client confirmed the proposed plan.',
      number >= 20 && decision && 'Client selected next move: ' + decision,
      spec.needsQuestion && 'Client question: ' + question.slice(0, 3000),
    ].filter(Boolean);
    function display(values) {
      regions.forEach((node, i) => { node.textContent = values[spec.slots[i].key] || 'Not established for this case.'; });
      if (number === 5) {
        const advice = values.advice;
        replyHeading.textContent = advice ? 'Digital JD advice' : 'Digital JD reply';
        regions[1].setAttribute('aria-label', replyHeading.textContent);
        regions[1].textContent = advice || values.question || 'Review the summary above, then confirm when it reflects your situation.';
      }
      if (number === 9) addOptionChoices(values);
    }
    if (number === 12 && revisedPlan) { display(revisedPlan); return; }
    if (number === 45 && !planQuestion) { display({ reply: planTurns.at(-1).answer }); return; }
    if (number === 46 && !planTurns.length) { first.textContent = 'Use Keep discussing to request changes first.'; return; }
    const fingerprint = JSON.stringify([number, depth, context, Boolean(adviceRequest)]);
    const savedOptions = number === 9 && selectedOption()?.options;
    if (savedOptions) {
      insights.set(9, { fingerprint, values: savedOptions, caseKey });
      display(savedOptions);
      return;
    }
    const saved = insights.get(number);
    if (saved?.fingerprint === fingerprint) {
      display(saved.values);
      return;
    }
    const controller = new AbortController();
    insightRequest = controller;
    first.setAttribute('aria-busy', 'true');
    showConversationPending(true);
    if (number === 5 && adviceRequest) {
      replyHeading.textContent = 'Digital JD advice';
      regions[1].textContent = 'Digital JD is preparing suggestions for your case?';
    } else {
      first.textContent = number === 5 && pendingCorrection
        ? 'Digital JD is updating its understanding from your answer...'
        : 'Digital JD is working from your case...';
    }
    try {
      const reply = await askJD({
        message: context.join('\n\n'),
        mode: spec.mode,
        depth,
        stage: number,
        ...(number === 5 && adviceRequest ? { requestAdvice: true } : {}),
      }, controller.signal);
      if (controller.signal.aborted) return;
      const values = number === 4 ? { reply } : JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/gi, ''));
      if (!values || !spec.slots.some(slot => typeof values[slot.key] === 'string' && values[slot.key].trim())) {
        throw new Error('Digital JD did not return the information for this screen.');
      }
      const keys = spec.slots.map(slot => slot.key);
      if (number === 5) keys.push('advice');
      if (number === 46) keys.push('outcome', 'delivery', 'resources', 'measures');
      const clean = Object.fromEntries(keys.map(key => [key, typeof values[key] === 'string' ? values[key].trim() : '']));
      if (number === 46 && keys.some(key => !clean[key])) throw new Error('Digital JD returned an incomplete revision.');
      if (number === 5 && adviceRequest && !clean.advice) throw new Error('Digital JD did not return direct advice.');
      insights.set(number, { fingerprint, values: clean, caseKey, answer, correction: pendingCorrection });
      if (number === 10) discussionAnswers = [...discussionAnswers, { caseKey, question, answer: clean.reply }].slice(-4);
      if (number === 45) {
        planTurns = [...planTurns, { question, answer: clean.reply }].slice(-6);
        planQuestion = '';
        insights.delete(46);
        if (fieldValue(45) === question) {
          const input = controls.querySelector('.deck-input');
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      display(clean);
      if (number === 5 && submitted && (adviceRequest === submitted || pendingCorrection.endsWith(submitted))) {
        const input = controls.querySelector('.deck-input');
        if (input?.value.trim() === submitted) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        status.textContent = clean.advice ? 'Advice ready. Ask a follow-up or confirm the case summary when ready.' :
          'Understanding updated. You can answer the next question or confirm.';
        adviceRequest = '';
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

const hurdleScreens = [16, 83, 84];

function hurdleResolutionKey(number) {
  const context = JSON.stringify([fieldValue(2), fieldValue(2, 1)]);
  return draftPrefix + ':hurdle-resolution:' + context + ':' + number;
}

function hurdleUpdateKey(number) {
  return hurdleResolutionKey(number) + ':update';
}

function updateHurdleNoteStatus(number) {
  const feedback = controls.querySelector('.hurdle-note-status');
  if (!feedback) return;
  const resolution = readDraft(hurdleResolutionKey(number));
  const update = readDraft(hurdleUpdateKey(number));
  const text = fieldValue(number);
  const state = resolution ? 'Hurdle complete.' : 'Hurdle still open.';
  if (text && (text === update || text === resolution)) {
    feedback.textContent = 'Update saved in this browser. ' + state;
  } else if (text) {
    feedback.textContent = 'Click Save update to keep your comment. ' + state;
  } else {
    feedback.textContent = 'Enter a comment, then click Save update.';
  }
}

function addHurdleResolution(number) {
  const index = hurdleScreens.indexOf(number);
  const id = 'H0' + (index + 1);
  const note = readDraft(hurdleResolutionKey(number));
  const stillOpen = hurdleScreens.filter(screen => !readDraft(hurdleResolutionKey(screen))).length;
  const count = document.createElement('span');
  count.className = 'hurdle-count';
  count.textContent = stillOpen + (stillOpen === 1 ? ' open hurdle' : ' open hurdles') + ' ? Evaluation case';
  place(count, [19.8, 32, 22.5, 4]);
  controls.append(count);

  for (const [position, screen] of hurdleScreens.entries()) {
    if (!readDraft(hurdleResolutionKey(screen))) continue;
    const completion = document.createElement('span');
    completion.className = 'hurdle-count';
    completion.textContent = 'Complete';
    place(completion, [19.8, 44.3 + position * 12.65, 22.5, 3.7]);
    controls.append(completion);
  }

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'deck-option-choice hurdle-complete-action';
  action.textContent = note ? id + ' complete' : 'Mark ' + id + ' complete';
  action.disabled = Boolean(note);
  place(action, [78.9, 81.4, 15, 3.1]);
  action.addEventListener('click', () => {
    const resolution = fieldValue(number);
    if (!resolution) {
      status.textContent = 'Enter how the hurdle was resolved first.';
      return;
    }
    const key = hurdleResolutionKey(number);
    if (!saveDraft(key, resolution)) { drafts.delete(key); return; }
    render(number);
    status.textContent = id + ' marked complete.';
  });
  controls.append(action);
  const saveUpdate = document.createElement('button');
  saveUpdate.type = 'button';
  saveUpdate.className = 'deck-option-choice hurdle-save-update';
  saveUpdate.textContent = 'Save update';
  place(saveUpdate, [63.4, 81.4, 14.5, 3.1]);
  controls.append(saveUpdate);

  const feedback = document.createElement('span');
  feedback.className = 'hurdle-note-status';
  feedback.setAttribute('role', 'status');
  place(feedback, [46.7, 84.8, 47.2, 3.6]);
  controls.append(feedback);
  updateHurdleNoteStatus(number);
  saveUpdate.addEventListener('click', () => {
    const update = fieldValue(number);
    if (!update) { feedback.textContent = 'Enter a comment before saving an update.'; return; }
    const key = hurdleUpdateKey(number);
    if (!saveDraft(key, update)) {
      drafts.delete(key);
      feedback.textContent = 'Update could not be saved in this browser. Try again.';
      return;
    }
    updateHurdleNoteStatus(number);
  });

  if (note) {
    const decision = document.createElement('div');
    decision.className = 'deck-insight deck-insight-compact';
    decision.setAttribute('aria-label', id + ' resolution');
    decision.textContent = 'Complete: ' + note;
    place(decision, [60, 56.7, 34.4, 7.4]);
    controls.append(decision);
  }
}

async function showRoadmap(screen) {
  const situation = fieldValue(2), objective = fieldValue(2, 1);
  const depth = readDraft(draftPrefix + ':depth') || 'Snapshot';
  const storageKey = draftPrefix + ':roadmap:' + planRevisionKey();
  const open = link => () => {
    if (link.kind === 'show') returnStack.push(13);
    render(link.target);
  };
  const back = screen.links.find(link => link.label === 'Back');
  const next = screen.links.find(link => link.label === 'Review progress');
  const navigation = [{ label: 'Back to your plan', run: open(back) },
    { label: 'Continue to progress dashboard', run: open(next), primary: true }];
  const shortcuts = screen.links.filter(link => !['Back', 'Review progress', 'Open'].includes(link.label))
    .map(link => ({ label: link.clientLabel || link.label, run: open(link) }));
  function show(plan) {
    mountRoadmap(roadmap, {initialSections: plan.sections, outcome: plan.outcome || objective, navigation, shortcuts,
      persist(sections) {
        const value = JSON.stringify({ ...plan, sections, edited: true });
        saveDraft(storageKey, value);
        if (localStorage.getItem(storageKey) !== value) throw new Error('Roadmap storage unavailable');
      },
    });
  }
  const root = roadmap.shadowRoot || roadmap.attachShadow({mode: 'open'});
  function message(text, action, callback) {
    const content = document.createElement('div');
    const heading = document.createElement('h1');
    heading.textContent = 'Slide 13 - Your Action Roadmap';
    const description = document.createElement('p');
    description.setAttribute('role', 'status');
    description.textContent = text;
    content.className = 'roadmap-loading';
    content.style.cssText = 'background:#fff;border:1px solid #c9d7eb;border-radius:12px;padding:1rem;margin:0 auto 1rem;max-width:1100px';
    content.append(heading, description);
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action;
      button.addEventListener('click', callback);
      content.append(button);
    }
    for (const {label, run} of navigation) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', run);
      content.append(button);
    }
    root.replaceChildren(content);
  }
  if (!situation || !objective) {
    message('Enter your situation and objective before opening your roadmap.', 'Go to Executive Input', () => render(2));
    return;
  }
  try {
    const stored = JSON.parse(readDraft(storageKey) || 'null');
    if (Array.isArray(stored?.sections) && stored.sections.length) { show(stored); return; }
  } catch { /* Generate a fresh starting roadmap if the saved data cannot be read. */ }
  message('Digital JD is grouping the work into a starting roadmap.');
  const controller = new AbortController();
  insightRequest = controller;
  try {
    const proposed = insights.get(12);
    const plan = approvedPlan() || (proposed?.caseKey === JSON.stringify([situation, objective, depth]) ? proposed.values : null);
    const selected = selectedOption();
    const context = [
      'Situation: ' + situation.slice(0, 4000),
      'Objective: ' + objective.slice(0, 3000),
      fieldValue(4) && 'Client clarification: ' + fieldValue(4).slice(0, 3000),
      readDraft(draftPrefix + ':latest-correction') && 'Case corrections: ' + readDraft(draftPrefix + ':latest-correction').slice(0, 3000),
      plan && 'Proposed plan: ' + JSON.stringify(plan).slice(0, 3500),
      selected && 'Selected approach: ' + selected.title,
      fieldValue(12) && 'Plan notes: ' + fieldValue(12).slice(0, 2000),
    ].filter(Boolean).join('\n\n');
    const reply = await askJD({ message: context, mode: 'executive_stage', depth, stage: 13 }, controller.signal);
    if (controller.signal.aborted || current !== 13) return;
    const generated = parseSuggestedRoadmap(reply);
    saveDraft(storageKey, JSON.stringify(generated));
    show(generated);
  } catch (error) {
    if (controller.signal.aborted) return;
    message(error instanceof SyntaxError ? 'Digital JD could not read the generated roadmap.' : error.message, 'Try again', () => showRoadmap(screen));
  } finally {
    if (insightRequest === controller) insightRequest = null;
  }
}

function render(number) {
  const screen = screens[number - 1];
  if (!screen) return;
  window.JDDictation?.stop(true);
  insightRequest?.abort();
  if ([45, 46].includes(number) && planContext !== planRevisionKey()) {
    planContext = planRevisionKey();
    planTurns = [];
    planQuestion = '';
    insights.delete(46);
  }
  current = number;
  status.textContent = '';
  picker.value = String(number);
  screenEvents?.abort();
  screenEvents = new AbortController();
  controls.replaceChildren();
  stage.hidden = number === 13;
  roadmap.hidden = number !== 13;
  if (number === 13) {
    scope.textContent = 'Executive evaluation. Use sample information.';
    showRoadmap(screen);
    return;
  }
  roadmap.shadowRoot?.replaceChildren();
  artwork.alt = screen.title;
  artwork.src = 'executive-approved/screen-' + String(number).padStart(3, '0') + '.png';
  if (number === 9) {
    const planArtwork = new Image();
    planArtwork.src = 'executive-approved/screen-012.png';
  }
  for (const link of screen.links) {
    const button = document.createElement('button');
    button.type = 'button';
    const sendPlanQuestion = number === 45 && link.label === 'Ask another question';
    const sendOptionsQuestion = number === 10 && link.target === 10 && link.label === 'Ask another question';
    const actionLabel = number === 5 && link.label === 'Update understanding' ? 'Send your answer or question' :
      sendOptionsQuestion ? 'Ask another question, then click here' :
      sendPlanQuestion ? 'Send to DJD' : link.clientLabel || link.label;
    button.setAttribute('aria-label', link.accessibleLabel || actionLabel);
    if (link.accessibleLabel) button.title = link.accessibleLabel;
    const backToTaskList = number === 15 && link.label === 'Back to task list';
    const saveTask = number === 15 && link.label === 'Save task';
    const sendConversation = number === 5 && link.label === 'Update understanding';
    const recordProgress = number === 17 && link.label === 'Record a progress update';
    if (sendPlanQuestion || sendOptionsQuestion || backToTaskList || saveTask || recordProgress || sendConversation || link.clientLabel) {
      const label = document.createElement('span');
      label.className = sendOptionsQuestion || recordProgress ? 'deck-send-label deck-options-send-label' : 'deck-send-label';
      if (link.clientLabel) label.classList.add('deck-client-label');
      if (link.labelTone) label.classList.add('deck-client-' + link.labelTone);
      label.textContent = actionLabel;
      button.append(label);
    }
    if (number === 5 && link.label === 'Update understanding') button.dataset.conversationAction = 'update';
    if (number === 5 && link.label === 'Confirm understanding') button.dataset.conversationAction = 'confirm';
    place(button, link.rect);
    if (saveTask) {
      const label = button.firstElementChild;
      const storageKey = draftPrefix + ':saved-task-update:' + planRevisionKey();
      const snapshot = () => JSON.stringify(Object.fromEntries(screen.microphones.map((field, index) => [field.label, fieldValue(15, index)])));
      let savedUpdate;
      try { savedUpdate = localStorage.getItem(storageKey); } catch { /* The save action reports storage errors. */ }
      const buttonLabel = () => savedUpdate && savedUpdate === snapshot() ? 'Add another task' : 'Save task';
      const refreshLabel = () => {
        label.textContent = buttonLabel();
        button.setAttribute('aria-label', label.textContent);
      };
      controls.addEventListener('input', () => {
        if (current === 15) refreshLabel();
      }, { signal: screenEvents.signal });
      refreshLabel();
      button.addEventListener('click', () => {
        if (buttonLabel() === 'Add another task') { jump(14); return; }
        const update = snapshot();
        if (!Object.values(JSON.parse(update)).some(Boolean)) {
          status.textContent = 'Enter a task update before saving.';
          return;
        }
        try {
          localStorage.setItem(storageKey, update);
          savedUpdate = update;
          status.textContent = 'Task update saved in this browser. You can add another task or submit this update for review.';
          refreshLabel();
        } catch {
          status.textContent = 'This browser could not save the task update.';
        }
      });
      controls.append(button);
      continue;
    }
    button.addEventListener('click', () => {
      if (current === 18 && link.label === 'Open') {
        openTrackedTask(link.target, button);
        return;
      }
      if (current === 3 && ['Select Snapshot', 'Select In-depth'].includes(link.label)) {
        saveDraft(draftPrefix + ':depth', link.label.slice(7));
      }
      if (current === 5 && link.label === 'Update understanding') {
        const correction = fieldValue(5);
        if (!correction) { status.textContent = 'Enter your answer, correction, or question first.'; return; }
        const depth = readDraft(draftPrefix + ':depth') || 'Snapshot';
        const key = JSON.stringify([fieldValue(2), fieldValue(2, 1), depth, fieldValue(4)]);
        const previous = readDraft(draftPrefix + ':correction-context') === key
          ? readDraft(draftPrefix + ':latest-correction') : '';
        saveDraft(draftPrefix + ':correction-context', key);
        if (correction !== previous.split('\n').at(-1)) {
          saveDraft(draftPrefix + ':latest-correction', [previous, correction].filter(Boolean).join('\n').slice(-3000));
        }
      }
      if (current === 12 && link.target === 45) {
        const key = planRevisionKey();
        if (planContext !== key) {
          planContext = key;
          planTurns = [];
          insights.delete(46);
        }
        const notes = fieldValue(12);
        planQuestion = notes && !planTurns.some(turn => turn.question === notes) ? notes : '';
      }
      if (sendPlanQuestion) {
        if (insightRequest) return;
        planContext = planRevisionKey();
        planQuestion = fieldValue(45);
        if (!planQuestion) { status.textContent = 'Enter a question or requested change first.'; return; }
        insights.delete(45);
      }
      if (current === 45 && link.target === 46 && (insightRequest || planQuestion || fieldValue(45) || !planTurns.length)) {
        status.textContent = insightRequest ? 'Wait for Digital JD to respond before reviewing changes.' : 'Send your question or change to Digital JD first.';
        return;
      }
      if (current === 46 && link.label === 'Confirm changes & return') {
        const revision = insights.get(46);
        if (insightRequest || !revision || !planTurns.length) { status.textContent = 'Generate and review the proposed changes first.'; return; }
        const values = Object.fromEntries(['outcome', 'delivery', 'resources', 'measures'].map(key => [key, revision.values[key]]));
        saveDraft(draftPrefix + ':plan-revision', JSON.stringify({ key: planRevisionKey(), values }));
        const roadmapKey = draftPrefix + ':roadmap:' + planRevisionKey();
        const storedRoadmap = readDraft(roadmapKey);
        if (storedRoadmap && !JSON.parse(storedRoadmap).edited) saveDraft(roadmapKey, '');
        saveDraft(draftPrefix + ':plan-confirmed', '');
        saveDraft(draftPrefix + ':12:0', '');
        planTurns = [];
        insights.delete(46);
        if (returnStack.at(-1) === 12) returnStack.pop();
        render(12);
        controls.querySelector('button')?.focus({ preventScroll: true });
        return;
      }
      if (current === 12 && link.target === 13 && link.label.startsWith('Confirm')) {
        const depth = readDraft(draftPrefix + ':depth') || 'Snapshot';
        saveDraft(draftPrefix + ':plan-confirmed', JSON.stringify([fieldValue(2), fieldValue(2, 1), depth, fieldValue(4)]));
      }
      if (current === 6 && /^(10|[1-9])$/.test(link.label)) saveDraft(draftPrefix + ':clarity', link.label);
      if (current === 34 && link.target >= 36 && link.target <= 40) saveDraft(draftPrefix + ':decision', link.label);
      if (link.kind === 'return') render(returnStack.pop() || (current === 45 ? 12 : 1));
      else {
        if (link.kind === 'show') returnStack.push(current);
        render(link.target);
      }
      controls.querySelector('button')?.focus({ preventScroll: true });
    });
    controls.append(button);
  }
  if (window.JDDictation) screen.microphones?.forEach((field, index) => addDictation(field, index, number));
  if (number === 12) {
    const guidance = document.createElement('div');
    guidance.className = 'deck-insight deck-insight-compact';
    guidance.textContent = 'Notes are optional. To request a change, add a note and choose Discuss / revise plan.';
    guidance.style.backgroundColor = '#fff';
    place(guidance, [60, 74.6, 34.1, 8.4]);
    controls.append(guidance);
  }
  showCasePanels(number);
  if (hurdleScreens.includes(number)) addHurdleResolution(number);
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
    onMissing: () => { location.href = 'signin.html?next=executive-preview.html'; },
  });
  if (session) {
    if (session.user.user_metadata?.plan !== 'executive') {
      throw new Error('Sign in with an Executive account to open the design review.');
    }
    draftPrefix = 'digital-jd:executive-design-draft:' + session.user.id;
    const response = await fetch('executive-preview/navigation.json');
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
