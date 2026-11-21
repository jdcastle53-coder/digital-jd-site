import { STAGES, REVISION_STAGES, NEXT_MOVES, OPPORTUNITY_TYPES } from './executive-flow.mjs';
import { createEvaluationStore } from './executive-evaluation-store.mjs';

const home = document.querySelector('#case-home');
const workspace = document.querySelector('#workspace');
const content = document.querySelector('#stage-content');
const status = document.querySelector('#status');
const title = document.querySelector('#stage-title');
const stages = document.querySelector('#stages');
let current;
let cases;
let busy = false;
let fieldForm;

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function notify(text, error = false) {
  status.textContent = text;
  status.toggleAttribute('data-error', error);
}

async function run(operation) {
  if (busy) return;
  busy = true;
  notify('Working...');
  try {
    const message = await operation();
    notify(typeof message === 'string' ? message : '');
  } catch (error) {
    notify(error.message, true);
  } finally {
    busy = false;
  }
}

function button(label, action, parent) {
  const control = element('button', label);
  control.type = 'button';
  control.addEventListener('click', () => run(action));
  parent.append(control);
  return control;
}

async function request(path, body) {
  const { data } = await window.Auth.client.auth.getSession();
  if (!data?.session) throw new Error('Sign in again to continue.');
  const options = {
    headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
  };
  if (body) Object.assign(options, { method: 'POST', body: JSON.stringify(body) });
  const response = await fetch(path, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

async function command(action, payload = {}, caseId = current?.id || crypto.randomUUID()) {
  const body = {
    action, payload, caseId, expectedVersion: current?.version || 0, requestId: crypto.randomUUID(),
  };
  current = cases.write(body);
}

async function openCase(id) {
  current = cases.get(id);
  render();
}

async function showCases() {
  await saveFields();
  const data = cases.list();
  current = null;
  fieldForm = null;
  const list = document.querySelector('#case-list');
  list.replaceChildren();
  for (const entry of data) {
    const item = element('li');
    button(entry.title + (entry.status === 'closed' ? ' (closed)' : ''), () => openCase(entry.id), item);
    list.append(item);
  }
  if (!data.length) list.append(element('li', 'No saved cases yet.'));
  workspace.hidden = true;
  home.hidden = false;
}

function field(parent, key, label, value = '', choices = null, type = 'textarea') {
  const id = 'field-' + key;
  const caption = element('label', label);
  caption.htmlFor = id;
  const input = element(choices ? 'select' : type);
  input.id = id;
  input.name = key;
  if (choices) {
    if (!value) input.append(new Option('Choose an option', ''));
    for (const choice of choices) input.append(new Option(choice.label ?? choice, choice.value ?? choice));
  }
  input.value = value;
  if (type === 'textarea' && !choices) input.maxLength = 8000;
  parent.append(caption, input);
  if (type === 'textarea' && !choices && window.JDDictation) {
    const mic = element('button', 'Dictate');
    mic.type = 'button';
    window.JDDictation.attach(mic, input, true);
    parent.append(mic);
  }
  return input;
}

async function saveFields() {
  if (!current || !fieldForm) return;
  const fields = Object.fromEntries(new FormData(fieldForm));
  const previous = current.document.fields[current.stage] || {};
  if (!Object.entries(fields).some(([key, value]) => value !== (previous[key] ?? ''))) return;
  await command('save', { stage: current.stage, fields });
}

async function navigate(stage, remember = false) {
  window.JDDictation?.stop(true);
  await saveFields();
  if (stage === 4 && !current.document.fields[4]?.initialUnderstanding) await generateOpening();
  await command('navigate', { stage, remember });
  render();
  title.focus();
}

async function generateOpening() {
  const fields = current.document.fields;
  const situation = fields[2]?.situation;
  const objective = fields[2]?.objective;
  const depth = fields[3]?.depth;
  if (!situation || !objective) throw new Error('Enter your situation and objective on Executive Input first.');
  if (!depth) throw new Error('Choose Snapshot or In-depth first.');

  notify('Digital JD is preparing its initial understanding...');
  const result = await request('/api/jd-brain-gateway', {
    message: 'Situation: ' + situation + '\n\nObjective: ' + objective,
    mode: 'executive_opening',
    caseScoped: true,
    depth,
  });
  if (!result.reply?.trim()) throw new Error('Digital JD returned no opening insight. Try again.');
  await command('save', { stage: 4, fields: { initialUnderstanding: result.reply.trim().slice(0, 8000) } });
}

function showOpening(parent) {
  const opening = current.document.fields[4]?.initialUnderstanding;
  if (!opening) {
    button('Get Digital JD?s initial understanding', async () => {
      await generateOpening();
      render();
      title.focus();
    }, parent);
    return false;
  }
  const summary = element('section');
  summary.className = 'opening-insight';
  const insight = element('p', opening);
  insight.className = 'answer';
  summary.append(element('h3', 'Digital JD?s initial understanding'), insight);
  parent.append(summary);
  return true;
}

function depthChoices(form, selected) {
  const choices = element('fieldset');
  choices.className = 'depth-choices';
  choices.append(element('legend', 'Choose your analysis depth'));
  for (const [value, description] of [
    ['Snapshot', 'A brief read on the situation and the main issue.'],
    ['In-depth', 'A closer look at the situation, key tensions, and what still needs to be understood.'],
  ]) {
    const label = element('label');
    const radio = element('input');
    radio.type = 'radio';
    radio.name = 'depth';
    radio.value = value;
    radio.required = true;
    radio.checked = selected === value;
    const copy = element('span');
    copy.append(element('strong', value), element('small', description));
    label.append(radio, copy);
    choices.append(label);
  }
  form.append(choices);
}

function stageFields(stage, parent) {
  if (!stage.fields.length) return null;
  const form = element('form');
  const values = current.document.fields[stage.number] || {};
  const options = {
    clarity: Array.from({ length: 10 }, (_, i) => String(i + 1)),
    nextMove: NEXT_MOVES,
  };
  for (const [key, label] of stage.fields) {
    if (key === 'depth') depthChoices(form, values.depth);
    else if (key !== 'initialUnderstanding') field(form, key, label, values[key], options[key]);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      await saveFields();
      return stage.number === 3 ? 'Analysis depth saved: ' + current.document.fields[3].depth + '.' : 'Changes saved.';
    });
  });
  const save = element('button', 'Save');
  save.type = 'submit';
  form.append(save);
  parent.append(form);
  return form;
}

const itemTypes = {
  task: { list: 'tasks', selection: 'selectedTask', title: 'Tasks', fields: [
    ['title', 'Task name', 'input'], ['owner', 'Owner', 'input'], ['due', 'Due date', 'date'],
    ['measure', 'Success measure'], ['status', 'Status', ['open', 'active', 'complete']], ['evidence', 'Progress and completion evidence'],
  ] },
  hurdle: { list: 'hurdles', selection: 'selectedHurdle', title: 'Hurdles', fields: [
    ['title', 'Hurdle name', 'input'], ['impact', 'Impact'], ['response', 'Response'],
    ['status', 'Status', ['open', 'resolved']],
  ] },
  opportunity: { list: 'opportunities', selection: 'selectedOpportunity', title: 'Opportunities', fields: [
    ['title', 'Opportunity name', 'input'], ['value', 'Expected value'], ['measure', 'Success measure'], ['action', 'Next action'],
  ] },
};

function itemWorkspace(kind, edit = false) {
  const config = itemTypes[kind];
  const records = current.document[config.list];
  const selected = records.find(record => record.id === current.document[config.selection]);
  content.append(element('h3', config.title));
  const list = element('ul');
  for (const record of records) {
    const row = element('li');
    button(record.title + (record.status ? ' (' + record.status + ')' : ''), async () => {
      if (selected?.id === record.id && edit) return;
      await command('select_' + kind, { id: record.id });
      render();
    }, row);
    list.append(row);
  }
  if (!records.length) list.append(element('li', 'No ' + config.list + ' recorded.'));
  content.append(list);
  const section = element('section');
  content.append(section);
  function editor(record) {
    window.JDDictation?.stop(true);
    section.replaceChildren();
    const form = element('form');
    section.append(element('h4', record ? 'Edit ' + kind : 'New ' + kind), form);
    for (const [key, label, config] of itemTypes[kind].fields) {
      const choices = Array.isArray(config) ? config : null;
      const input = field(form, kind + '-' + key, label, record?.[key] ?? choices?.[0], choices, config === 'date' ? 'input' : typeof config === 'string' ? config : 'textarea');
      if (config === 'date') input.type = 'date';
      if (key === 'title' || key === 'impact') input.required = true;
    }
    if (kind === 'hurdle') {
      const options = [{ value: '', label: 'No associated task' }, ...current.document.tasks.map(task => ({ value: task.id, label: task.title }))];
      field(form, 'hurdle-taskId', 'Associated task', record?.taskId ?? '', options);
    }
    if (kind === 'opportunity') field(form, 'opportunity-selected', 'Include in follow-up', String(record?.selected || false), [
      { value: 'false', label: 'No' }, { value: 'true', label: 'Yes' },
    ]);
    const save = element('button', 'Save ' + kind);
    save.type = 'submit';
    form.append(save);
    form.addEventListener('submit', event => {
      event.preventDefault();
      run(async () => {
        window.JDDictation?.stop(true);
        const payload = Object.fromEntries(Array.from(new FormData(form), ([key, value]) => [key.slice(kind.length + 1), value]));
        if (record) payload.id = record.id;
        if (kind === 'opportunity') payload.selected = payload.selected === 'true';
        await command(kind, payload);
        if (!edit) await command('select_' + kind, { id: current.document[config.selection] });
        render();
      });
    });
  }
  button('Add ' + kind, () => editor(null), content);
  if (edit && selected) editor(selected);
}

function addDiscussion() {
  const form = element('form');
  const history = element('section');
  history.setAttribute('aria-label', 'Saved discussion');
  for (const entry of current.document.discussion) {
    const note = element('p', (entry.role === 'user' ? 'You: ' : 'Digital JD: ') + entry.text);
    note.className = 'answer';
    history.append(note);
  }
  const answer = element('p');
  answer.className = 'answer';
  answer.setAttribute('role', 'status');
  const input = field(form, 'discussion', 'What would you like to discuss with Digital JD?');
  input.required = true;
  const submit = element('button', 'Ask Digital JD');
  submit.type = 'submit';
  form.append(submit);
  form.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      window.JDDictation?.stop(true);
      await saveFields();
      const record = current.document.fields;
      const recent = current.document.discussion.slice(-4).map(entry =>
        (entry.role === 'user' ? 'You: ' : 'Digital JD: ') + entry.text.slice(0, 600));
      const context = [
        record[2]?.situation && 'Situation: ' + record[2].situation,
        record[2]?.objective && 'Objective: ' + record[2].objective,
        record[3]?.depth && 'Analysis depth: ' + record[3].depth,
        record[4]?.initialUnderstanding && 'Your initial understanding: ' + record[4].initialUnderstanding.slice(0, 1400),
        recent.length && 'Recent discussion:\n' + recent.join('\n'),
      ].filter(Boolean).join('\n').slice(0, 5000);
      const message = input.value.trim();
      const result = await request('/api/jd-brain-gateway', {
        message: context + '\n\nQuestion: ' + message,
        mode: 'advisor',
        caseScoped: true,
      });
      if (!result.reply) throw new Error('No response was returned. Try again.');
      answer.textContent = result.reply;
      await command('message', { message, reply: result.reply.slice(0, 16000) });
      render();
    });
  });
  content.append(history, form, answer);
}

function render() {
  window.JDDictation?.stop(true);
  home.hidden = true;
  workspace.hidden = false;
  document.querySelector('#case-name').textContent = current.title;
  const stage = STAGES[current.stage - 1];
  title.textContent = stage.title;
  content.replaceChildren();
  stages.replaceChildren();
  fieldForm = null;
  if (current.status === 'closed') {
    content.append(element('p', current.document.fields[23]?.outcome || 'Case closed.'));
    button('Reopen case', async () => { await command('reopen'); render(); }, content);
    return;
  }
  for (const next of STAGES) {
    const control = button(next.title, () => navigate(next.number), stages);
    if (next.number === stage.number) control.setAttribute('aria-current', 'step');
  }
  const canRespond = stage.number !== 4 || showOpening(content);
  if (canRespond) fieldForm = stageFields(stage, content);
  if (canRespond && [4, 5, 10, 19].includes(stage.number)) addDiscussion();
  if (stage.number === 8) content.append(element('p', 'Review the facts and assumptions behind your analysis, then compare your options.'));
  if ([13, 14, 15, 17, 18, 21].includes(stage.number)) itemWorkspace('task', [14, 15].includes(stage.number));
  if ([16, 17, 21].includes(stage.number)) itemWorkspace('hurdle', stage.number === 16);
  if ([24, 25].includes(stage.number)) {
    content.append(element('p', OPPORTUNITY_TYPES.join(' ? ')));
    itemWorkspace('opportunity', stage.number === 25);
  }
  const actions = element('div');
  actions.className = 'actions';
  content.append(actions);
  const navigation = {
    1: [['Begin your case', 2]],
    2: [['Back', 1], ['Choose analysis depth', 3]],
    3: [['Back', 2], ['Discuss with Digital JD', 4]],
    4: [['Back', 3], ['Review your understanding', 5]],
    5: [['Back', 4], ['Confirm understanding', 6]],
    6: [['Return to the conversation', 5], ['Review the foundations', 7]],
    7: [['Back', 6], ['Inside Digital JD', 8], ['Compare options', 9]],
    8: [['Back to foundations', 7]],
    9: [['Discuss the options', 10], ['Other options', 11], ['Review proposed plan', 12]],
    10: [['Back to options', 9], ['Review proposed plan', 12]],
    11: [['Back to options', 9]],
    12: [['Back to options', 9], ['Discuss the plan', 10]],
    13: [['Back to plan', 12], ['Review progress', 17]],
    14: [['Back to roadmap', 13], ['Provide an update', 15]],
    15: [['Back to task', 14], ['Facing a hurdle', 16]],
    16: [['Back to task update', 15], ['View progress dashboard', 17]],
    17: [['Back to roadmap', 13], ['Facing a hurdle', 16], ['View all tasks', 18]],
    18: [['Back to overview', 17], ['Open all task details', 13], ['Review the case', 19]],
    19: [['Back to task tracker', 18], ['Choose the next move', 20]],
    20: [['Back to assessment', 19]],
    21: [['Back to decisions', 20], ['View case briefing', 22]],
    22: [['Back to actions', 21], ['Return to roadmap', 13], ['Review the outcome', 23]],
    23: [['Back to briefing', 22], ['Review opportunities', 24]],
    24: [['Back to outcome review', 23], ['Open opportunity workspace', 25]],
    25: [['Back to opportunities', 24]],
  };
  for (const [label, target] of navigation[stage.number]) button(label, () => navigate(target), actions);
  if (current.document.returnStack.length) button('Return to previous workspace', async () => {
    await saveFields(); await command('return'); render();
  }, actions);
  if (stage.number === 12) button('Confirm plan', async () => {
    await saveFields(); await command('confirm_plan'); render();
  }, actions);
  if (stage.number === 20) button('Confirm decision', async () => {
    await saveFields();
    const { nextMove, conditions } = current.document.fields[20] || {};
    await command('decision', { choice: nextMove, conditions });
    render();
  }, actions);
  if (current.document.revision) button('Review revision and return', async () => {
    await saveFields(); await command('finish_revision'); render();
  }, actions);
  else if ([20, 23, 24].includes(stage.number)) {
    const revisionForm = element('div');
    const select = field(revisionForm, 'revision', 'Choose a stage to revise', '', REVISION_STAGES.map(number => ({
      value: String(number), label: STAGES[number - 1].title,
    })));
    button('Begin revision', async () => {
      if (!select.value) throw new Error('Choose a stage to revise.');
      await saveFields(); await command('begin_revision', { stage: Number(select.value) }); render();
    }, revisionForm);
    content.append(revisionForm);
  }
  if (stage.number === 23) button('Close and record case', async () => {
    await saveFields();
    const outstanding = current.document.tasks.some(task => task.status !== 'complete') ||
      current.document.hurdles.some(hurdle => hurdle.status === 'open');
    if (outstanding && !confirm('Are the remaining responsibilities recorded?')) return;
    await command('close', { acknowledgeOpen: outstanding });
    render();
  }, actions);
}

document.querySelector('#all-cases').addEventListener('click', () => run(showCases));
document.querySelector('#create-case').addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    await command('create', { title: document.querySelector('#case-title').value.trim() });
    document.querySelector('#case-title').value = '';
    render();
  });
});
window.addEventListener('pagehide', () => window.JDDictation?.stop(true));
run(async () => {
  if (!window.Auth) throw new Error('Sign-in is unavailable. Refresh the page to try again.');
  const session = await window.Auth.requireActiveSession({ onMissing: () => { location.href = 'signin.html?next=executive-workspace.html'; } });
  if (!session) return;
  if (session.user.user_metadata?.plan !== 'executive') {
    throw new Error('Sign in with your Executive account to open the evaluation.');
  }
  cases = createEvaluationStore(localStorage, session.user.id);
  await showCases();
});
