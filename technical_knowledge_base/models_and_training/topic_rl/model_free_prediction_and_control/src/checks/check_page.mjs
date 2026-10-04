// Exercises every control on the page in headless Chrome, at 390 px dark and 920 px light: no console errors, no NaN or undefined in the visible tab's text,
// no sideways scroll, error box hidden. Screenshots of each visual land in ../../.shots/el-*.png.
// usage (from src/checks): node check_page.mjs [quick]
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../../..');
const puppeteer=createRequire(path.join(root,'html_utils/package.json'))('puppeteer');
const page=path.resolve(here,'../../index.html'),shots=path.resolve(here,'../../.shots');fs.mkdirSync(shots,{recursive:true});
const quick=process.argv[2]==='quick';
const b=await puppeteer.launch({headless:'shell',executablePath:process.env.CHROME_PATH||undefined,args:process.platform==='linux'?['--no-sandbox']:[]});
let fails=0,probes=0;const say=(...a)=>console.log(...a),sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const [scheme,width] of (quick?[['dark',390]]:[['dark',390],['light',920]])){
  const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.setViewport({width,height:900});await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);
  await p.goto('file://'+page);await p.evaluate(()=>{try{localStorage.clear()}catch(e){}});await p.reload();await sleep(300);
  let cur='t-read';
  const tab=async t=>{cur=t;await p.click('button[data-t='+t+']');await sleep(250)};
  const probe=async(what)=>{probes++;const r=await p.evaluate(t=>{const x=document.getElementById(t).innerText;return{nan:/\bNaN\b/.test(x),und:/undefined/.test(x),inf:/Infinity/.test(x),side:document.documentElement.scrollWidth>innerWidth,box:(()=>{const d=document.getElementById('jsErr');return d&&!d.hidden?d.textContent:''})()}},cur);
    const bad=r.nan||r.und||r.inf||r.side||r.box||errs.length;if(bad){fails++;say('FAIL',scheme,width,what,JSON.stringify(r),errs.splice(0))}return!bad};
  const idle=async()=>{await p.waitForFunction(()=>{const T=window.LB_TEST;if(!T)return true;return!(T.rwBusy&&T.rwBusy())&&!(T.nl&&T.nl().busy())&&!(T.cl&&T.cl().busy())&&!(T.mx&&T.mx().busy())&&!(T.is&&T.is().busy())},{timeout:400000,polling:250})};
  const click=async sel=>{await p.$eval(sel,e=>e.click())};
  const pick=async(id,v)=>{await p.evaluate((id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}))},id,v)};
  const slide=async(id,v)=>{await p.evaluate((id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}))},id,v)};
  const opts=async id=>p.$$eval('#'+id+' option',os=>os.map(o=>o.value));
  const shot=async(sel,name)=>{const el=await p.$(sel);if(el){await el.scrollIntoView();await sleep(150);await el.screenshot({path:path.join(shots,'el-'+name+'-'+scheme+'-'+width+'.png')})}};
  // ---------------- Reading ----------------
  await probe('read open');
  await p.$eval('#rd-four',e=>e.scrollIntoView());await sleep(500);
  const n4=await p.evaluate(()=>RD_TEST.four.an.n);
  for(const m of ['sarsa','esarsa','q','mc']){await click('#rd-fourM button[data-m="'+m+'"]');for(const i of [0,1,4,5,n4-1]){await p.evaluate(i=>RD_TEST.four.an.go(i),i);await probe('four '+m+' '+i)}}
  await click('#rd-fourM button[data-m="sarsa"]');await p.evaluate(i=>RD_TEST.four.an.go(i),await p.evaluate(()=>RD_TEST.four.kPrev+1));await shot('#rd-four','four-key');
  await click('#rd-fourC-p');await sleep(1200);await click('#rd-fourC-p');await click('#rd-fourC-f');await click('#rd-fourC-b');await pick('rd-fourC-v','2');await probe('four transport');
  await p.evaluate(i=>RD_TEST.four.an.go(i),n4-1);await shot('#rd-four','four-end');
  for(const v of [0,25,50,90,100]){await slide('rd-laml',v);await probe('lam '+v)}await slide('rd-laml',50);await shot('#rd-lam','lam');
  for(const [id,vs] of [['rd-ttR',[-10,10,-1]],['rd-ttq',[-20,0,-5]],['rd-ttqBest',[-20,0,-4]],['rd-ttqDown',[-120,0,-100]],['rd-tta',[0.05,1,0.5]],['rd-tteps',[0,1,0.1]]])for(const v of vs){await slide(id,v);await probe(id+' '+v)}
  await pick('rd-ttap','right');await probe('tt right');await pick('rd-ttap','down');await shot('#rd-tt','tt');
  for(const [id,vs] of [['rd-falle',[0,0.5,0.1]],['rd-fallm',[2,8,4]],['rd-fallk',[1,20,10]]])for(const v of vs){await slide(id,v);await probe(id+' '+v)}
  await shot('#rd-fall','fall');
  // decision tree: walk every path
  for(const seq of [['p','td'],['p','p2','td2'],['p','p2','mc'],['c','sarsa'],['c','c2','ql'],['c','c2','ql2']]){for(const s of seq){await click('#rd-tree button[data-n="'+s+'"]')}await probe('tree '+seq.join('>'));await click('#rd-tree button[data-back]');await click('#rd-tree button[data-reset]')}
  await shot('#rd-tree','tree');
  await p.$$eval('#rd-quizL details',ds=>ds.forEach(d=>d.open=true));await probe('quiz open');
  await p.$eval('#rd-spine tr[data-go="rd-off"]',e=>e.click());await sleep(200);await probe('spine click');
  await shot('#rd-spine','spine');
  // ---------------- TD or Monte Carlo ----------------
  await tab('t-rw');await p.$eval('#lb-rw',e=>e.scrollIntoView());await sleep(400);await idle();await probe('rw open');
  if(!quick){for(const e of ['0','1','10','100']){await click('#lb-rw .lb-jb button[data-e="'+e+'"]');await probe('rw jump '+e)}
    for(const v of await opts('lb-rw-at')){await pick('lb-rw-at',v);await probe('rw at '+v)}for(const v of await opts('lb-rw-am')){await pick('lb-rw-am',v);await probe('rw am '+v)}
    for(const m of ['batch','on']){await click('#lb-rw-mode button[data-m="'+m+'"]');await idle();await probe('rw mode '+m)}}
  await click('#lb-rw .lb-jb button[data-e="10"]');await shot('#lb-rw','rw');
  // ---------------- n-step and TD(lambda) ----------------
  await tab('t-nl');await p.$eval('#lb-nl',e=>e.scrollIntoView());await sleep(400);await idle();await probe('nl open');
  if(!quick){for(const id of ['lb-nl-n','lb-nl-l','lb-nl-ep'])for(const v of await opts(id)){await pick(id,v);await click('#lb-nl-fwd');await probe(id+'='+v)}
    for(const f of ['lret','tdl','nstep']){await click('#lb-nl-fam button[data-f="'+f+'"]');await idle();await probe('nl fam '+f)}}
  await shot('#lb-nl','nl');
  // ---------------- Cliff ----------------
  await tab('t-cl');await p.$eval('#lb-cl',e=>e.scrollIntoView());await sleep(400);await idle();await probe('cl open');
  if(!quick){for(const v of [0,1,250,500]){await slide('lb-cl-scr',v);await click('#lb-cl-fwd');await probe('cl scrub '+v)}
    for(const w of ['a','b'])for(const v of await opts('lb-cl-m'+w)){await pick('lb-cl-m'+w,v);await idle();await probe('cl m'+w+'='+v)}
    await pick('lb-cl-ma','sarsa');await pick('lb-cl-mb','q');await idle()}
  await slide('lb-cl-scr',300);await shot('#lb-cl','cl');
  // ---------------- Maximisation bias ----------------
  await tab('t-mx');await p.$eval('#mx-run',e=>e.scrollIntoView());await sleep(400);await idle();await probe('mx open');
  for(const [id,vs] of [['mx-emN',[1,3,30,10]],['mx-emS',[0,30,10]]])for(const v of vs){await slide(id,v);await probe(id+' '+v)}
  for(const v of [0,1,5,50,300]){await slide('mx-scr',v);await probe('mx scrub '+v)}
  await click('#mx-play');await sleep(800);await click('#mx-play');await click('#mx-fwd');await click('#mx-back');await probe('mx transport');
  if(!quick){for(const v of ['1','2','20','10']){await pick('mx-nb',v);await idle();await probe('mx nb '+v)}
    for(const v of ['1000','10000']){await pick('mx-runs',v);await idle();await probe('mx runs '+v)}await pick('mx-seed','2');await idle();await probe('mx seed 2');await pick('mx-seed','1');await idle()}
  await slide('mx-scr',25);await shot('#mx-run','mx');await shot('#mx-one','mxem');
  // ---------------- Importance sampling ----------------
  await tab('t-is');await p.$eval('#is-bj',e=>e.scrollIntoView());await sleep(400);await p.$eval('#is-iv',e=>e.scrollIntoView());await sleep(400);await idle();await probe('is open');
  for(const v of [0,1,2,3,10,200]){await slide('is-scr',v);await probe('is scrub '+v)}
  await click('#is-play');await sleep(800);await click('#is-play');await probe('is play');
  if(!quick){for(const v of ['20','500','100']){await pick('is-runs',v);await idle();await probe('is runs '+v)}await pick('is-seed','2');await idle();await probe('is seed 2');await pick('is-seed','1');await idle();
    await pick('is-ivn','100000');await idle();await probe('iv 1e5');await pick('is-ivs','2');await idle();await probe('iv seed 2');await pick('is-ivs','1');await pick('is-ivn','1000000');await idle()}
  await slide('is-scr',40);await shot('#is-bj','isbj');await shot('#is-iv','isiv');
  // legends
  for(const id of ['mx-lg','is-lg','is-ivlg']){await click('#'+id+' button');await probe('legend '+id);await click('#'+id+' button')}
  // ---------------- Further reading and tab links ----------------
  await tab('t-more');await probe('more');
  await tab('t-read');await p.$eval('a[data-tab="t-mx"]',e=>e.click());await sleep(300);cur='t-mx';await probe('link to mx');
  await p.setViewport({width:width===390?360:1100,height:900});await sleep(400);await probe('resize');
  say(scheme,width,'done');await p.close()}
await b.close();say(fails?'check_page: '+fails+' failures of '+probes+' probes':'check_page: pass ('+probes+' probes)');process.exit(fails?1:0);
