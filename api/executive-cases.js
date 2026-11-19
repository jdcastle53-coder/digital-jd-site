import { createClient } from '@supabase/supabase-js';
import { createExecutiveHandler } from './_lib/executive-handler.mjs';
import { fail } from './_lib/executive-core.mjs';
function checked(result) { if (result.error) throw new Error('Storage operation failed'); return result.data; }
export default createExecutiveHandler({
  connect: async authorization => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) throw new Error('Storage configuration missing');
    const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    return {
      authenticate: async()=>{ const {data,error}=await db.auth.getUser(authorization.slice(7)); return error ? null : data.user; },
      entitled: async userId=>{
        const row=checked(await db.from('jd_executive_entitlements').select('user_id,valid_until').eq('user_id',userId).maybeSingle());
        return !!row && (!row.valid_until || Date.parse(row.valid_until)>Date.now());
      },
      list: async userId=>checked(await db.from('jd_executive_cases').select('id,title,stage,status,version,updated_at').eq('user_id',userId).order('updated_at',{ascending:false}).limit(100)),
      get: async(userId,id)=>checked(await db.from('jd_executive_cases').select('*').eq('user_id',userId).eq('id',id).maybeSingle()),
      request: async(userId,id)=>checked(await db.from('jd_executive_events').select('fingerprint,saved_case').eq('user_id',userId).eq('request_id',id).maybeSingle()),
      write: async args=>{
        const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) throw new Error('Case write configuration missing');
        const writer=createClient(process.env.SUPABASE_URL,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
        const {data,error}=await writer.rpc('jd_exec_write',{p_user_id:args.userId,p_case_id:args.caseId,p_expected_version:args.expectedVersion,p_request_id:args.requestId,p_fingerprint:args.fingerprint,p_action:args.action,p_next:args.next});
        if(error){
          if(error.message==='version_conflict') fail(409,'version_conflict','This case changed in another window. Reload before saving.');
          if(error.message==='request_reused') fail(409,'request_reused','Use a new request identifier for this change.');
          if(error.message==='access_denied') fail(403,'access_required','Executive access is required.');
          throw new Error('Case transaction failed');
        }
        return data;
      }
    };
  },
  log: entry=>console.info(JSON.stringify(entry))
});
