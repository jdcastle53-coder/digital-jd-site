import { PANELS } from './case-panels.mjs';
import { mountRoadmap, parseSuggestedRoadmap } from './roadmap.mjs?v=panel-trim-2';
import { openTrackedTask } from './tracker-task-details.mjs';
import { askButton, decorateSlide } from './slide-standard.mjs?v=panel-trim-2';
import { openWorkshop, renderOpportunities } from './workshop.mjs';
import { renderProgressDashboard } from './progress-dashboard.mjs';

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
let opportunity;
let opportunityCase;
let baseDraftPrefix;
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

function inputKey(number,index) {
  const suffix = number === 25 && opportunity ? ':' + planRevisionKey() + ':' + opportunity.key : '';
  return draftPrefix + ':' + number + ':' + index + suffix;
}

function addDictation(field, index, number) {
  const key = inputKey(number,index);
  const input = document.createElement('textarea');
  input.className = hurdleScreens.includes(number) || number === 15 ? 'deck-input deck-roomy-input' : 'deck-input';
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
  return readDraft(inputKey(screen,index)).trim();
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

function drawAssessmentPanels() {
  const background = document.createElement('div');
  background.className = 'assessment-panel-background';
  place(background, [19.75, 23.55, 76.3, 54.1]);
  controls.append(background);
  for (const [index, title] of ['Current assessment', 'Rationale and attention'].entries()) {
    const panel = document.createElement('section');
    panel.className = 'assessment-rounded-panel';
    const heading = document.createElement('h2');
    heading.textContent = title;
    panel.append(heading);
    place(panel, index === 0 ? [20, 24.03, 36.6, 52.92] : [58.55, 24.03, 37.2, 52.92]);
    if (index === 0) {
      const rows = document.createElement('div');
      rows.className = 'assessment-panel-row-labels';
      for (const label of ['Result', 'Direction', 'Confidence']) {
        const row = document.createElement('div');
        row.textContent = label;
        rows.append(row);
      }
      panel.append(rows);
    }
    controls.append(panel);
  }
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
    if (number === 25 && !opportunity) { first.textContent = 'Go back to opportunities and choose one to explore.'; return; }
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
      number === 20 && readDraft(draftPrefix + ':saved-task-update:' + planRevisionKey()) && 'Saved task update: ' + readDraft(draftPrefix + ':saved-task-update:' + planRevisionKey()).slice(0, 3000),
      number === 20 && hurdleScreens.some(screen => readDraft(hurdleUpdateKey(screen)) || readDraft(hurdleResolutionKey(screen))) && 'Recorded hurdle updates: ' + JSON.stringify(hurdleScreens.map(screen => ({ update: readDraft(hurdleUpdateKey(screen)), resolution: readDraft(hurdleResolutionKey(screen)) }))).slice(0, 2000),
      number === 20 && insights.get(19)?.caseKey === caseKey && 'Progress assessment: ' + JSON.stringify(insights.get(19).values).slice(0, 2000),
      number === 25 && 'Selected opportunity: ' + opportunity.title + '. ' + opportunity.summary,
      number === 25 && fieldValue(25) && 'Client notes for this opportunity: ' + fieldValue(25).slice(0, 3500),
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
      if (number === 11) {
        for (const [index,key] of ['first','second'].entries()) {
          const region=regions[index];
          region.classList.add('deck-option-rationale');
          region.replaceChildren();
          if (!values[key]) {
            region.textContent = 'No additional supported alternative for this case.';
            continue;
          }
          const title=document.createElement('strong');
          title.textContent=values[key];
          const label=document.createElement('span');
          label.textContent='Why it was ranked lower';
          const reason=document.createElement('p');
          reason.textContent=values[key+'Reason'] || 'The available case information does not support a definitive reason.';
          region.append(title,label,reason);
        }
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
      if (number === 11) keys.push('firstReason','secondReason');
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
  place(action, [79, 81.05, 14.3, 2.65]);
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
  place(saveUpdate, [64.3, 81.05, 13.5, 2.65]);
  controls.append(saveUpdate);

  const feedback = document.createElement('span');
  feedback.className = 'hurdle-note-status';
  feedback.setAttribute('role', 'status');
  place(feedback, [47.5, 85.05, 46, 2.9]);
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
    mountRoadmap(roadmap, {initialSections: plan.sections, outcome: plan.outcome || objective, navigation, shortcuts, ask: () => askButton(openSlideWorkshop),
      persist(sections) {
        const value = JSON.stringify({ ...plan, sections, edited: true });
        saveDraft(storageKey, value);
        if (localStorage.getItem(storageKey) !== value) throw new Error('Roadmap storage unavailable');
      },
    });
  }
  const root = roadmap.shadowRoot || roadmap.attachShadow({mode: 'open'});
  function message(text, action, callback, preparing = false) {
    const content = document.createElement('div');
    const heading = document.createElement('h1');
    heading.textContent = preparing ? 'Preparing your roadmap' : 'Your Action Roadmap';
    const description = document.createElement('p');
    description.setAttribute('role', 'status');
    description.textContent = text;
    content.className = 'roadmap-loading';
    content.style.cssText = 'background:#fff;border:4px solid #08265f;border-radius:16px;padding:clamp(1.4rem,5vw,3rem);margin:1rem auto;max-width:1050px;min-height:16rem;color:#152940;box-shadow:0 3px 8px #10244037;font:inherit';
    if (preparing) content.setAttribute('aria-busy','true');
    const kicker=document.createElement('strong'); kicker.textContent='SLIDE 13';
    content.append(kicker, heading, description);
    if (preparing) {
      const indicator=document.createElement('progress');
      indicator.setAttribute('aria-label','Generating roadmap');
      indicator.style.cssText='display:block;width:min(100%,22rem);margin:1rem 0;accent-color:#2156d9';
      content.append(indicator);
    }
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
  message('Digital JD is turning your plan into sections and tasks. Your roadmap will appear here when it is ready.', null, null, true);
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

function workshopScreenDetails(number,screen) {
  const caseKey=JSON.stringify([fieldValue(2),fieldValue(2,1),readDraft(draftPrefix+':depth') || 'Snapshot']);
  const currentPanel=insights.get(number);
  const panel=currentPanel?.caseKey === caseKey ? JSON.stringify(currentPanel.values).slice(0,3000) : '';
  const notes=(screen.microphones || []).map((field,index)=>{
    const note=fieldValue(number,index);
    return note ? field.label+': '+note.slice(0,900) : '';
  }).filter(Boolean).join('\n').slice(0,2400);
  return [panel && 'Information shown on this screen: '+panel,notes && 'Client entries on this screen: '+notes].filter(Boolean).join('\n');
}

function openSlideWorkshop(opener) {
  const number = current;
  const screen = screens[number - 1];
  const title = screen.title;
  openWorkshop({ opener, async send(question, history, signal) {
    const caseContext = [42,43].includes(number) ? '' : [
      fieldValue(2) && 'Situation: ' + fieldValue(2).slice(0, 2500),
      fieldValue(2,1) && 'Objective: ' + fieldValue(2,1).slice(0, 2500),
      fieldValue(4) && 'Client clarification: ' + fieldValue(4).slice(0, 1700),
      selectedOption() && 'Selected approach: ' + selectedOption().title,
      number >= 15 && fieldValue(15,3) && 'Recorded result or evidence: ' + fieldValue(15,3).slice(0,2400),
      [16,83,84].includes(number) && readDraft(hurdleUpdateKey(number)) && 'Saved update for this hurdle: ' + readDraft(hurdleUpdateKey(number)).slice(0,1800),
      [16,83,84].includes(number) && fieldValue(number) && 'Current hurdle note: ' + fieldValue(number).slice(0,1800),
      number === 25 && opportunity && 'Selected opportunity: ' + opportunity.title + '. ' + opportunity.summary,
      workshopScreenDetails(number,screen),
    ].filter(Boolean).join('\n');
    const message = ['Executive screen ' + number + ': ' + title, caseContext,
      history.length && 'Recent workshop conversation: ' + JSON.stringify(history).slice(-3500),
      'Client request: ' + question].filter(Boolean).join('\n\n');
    const reply = JSON.parse(await askJD({message, mode:'executive_stage',stage:110},signal));
    if (typeof reply.reply !== 'string' || !reply.reply.trim()) throw new Error('No answer was returned. Try again.');
    return reply.reply;
  } });
}

async function showOutcomeOpportunities() {
  const panel = document.createElement('section');
  panel.className = 'deck-insight deck-insight-compact opportunity-list';
  panel.setAttribute('aria-label','Case opportunities');
  panel.setAttribute('aria-live','polite');
  place(panel,[64.05,31.15,30.9,53.95]);
  controls.append(panel);
  const evidence = fieldValue(15,3);
  if (!fieldValue(2) || !fieldValue(2,1) || !evidence) {
    panel.textContent = 'Add a case outcome and supporting evidence before looking for follow-up opportunities.';
    return;
  }
  const message = [ 'Situation: ' + fieldValue(2).slice(0,3000), 'Objective: ' + fieldValue(2,1).slice(0,3000),
    'Actual result and evidence: ' + evidence.slice(0,3500),
    'Open hurdle updates, if recorded: ' + hurdleScreens.filter(screen => !readDraft(hurdleResolutionKey(screen)))
      .map(screen => readDraft(hurdleUpdateKey(screen))).filter(Boolean).join(' / ').slice(0,2000),
    'Case plan, when available: ' + JSON.stringify(approvedPlan() || {}).slice(0,2000),
  ].join('\n\n');
  async function load() {
    const controller = new AbortController();
    insightRequest = controller;
    panel.textContent = 'Digital JD is reviewing the evidence for follow-up opportunities...';
    try {
      const values = JSON.parse(await askJD({message,mode:'executive_stage',stage:24},controller.signal));
      if (controller.signal.aborted) return;
      renderOpportunities(panel,values,selected => { opportunity=selected; opportunityCase=planRevisionKey(); render(25); });
    } catch (error) {
      if (controller.signal.aborted) return;
      panel.textContent = 'Digital JD could not prepare opportunities. ';
      const retry=document.createElement('button');
      retry.type='button'; retry.className='insight-retry'; retry.textContent='Try again';
      retry.addEventListener('click',load); panel.append(retry);
    } finally { if(insightRequest===controller) insightRequest=null; }
  }
  load();
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
  if (opportunity && opportunityCase !== planRevisionKey()) opportunity = null;
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
  const entries = [];
  for (const link of screen.links) {
    if (number === 24 && (!link.label || link.target === 25)) {
      if (link.rect[1] >= 85) entries.push({link,button:null});
      continue;
    }
    const button = document.createElement('button');
    button.type = 'button';
    const sendPlanQuestion = number === 45 && link.label === 'Ask another question';
    const sendOptionsQuestion = number === 10 && link.target === 10 && link.label === 'Ask another question';
    entries.push({link,button});
    const actionLabel = number === 25 && link.label === 'Review & update' ? 'Send notes to Digital JD' :
      number === 5 && link.label === 'Update understanding' ? 'Send your answer or question' :
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
      if (current === 1 && link.target === 2 && new URLSearchParams(location.search).get('new-case') === '1') {
        const id = crypto.randomUUID();
        draftPrefix = baseDraftPrefix + ':' + id;
        const url = new URL(location.href);
        url.searchParams.delete('new-case'); url.searchParams.set('case',id);
        history.replaceState(null,'',url);
        insights.clear(); discussionAnswers=[]; planTurns=[]; opportunity=null;
      }
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
      if (link.kind === 'return') render(returnStack.pop() || directReturn(current,link.label));
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
  if (number === 19) drawAssessmentPanels();
  showCasePanels(number);
  if (number === 24) showOutcomeOpportunities();
  if (number === 17) {
    let sections = [];
    try { sections = JSON.parse(readDraft(draftPrefix + ':roadmap:' + planRevisionKey()) || 'null')?.sections || []; } catch {}
    renderProgressDashboard(controls, {
      sections, evidence:fieldValue(15,3),
      hurdles:hurdleScreens.map((screen,i)=>({id:'H0'+(i+1),note:readDraft(hurdleUpdateKey(screen)),resolved:Boolean(readDraft(hurdleResolutionKey(screen)))})),
    });
  }
  decorateSlide({number,screen,controls,entries,openHelp:openSlideWorkshop,
    go(target,returnable) { if (!fieldValue(2) || !fieldValue(2,1)) { status.textContent = 'Enter your situation and objective to use this case shortcut.'; return; } if (returnable) returnStack.push(number); render(target); },
    unavailable(label) { status.textContent = label + ' is not available for this sample case record in the preview.'; },
  });
  if (hurdleScreens.includes(number)) addHurdleResolution(number);
  scope.textContent = number === 4 || PANELS[number] || [1, 2, 3, 6, 8].includes(number)
    ? 'Executive evaluation. Use sample information.'
    : 'Design and navigation preview. Example values on this screen are not results from your case.';
}

function directReturn(number,label) {
  if (label === 'Return to task list') return 18;
  if (label === 'Return to action list') return 21;
  if ([16,83,84].includes(number)) return 17;
  if (number === 32) return 16;
  if ([42,43,44].includes(number)) return 30;
  if (number >= 102) return 27;
  const home = {26:18,30:1,45:12,47:13,49:18,51:15,53:16,55:17,57:18,59:19,61:20,63:21,65:22,67:23,69:24,71:25,73:27,75:28,77:29,79:31};
  return home[number] || home[number-1] || 30;
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
    onMissing: () => { const target = new URLSearchParams(location.search).get('new-case') === '1' ? 'executive-preview.html?new-case=1' : 'executive-preview.html'; location.href = 'signin.html?next=' + encodeURIComponent(target); },
  });
  if (session) {
    if (session.user.user_metadata?.plan !== 'executive') {
      throw new Error('Sign in with an Executive account to open the design review.');
    }
    baseDraftPrefix = 'digital-jd:executive-design-draft:' + session.user.id;
    const caseId = new URLSearchParams(location.search).get('case');
    draftPrefix = caseId && /^[a-f0-9-]{36}$/i.test(caseId) ? baseDraftPrefix + ':' + caseId : baseDraftPrefix;
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
    const initialSlide = Number(new URLSearchParams(location.search).get('slide'));
    render(Number.isInteger(initialSlide) && screens[initialSlide-1] ? initialSlide : 1);
    review.hidden = false;
    status.textContent = '';
  }
} catch (error) {
  status.textContent = error.message;
}
