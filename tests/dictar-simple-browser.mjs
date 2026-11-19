// U19 · Dictar mínimo, destino y audio histórico en Ajustes.
// Chrome real a 360 px, dos apariencias, únicamente información ficticia.
// CAPTURA_DIR=/ruta CHROME_BIN=/ruta node tests/dictar-simple-browser.mjs
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const profile=mkdtempSync(join(tmpdir(),'dictavoz-u19-'));
const shots=process.env.CAPTURA_DIR||mkdtempSync(join(tmpdir(),'dictavoz-u19-capturas-'));
mkdirSync(shots,{recursive:true});
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(readFileSync(new URL('../index.html',import.meta.url)));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const ORIGIN='http://localhost:'+server.address().port;
const chrome=spawn(process.env.CHROME_BIN||'chromium',['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank']);
let ws;
try{
  const endpoint=await new Promise((resolve,reject)=>{
    let log='';const timer=setTimeout(()=>reject(Error('Chrome no abrió: '+log)),30000);
    chrome.on('error',reject);chrome.stderr.on('data',b=>{log+=b;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});
  });
  ws=new WebSocket(endpoint);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  let seq=0;const pending=new Map(), errors=[];
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(m.params.exceptionDetails).slice(0,250));
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(JSON.stringify(m.params.args).slice(0,250));
    if(m.method==='Page.javascriptDialogOpening')call('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
  });
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetInfos}=await send('Target.getTargets');
  const {sessionId}=await send('Target.attachToTarget',{targetId:targetInfos.find(x=>x.type==='page').targetId,flatten:true});
  const call=(method,params={})=>send(method,params,sessionId);
  const run=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,600));
    return r.result.value;
  };
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const page=async()=>{
    await call('Page.navigate',{url:ORIGIN+'/'});
    for(let i=0;i<150;i++){
      try{if(await run('document.readyState==="complete" && typeof convInit==="function" && !!convStore.data'))return;}catch{}
      await sleep(100);
    }
    throw Error('La app no terminó de iniciar');
  };
  const reset=async()=>{
    await call('Page.navigate',{url:'about:blank'});await sleep(300);
    await call('Storage.clearDataForOrigin',{origin:ORIGIN,storageTypes:'all'});
    await page();
  };
  const view=v=>run(`document.querySelector('[data-delta-view="${v}"]').click(); document.body.dataset.view`);
  const screenshot=async filename=>{
    await sleep(140);
    const p=await call('Page.captureScreenshot',{format:'png'});
    writeFileSync(join(shots,filename),Buffer.from(p.data,'base64'));
  };
  const waitCount=async n=>{
    for(let i=0;i<100;i++){if(await run(`convStore.data.entries.length===${n}&&!convSaving`))return;await sleep(50);}
    throw Error('No se guardó la nota sintética '+n);
  };
  await call('Page.enable');await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:360,height:740,deviceScaleFactor:2,mobile:true});
  await reset();

  // La disposición visible y el DOM deben seguir siendo simples tras inicializar.
  assert.deepEqual(await run(`(()=>{const rec=document.getElementById('grabacion'),dest=document.getElementById('dictDest'),mic=document.getElementById('rec'),adv=document.getElementById('audioAdvanced');return [rec.firstElementChild===dest,dest.getBoundingClientRect().top<mic.getBoundingClientRect().top,!rec.querySelector('.record-head'),!rec.querySelector('#openSheets'),!rec.querySelector('#writeNewNote'),!document.getElementById('recordSaveAudio'),adv.contains(document.getElementById('audioBox')),adv.contains(document.querySelector('.audio-tools')),adv.contains(document.getElementById('recordDownloadAudio')),!adv.open]})()`),Array(10).fill(true));
  const dimensions=()=>run(`(()=>{const r=document.getElementById('rec').getBoundingClientRect(),s=document.getElementById('dictDestSel').getBoundingClientRect(),a=document.getElementById('dictName').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>360,mic:r.height,selector:s.height,name:a.height}})()`);
  const d=await dimensions();assert.equal(d.overflow,false);assert.ok(d.mic>=48&&d.selector>=48&&d.name>=48);

  for(const [label,theme] of [['claro','light'],['nocturno','dark']]){
    await run(`document.getElementById('theme-${theme}').click();document.activeElement.blur();`);
    await view('grabacion');await screenshot('u19-dictar-reposo-'+label+'.png');
    // Solo se simula el estado gráfico. No se inventa una grabación de micrófono.
    await run(`recording=true;paused=false;tAcc=123000;tRun=0;document.getElementById('rec').classList.add('on');document.getElementById('rec').textContent='Detener';setCtl(true);updClock();updProgress();`);
    await sleep(150);const visible=await run(`(()=>{const r=document.getElementById('rec').getBoundingClientRect(),dock=document.querySelector('.studio-dock').getBoundingClientRect();return r.top>=0&&r.bottom<=dock.top&&r.width>=48&&r.height>=48})()`);
    assert.equal(visible,true,label+': el botón de grabar completo queda arriba de la franja');
    assert.equal(await run('document.documentElement.scrollWidth<=360'),true);
    await screenshot('u19-dictar-grabando-'+label+'.png');
    await run('recording=false;paused=false;stopUI();updProgress()');
    await view('ajustes');await run(`ajShow('espacio',false);document.getElementById('audioAdvanced').open=true;document.getElementById('audioAdvanced').scrollIntoView({block:'start',behavior:'instant'});`);
    assert.equal(await run(`document.getElementById('audioBox').getBoundingClientRect().height>0`),true);
    assert.equal(await run(`['aDown','aMp3','aTx','aDel'].every(id=>document.getElementById('audioAdvanced').contains(document.getElementById(id)))`),true);
    await screenshot('u19-espacio-audios-'+label+'.png');
  }

  // El enlace desde Cuadernos abre Ajustes y expande los audios sin cambiar de pestaña por error.
  await view('transcripcion');
  await run(`document.querySelector('.where-audio [data-go-target="audioBox"]').click()`);
  assert.deepEqual(await run(`[document.body.dataset.view,!document.getElementById('ajSub-espacio').hidden,document.getElementById('audioAdvanced').open]`),['ajustes',true,true]);

  // Guardar nuevo y existente: mismas funciones que el test U12, siempre datos inventados.
  await reset();await view('grabacion');
  await run(`document.getElementById('dictName').value='Cuaderno ficticio U19';document.getElementById('dictName').dispatchEvent(new Event('input',{bubbles:true}));prepareNew();appendMachine('Transcripción ficticia primera.');`);
  await view('transcripcion');await run(`document.getElementById('save').click()`);await waitCount(1);
  const id=await run('convStore.data.conversations[0].id');
  assert.equal(await run('convStore.data.conversations[0].title'),'Cuaderno ficticio U19');
  await view('grabacion');
  await run(`(()=>{const s=document.getElementById('dictDestSel');s.value=${JSON.stringify(id)};s.dispatchEvent(new Event('change',{bubbles:true}));prepareNew();appendMachine('Transcripción ficticia segunda.');})()`);
  await view('transcripcion');await run('document.getElementById("save").click()');await waitCount(2);
  assert.deepEqual(await run('convStore.data.entries.map(x=>x.conversationId)'),[id,id]);

  // Fallo simulado de Whisper: el aviso sigue en Dictar y distingue conservar audio.
  await view('grabacion');
  await run(`document.getElementById('saveAudio').checked=true;document.getElementById('saveAudio').dispatchEvent(new Event('change'));dead=false;fail(new Error('Fallo ficticio de Whisper'));`);
  const status=await run(`document.getElementById('status').textContent`);
  assert.match(status,/podés confirmarlo como una nota sin texto/);
  assert.equal(await run(`document.getElementById('grabacion').contains(document.getElementById('status'))`),true);
  assert.deepEqual(errors,[],'no deben aparecer errores JavaScript en la consola');
  console.log('U19 CHROME OK: 360px, dos temas, capturas, Dictar, destino nuevo/existente, audio en Ajustes, enlaces, fallo ficticio, sin errores. Capturas: '+shots);
}finally{
  ws?.close();chrome.kill();server.close();setTimeout(()=>rmSync(profile,{recursive:true,force:true}),500).unref();
}
