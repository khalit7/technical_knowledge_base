// ---- Train the toy: every method on the same settings, live; one run stepped through ----
(function(){if(!window.TOY||!$('gfToy'))return;
  const NAME={none:'No intervention',penalty:'Reward penalty',filter:'Filtering',noroute:'GRAFT w/o routing',noanchor:'GRAFT w/o anchoring',graft:'GRAFT (ours)'};
  const SH={none:'No interv.',penalty:'Penalty',filter:'Filtering',noroute:'w/o routing',noanchor:'w/o anchoring',graft:'GRAFT'};
  MC['GRAFT w/o anchoring']='var(--c5)';
  let V='truth',RES=null,cfg={};
  const read=()=>({monitor:+$('gfMon').value,recall:+$('gfRec').value,penalty:+$('gfPen').value,seed:+$('gfSeed').value});
  function runAll(){cfg=read();$('gfRecV').textContent=cfg.recall.toFixed(2);$('gfPenV').textContent=cfg.penalty.toFixed(2);
    RES={};TOY.METHODS.forEach(m=>{RES[m]=TOY.run(m,cfg)});}
  function last(m,v){const h=RES[m].hist;return h[h.length-1][v||'dep']}
  function drawMain(w){if(!RES)runAll();const P=[];
    TOY.METHODS.forEach(m=>{const d=last(m);P.push({n:NAME[m],lab:SH[m],x:100*(V==='truth'?d.hack:d.flagged),y:100*(V==='truth'?d.clean:d.proxy)})});
    const pre=last('graft','pre');P.push({n:'GRAFT: pre-ablation',lab:'GRAFT pre-ablation',x:100*(V==='truth'?pre.hack:pre.flagged),y:100*(V==='truth'?pre.clean:pre.proxy)});
    const b=RES.none.hist[0].dep;P.push({n:'Base model',lab:'Start',x:100*(V==='truth'?b.hack:b.flagged),y:100*(V==='truth'?b.clean:b.proxy)});
    $('gfToySvg').innerHTML=scat(w,P,{x:[0,100],y:V==='truth'?[40,90]:[40,104],xl:V==='truth'?'Hack rate, every kind':'Flagged rate (what the monitor sees)',yl:V==='truth'?'Clean solve rate':'Proxy reward',label:'Toy results'});
    const g=last('graft'),pn=last('penalty');
    $('gfToyT').innerHTML=V==='truth'?'After '+RES.graft.cfg.steps+' steps: who hacks, and how much the real task improved':'The same runs as the developer sees them';
    $('gfToyNote').innerHTML='Deployed GRAFT: '+pc(100*g.hack)+' hacking ('+pc(100*g.detected)+' the monitored hack, '+pc(100*g.undetected)+' the others), clean solve '+pc(100*g.clean)+'. Reward penalty: '+pc(100*pn.hack)+' hacking, '+pc(100*pn.flagged)+' flagged. Exact rates of the final policies (not sampled), seed '+cfg.seed+'.'}
  const host=$('gfToySvg');
  function rerun(){runAll();refit(host);drawRun()}
  ['gfMon','gfSeed'].forEach(id=>$(id).addEventListener('change',rerun));['gfRec','gfPen'].forEach(id=>$(id).addEventListener('change',rerun));
  ['gfRec','gfPen'].forEach(id=>$(id).addEventListener('input',()=>{$('gfRecV').textContent=(+$('gfRec').value).toFixed(2);$('gfPenV').textContent=(+$('gfPen').value).toFixed(2)}));
  $('gfReset').addEventListener('click',()=>{$('gfMon').value='1';$('gfRec').value='1';$('gfPen').value='1';$('gfSeed').value='1';rerun()});
  segBind('gfToyV',m=>{V=m;$('gfToyV').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit(host)});
  // One run, stepped: answer mix of each view at the chosen step, and hack curves up to it.
  const COL=['var(--c3)','var(--c5)','var(--c2)','var(--c6)'];
  function drawRun(){if(!RES)runAll();const m=$('gfMeth').value,k=+$('gfStep').value,H=RES[m].hist,o=H[Math.min(k,H.length-1)],w=$('gfMixSvg').clientWidth;if(!w)return;
    $('gfStepV').textContent=o.t;const views=[['dep',m.indexOf('graft')===0||m==='noroute'||m==='noanchor'?'Deployed (retain only)':'The policy']];
    if(o.pre){views.push(['pre','Pre-ablation (both adapters)']);views.push(['fo','Forget adapter only'])}
    const lw=Math.min(170,w*0.4),bw=w-lw-10,rh=24;let s='';
    views.forEach(([v,n],i)=>{const d=o[v],y=i*rh+4;s+=tx(lw-6,y+15,w<520?n.split(' (')[0]:n,{fs:11,a:'end',c:'var(--mute)'});let x=lw;
      d.pi.forEach((p,j)=>{s+=rc(x,y+3,bw*p,rh-8,COL[j],{r:0})+(bw*p>34?tx(x+bw*p/2,y+15,(100*p).toFixed(0)+'%',{fs:11,a:'middle',c:'#fff'}):'');x+=bw*p})});
    let lg='',lx=4,ly=views.length*rh+10;TOY.SHORT.forEach((n,j)=>{const lab=j===RES[m].cfg.monitor?n+' (monitored)':n,lw2=lab.length*6.6+26;if(lx+lw2>w&&lx>4){lx=4;ly+=16}lg+=rc(lx,ly,10,10,COL[j],{r:2})+tx(lx+14,ly+9,lab,{fs:11});lx+=lw2});
    $('gfMixSvg').innerHTML=svgW(w,ly+16,s+lg,'Answer mix');
    const W2=w,H2=w<520?190:210,F=linFrame({W:W2,H:H2,pl:40,pr:w<520?84:110,pt:8,pb:32,x:[0,RES[m].cfg.steps],y:[0,100],fy:v=>v+'%',xl:'Training step',yl:'Rate'});let c=F.s;const ends=[];
    const ser=[['dep','hack','var(--c2)','hacking (deployed)'],['dep','clean','var(--c3)','clean solve (deployed)']];if(o.pre)ser.push(['pre','hack','var(--c1)','hacking (pre-ablation)']);
    ser.forEach(([v,key,col,n])=>{const pts=H.slice(0,k+1).map(r=>[r.t,100*r[v][key]]);c+=lineS(H.map(r=>[r.t,100*r[v][key]]),F.X,F.Y,col,{sw:1,op:.25})+lineS(pts,F.X,F.Y,col,{sw:2});const L=pts[pts.length-1];ends.push({y:F.Y(L[1]),n:(w<520?{'hacking (deployed)':'dep. hack','clean solve (deployed)':'clean solve','hacking (pre-ablation)':'pre-abl. hack'}[n]:n),c:col,how:n})});
    c+=ln2(F.X(o.t),8,F.X(o.t),H2-32,'var(--mute)',{da:'3 3'});c+=endLabels(ends,W2-(w<520?84:110)+6,13);
    $('gfCurvSvg').innerHTML=svgW(W2,H2,c,'Training curves');
    const d=o.dep;$('gfRunCap').innerHTML='<b>'+NAME[m]+', step '+o.t+'.</b> '+(o.pre?'Pre-ablation the policy hacks '+pc(100*o.pre.hack)+' ('+pc(100*o.pre.detected)+' the monitored hack); deleting the forget adapter leaves '+pc(100*d.hack)+'. ':'It hacks '+pc(100*d.hack)+', of which the monitor sees '+pc(100*d.flagged)+'. ')+'A real solution is right '+pc(100*d.clean)+' of the time.'}
  $('gfMeth').addEventListener('change',drawRun);$('gfStep').addEventListener('input',drawRun);
  $('gfBack').addEventListener('click',()=>{$('gfStep').value=Math.max(0,+$('gfStep').value-1);drawRun()});$('gfFwd').addEventListener('click',()=>{$('gfStep').value=Math.min(60,+$('gfStep').value+1);drawRun()});
  onTab('t-toy',()=>{fit(host,drawMain);fit($('gfMixSvg'),()=>drawRun())});
  const v=TOYREF.variants;
  $('gfToyHonest').innerHTML='<b>Reproduces, at the defaults (five seeds):</b> the penalty moves the policy to the unmonitored hack ('+pc(100*v.default.penalty.undetected)+' undetected, nothing flagged, proxy reward '+pc(100*v.default.penalty.proxy)+'), as the paper\'s environments were built to do; routing confines the monitored hack to the forget adapter (forget-only policy: '+pc(100*v.default.graft_fo.detected)+' hack 1) and preempts exploration (pre-ablation undetected hacking '+pc(100*v.default.graft_pre.undetected)+'); without routing the deleted adapter takes only half the learned shift ('+pc(100*v.default.noroute.hack)+' hacking); without anchoring the retain-only policy solves less ('+pc(100*v.default.noanchor.clean)+' against '+pc(100*v.default.graft.clean)+'). <b>Does not reproduce:</b> the clean deployed model. Deleting the forget adapter leaves '+pc(100*v.default.graft.hack)+' hacking ('+pc(100*v.default.graft.undetected)+' undetected), against 1.6% on Countdown-Code. With the monitor on the rarest hack, deployed GRAFT hacks '+pc(100*v.monitor_hack3.graft.hack)+'; at recall 0.25, '+pc(100*v.recall_025.graft.hack)+'. Deployed hack 1 also rises above its start, for a toy-specific reason: lowering the real-solution logit in a softmax raises every other answer, hack 1 included. <b>Cannot test:</b> inoculation and absorption, which need adapters with shared features; the toy\'s adapters share nothing, so it shows what routing does without them. Absolute rates and step counts are toy-specific; the order of the methods is the point.';
  $('gfToyCheck').innerHTML='The engine (<code>parts/22_js_toy.js</code>) is the same file in the page and in <code>src/toy_sweep.mjs</code>, which wrote the five-seed numbers quoted on this page; <code>src/check_page.mjs</code> reruns the default seed in the browser and compares it with the sweep. The toy is not a port of the authors\' code: their code trains language models, this trains five logits, following Algorithm 1 and Appendix B.';
})();
