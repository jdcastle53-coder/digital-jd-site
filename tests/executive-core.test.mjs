import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, CaseError } from '../api/_lib/executive-core.mjs';
import { NEXT_MOVES, REVISION_STAGES, STAGES } from '../executive-flow.mjs';
const opts = { id:'11111111-1111-4111-8111-111111111111', now:'2026-11-17T12:00:00Z' };
const run = (c,a,p={}) => applyCommand(c,a,p,opts);
const fresh = () => run(null,'create',{title:'Growth case'});
const save = (c,stage,fields) => run(c,'save',{stage,fields});
const ready = () => run(save(save(fresh(),2,{objective:'Reduce delays'}),12,{plan:'Assign owners; review weekly'}),'confirm_plan');
const outcome = c => save(c,23,{outcome:'Reduced delays',outcomeEvidence:'Measured lead time before and after'});
const rejects = (fn,code) => assert.throws(fn,e=>e instanceof CaseError && e.code===code);

test('case creation and failed mutations leave independent records untouched',()=>{
  const a=fresh(),b=fresh();
  const changed=save(a,2,{objective:'Only case A'});
  assert.equal(a.document.fields['2'],undefined);
  assert.equal(b.document.fields['2'],undefined);
  assert.equal(changed.document.fields['2'].objective,'Only case A');
  rejects(()=>save(a,2,{owner_id:'other user'}),'unknown_field');
  assert.deepEqual(a,fresh());
});
test('stage and choice boundaries reject invalid or undeclared input',()=>{
  for(const stage of [0,26,1.5,'2']) rejects(()=>run(fresh(),'navigate',{stage}),'invalid_stage');
  rejects(()=>save(fresh(),3,{depth:'Whatever'}),'invalid_depth');
  rejects(()=>save(fresh(),6,{clarity:'11'}),'invalid_clarity');
  assert.equal(save(fresh(),6,{clarity:'10'}).document.fields['6'].clarity,'10');
  assert.equal(STAGES.length,25);
});
test('task completion needs evidence, valid dates, and an item belonging to the case',()=>{
  const base=fresh();
  rejects(()=>run(base,'task',{title:'Ship',status:'complete'}),'evidence_required');
  rejects(()=>run(base,'task',{title:'Ship',due:'2026-02-30'}),'invalid_date');
  const added=run(base,'task',{title:'Ship',due:'2028-02-29'});
  rejects(()=>run(base,'select_task',{id:opts.id}),'item_not_found');
  const selected=run(added,'select_task',{id:opts.id});
  assert.equal(selected.stage,14);
  assert.equal(run(selected,'return').stage,1);
  const done=run(added,'task',{id:opts.id,title:'Ship',status:'complete',evidence:'Acceptance recorded'});
  assert.equal(done.document.tasks[0].status,'complete');
});
test('hurdles cannot refer to another case task or resolve without a response',()=>{
  rejects(()=>run(fresh(),'hurdle',{title:'Delay',impact:'Cannot ship',taskId:opts.id}),'item_not_found');
  rejects(()=>run(fresh(),'hurdle',{title:'Delay',impact:'Cannot ship',status:'resolved'}),'response_required');
  const c=run(fresh(),'hurdle',{title:'Delay',impact:'Cannot ship'});
  assert.equal(run(c,'select_hurdle',{id:opts.id}).stage,16);
});
test('all five decision choices have their intended destinations',()=>{
  const destinations=[21,12,16,21,23];
  NEXT_MOVES.forEach((choice,index)=>assert.equal(run(ready(),'decision',{choice}).stage,destinations[index]));
  rejects(()=>run(ready(),'decision',{choice:'Unknown'}),'invalid_move');
});
test('each revision returns to its originating assessment and records changed stages',()=>{
  for(const stage of REVISION_STAGES){
    let c=run(ready(),'navigate',{stage:19});
    c=run(c,'begin_revision',{stage});
    assert.equal(c.stage,stage);
    rejects(()=>run(c,'begin_revision',{stage:2}),'revision_open');
    c=save(c,2,{objective:'Revised goal'});
    c=run(c,'finish_revision');
    assert.equal(c.stage,19);
    assert.equal(c.document.planConfirmed,false);
    assert.deepEqual(c.document.lastRevision.changedStages,[2]);
  }
});
test('closure requires confirmed plan, outcome evidence, and acknowledgement of open responsibilities',()=>{
  rejects(()=>run(outcome(fresh()),'close'),'plan_unconfirmed');
  rejects(()=>run(ready(),'close'),'outcome_required');
  let c=run(outcome(ready()),'task',{title:'Outstanding action'});
  rejects(()=>run(c,'close'),'open_items');
  const closed=run(c,'close',{acknowledgeOpen:true});
  assert.equal(closed.status,'closed');
  rejects(()=>save(closed,23,{outcome:'Overwrite'}),'case_closed');
  assert.equal(run(closed,'reopen').status,'active');
  assert.equal(c.status,'active');
});
test('revised plan cannot be silently treated as confirmed',()=>{
  const c=save(outcome(ready()),12,{plan:'Changed approach'});
  rejects(()=>run(c,'close'),'plan_unconfirmed');
});
test('discussion is bounded and isolated from other cases',()=>{
  let c=fresh();
  for(let i=0;i<30;i++) c=run(c,'message',{message:'Question '+i,reply:'Reply '+i});
  assert.equal(c.document.discussion.length,40);
  assert.equal(c.document.discussion[0].text,'Question 10');
  assert.equal(fresh().document.discussion.length,0);
});
test('repeated quick navigation retains a bounded return history',()=>{
  let c=run(fresh(),'task',{title:'Review'});
  for(let i=0;i<40;i++) c=run(c,'select_task',{id:opts.id});
  assert.equal(c.document.returnStack.length,10);
});
test('case item and document limits fail before modifying the supplied record',()=>{
  const c=fresh();
  c.document.tasks=Array.from({length:100},(_,i)=>({id:String(i),title:'Task',status:'open'}));
  rejects(()=>run(c,'task',{title:'Overflow'}),'item_limit');
  const big=fresh();
  big.document.discussion=Array.from({length:40},()=>({text:'x'.repeat(8000)}));
  rejects(()=>run(big,'navigate',{stage:2}),'case_limit');
  assert.equal(big.stage,1);
});
