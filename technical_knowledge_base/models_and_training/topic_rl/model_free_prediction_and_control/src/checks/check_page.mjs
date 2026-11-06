// Exercises every control on the page in headless Chrome, at 390 px dark, 920 px light and 1400 px light: no console errors, no NaN or undefined in the visible tab's text,
// no sideways scroll, error box hidden. Motion (2026-11-06 rules): both 3D stages play by themselves once scrolled into view, each steps to its last step
// with one list item per step, and with prefers-reduced-motion nothing moves by itself. The five lab transports are long replays the reader drives
// (the long-replay rule, case b): they never play by themselves, open on their informative frame, and play when the reader presses Play. The numbers the two step lists
// quote are recomputed from the page's engine. At 1400 px every .s3sp is two columns and section 3 is full width.
// Screenshots of each visual land in ../../.shots/el-*.png.
// usage (from src/checks): node check_page.mjs [quick]
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../../../..');
const puppeteer=createRequire(path.join(root,'html_utils/package.json'))('puppeteer');
const page=path.resolve(here,'../../index.html'),shots=path.resolve(here,'../../.shots');fs.mkdirSync(shots,{recursive:true});
const quick=process.argv[2]==='quick';
const b=await puppeteer.launch({headless:'shell',executablePath:process.env.CHROME_PATH||undefined,args:process.platform==='linux'?['--no-sandbox']:[]});
let fails=0,probes=0;const say=(...a)=>console.log(...a),sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(const [scheme,width] of (quick?[['dark',390]]:[['dark',390],['light',920],['light',1400]])){
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
  // ---- the two 3D stages: autoplay on view, one list item per step, the last step reachable, numbers in the step lists from the engine ----
  for(const [id,n] of [['stg-hero',8],['stg-four',7]]){
    await p.$eval('#'+id,e=>e.scrollIntoView({block:'center'}));await sleep(2500);
    const r=await p.evaluate(id=>{const h=document.getElementById(id);return{fr:+(h.dataset.frames||0),play:/Pause/.test(h.querySelector('.stg-p').textContent),items:document.getElementById(id.replace('stg-','sx-')).children.length}},id);
    if(!(r.fr>0||r.play)){fails++;say('FAIL',scheme,width,id,'does not play by itself',JSON.stringify(r))}
    if(r.items!==n){fails++;say('FAIL',scheme,width,id,'list items',r.items,'expected',n)}
    for(let i=0;i<n;i++){await p.$eval('#'+id+'-f',e=>e.click());await sleep(60)}await sleep(1500);
    const last=await p.$eval('#'+id+' .stg-st',e=>e.textContent);if(last!=='step '+n+' of '+n){fails++;say('FAIL',scheme,width,id,'last step',last)}
    await probe(id+' last');
    await p.$eval('#'+id.replace('stg-','sx-')+' li:nth-child('+Math.ceil(n/2)+')',e=>e.click());await sleep(1600);await shot('#'+id,id.replace('stg-','')+'-mid')}
  probes++;const nums=await p.evaluate(()=>{const M=window.MFE,bad=[],f=v=>(v<0?'−':'')+Math.abs(v).toFixed(2),txt=id=>document.getElementById(id).textContent;
    // hero: the lambda-return and the three targets of section 4's transition
    const LR=M.lamReturn([0,0,1],[0.5,0.5],1,0.5),TT=M.twoTargets({R:-1,q:-5,qBest:-4,qDown:-100,qO1:-5,qO2:-6,qAp:-100,a:0.5,g:1,eps:0.1}),h=txt('sx-hero');
    [String(LR.v),'0.5, 0.25 and 0.25','−'+Math.abs(TT.sarsa.tg),'−'+(+Math.abs(TT.es.tg).toFixed(3)),'−'+Math.abs(TT.q.tg)].forEach(x=>{if(!h.includes(x))bad.push('hero '+x)});
    // four learners: the moment, the fall, SARSA's recovery, Monte Carlo's three visits, the end values and total changes
    const D=M.mDefault(),L=M.fourLearners(D.Q0,D.T,0.5,0.1),F=L.F,k=D.T.findIndex(s=>s.r===-100),pr=D.T[k-1].s*4+D.T[k-1].a,dn=D.T[k].s*4+D.T[k].a,t=txt('sx-four');
    const u=F[k].u,v=F[k+1].u,want=[f(u.sarsa.boot),f(u.sarsa.tg),f(u.sarsa.old),f(u.sarsa.nw),f(u.esarsa.tg),f(u.esarsa.nw),f(u.q.tg),f(v.sarsa.old),f(v.sarsa.nw),f(v.esarsa.nw),String(D.T.length)+' pairs','\u2212'+Math.abs(L.G[0])];
    const mc=F[D.T.length].u.mc.filter(m=>m.k===pr).map(m=>f(m.nw));want.push(...mc);
    const sv=[...new Set(F.map(fr=>fr.Q.sarsa[pr].toFixed(6)))].map(Number).slice(1);want.push(...sv.map(f));
    ['sarsa','esarsa','q','mc'].forEach(g=>{want.push(f(F[D.T.length].Q[g][pr]));let tot=0;for(let j=0;j<D.Q0.length;j++)tot+=Math.abs(F[D.T.length].Q[g][j]-D.Q0[j]);want.push(tot.toFixed(1))});
    want.forEach(x=>{if(!t.includes(x))bad.push('four '+x)});return bad});
  if(nums.length){fails++;say('FAIL',scheme,width,'step-list numbers not found:',nums)}
  for(const v of [0,25,50,90,100]){await slide('rd-laml',v);await probe('lam '+v)}await slide('rd-laml',50);await shot('#rd-lam','lam');
  for(const [id,vs] of [['rd-ttR',[-10,10,-1]],['rd-ttq',[-20,0,-5]],['rd-ttqBest',[-20,0,-4]],['rd-ttqDown',[-120,0,-100]],['rd-tta',[0.05,1,0.5]],['rd-tteps',[0,1,0.1]]])for(const v of vs){await slide(id,v);await probe(id+' '+v)}
  await pick('rd-ttap','right');await probe('tt right');await pick('rd-ttap','down');await shot('#rd-tt','tt');
  for(const [id,vs] of [['rd-falle',[0,0.5,0.1]],['rd-fallm',[2,8,4]],['rd-fallk',[1,20,10]]])for(const v of vs){await slide(id,v);await probe(id+' '+v)}
  await shot('#rd-fall','fall');
  // the deadly triad: every combination of the three switches
  for(const f of ['linear','table'])for(const t of ['td','mc'])for(const d of ['off','on']){await click('#rd-triF button[data-m="'+f+'"]');await click('#rd-triT button[data-m="'+t+'"]');await click('#rd-triD button[data-m="'+d+'"]');await probe('triad '+f+' '+t+' '+d)}
  await click('#rd-triF button[data-m="linear"]');await click('#rd-triT button[data-m="td"]');await click('#rd-triD button[data-m="off"]');await shot('#rd-triad','triad');
  await click('#rd-triT button[data-m="mc"]');await shot('#rd-triad','triad-mc');await click('#rd-triT button[data-m="td"]');
  // the lab transports are widgets (long-replay rule, case b): no autoplay, an informative opening frame, Play plays and a step stops it
  await p.$$eval('#t-read details',ds=>ds.forEach(d=>d.open=true));await probe('details open');
  const OPEN={'lb-rw':'episode 10 of 100','mx':'episode 100 of 300','is':'episode 200 of 200','lb-cl':'episode 500 of 500'};
  for(const [card,pid] of [['lb-rw','lb-rw'],['lb-nl','lb-nl'],['lb-cl','lb-cl'],['mx-run','mx'],['is-bj','is']]){
    await p.$eval('#'+card,e=>e.scrollIntoView({block:'start'}));await sleep(1500);
    const r=await p.evaluate(pid=>{const b=document.getElementById(pid+'-play');return{on:b.getAttribute('aria-pressed')==='true',fn:document.getElementById(pid+'-fn').textContent,cap:(document.getElementById(pid+'-cap')||{}).textContent||''}},pid);
    if(r.on){fails++;say('FAIL',scheme,width,card,'transport plays by itself')}
    if(OPEN[pid]&&r.fn!==OPEN[pid]){fails++;say('FAIL',scheme,width,card,'opening frame',r.fn,'expected',OPEN[pid])}
    if(pid==='lb-nl'&&!/TD\(λ\)/.test(r.cap)){fails++;say('FAIL',scheme,width,card,'does not open on the last step of the walk',r.cap)}
    if(pid!=='lb-cl'&&pid!=='is'){await p.$eval('#'+pid+'-play',e=>e.click());await sleep(500);
      const on=await p.evaluate((pid,fn)=>{const b=document.getElementById(pid+'-play');return(b.getAttribute('aria-pressed')==='true'&&/Pause/.test(b.textContent))||document.getElementById(pid+'-fn').textContent!==fn},pid,r.fn);   // playing, or already played its few remaining frames
      if(!on){fails++;say('FAIL',scheme,width,card,'Play does not play')}}
    await p.$eval('#'+pid+'-fwd',e=>e.click());await sleep(300);
    const off=await p.$eval('#'+pid+'-play',b=>b.getAttribute('aria-pressed')==='false');if(!off){fails++;say('FAIL',scheme,width,card,'a step does not stop it')}}
  // the split layout at 1400 px: two columns where a section has a visual, full width where it has none
  if(width>=1100){probes++;const lay=await p.evaluate(()=>{const bad=[];document.querySelectorAll('#t-read .s3sp').forEach((sp,i)=>{const L=sp.querySelector('.s3L'),R=sp.querySelector('.s3R');
      if(!(R.getBoundingClientRect().left>L.getBoundingClientRect().right-1))bad.push('split '+i+' not two columns')});
    const c=document.getElementById('rd-ctl');if(c.getBoundingClientRect().width<1000)bad.push('section 3 not full width');return bad});
    if(lay.length){fails++;say('FAIL',scheme,width,lay)}}
  await p.$eval('#rd-spine tr[data-go="rd-off"]',e=>e.click());await sleep(200);await probe('spine click');
  await shot('#rd-spine','spine');
  // ---------------- TD or Monte Carlo (section 1) ----------------
  await p.$eval('#lb-rw',e=>e.scrollIntoView());await sleep(400);await idle();await probe('rw open');
  if(!quick){for(const e of ['0','1','10','100']){await click('#lb-rw .lb-jb button[data-e="'+e+'"]');await probe('rw jump '+e)}
    for(const v of await opts('lb-rw-at')){await pick('lb-rw-at',v);await probe('rw at '+v)}for(const v of await opts('lb-rw-am')){await pick('lb-rw-am',v);await probe('rw am '+v)}
    for(const m of ['batch','on']){await click('#lb-rw-mode button[data-m="'+m+'"]');await idle();await probe('rw mode '+m)}}
  await click('#lb-rw .lb-jb button[data-e="10"]');await shot('#lb-rw','rw');
  // ---------------- n-step and TD(lambda) ----------------
  await p.$eval('#lb-nl',e=>e.scrollIntoView());await sleep(400);await idle();await probe('nl open');
  if(!quick){for(const id of ['lb-nl-n','lb-nl-l','lb-nl-ep'])for(const v of await opts(id)){await pick(id,v);await click('#lb-nl-fwd');await probe(id+'='+v)}
    for(const f of ['lret','tdl','nstep']){await click('#lb-nl-fam button[data-f="'+f+'"]');await idle();await probe('nl fam '+f)}}
  await shot('#lb-nl','nl');
  // ---------------- Cliff ----------------
  await p.$eval('#lb-cl',e=>e.scrollIntoView());await sleep(400);await idle();await probe('cl open');
  if(!quick){for(const v of [0,1,250,500]){await slide('lb-cl-scr',v);await click('#lb-cl-fwd');await probe('cl scrub '+v)}
    for(const w of ['a','b'])for(const v of await opts('lb-cl-m'+w)){await pick('lb-cl-m'+w,v);await idle();await probe('cl m'+w+'='+v)}
    await pick('lb-cl-ma','sarsa');await pick('lb-cl-mb','q');await idle()}
  await slide('lb-cl-scr',300);await shot('#lb-cl','cl');
  // ---------------- Maximisation bias ----------------
  await p.$eval('#mx-run',e=>e.scrollIntoView());await sleep(400);await idle();await probe('mx open');
  for(const [id,vs] of [['mx-emN',[1,3,30,10]],['mx-emS',[0,30,10]]])for(const v of vs){await slide(id,v);await probe(id+' '+v)}
  for(const v of [0,1,5,50,300]){await slide('mx-scr',v);await probe('mx scrub '+v)}
  await click('#mx-play');await sleep(800);await click('#mx-play');await click('#mx-fwd');await click('#mx-back');await probe('mx transport');
  if(!quick){for(const v of ['1','2','20','10']){await pick('mx-nb',v);await idle();await probe('mx nb '+v)}
    for(const v of ['1000','10000']){await pick('mx-runs',v);await idle();await probe('mx runs '+v)}await pick('mx-seed','2');await idle();await probe('mx seed 2');await pick('mx-seed','1');await idle()}
  await slide('mx-scr',25);await shot('#mx-run','mx');await shot('#mx-one','mxem');
  // ---------------- Importance sampling ----------------
  await p.$eval('#is-bj',e=>e.scrollIntoView());await sleep(400);await p.$eval('#is-iv',e=>e.scrollIntoView());await sleep(400);await idle();await probe('is open');
  for(const v of [0,1,2,3,10,200]){await slide('is-scr',v);await probe('is scrub '+v)}
  await click('#is-play');await sleep(800);await click('#is-play');await probe('is play');
  if(!quick){for(const v of ['20','500','100']){await pick('is-runs',v);await idle();await probe('is runs '+v)}await pick('is-seed','2');await idle();await probe('is seed 2');await pick('is-seed','1');await idle();
    await pick('is-ivn','100000');await idle();await probe('iv 1e5');await pick('is-ivs','2');await idle();await probe('iv seed 2');await pick('is-ivs','1');await pick('is-ivn','1000000');await idle()}
  await slide('is-scr',40);await shot('#is-bj','isbj');await shot('#is-iv','isiv');
  // legends
  for(const id of ['mx-lg','is-lg','is-ivlg']){await click('#'+id+' button');await probe('legend '+id);await click('#'+id+' button')}
  // ---------------- Further reading and tab links ----------------
  await tab('t-more');await probe('more');
  await p.$eval('#t-more a[data-sec="mx-run"]',e=>e.click());await sleep(300);cur='t-read';await probe('link to mx section');
  await p.setViewport({width:width===390?360:1100,height:900});await sleep(400);await probe('resize');
  say(scheme,width,'done');await p.close()}
// reduced motion: nothing moves by itself (light, 1400 px)
{const p=await b.newPage();await p.setViewport({width:1400,height:900});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await p.goto('file://'+page);await sleep(400);
  for(const id of ['stg-hero','stg-four','lb-rw','lb-nl','lb-cl','mx-run','is-bj']){await p.$eval('#'+id,e=>e.scrollIntoView({block:'center'}));await sleep(1500)}
  probes++;const moved=await p.evaluate(()=>{const m=[];['stg-hero','stg-four'].forEach(id=>{const h=document.getElementById(id);if(+(h.dataset.frames||0)>0||/Pause/.test(h.querySelector('.stg-p').textContent)||h.querySelector('.stg-st').textContent!=='step 1 of '+document.getElementById(id.replace('stg-','sx-')).children.length)m.push(id)});
    document.querySelectorAll('.lb-pl').forEach(b=>{if(b.getAttribute('aria-pressed')==='true')m.push(b.id)});return m});
  if(moved.length){fails++;say('FAIL reduced motion: moved by itself',moved)}else say('reduced motion: nothing moves by itself');await p.close()}
await b.close();say(fails?'check_page: '+fails+' failures of '+probes+' probes':'check_page: pass ('+probes+' probes)');process.exit(fails?1:0);
