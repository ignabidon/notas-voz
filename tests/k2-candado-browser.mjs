// K2 · candado universal y fallos (17/11/2026). Chrome aislado, copia fija de formato 1 y datos totalmente inventados.
// Cubre: dos pestañas reales sin bóveda (la segunda no escribe nada), limpieza solo con el candado, lote alterado o ajeno,
// fallos de cuota en cada fase (IndexedDB y localStorage), corte real del navegador (recarga) durante la importación
// y después de la cabecera, y confirmación clara cuando falla algo tras escribir la cabecera.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const html=()=>readFileSync(new URL('../index.html',import.meta.url));
const servers=[];
// Cada servidor (puerto) es un origen distinto: almacenamiento totalmente independiente.
async function newOrigin(){
  const s=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html());});
  await new Promise(r=>s.listen(0,'127.0.0.1',r));servers.push(s);
  return 'http://127.0.0.1:'+s.address().port+'/';
}
const profile=mkdtempSync(tmpdir()+'/dictavoz-k2c-');
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank']);
const PASS='frase de prueba inventada 901';
const bytes=readFileSync(new URL('./copia-formato-1.dictanota',import.meta.url));
const V1="new Blob([Uint8Array.from(atob("+JSON.stringify(bytes.toString('base64'))+"),x=>x.charCodeAt(0))])";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
try{
  const endpoint=await new Promise((resolve,reject)=>{
    let log='';const timer=setTimeout(()=>reject(Error('Chrome timeout: '+log)),30000);
    chrome.on('error',reject);chrome.stderr.on('data',d=>{
      log+=d;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);
      if(m){clearTimeout(timer);resolve(m[1]);}
    });
  });
  ws=new WebSocket(endpoint);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let seq=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
  // Abre una pestaña real (mismo navegador, mismo perfil) y devuelve sus herramientas.
  async function openTab(url){
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const call=(method,params={})=>send(method,params,sessionId);
    const run=async expression=>{
      const m=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(m.exceptionDetails)throw Error(JSON.stringify(m.exceptionDetails));
      return m.result.value;
    };
    await call('Page.enable');await call('Runtime.enable');
    const tab={targetId,call,run,
      async ready(){
        // K2 puede recargar de nuevo la página justo entre la primera comprobación
        // y la espera del candado: repetir ambas en el mismo bucle, sin dar por
        // inicializada una pestaña por una lectura de su contexto anterior.
        let acquired=false;
        for(let i=0;i<150;i++){
          try{
            if(await run('document.readyState==="complete" && typeof k2RestoreEmpty==="function" && typeof vaultTabLockP!=="undefined" && (vaultTabLockP!==null||vault.state==="locked")')){
              await run('vaultTabLockP');   // la pestaña bloqueada no escribe hasta abrir la bóveda
              acquired=true;break;
            }
          }catch(e){}  // el contexto pudo cambiar por una recarga interna de K2
          await sleep(100);
        }
        if(!acquired)throw Error('DictaVoz no inició o no tomó el candado en '+url);
        for(let i=0;i<50;i++){   // limpieza de arranque (k2ResumeCleanup): el lote desaparece si esta pestaña tiene el candado
          if(await run('vault.otherTab||vault.state==="locked"&&vaultTabLockP===null&&!localStorage.getItem(K2_JOURNAL)||!localStorage.getItem(K2_JOURNAL)'))break;await sleep(100);
        }
        await sleep(100);
      },
      async go(u){await call('Page.navigate',{url:u});await tab.ready();},
      async reload(){await call('Page.reload',{ignoreCache:true});await tab.ready();},
      close:()=>send('Target.closeTarget',{targetId})};
    await tab.go(url);
    return tab;
  }
  const json=async(tab,body)=>JSON.parse(await tab.run('(async()=>{'+body+'})()'));
  const state=tab=>json(tab,'return JSON.stringify({empty:await k2StorageEmpty(),journal:localStorage.getItem(K2_JOURNAL),'+
    'header:localStorage.getItem(VAULT_HEADER)!==null,audios:(await anListMeta(await anDb())).length,'+
    'keys:Object.keys(localStorage).filter(k=>k.startsWith("notasvoz.")).sort()});');

  /* ── 1. Dos pestañas reales sin bóveda ─────────────────────────────── */
  const o1=await newOrigin();
  const A=await openTab(o1);
  assert.equal(await A.run('vault.state'),'off');
  assert.equal(await A.run('vault.otherTab'),false,'la primera pestaña escribe');
  const B=await openTab(o1);
  const b=await json(B,
    'const r={otherTab:vault.otherTab,readOnly:vault.readOnly,warn:!document.getElementById("tabLockWarn").hidden};'+
    'try{vaultStore.setItem("notasvoz.gamma.draft.v1","borrador ficticio B");r.set="escribió"}catch(e){r.set=e.name}'+
    'try{vaultStore.removeItem("notasvoz.gamma.v1");r.remove="borró"}catch(e){r.remove=e.name}'+
    'r.cfg=saveCfg();r.draft=await saveDraft();r.audio=await anLockOk();'+
    'try{await k2RestoreEmpty('+V1+',"'+PASS+'");r.k2="restauró"}catch(e){r.k2=e.message}'+
    'return JSON.stringify(r);');
  assert.equal(b.otherTab,true);assert.equal(b.readOnly,true);assert.equal(b.warn,true);
  assert.equal(b.set,'OtraPestana');assert.equal(b.remove,'OtraPestana');
  assert.equal(b.cfg,false);assert.equal(b.draft,false);assert.equal(b.audio,false);
  assert.match(b.k2,/Cerrá las otras pestañas/);
  // A (la que escribe) puede haber guardado su borrador vacío de arranque; de B no debe haber nada.
  assert.deepEqual(JSON.parse(await A.run('JSON.stringify(Object.keys(localStorage).filter(k=>k.startsWith("notasvoz.")&&!(k===DRAFT&&k2DraftEmpty(localStorage.getItem(k)))))')),[],'la segunda pestaña no dejó nada escrito');
  // Simultaneidad: A restaura mientras B intenta escribir sin parar. B no logra escribir nada.
  await B.run('window.__intentos=0;window.__escritas=0;window.__t=setInterval(()=>{window.__intentos++;'+
    'try{vaultStore.setItem("notasvoz.gamma.draft.v1","borrador ficticio B "+Date.now());window.__escritas++}catch(e){}'+
    'try{localStorage.getItem("x");saveCfg()&&window.__escritas++}catch(e){}},5)');
  const ra=await json(A,'const r=await k2RestoreEmpty('+V1+',"'+PASS+'");return JSON.stringify({audios:r.audios,notas:r.notas});');
  await sleep(100);
  const bw=await json(B,'clearInterval(window.__t);return JSON.stringify({intentos:window.__intentos,escritas:window.__escritas});');
  assert.equal(ra.audios,1);assert.equal(ra.notas,2);
  assert.ok(bw.intentos>5,'B intentó escribir durante la restauración');
  assert.equal(bw.escritas,0,'B no escribió nada');
  const afterA=await state(A);
  assert.equal(afterA.header,true);assert.equal(afterA.journal,null);
  assert.equal(await A.run('localStorage.getItem(DRAFT)'),null,'ningún borrador en claro junto a la bóveda (ni de A ni de B)');
  await A.close();await B.close();

  /* ── 2. Limpieza solo con el candado ─────────────────────────────────── */
  const o2=await newOrigin();
  const C=await openTab(o2);
  const plant='const db=await anDb(),id="audio-lote-ficticio",m=anNewMeta(id,1700000000000,"importando");'+
    'await anPutMeta(db,m);await anPutChunk(db,id,0,0,new Blob(["audio inventado"]));'+
    'localStorage.setItem(VAULT_REC_PREFIX+"borrador","registro de ensayo");'+
    'localStorage.setItem(K2_JOURNAL,JSON.stringify({version:2,audios:[{id,createdAt:m.createdAt,bytes:m.bytes}],names:["borrador"]}));'+
    'return JSON.stringify(true);';
  await json(C,plant);
  const D=await openTab(o2);   // arranca sin candado: su limpieza de arranque no debe tocar el lote
  const d=await json(D,'let k2="";try{await k2RestoreEmpty('+V1+',"'+PASS+'")}catch(e){k2=e.message}'+
    'let rb="";try{await k2Rollback();rb="limpió"}catch(e){rb=e.message}'+
    'return JSON.stringify({k2,rb,otherTab:vault.otherTab});');
  assert.equal(d.otherTab,true);
  assert.match(d.k2,/Cerrá las otras pestañas/);
  assert.match(d.rb,/Sin el candado/);
  let s=await state(D);
  assert.notEqual(s.journal,null,'el lote sigue intacto');assert.equal(s.audios,1);
  await C.close();await sleep(200);
  await D.reload();   // ahora D toma el candado y limpia el lote al arrancar
  s=await state(D);
  assert.equal(s.journal,null);assert.equal(s.audios,0);assert.equal(s.empty,true);

  /* ── 3. Lote alterado o ajeno: no se toca nada ───────────────────────── */
  const tamper=async(journalExpr,metaCreatedAt)=>json(D,
    'const db=await anDb(),id="audio-ajeno-ficticio",m=anNewMeta(id,'+metaCreatedAt+',"importando");'+
    'await anPutMeta(db,m);await anPutChunk(db,id,0,0,new Blob(["audio inventado"]));'+
    'localStorage.setItem(VAULT_REC_PREFIX+"borrador","registro de ensayo");'+
    'localStorage.setItem(K2_JOURNAL,JSON.stringify('+journalExpr+'));'+
    'let msg="";try{await k2Rollback();msg="limpió"}catch(e){msg=e.message}'+
    'const r={msg,meta:!!(await anGetMeta(db,id)),chunks:await anCountChunks(db,id),rec:localStorage.getItem(VAULT_REC_PREFIX+"borrador")!==null};'+
    'await anDelete(db,id);localStorage.removeItem(VAULT_REC_PREFIX+"borrador");localStorage.removeItem(K2_JOURNAL);'+
    'return JSON.stringify(r);');
  const cases={
    'versión vieja':'{version:1,ids:[id],names:["borrador"]}',
    'IDs repetidos':'{version:2,audios:[{id,createdAt:1,bytes:0},{id,createdAt:1,bytes:0}],names:[]}',
    'registro desconocido':'{version:2,audios:[],names:["../otra-cosa"]}',
    'firma distinta':'{version:2,audios:[{id,createdAt:999,bytes:0}],names:["borrador"]}',
    'no es JSON de lote':'"texto cualquiera"'};
  for(const [name,expr] of Object.entries(cases)){
    const r=await tamper(expr,1);
    assert.notEqual(r.msg,'limpió',name);
    assert.equal(r.meta,true,name+': ficha intacta');assert.equal(r.chunks,1,name+': fragmento intacto');assert.equal(r.rec,true,name+': registro intacto');
  }
  assert.equal((await state(D)).empty,true);

  /* ── 4. Fallos de cuota en cada fase: se limpia todo, la instalación queda vacía ── */
  const failAt=async phase=>json(D,
    'const P=IDBObjectStore.prototype,S=Storage.prototype,put=P.put,set=S.setItem;let n={meta:0,chunks:0,rec:0},fired=false;'+
    'const quota=()=>{fired=true;throw new DOMException("cuota simulada","QuotaExceededError")};'+
    'P.put=function(...a){const st=this.name;if(st in n)n[st]++;'+
    ' if(('+JSON.stringify(phase)+'==="meta-importando"&&st==="meta"&&n.meta===1)||('+JSON.stringify(phase)+'==="fragmento"&&st==="chunks"&&n.chunks===2)||'+
    '    ('+JSON.stringify(phase)+'==="meta-final"&&st==="meta"&&n.meta===2))quota();return put.apply(this,a)};'+
    'S.setItem=function(k,v){if(k.startsWith(VAULT_REC_PREFIX))n.rec++;'+
    ' if(('+JSON.stringify(phase)+'==="registro"&&k.startsWith(VAULT_REC_PREFIX)&&n.rec===2)||('+JSON.stringify(phase)+'==="lote"&&k===K2_JOURNAL)||'+
    '    ('+JSON.stringify(phase)+'==="ajustes"&&(k===CKEY||k===GKEY))||('+JSON.stringify(phase)+'==="cabecera"&&k===VAULT_HEADER))quota();return set.call(this,k,v)};'+
    'let msg="";try{await k2RestoreEmpty('+V1+',"'+PASS+'");msg="restauró"}catch(e){msg=e.name+": "+e.message}finally{P.put=put;S.setItem=set}'+
    'return JSON.stringify({fired,msg});');
  for(const phase of ['lote','meta-importando','fragmento','meta-final','registro','ajustes','cabecera']){
    const r=await failAt(phase);
    if(!r.fired){assert.equal(phase,'ajustes','solo la fase de ajustes puede no existir en la copia fija');assert.equal(r.msg,'restauró');
      await json(D,'vault.otherTab=false;localStorage.clear();const db=await anDb();for(const m of await anListMeta(db))await anDelete(db,m.id);return "1"');continue;}
    assert.notEqual(r.msg,'restauró',phase);
    const st=await state(D);
    assert.equal(st.empty,true,phase+': instalación vacía tras el fallo');assert.equal(st.journal,null,phase);assert.equal(st.header,false,phase);
  }

  /* ── 5. Confirmación clara: falla la relectura tras escribir la cabecera ── */
  const amb=await json(D,
    'const S=Storage.prototype,get=S.getItem;let armed=false,thrown=false;const set=S.setItem;'+
    'S.setItem=function(k,v){const r=set.call(this,k,v);if(k===VAULT_HEADER)armed=true;return r};'+
    'S.getItem=function(k){if(armed&&!thrown&&k===VAULT_HEADER){thrown=true;throw new Error("falla simulada al releer")}return get.call(this,k)};'+
    'let msg="";try{const r=await k2RestoreEmpty('+V1+',"'+PASS+'");msg="restauró "+r.audios}catch(e){msg=e.message}finally{S.getItem=get;S.setItem=set}'+
    'return JSON.stringify({thrown,msg,header:localStorage.getItem(VAULT_HEADER)!==null,journal:localStorage.getItem(K2_JOURNAL)});');
  assert.equal(amb.thrown,true);assert.equal(amb.msg,'restauró 1','informa éxito si la cabecera quedó completa');
  assert.equal(amb.header,true);assert.equal(amb.journal,null);
  await D.reload();
  const op=await json(D,'await vault.unlockPassword("'+PASS+'");await vaultAfterUnlock();'+
    'const data=JSON.parse(vaultStore.getItem("notasvoz.dictanota.v2"));return JSON.stringify({notas:data.entries.length});');
  assert.equal(op.notas,2);
  await D.close();

  /* ── 6. Corte real del navegador (recarga) a mitad de la importación ── */
  const o3=await newOrigin();
  const E=await openTab(o3);
  await E.run('(()=>{const P=IDBObjectStore.prototype,put=P.put;let n=0;P.put=function(...a){if(this.name==="chunks"&&++n===2){'+
    'const r=put.apply(this,a);location.reload();return r}return put.apply(this,a)};'+
    'k2RestoreEmpty('+V1+',"'+PASS+'").catch(()=>{});return 1})()');
  await sleep(300);await E.ready();
  // La limpieza del lote cortado corre al arrancar y es asincrónica: se espera a que termine (máx. 10 s) en vez de mirar a ciegas.
  const settle=async(tab,ok)=>{let s;for(let i=0;i<100;i++){s=await state(tab);if(ok(s))return s;await sleep(100)}return s};
  // location.reload() no detiene la página al instante: a veces la restauración alcanza a terminar antes de recargar.
  // Lo que se exige es todo o nada: o quedó vacía (lote limpiado al arrancar) o quedó la copia entera (cabecera y su audio), nunca a medias.
  let st=await settle(E,s=>s.journal===null&&((s.empty&&s.audios===0&&!s.header)||(s.header&&s.audios===1)));
  assert.equal(st.journal,null,'el arranque limpió el lote cortado');
  if(st.header){assert.equal(st.audios,1,'si la cabecera quedó escrita, la copia está entera');
    await json(E,'vault.otherTab=false;localStorage.clear();const db=await anDb();for(const m of await anListMeta(db))await anDelete(db,m.id);return "1"');await E.reload();st=await state(E);}
  assert.equal(st.empty,true,'estado: '+JSON.stringify(st));assert.equal(st.audios,0);
  // Corte justo después de escribir la cabecera: la restauración vale y el lote se descarta al arrancar.
  await E.run('(()=>{const S=Storage.prototype,set=S.setItem;S.setItem=function(k,v){const r=set.call(this,k,v);'+
    'if(k===VAULT_HEADER)location.reload();return r};k2RestoreEmpty('+V1+',"'+PASS+'").catch(()=>{});return 1})()');
  await sleep(300);await E.ready();
  st=await settle(E,s=>s.header&&s.journal===null&&s.audios===1);
  assert.equal(st.header,true);assert.equal(st.journal,null);assert.equal(st.audios,1);
  assert.equal(await E.run('vault.state'),'locked');
  await E.close();

  console.log('K2 candado OK: dos pestañas reales, limpieza solo con candado, lotes alterados intactos, cuota en 7 fases, confirmación clara y cortes reales');
}finally{
  try{ws?.close()}catch(e){}
  chrome.kill('SIGKILL');for(const s of servers)s.close();
  try{rmSync(profile,{recursive:true,force:true})}catch(e){}
}
