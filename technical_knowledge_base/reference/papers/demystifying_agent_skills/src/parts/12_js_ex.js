// ---- The paired run (Appendix A.3): replay animation, prompt toggle, excerpts, checkout scheduler ----
const ARMC={raw:'var(--mute)',wf:'var(--c2)',skill:'var(--c1)'};
const ARMN={raw:'Raw',wf:'Workflow Memory',skill:'Skill'};
const SVC={user:400,config:600,profile:300}; // ms, environment/api-simulator/src/server.ts
const SVCC={user:'var(--c3)',config:'var(--c5)',profile:'var(--c4)'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// a schedule: start/end of each call; bypass = no call
function schedule(cfg,pro){const u=[0,400];let c,p;
  if(cfg==='0')c=[0,600];else if(cfg==='user')c=[400,1000];
  if(cfg==='profile'){p=[400,700];c=[700,1300]}
  else p=pro==='user'?[400,700]:[Math.max(400,c[1]),Math.max(400,c[1])+300];
  return {user:u,config:c,profile:p,total:Math.max(u[1],c[1],p[1])}}
const SCHED={raw:null,wf:schedule('0','both'),skill:schedule('0','user')};
const MEAS={raw:7,wf:915,skill:711.576};
// draw lanes on a 0..T ms axis; e = growth 0..1 (bars drawn up to e*total)
function lanes(w,s,e,opt){opt=opt||{};const T=opt.T||1000,pl=w<480?62:78,pr=12,top=22,lh=opt.lh||24,rows=['user','config','profile'];
  const X=v=>pl+(w-pl-pr)*Math.min(v,T)/T,H=top+rows.length*lh+46;let g='';
  g+=rc(X(400),top-6,X(800)-X(400),rows.length*lh+10,'var(--good)',{op:.12,r:2});
  g+=tx(X(600),top-9,'verifier window 400 to 800 ms',{fs:11,a:'middle',c:'var(--good)'});
  [0,200,400,600,800,1000,1200,1400].filter(v=>v<=T).forEach(v=>{g+=ln2(X(v),top+rows.length*lh+2,X(v),top+rows.length*lh+6,'var(--mute)')+tx(X(v),top+rows.length*lh+18,v+(v===T&&w>=480?' ms':''),{fs:11,a:v===T?'end':'middle',c:'var(--mute)'})});
  rows.forEach((r,i)=>{const y=top+i*lh;g+=tx(pl-6,y+lh/2+4,r+' '+SVC[r],{fs:11,a:'end',c:'var(--mute)'});
    g+=rc(pl,y+4,w-pl-pr,lh-8,'var(--soft)',{r:3});
    if(s&&s[r]){const now=e*s.total,a=s[r][0],b=Math.min(s[r][1],now);if(b>a)g+=rc(X(a),y+4,X(b)-X(a),lh-8,SVCC[r],{r:3,op:.9});}});
  const yb=top+rows.length*lh+30;
  if(s){const now=Math.min(e*s.total,s.total);g+=ln2(X(now),top-4,X(now),top+rows.length*lh+2,'var(--ink)',{sw:1.6});
    if(e>=1)g+=tx(X(s.total)+(X(s.total)>w-90?-4:4),yb,'total '+s.total+' ms',{fs:12,w:600,a:X(s.total)>w-90?'end':'start'})}
  else if(opt.bypass&&e>0){g+=ln2(X(7),top-4,X(7),top+rows.length*lh+2,'var(--bad)',{sw:2});g+=tx(X(7)+4,yb,'7 ms: no service was called',{fs:12,w:600,c:'var(--bad)'})}
  return svgW(w,H,g,'Checkout timeline')}
// ---- the replay animation
(function(){if(!$('rp'))return;const A=EX.arms;
  const firstAgent=m=>{const e=A[m].ents.find(x=>x.h==='Agent');return e?e.body.join(' '):''};
  const given={raw:'Nothing: no prior trajectory, no skill.',wf:'Workflow Memory: the five source trajectories (one success, four failures), cleaned and structured, appended to the task instruction.',skill:'A SKILL.md distilled from the same five trajectories, placed in the environment. Its relevant part reads: <i>'+esc(A.skill.ents[0].body.join(' '))+'</i>'};
  const did={raw:'"'+esc(firstAgent('raw'))+'" Its own checks show /api/products returning 500 and /api/checkout answering in about 4 to 5 ms; restarting the server fails with EADDRINUSE.',wf:'"'+esc(firstAgent('wf'))+'"',skill:'The agent applies the rule to the checkout route: start user and config at once, start profile the moment user resolves, await the rest together. It then measures POST /api/checkout five times: warm average 0.711576 s.'};
  const ver=m=>A[m].ents.filter(x=>x.h==='Verifier')[0].body.reduce((o,l)=>{if(o.length&&(/-$/.test(o[o.length-1])||/^\(/.test(l)))o[o.length-1]+=' '+l;else o.push(l);return o},[]);
  const steps=m=>[
    {t:'The task and the bar',c:'An e-commerce site in Next.js is slow; fix it. The verifier times POST /api/checkout twice: it must answer in under 800 ms, and in at least 400 ms, to prove the external services are really called. The three services take 400, 600 and 300 ms, and profile needs the user id.'},
    {t:'What the '+ARMN[m]+' arm was given',c:given[m]},
    {t:'What the agent did',c:did[m]},
    {t:'The checkout route it shipped, to scale',c:m==='raw'?'The paper does not print Raw\'s route. Its checkout answered in 7 ms, so no service call was made: fast, but it fails the "external API actually called" test.':m==='wf'?'Promise.all over user and config, then profile: 600 + 300 = 900 ms (measured 915 ms). This is the route the task ships with, unchanged.':'User and config start together; profile starts when user resolves; the two remaining promises are awaited together: max(400 + 300, 600) = 700 ms (measured 711.6 ms), the fastest schedule possible.'},
    {t:'The verifier',c:esc(ver(m).join(' · '))+'. Reward '+A[m].reward+'.'}];
  const modes={raw:steps('raw'),wf:steps('wf'),skill:steps('skill')};
  makeAnim({id:'rp',mode:'skill',modes,dur:3200,
    draw:(m,k,e,w)=>{let top='';if(k===1||k===2)top='<div class="ent '+(k===1?'r-f':'r-t')+'" style="margin:0 0 6px"><span class="who">'+(k===1?'given':'agent')+'</span>'+(k===1?given[m]:did[m])+'</div>';
      if(k===4){top='<div class="tr" style="margin:0 0 6px">'+ver(m).map(l=>'<div class="ent '+(/FAILED|Error|too fast|took/.test(l)?'r-e':'r-o')+'" style="padding:2px 8px">'+esc(l)+'</div>').join('')+'</div>'}
      const s=k>=3?SCHED[m]:null;return top+lanes(w,s,k>=3?(k===3?e:1):0,{bypass:m==='raw'&&k>=3})},
    counters:(m,k,e)=>{const show=k>=3,t=m==='raw'?7:SCHED[m].total,meas=MEAS[m];
      const okLo=meas>=400,okHi=meas<800,tests=k>=4?(m==='skill'?'11 of 11':'10 of 11'):'?';
      return stat('Checkout time',show?(m==='raw'?'7 ms':t+' ms'):'?',show?'measured '+(m==='skill'?'711.6':meas)+' ms':'not yet shipped')+
        stat('At least 400 ms',show?(okLo?'<span class="ok">yes</span>':'<span class="no">no</span>'):'?','proves the services are called')+
        stat('Under 800 ms',show?(okHi?'<span class="ok">yes</span>':'<span class="no">no</span>'):'?','the latency test')+
        stat('Tests passed',tests,k>=4?'reward '+EX.arms[m].reward:'after the verifier runs')}});
})();
// ---- skill-creator prompt, B.1 against B.2
(function(){if(!$('scr'))return;const a=EX.creator,b=EX.creator_nohint;
  function show(m){const L=m==='normal'?a:b,O=m==='normal'?b:a;$('scrBody').innerHTML=L.map(l=>O.indexOf(l)<0?'<span style="background:var(--hl);display:block">'+esc(l)+'</span>':esc(l)).join('\n')+'\n\n<span class="mute">Highlighted: lines not in the other version. Appendix B.'+(m==='normal'?'1':'2')+', verbatim.</span>'}
  segBind('scrM',show);show('normal')})();
// ---- the excerpts, three columns
(function(){if(!$('ex'))return;const A=EX.arms;
  const col=m=>'<div class="excol" data-a="'+m+'"><div class="exh" style="border-color:'+ARMC[m]+'">'+ARMN[m]+' <span class="mute">(reward '+A[m].reward+')</span></div>'+A[m].ents.map(e=>'<div class="ent '+({'Agent':'r-t','Verifier':'r-o','Injected SKILL.md':'r-f','Runtime checks':'r-a','Agent runtime measurement':'r-a','Final checkout patch':'r-a'}[e.h]||'')+'"><span class="who">'+esc(e.h)+'</span><div class="mono" style="white-space:pre-wrap;font-size:12px">'+esc(e.h==='Agent'?e.body.filter(l=>!/^[$]|^Error/.test(l)).join(' ')+(e.body.some(l=>/^[$]|^Error/.test(l))?'\n'+e.body.filter(l=>/^[$]|^Error/.test(l)).join('\n'):''):e.body.join('\n'))+'</div></div>').join('')+'</div>';
  $('ex').innerHTML=['raw','wf','skill'].map(col).join('');
  segBind('exM',m=>{document.querySelectorAll('#ex .excol').forEach(c=>{c.hidden=!(m==='all'||c.dataset.a===m)});$('ex').classList.toggle('one',m!=='all')})})();
// ---- the scheduler
(function(){if(!$('sch'))return;const pre=$('schPre'),cf=$('schCfg'),pr=$('schPro');
  const P={orig:['0','both'],skill:['0','user'],seq:['user','both']};
  const host=$('schSvg');let cur={s:null,T:1000,by:false};
  fit(host,w=>{host.innerHTML=lanes(w,cur.s,1,{T:cur.T,bypass:cur.by})});
  function draw(){const v=pre.value;let s=null,note='';
    if(P[v]){cf.value=P[v][0];pr.value=P[v][1]}
    cf.disabled=pr.disabled=v==='bypass';
    if(v!=='bypass'){if(cf.value==='profile'&&pr.value==='both'){pr.value='user';note='Config cannot wait for profile while profile waits for config, so profile starts after user here. '}s=schedule(cf.value,pr.value)}
    const T=s&&s.total>1000?1400:1000;
    cur={s,T,by:v==='bypass'};refit(host);
    const t=s?s.total:7,lo=t>=400,hi=t<800;
    $('schOut').innerHTML=stat('Checkout time',t+' ms',v==='orig'?'measured 915 ms in the Workflow arm':v==='skill'?'measured 711.6 ms in the Skill arm':v==='bypass'?'measured 7 ms in the Raw arm':'model: service delays only')+
      stat('test_external_api_actually_called',lo?'<span class="ok">passes</span>':'<span class="no">fails</span>','needs at least 400 ms')+
      stat('test_checkout_fast',hi?'<span class="ok">passes</span>':'<span class="no">fails</span>','needs under 800 ms');
    $('schNote').textContent=note+(v==='bypass'?'Answering from a cache or a stub is fast but fails the test written to catch exactly that.':s&&s.total===700?'700 ms is the floor: user then profile is a 700 ms chain, and config (600 ms) fits beside it.':'The critical path is the longest chain of calls that must wait for each other.')}
  pre.addEventListener('change',draw);[cf,pr].forEach(e=>e.addEventListener('change',()=>{pre.value='custom';draw()}));
  onTab('t-run',()=>draw());draw()})();
