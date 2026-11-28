
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  act, activate, authorizeBeta, authorizeSignedBeta, betaError, clearSession, digest, issueInvitation,
  listInvitations, normalizeEmail, ownerIdentity, randomSecret, recordKey,
  requireId, resume, setCredentials, startVerification, store, time, validateBrowserKey, verifiedIdentity,
} from './_lib/executive-beta.js';

const origin = process.env.EXECUTIVE_BETA_ORIGIN || 'https://digitaljd.org';
const workspace = '/executive-beta/workspace';
const privateFields = ({id,email,status,issuedAt,inviteUntil,activatedAt,expiresAt,lastSeen,limit,used,day}) =>
  ({id,email,status:status==='active'&&expiresAt&&expiresAt<=time()?'expired':status,issuedAt,inviteUntil,activatedAt,expiresAt,lastSeen,limit,
    used:day===Math.floor(time()/86400)?used:0});
function integer(value,min,max) {
  if(!Number.isInteger(value)||value<min||value>max) throw betaError(400,'Enter a whole number between '+min+' and '+max+'.');
  return value;
}
async function owner(req) {
  const {user}=await verifiedIdentity(req);
  if(!ownerIdentity(user)) throw betaError(403,'Executive beta administration is restricted to the configured owner.');
  return user;
}
function invitationUrl(token) {return origin+'/executive-beta.html#invite='+token;}
async function ownerSession(req,res,publicKey) {
  const user=await owner(req);
  const registeredKey=validateBrowserKey(publicKey);
  const device=randomSecret(),session=randomSecret(),now=time();
  const id=requireId(user.id);
  await store().set(recordKey(id),JSON.stringify({
    id,email:normalizeEmail(user.email),status:'active',uid:user.id,owner:true,publicKey:registeredKey,device:digest(device),
    session:digest(session),sessionUntil:now+43200,activatedAt:now,lastSeen:now,limit:1000,used:0,
  }));
  setCredentials(res,id,device,session);
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const action=String(req.query?.action||'');
  let phase=action;
  try {
    if(action==='workspace'&&req.method==='GET') {
      try {await authorizeBeta(req);}
      catch(error) {
        if(error.status===401||error.status===403) return res.redirect(303,'/executive-beta.html');
        throw error;
      }
      const template=await readFile(join(process.cwd(),'executive-preview.html'),'utf8');
      return res.status(200).setHeader('Content-Type','text/html; charset=utf-8').send(
        template.replace('<html lang="en">','<html lang="en" data-executive-beta="true">')
          .replace('<head>','<head><base href="/">'));
    }
    if(req.method!=='POST') return res.status(405).json({error:'Method not allowed.'});
    if(req.headers.origin!==origin) throw betaError(403,'This request must come from Digital JD.');
    const body=req.body||{};
    if(action==='start') {
      await startVerification(body.invite);
      res.setHeader('Set-Cookie','__Host-djd-beta-pending='+body.invite+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800');
      return res.status(200).json({ok:true});
    }
    if(action==='activate') {
      const pending=String(req.headers.cookie||'').split(/;\s*/).find(cookie=>cookie.startsWith('__Host-djd-beta-pending='))?.slice('__Host-djd-beta-pending='.length);
      await activate(req,res,pending,body.publicKey);
      res.setHeader('Set-Cookie',[...res.getHeader('Set-Cookie'),'__Host-djd-beta-pending=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0']);
      return res.status(200).json({workspace});
    }
    if(action==='resume') {await resume(req,res);return res.status(200).json({workspace});}
    if(action==='owner') {await ownerSession(req,res,body.publicKey);return res.status(200).json({workspace});}
    if(action==='logout') {await authorizeSignedBeta(req,'logout','logout');clearSession(res);return res.status(200).json({ok:true});}
    if(action==='session') {
      const entry=await authorizeSignedBeta(req,'session');
      return res.status(200).json({id:entry.id,expiresAt:entry.expiresAt||null,owner:!!entry.owner});
    }
    if(action==='read-case') {
      const fields=await authorizeSignedBeta(req,'read-case','read-case');
      const entries=[];
      for(let i=0;Array.isArray(fields)&&i<fields.length;i+=2) entries.push([fields[i],fields[i+1]]);
      return res.status(200).json({entries});
    }
    if(action==='save-case') {
      const {key,value}=body;
      if(typeof key!=='string'||key.length>32768||typeof value!=='string'||value.length>120000) throw betaError(400,'Invalid case update.');
      await authorizeSignedBeta(req,'save-case','save-case',key,value);
      return res.status(200).json({ok:true});
    }
    if(action==='admin-list') {
      phase='admin-list:owner';
      await owner(req);
      phase='admin-list:storage';
      return res.status(200).json({invitations:(await listInvitations()).map(privateFields)});
    }
    if(action==='admin-issue') {
      await owner(req);
      const email=normalizeEmail(body.email);
      if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)) throw betaError(400,'Enter a valid tester email.');
      const {entry,token}=await issueInvitation(email,integer(body.limit??100,1,1000));
      return res.status(201).json({invitation:privateFields(entry),url:invitationUrl(token)});
    }
    if(['admin-revoke','admin-extend','admin-reset','admin-limit'].includes(action)) {
      await owner(req);
      const id=requireId(body.id);
      const command=action.slice(6);
      const secret=command==='reset'?randomSecret():null;
      const args=command==='extend'?[integer(body.days,1,365)]:command==='limit'?[integer(body.limit,1,1000)]:secret?[digest(secret)]:[];
      const entry=await act(id,command,...args);
      return res.status(200).json({invitation:privateFields(entry),...(secret?{url:invitationUrl(id+'.'+secret)}:{})});
    }
    return res.status(404).json({error:'Not found.'});
  } catch(error) {
    if(!error.status) {
      const frame=String(error.stack||'').split('\n').find(line=>line.trim().startsWith('at '))||'';
      const typeDetail=error.name==='TypeError'?(String(error.message).match(/^(Cannot read properties of (?:null|undefined) \(reading '[\w]+'\)|[\w.]+ is not a function|fetch failed|Invalid URL)/)?.[0]||''):'';
      console.error('[EXECUTIVE-BETA] '+phase+' '+error.name+' '+typeDetail+' '+frame.trim());
    }
    return res.status(error.status||503).json({error:error.status?error.message:'Executive beta service is temporarily unavailable.'});
  }
}
