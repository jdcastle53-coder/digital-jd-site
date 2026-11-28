
import { createHash, createPublicKey, randomBytes, randomUUID, verify } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

export const DAYS = 86400;
export const deviceCookie = '__Host-djd-beta-device';
export const sessionCookie = '__Host-djd-beta-session';
const root = 'djd:exec-beta:v1:';
const secretPattern = /^[A-Za-z0-9_-]{43}$/;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const randomSecret = () => randomBytes(32).toString('base64url');
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const time = () => Math.floor(Date.now()/1000);
export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
export const betaError = (status, message) => Object.assign(new Error(message), { status });

let redis;
let identity;
export function store() {
  const url=process.env.KV_REST_API_URL, token=process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw betaError(503,'Executive beta storage is unavailable.');
  return redis ||= new Redis({url,token,automaticDeserialization:false});
}
function supabase() {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw betaError(503,'Account verification is unavailable.');
  return identity ||= createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function verifiedIdentity(req) {
  const token=/^Bearer ([^ ]+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) throw betaError(401,'Sign in to continue.');
  const {data,error}=await supabase().auth.getUser(token);
  if(error||!data?.user?.email_confirmed_at) throw betaError(401,'A verified email account is required.');
  let claims;
  try { claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')); }
  catch { throw betaError(401,'Invalid account session.'); }
  return {user:data.user,claims};
}
export function ownerIdentity(user) {
  const id = process.env.EXECUTIVE_OWNER_USER_ID;
  const email = normalizeEmail(process.env.EXECUTIVE_OWNER_EMAIL);
  return Boolean(user?.email_confirmed_at && (id ? user.id===id :
    email && normalizeEmail(user.email)===email));
}
export const recordKey = (id) => root+'invite:'+id;
const keyForEmail = email => root+'email:'+digest(email);
const listKey = root+'invitations';
function parse(result) {
  if(!result) return null;
  return typeof result==='string' ? JSON.parse(result) : result;
}
export function requireId(id) {
  if(typeof id!=='string'||!idPattern.test(id)) throw betaError(400,'Invalid invitation.');
  return id;
}
function split(value) {
  if(typeof value!=='string') return null;
  const [id,secret,extra]=value.split('.');
  return !extra && idPattern.test(id||'') && secretPattern.test(secret||'') ? {id,secret} : null;
}
function cookie(req,name) {
  return String(req.headers.cookie||'').split(/;\s*/).find(v=>v.startsWith(name+'='))?.slice(name.length+1);
}
export function isBetaRequest(req) {
  return req.headers['x-djd-executive-beta']==='1' || Boolean(cookie(req,sessionCookie) && !req.headers.authorization);
}
export function setCredentials(res,id,device,session) {
  const attributes='; Path=/; HttpOnly; Secure; SameSite=Strict';
  const headers=[];
  if(device) headers.push(deviceCookie+'='+id+'.'+device+attributes+'; Max-Age=31536000');
  headers.push(sessionCookie+'='+id+'.'+session+attributes+'; Max-Age=43200');
  res.setHeader('Set-Cookie',headers);
}
export function clearSession(res) {
  res.setHeader('Set-Cookie',sessionCookie+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}
const create = /* lua */ `
if redis.call('EXISTS',KEYS[1])==1 or redis.call('EXISTS',KEYS[2])==1 then return 0 end
redis.call('SET',KEYS[1],ARGV[2])
redis.call('SET',KEYS[2],ARGV[1])
redis.call('ZADD',KEYS[3],ARGV[3],ARGV[2])
return 1
`;


export async function issueInvitation(email, limit) {
  const id=randomUUID(), secret=randomSecret(), now=time();
  const entry={id,email,issuedAt:now,inviteUntil:now+7*DAYS,days:30,limit,invite:digest(secret),status:'pending',used:0};
  const inserted=await store().eval(create,[keyForEmail(email),recordKey(id),listKey],[JSON.stringify(entry),id,now]);
  if(Number(inserted)!==1) throw betaError(409,'This tester already has an invitation. Use Reset to replace it.');
  return {entry,token:id+'.'+secret};
}
const listRecords = /* lua */ `
local records={}
for _,id in ipairs(redis.call('ZREVRANGE',KEYS[1],0,199)) do
 local record=redis.call('GET',ARGV[1]..id)
 if record then table.insert(records,record) end
end
return records
`;
export async function listInvitations() {
  return (await store().eval(listRecords,[listKey],[root+'invite:'])).map(parse);
}
export async function getInvitation(id) {return parse(await store().get(recordKey(requireId(id))));}

const transaction = /* lua */ `
local raw=redis.call('GET',KEYS[1])
if not raw then return {'missing'} end
local item=cjson.decode(raw)
local action=ARGV[1]
local now=tonumber(ARGV[2])
local function save() redis.call('SET',KEYS[1],cjson.encode(item)) end
if action=='extend' then
 if item.status=='revoked' then return {'denied'} end
 if item.status=='pending' then item.days=item.days+tonumber(ARGV[3]); item.inviteUntil=math.max(item.inviteUntil,now)+tonumber(ARGV[3])*86400
 else item.expiresAt=math.max(item.expiresAt,now)+tonumber(ARGV[3])*86400 end
 save(); return {'ok',cjson.encode(item)}
end
if action=='revoke' then
 item.status='revoked'; item.session=nil; item.revokedAt=now; save(); return {'ok',cjson.encode(item)}
end
if action=='reset' then
 item.status='pending'; item.invite=ARGV[3]; item.inviteUntil=now+7*86400; item.issuedAt=now
 item.days=30; item.device=nil; item.session=nil; item.uid=nil; item.expiresAt=nil; item.lastVerification=nil; item.revokedAt=nil; item.activatedAt=nil; item.lastSeen=nil
 save(); return {'ok',cjson.encode(item)}
end
if action=='limit' then item.limit=tonumber(ARGV[3]); save(); return {'ok',cjson.encode(item)} end
if action=='start' or action=='activate' then
 if item.status~='pending' or item.invite~=ARGV[3] or item.inviteUntil<=now then return {'denied'} end
 if action=='start' then
  if item.lastVerification and item.lastVerification+60>now then return {'limited'} end
  item.lastVerification=now; save(); return {'ok',cjson.encode(item)}
 end
 if not item.lastVerification or item.lastVerification+1800<now or tonumber(ARGV[4])<item.lastVerification-5 or tonumber(ARGV[4])>now+30 then return {'verify'} end
 if item.email~=ARGV[5] then return {'verify'} end
 item.status='active'; item.invite=nil; item.activatedAt=now; item.expiresAt=now+item.days*86400
 item.uid=ARGV[6]; item.device=ARGV[7]; item.session=ARGV[8]; item.publicKey=cjson.decode(ARGV[9]); item.sessionUntil=now+43200; item.lastSeen=now
 save(); return {'ok',cjson.encode(item)}
end
if item.status~='active' or (item.expiresAt and item.expiresAt<=now) or item.device~=ARGV[3] then return {'denied'} end
if action=='resume' then
 item.session=ARGV[4]; item.sessionUntil=now+43200; item.lastSeen=now; save()
 return {'ok',cjson.encode(item)}
end
if item.session~=ARGV[4] or item.sessionUntil<=now then return {'session'} end
if action=='logout' then item.session=nil; save(); return {'ok',cjson.encode(item)} end
if action=='usage' then
 local day=math.floor(now/86400)
 if item.day~=day then item.day=day; item.used=0 end
 if item.used>=item.limit then return {'limited'} end
 item.used=item.used+1
end
if action=='read-case' then return {'case',cjson.encode(redis.call('HGETALL',KEYS[2]))} end
if action=='save-case' then
 if ARGV[6]=='' then redis.call('HDEL',KEYS[2],ARGV[5])
 elseif redis.call('HEXISTS',KEYS[2],ARGV[5])==0 and redis.call('HLEN',KEYS[2])>=5000 then return {'storage'}
 else redis.call('HSET',KEYS[2],ARGV[5],ARGV[6]) end
 return {'ok'}
end
item.lastSeen=now; save(); return {'ok',cjson.encode(item)}
`;
export async function act(id, action, ...args) {
  const result=await store().eval(transaction,[recordKey(requireId(id)),root+'case-data:'+id],[action,time(),...args]);
  const [code,data]=result;
  if(code==='ok'||code==='case') return parse(data);
  if(code==='limited') throw betaError(429,action==='start'?'Wait one minute before requesting another email.':'Your Executive beta AI limit has been reached for today.');
  if(code==='verify') throw betaError(403,'Open the verification email for the assigned address in this browser.');
  if(code==='storage') throw betaError(409,'This beta workspace has reached its storage limit.');
  if(code==='session') throw betaError(401,'Resume in your registered browser to continue.');
  throw betaError(403,'This invitation or browser is not registered for active Executive beta access.');
}
export async function startVerification(token) {
  const invite=split(token);
  if(!invite) throw betaError(400,'Open your individual invitation link first.');
  const entry=await act(invite.id,'start',digest(invite.secret));
  const url=process.env.EXECUTIVE_BETA_ORIGIN || 'https://digitaljd.org';
  const {error}=await supabase().auth.signInWithOtp({
    email:entry.email,options:{emailRedirectTo:url+'/executive-beta.html?verify=1'}
  });
  if(error) throw betaError(503,'Verification email could not be sent. Wait a minute and try again.');
}
export async function activate(req,res,token,publicKey) {
  const key=validateBrowserKey(publicKey);
  const invite=split(token);
  if(!invite) throw betaError(400,'Open your individual invitation link first.');
  const {user,claims}=await verifiedIdentity(req);
  const times=(Array.isArray(claims.amr)?claims.amr:[])
    .filter(x=>['otp','magiclink','email/signup'].includes(x.method) && Number.isInteger(x.timestamp))
    .map(x=>x.timestamp);
  const verifiedAt=Math.max(0,...times);
  if(!verifiedAt) throw betaError(403,'Use the link in your verification email first.');
  const device=randomSecret(), session=randomSecret();
  await act(invite.id,'activate',digest(invite.secret),verifiedAt,normalizeEmail(user.email),user.id,digest(device),digest(session),JSON.stringify(key));
  setCredentials(res,invite.id,device,session);
}
export function validateBrowserKey(key) {
  if(key?.kty!=='EC'||key.crv!=='P-256'||!secretPattern.test(key.x||'')||!secretPattern.test(key.y||'')||key.d) {
    throw betaError(400,'A valid browser credential is required.');
  }
  const publicKey={kty:'EC',crv:'P-256',x:key.x,y:key.y};
  try { createPublicKey({key:publicKey,format:'jwk'}); } catch { throw betaError(400,'Invalid browser credential.'); }
  return publicKey;
}
async function proveBrowser(req, device, purpose) {
  const timestamp=String(req.headers['x-djd-beta-time']||'');
  const nonce=String(req.headers['x-djd-beta-nonce']||'');
  const signature=String(req.headers['x-djd-beta-proof']||'');
  if (!/^\d{10}$/.test(timestamp) || Math.abs(time()-Number(timestamp))>90 || !idPattern.test(nonce) || !/^[A-Za-z0-9_-]{86}$/.test(signature)) {
    throw betaError(403,'This browser has not proved its registered credential.');
  }
  const entry=await getInvitation(device.id);
  if(!entry?.publicKey || entry.status!=='active' || entry.device!==digest(device.secret)) throw betaError(403,'Unregistered browser.');
  const message=[purpose,timestamp,nonce,digest(JSON.stringify(req.body??{}))].join('\n');
  const key=createPublicKey({key:entry.publicKey,format:'jwk'});
  if(!verify('sha256',Buffer.from(message),{key,dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url'))) throw betaError(403,'Unregistered browser.');
  const accepted=await store().set(root+'proof:'+device.id+':'+nonce,'1',{nx:true,ex:190});
  if(!accepted) throw betaError(403,'This browser proof was already used. Try again.');
}
export async function resume(req,res) {
  const device=split(cookie(req,deviceCookie));
  if(!device) throw betaError(403,'This browser is not registered. Use your original browser or request an administrator reset.');
  await proveBrowser(req,device,'resume');
  const session=randomSecret();
  await act(device.id,'resume',digest(device.secret),digest(session));
  setCredentials(res,device.id,null,session);
}
export async function authorizeBeta(req,action='access',...args) {
  const device=split(cookie(req,deviceCookie)),session=split(cookie(req,sessionCookie));
  if(!device||!session||device.id!==session.id) throw betaError(401,'Active Executive beta access is required in the registered browser.');
  return act(device.id,action,digest(device.secret),digest(session.secret),...args);
}
export async function authorizeSignedBeta(req,purpose,action='access',...args) {
  const device=split(cookie(req,deviceCookie));
  if(!device) throw betaError(401,'Use your registered Executive beta browser.');
  await proveBrowser(req,device,purpose);
  return authorizeBeta(req,action,...args);
}
export async function gatewayBeta(req) {
  try {
    const purpose=new URL(req.url,'https://digitaljd.org').pathname;
    const entry=await authorizeSignedBeta(req,purpose,'usage');
    return {ok:true,userId:entry.uid,plan:'executive',trial:false,beta:true};
  } catch(error) {
    return {ok:false,status:error.status||503,code:'beta_access_denied',message:error.status?error.message:'Executive beta access is temporarily unavailable.'};
  }
}
