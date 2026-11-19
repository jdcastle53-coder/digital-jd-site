import { createHash, randomUUID } from 'node:crypto';
import { applyCommand, CaseError, uuid, fail } from './executive-core.mjs';
const actions = new Set(['create','save','navigate','return','confirm_plan','task','select_task','hurdle','select_hurdle','opportunity','select_opportunity','decision','begin_revision','finish_revision','close','reopen']);
export function createExecutiveHandler({ connect, log = () => {} }) {
  return async function handler(req,res) {
    const started=Date.now(), requestLogId=randomUUID();
    res.setHeader('Cache-Control','no-store');
    let status=500;
    try {
      if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); fail(405,'method','Method not allowed.'); }
      const authorization=req.headers?.authorization;
      if (typeof authorization!=='string' || !/^Bearer \S+$/.test(authorization)) fail(401,'unauthorized','Sign in to continue.');
      const store=await connect(authorization);
      const user=await store.authenticate();
      if (!user?.id) fail(401,'unauthorized','Sign in to continue.');
      if (!await store.entitled(user.id)) fail(403,'access_required','Executive access has not been enabled for this account.');
      let result;
      if (req.method==='GET') {
        const caseId=req.query?.caseId;
        if (caseId && !uuid(caseId)) fail(400,'invalid_id','Choose a valid case.');
        result=caseId ? await store.get(user.id,caseId) : await store.list(user.id);
        if (caseId && !result) fail(404,'case_not_found','Case not found.');
      } else {
        let body=req.body;
        if (typeof body==='string') { try { body=JSON.parse(body); } catch { fail(400,'invalid_json','Invalid request.'); } }
        if (!body || typeof body!=='object' || Array.isArray(body)) fail(400,'invalid_request','Invalid request.');
        if (Buffer.byteLength(JSON.stringify(body),'utf8')>280000) fail(413,'request_limit','Request is too large.');
        const {action,caseId,expectedVersion,requestId,payload={}}=body;
        if (!actions.has(action)) fail(400,'invalid_action','Unsupported action.');
        if (!uuid(caseId) || !uuid(requestId)) fail(400,'invalid_id','Invalid case or request identifier.');
        if (!Number.isInteger(expectedVersion) || expectedVersion<0) fail(400,'invalid_version','Invalid record version.');
        const fingerprint=createHash('sha256').update(JSON.stringify({action,caseId,expectedVersion,payload})).digest('hex');
        const current=await store.get(user.id,caseId);
        const previous=await store.request(user.id,requestId);
        if (previous) {
          if (previous.fingerprint!==fingerprint) fail(409,'request_reused','Use a new request identifier for this change.');
          result=previous.saved_case;
        } else {
          if (action!=='create' && !current) fail(404,'case_not_found','Case not found.');
          if ((current?.version || 0)!==expectedVersion) fail(409,'version_conflict','This case changed in another window. Reload before saving.');
          const next=applyCommand(current,action,payload,{id:randomUUID()});
          result=await store.write({userId:user.id,caseId,expectedVersion,requestId,fingerprint,action,next});
        }
      }
      status=200; return res.status(status).json({data:result});
    } catch(error) {
      status=error instanceof CaseError ? error.status : 503;
      return res.status(status).json({error:error instanceof CaseError ? error.message : 'Case storage is unavailable. Your change was not confirmed.',code:error instanceof CaseError ? error.code : 'storage_unavailable'});
    } finally { try { log({component:'executive_cases',action:req.method,requestId:requestLogId,status,duration:Date.now()-started}); } catch {} }
  };
}
