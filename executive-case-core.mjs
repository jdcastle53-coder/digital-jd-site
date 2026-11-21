import { STAGES, REVISION_STAGES, NEXT_MOVES } from './executive-flow.mjs';
export class CaseError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const fail = (status, code, message) => { throw new CaseError(status, code, message); };
export const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function text(value, max = 8000) {
  if (typeof value !== 'string' || value.length > max) fail(400, 'invalid_text', 'Enter text within the displayed limit.');
  return value.trim();
}
function required(value, max) { const result = text(value, max); if (!result) fail(400, 'required', 'Complete the required fields.'); return result; }
function stage(value) { if (!Number.isInteger(value) || value < 1 || value > 25) fail(400, 'invalid_stage', 'Choose a valid process stage.'); return value; }
function item(list, id) { const result = list.find(x => x.id === id); if (!result) fail(404, 'item_not_found', 'This item is not in the selected case.'); return result; }
export function initialDocument() {
  return { fields: {}, tasks: [], hurdles: [], opportunities: [], decisions: [], discussion: [], returnStack: [], revision: null, planConfirmed: false, selectedTask: null, selectedHurdle: null, selectedOpportunity: null };
}
export function applyCommand(current, action, payload = {}, { id, now = new Date().toISOString() } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail(400, 'invalid_payload', 'Invalid request.');
  if (action === 'create' || action === 'followup') {
    if (current) fail(409, 'already_exists', 'This case already exists.');
    const doc = initialDocument();
    if (action === 'followup') doc.fields['2'] = { situation: text(payload.situation || ''), objective: text(payload.objective || '') };
    return { title: required(payload.title, 160), stage: 1, status: 'active', document: doc };
  }
  if (!current) fail(404, 'case_not_found', 'Case not found.');
  if (current.status === 'closed' && action !== 'reopen') fail(409, 'case_closed', 'Reopen this case before making changes.');
  const next = JSON.parse(JSON.stringify(current));
  const d = next.document;
  if (!d || !Array.isArray(d.tasks) || !Array.isArray(d.discussion)) fail(409, 'invalid_record', 'This case needs a data review before editing.');
  switch (action) {
    case 'save': {
      const n = stage(payload.stage);
      const allowed = new Set(STAGES[n - 1].fields.map(([key]) => key));
      const fields = payload.fields || {};
      if (typeof fields !== 'object' || Array.isArray(fields)) fail(400, 'invalid_fields', 'Invalid stage fields.');
      for (const key of Object.keys(fields)) if (!allowed.has(key)) fail(400, 'unknown_field', 'Invalid field for this stage.');
      const values = Object.fromEntries(Object.entries(fields).map(([key,value]) => [key,text(value)]));
      const changed = Object.entries(values).some(([key, value]) => value !== d.fields[n]?.[key]);
      d.fields[n] = { ...d.fields[n], ...values };
      if (changed && (n === 2 || n === 3) && d.fields[4]) {
        delete d.fields[4].initialUnderstanding;
      }
      if (n === 3 && !['Snapshot','In-depth'].includes(d.fields[n].depth)) fail(400,'invalid_depth','Choose an analysis depth.');
      if (n === 6 && !/^(10|[1-9])$/.test(d.fields[n].clarity)) fail(400,'invalid_clarity','Choose a number from 1 to 10.');
      if (n === 20 && !NEXT_MOVES.includes(d.fields[n].nextMove)) fail(400,'invalid_move','Choose a next move.');
      if ([2,7,9,12].includes(n)) d.planConfirmed = false;
      if (d.revision && !d.revision.changedStages.includes(n)) d.revision.changedStages.push(n);
      break;
    }
    case 'navigate': {
      const to = stage(payload.stage);
      if (payload.remember === true && to !== next.stage) d.returnStack = [...d.returnStack.slice(-9), next.stage];
      next.stage = to;
      break;
    }
    case 'return': next.stage = d.returnStack.pop() || 13; break;
    case 'confirm_plan':
      if (!d.fields['2']?.objective || !d.fields['12']?.plan) fail(400,'plan_incomplete','Record your objective and plan before confirming.');
      d.planConfirmed = true; next.stage = 13; break;
    case 'task': {
      const record = payload.id ? item(d.tasks,payload.id) : { id, createdAt: now };
      if (!payload.id && d.tasks.length >= 100) fail(400,'item_limit','This case has reached 100 tasks.');
      Object.assign(record, { title: required(payload.title,200), owner: text(payload.owner || '',160), due: text(payload.due || '',10), measure: text(payload.measure || '',2000), evidence: text(payload.evidence || '',4000), status: payload.status || 'open', updatedAt: now });
      if (!['open','active','complete'].includes(record.status)) fail(400,'invalid_status','Choose a task status.');
      if (record.due && (!/^\d{4}-\d{2}-\d{2}$/.test(record.due) || !Number.isFinite(Date.parse(record.due)) || new Date(record.due).toISOString().slice(0,10) !== record.due)) fail(400,'invalid_date','Choose a valid due date.');
      if (record.status === 'complete' && !record.evidence) fail(400,'evidence_required','Record completion evidence.');
      if (!payload.id) d.tasks.push(record);
      d.selectedTask = record.id; break;
    }
    case 'select_task': item(d.tasks,payload.id); d.selectedTask = payload.id; d.returnStack = [...d.returnStack.slice(-9), next.stage]; next.stage = 14; break;
    case 'hurdle': {
      if (payload.taskId) item(d.tasks,payload.taskId);
      const record = payload.id ? item(d.hurdles,payload.id) : { id, createdAt: now };
      if (!payload.id && d.hurdles.length >= 100) fail(400,'item_limit','This case has reached 100 hurdles.');
      Object.assign(record,{ title: required(payload.title,200), taskId: payload.taskId || null, impact: required(payload.impact,4000), response: text(payload.response || '',4000), status: payload.status || 'open', updatedAt: now });
      if (!['open','resolved'].includes(record.status)) fail(400,'invalid_status','Choose a hurdle status.');
      if (record.status === 'resolved' && !record.response) fail(400,'response_required','Record how the hurdle was resolved.');
      if (!payload.id) d.hurdles.push(record);
      d.selectedHurdle = record.id; break;
    }
    case 'select_hurdle': item(d.hurdles,payload.id); d.selectedHurdle=payload.id; d.returnStack = [...d.returnStack.slice(-9), next.stage]; next.stage=16; break;
    case 'opportunity': {
      const record = payload.id ? item(d.opportunities,payload.id) : { id,createdAt:now };
      if (!payload.id && d.opportunities.length >= 100) fail(400,'item_limit','This case has reached 100 opportunities.');
      Object.assign(record,{ title: required(payload.title,200), value:text(payload.value || '',2000), measure:text(payload.measure || '',2000), action:text(payload.action || '',4000), selected:payload.selected === true, updatedAt:now });
      if (!payload.id) d.opportunities.push(record);
      d.selectedOpportunity=record.id; break;
    }
    case 'select_opportunity': item(d.opportunities,payload.id); d.selectedOpportunity=payload.id; d.returnStack = [...d.returnStack.slice(-9), next.stage]; next.stage=25; break;
    case 'decision': {
      if (!NEXT_MOVES.includes(payload.choice)) fail(400,'invalid_move','Choose a next move.');
      if (d.decisions.length >= 100) fail(400,'item_limit','This case has reached 100 decisions.');
      d.decisions.push({ id,choice:payload.choice,conditions:text(payload.conditions || '',4000),createdAt:now });
      next.stage = { 'Continue the current plan':21,'Adjust the plan':12,'Resolve a hurdle':16,'Pause pending information':21,'Review the outcome':23 }[payload.choice];
      if (payload.choice === 'Adjust the plan') d.planConfirmed=false;
      break;
    }
    case 'begin_revision':
      if (!REVISION_STAGES.includes(payload.stage)) fail(400,'invalid_revision','Choose a revision stage.');
      if (d.revision) fail(409,'revision_open','Review the current revision first.');
      d.revision={ origin:next.stage, target:payload.stage, changedStages:[], startedAt:now };
      next.stage=payload.stage; break;
    case 'finish_revision':
      if (!d.revision) fail(409,'no_revision','No revision is open.');
      next.stage=d.revision.origin;
      d.lastRevision={ ...d.revision, reviewedAt:now };
      d.revision=null; break;
    case 'close': {
      if (d.revision) fail(409,'revision_open','Review your revision before closing.');
      if (!d.planConfirmed) fail(409,'plan_unconfirmed','Review and confirm the current plan before closing.');
      if (!d.fields['23']?.outcome || !d.fields['23']?.outcomeEvidence) fail(400,'outcome_required','Record the outcome and supporting evidence.');
      const open = d.tasks.some(x=>x.status!=='complete') || d.hurdles.some(x=>x.status==='open');
      if (open && payload.acknowledgeOpen !== true) fail(400,'open_items','Confirm that remaining responsibilities are recorded before closing.');
      next.status='closed'; next.stage=23; d.closedAt=now; break;
    }
    case 'reopen':
      if (current.status!=='closed') fail(409,'not_closed','This case is already active.');
      next.status='active'; d.reopenedAt=now; break;
    case 'message': {
      const user=required(payload.message,8000),reply=required(payload.reply,16000);
      d.discussion=[...d.discussion,{id:id+'-u',role:'user',text:user,stage:next.stage,createdAt:now},{id:id+'-a',role:'assistant',text:reply,stage:next.stage,createdAt:now}].slice(-40);
      break;
    }
    default: fail(400,'invalid_action','Unsupported action.');
  }
  if (new TextEncoder().encode(JSON.stringify(next.document)).length > 262144) fail(413,'case_limit','This case has reached its record size limit.');
  return next;
}
