
let database;
const encoder = new TextEncoder();
function openDatabase() {
  if(!database) database=new Promise((resolve,reject)=>{
    const request=indexedDB.open('digital-jd-executive-beta',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('credentials');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('This browser must allow site data to use the Executive beta.'));
  });
  return database;
}
async function existingKey() {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const request=db.transaction('credentials').objectStore('credentials').get('browser');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
let creating;
export async function registerBrowserKey() {
  if(!creating) creating=(async()=>{
    const existing=await existingKey();
    if(existing)return existing.publicKey;
    const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
    const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
    const db=await openDatabase();
    try {
      await new Promise((resolve,reject)=>{
        const transaction=db.transaction('credentials','readwrite');
        transaction.objectStore('credentials').add({privateKey:pair.privateKey,publicKey},'browser');
        transaction.oncomplete=resolve;
        transaction.onerror=()=>reject(transaction.error);
        transaction.onabort=()=>reject(transaction.error);
      });
      return publicKey;
    } catch(error) {
      const concurrent=await existingKey();
      if(concurrent)return concurrent.publicKey;
      throw error;
    }
  })();
  return creating;
}
export async function signedBetaHeaders(purpose,body) {
  const key=await existingKey();
  if(!key)throw Error('This browser is not registered. Open the original browser or request an administrator reset.');
  const timestamp=Math.floor(Date.now()/1000).toString();
  const nonce=crypto.randomUUID();
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(body??{})));
  const hex=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
  const message=[purpose,timestamp,nonce,hex].join('\n');
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.privateKey,encoder.encode(message));
  const encoded=btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return {'X-DJD-Beta-Time':timestamp,'X-DJD-Beta-Nonce':nonce,'X-DJD-Beta-Proof':encoded};
}
