// ---- The Train tab: run the toy R1-Zero live, chunked so the page stays responsive ----
(function(){
const TD=window.TOYDATA,SW=TD.sweep,base=TOY.fromInts(TD.baseInts);let cold=null;
const C1='var(--c1)',C2='var(--c2)',C3='var(--c3)',C4='var(--c4)';
const MAIN=['zero','zero_long','zero_lc','zero_long_lc','cold_lc'];
const DESC={zero:'R1-Zero as the paper ran it: rule reward, short cap raised at 79% of the run. Watch format come first, length creep up under the short cap, then jump with the long one.',
 zero_long:'The same with the long cap from the start: nothing truncates a correct chain, and the toy learns in a fifth of the steps. The short cap was holding it back.',
 zero_lc:'R1-Zero plus the language-consistency reward (Eq. 7). In the toy language A takes over within a few dozen steps at no cost in accuracy.',
 zero_long_lc:'Long cap and language reward: the fair baseline for the cold start below.',
 cold_lc:'R1\'s first two stages at toy scale: fine-tune the base on 128 clean, single-language solutions, then RL with the language reward and the long cap.'};
const sel=$('rnPreset');MAIN.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=SW[k].name;sel.appendChild(o)});
const cfgNow=()=>{const k=sel.value,P=TOY.PRESETS[k];return {key:k,cold:P.cold,cfg:Object.assign({},P.cfg,{eps:+$('rnEps').value,obj:$('rnObj').value,G:+$('rnG').value,seed:+$('rnSeed').value})}};
function sweepKey(){const c=cfgNow(),f=c.cfg;if(f.G!==16)return null;if(f.eps===10&&f.obj==='grpo')return c.key;if(c.key==='zero'&&f.eps===0.2&&f.obj==='grpo')return 'eps02';if(c.key==='zero'&&f.eps===10&&f.obj==='drgrpo')return 'drgrpo';return null}
let live=null,job=null;
function line(el,o){if(!el)return;fit(el,w=>{const H=w<420?190:210,lg=legendW(o.legend||[],8,14,w-16);const F=linFrame({W:w,H:H+lg.h,pl:40,pr:10,pt:8+lg.h,pb:30,x:[0,400],y:o.y,xl:'RL step',yl:o.yl,fy:o.fy});let s=lg.s+F.s;
  (o.hl||[]).forEach(h=>{s+=ln2(F.X(0),F.Y(h.y),F.X(400),F.Y(h.y),h.c,{sw:1.2,da:'5 3'})+tx(F.X(400)-4,F.Y(h.y)-4,h.t,{fs:11,a:'end',c:h.c})});
  if(o.cap)s+=ln2(F.X(o.cap),8+lg.h,F.X(o.cap),H+lg.h-30,'var(--mute)',{sw:1,da:'3 3'})+tx(F.X(o.cap)-4,20+lg.h,'cap raised',{fs:11,a:'end',c:'var(--mute)'});
  (o.series||[]).forEach(S=>{if(S.band){const up=S.band.map(p=>[p[0],p[2]]),dn=S.band.map(p=>[p[0],p[1]]).reverse();s+='<path d="'+pathOf(up.concat(dn),F.X,F.Y)+'Z" fill="'+S.c+'" opacity="0.16"/>'}if(S.pts.length)s+=lineS(S.pts,F.X,F.Y,S.c,{sw:S.sw||1.8,da:S.da})});
  el.innerHTML=svgW(w,H+lg.h,s,o.yl)})}
function draw(){const k=sweepKey(),S=k?SW[k]:null,L=live&&live.hist,c=cfgNow(),cap=c.cfg.capA===10?null:316;
  const ser=(m,col)=>{const out=[];if(S)out.push({pts:S.s.map((s,i)=>[s,S[m][i]]),band:S[m+'Lo']?S.s.map((s,i)=>[s,S[m+'Lo'][i],S[m+'Hi'][i]]):null,c:col,sw:1.2,da:'4 3'});if(L)out.push({pts:L.map(e=>[e.step,e[m]]),c:col,sw:2.2});return out};
  const lgd=(n,col)=>[[n+(L?' (your run)':''),col,'l']].concat(S?[['three-seed sweep, range shaded',col,'da']]:[]);
  line($('rnAcc'),{y:[0.25,1],yl:'accuracy (exact)',fy:v=>Math.round(v*100)+'%',series:ser('acc',C1),hl:[{y:1/3,c:'var(--mute)',t:'guessing'}],cap,legend:lgd('accuracy',C1)});
  line($('rnThink'),{y:[0,5],yl:'thinking tokens per answer',series:ser('think',C2),hl:[{y:4.5,c:C3,t:'needed: 4.5'}],cap,legend:lgd('thinking tokens',C2)});
  const lang=[];if(S){lang.push({pts:S.s.map((s,i)=>[s,S.lc[i]]),band:S.s.map((s,i)=>[s,S.lcLo[i],S.lcHi[i]]),c:C1,sw:1.2,da:'4 3'});lang.push({pts:S.s.map((s,i)=>[s,S.mix[i]]),c:C4,sw:1.2,da:'4 3'})}
  if(L){lang.push({pts:L.map(e=>[e.step,e.lc]),c:C1,sw:2.2});lang.push({pts:L.map(e=>[e.step,e.mix]),c:C4,sw:2.2})}
  line($('rnLang'),{y:[0,1],yl:'language',fy:v=>v.toFixed(1),series:lang,cap,legend:[['share of thinking in A',C1,'l'],['answers mixing both',C4,'l']]});
  const cl=[];if(S&&S.clip)cl.push({pts:S.s.slice(1).map((s,i)=>[s,S.clip[i+1]]),c:C2,sw:1.2,da:'4 3'});if(L)cl.push({pts:L.slice(1).map(e=>[e.step,e.clipShare||0]),c:C2,sw:2.2});
  line($('rnClip'),{y:[0,0.2],yl:'share of tokens clipped',fy:v=>Math.round(v*100)+'%',series:cl,cap,legend:[['tokens whose gradient the clip removed',C2,'l']]});
  drawHm();drawTr()}
function drawHm(){const el=$('rnHm');fit(el,w=>{const k=sweepKey(),L=live&&live.hist;let rows,steps,lab;if(L){rows=L.map(e=>e.byN.map(o=>o.acc));steps=L.map(e=>e.step);lab='your run'}else if(k){rows=SW[k].byN;steps=SW[k].s;lab='sweep mean'}else{el.innerHTML='<p class="small mute">Train to see this run.</p>';return}
  const lw=44,cw=Math.max(6,(w-lw-8)/21),ch=18;let s='';for(let n=0;n<8;n++){s+=tx(lw-6,22+n*ch+ch*0.7,n+1+' digits',{fs:11,a:'end',c:'var(--mute)'})}
  rows.forEach((r,j)=>{r.forEach((v,n)=>{const t=Math.max(0,Math.min(1,(v-1/3)/(2/3)));s+=rc(lw+j*cw,22+n*ch,cw-1,ch-1,'var(--acc)',{r:1,op:(0.08+0.92*t).toFixed(2)})+'<title>step '+steps[j]+', '+(n+1)+' digits: '+Math.round(v*100)+'%</title>'})});
  s+=tx(lw,14,lab+': darker is more accurate (pale is guessing)',{fs:11,c:'var(--mute)'});[0,100,200,300,400].forEach(st=>{const j=steps.indexOf(st);if(j>=0)s+=tx(lw+j*cw+cw/2,22+8*ch+14,String(st),{fs:11,a:'middle',c:'var(--mute)'})});
  el.innerHTML=svgW(w,22+8*ch+20,s,'Accuracy by question length over training')})}
const TOKC=t=>t<3?'a':t<6?'b':t===6?'tg':'ans',TOKT=t=>TOY.TOK[t];
function drawTr(){const ck=+$('rnCk').value,QS=TD.QS;let outs,step,cap;
  if(live&&live.snaps[ck]){const sn=live.snaps[ck],r=TOY.rng(2000+ck);step=sn.step;cap=sn.cap;outs=QS.map(q=>TOY.rollOne(sn.p,q,cap,r))}
  else{const tr=TD.traces;const want=ck*20;const T=tr.reduce((a,b)=>Math.abs(b.s-want)<Math.abs(a.s-want)?b:a);step=T.s;cap=T.cap;outs=T.out.map(o=>({toks:o.t,acc:o.acc,fmt:o.fmt,trunc:o.trunc}))}
  $('rnCkV').textContent=step;let h='';QS.forEach((q,i)=>{const o=outs[i],ans=q.reduce((a,b)=>a+b,0)%3;h+='<div class="q">'+q.join('')+' → '+ans+'</div><div>'+o.toks.map(t=>'<span class="tok '+TOKC(t)+(t>=7?(t-7===ans?' ok':' no'):'')+'">'+TOKT(t)+'</span>').join('')+(o.trunc?' <span class="small" style="color:var(--bad)">cut off by the cap</span>':'')+'</div>'});
  $('rnTr').innerHTML=h;$('rnTrNote').textContent=live&&live.snaps[ck]?'Your run, cap '+cap+' tokens; a fresh sample each time you move the slider back here.':'The published run (R1-Zero preset, seed 1), cap '+cap+' tokens. Train to sample from your own checkpoints.'}
$('rnCk').addEventListener('input',drawTr);
function start(){if(job)return;const c=cfgNow();if(c.cold&&!cold)cold=TOY.coldStart(base);const run=TOY.makeRun(c.cold?cold:base,c.cfg);const E=20;
  live={hist:[],snaps:[],key:sweepKey(),cfg:c};let clipped=0,tokens=0;
  const ev=()=>{const cap=TOY.capAt(run.cfg,run.steps),e=TOY.evaluate(run.p,cap,run.cfg.lcEmpty);e.step=run.steps;e.cap=cap;e.clipShare=tokens?clipped/tokens:0;clipped=0;tokens=0;live.hist.push(e);live.snaps.push({step:run.steps,cap,p:Float64Array.from(run.p)})};
  ev();$('rnGo').disabled=true;$('rnStop').disabled=false;const t0=performance.now();
  const tick=()=>{const tEnd=performance.now()+30;while(run.steps<run.cfg.steps&&performance.now()<tEnd){const info=TOY.trainStep(run);clipped+=info.clipped;tokens+=info.tokens;if(run.steps%E===0)ev()}
    $('rnBar').style.width=(100*run.steps/run.cfg.steps)+'%';const e=live.hist[live.hist.length-1];
    $('rnStatus').textContent='step '+run.steps+' of '+run.cfg.steps+' · accuracy '+Math.round(e.acc*100)+'% · thinking '+e.think.toFixed(2)+' tokens · '+((performance.now()-t0)/1000).toFixed(1)+' s';
    $('rnCk').max=live.hist.length-1;$('rnCk').value=live.hist.length-1;draw();
    if(run.steps<run.cfg.steps&&job)job=setTimeout(tick,0);else finish()};
  job=setTimeout(tick,0)}
function finish(){job=null;$('rnGo').disabled=false;$('rnStop').disabled=true;const k=live.key,L=live.hist;let msg=$('rnStatus').textContent;
  if(k&&L.length===21){const ref=SW[k].seeds[live.cfg.cfg.seed-1];let d=0;L.forEach((e,i)=>{d=Math.max(d,Math.abs(e.acc-ref.acc[i]),Math.abs(e.think-ref.think[i]))});
    msg+=' · reproduces the offline sweep (seed '+live.cfg.cfg.seed+') at all 21 checkpoints, largest difference '+d.toExponential(1)+' (the sweep stores 3 decimals)';document.getElementById('runCard').dataset.repro=d.toFixed(6)}
  $('rnStatus').textContent=msg;document.getElementById('runCard').dataset.done='1'}
$('rnGo').addEventListener('click',start);$('rnStop').addEventListener('click',()=>{if(job){clearTimeout(job);job=null;finish()}});
['rnPreset','rnEps','rnObj','rnG','rnSeed'].forEach(id=>$(id).addEventListener('change',()=>{if(job){clearTimeout(job);job=null}live=null;$('rnBar').style.width='0';$('rnStatus').textContent='';$('rnGo').disabled=false;$('rnStop').disabled=true;$('rnCk').max=20;$('rnCk').value=0;desc();draw()}));
function desc(){const c=cfgNow(),k=sweepKey();$('rnDesc').innerHTML=DESC[c.key]+(k?' The dashed line and shaded band are the offline sweep for this configuration.':' This combination is not in the offline sweep, so only your run is drawn.')}
// sweep table and the reproduction box
(function(){const rows=[['Run','Final accuracy','Thinking tokens','Language A share','Accuracy at step 300','Steps to 80%']];
  Object.entries(SW).forEach(([k,v])=>{const n=v.s.length-1,i300=v.s.indexOf(300),r80=v.s.find((s,i)=>v.acc[i]>=0.8);
    rows.push([v.name,(v.acc[n]*100).toFixed(1)+'% ('+(v.accLo[n]*100).toFixed(1)+' to '+(v.accHi[n]*100).toFixed(1)+')',v.think[n].toFixed(2),v.lc[n].toFixed(2)+' ('+v.lcLo[n].toFixed(2)+' to '+v.lcHi[n].toFixed(2)+')',(v.acc[i300]*100).toFixed(1)+'%',r80==null?'never':String(r80)])});
  $('rnSweep').innerHTML='<thead><tr>'+rows[0].map((h,i)=>'<th'+(i?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map((c,i)=>'<td'+(i?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>';
  const z=SW.zero,n=z.s.length-1,e2=SW.eps02,dr=SW.drgrpo,zl=SW.zero_long,cl=SW.cold_lc,zll=SW.zero_long_lc,zc=SW.zero_lc,i300=z.s.indexOf(300);
  const items=[['ok','reproduces','Length grows from an outcome reward alone: '+TD.base.think.toFixed(1)+' to '+z.think[n].toFixed(1)+' thinking tokens, the mean the questions need, in all three seeds (Figure 1(b)).'],
   ['ok','reproduces','A jump in length and accuracy when the cap is raised: accuracy '+(z.acc[i300]*100).toFixed(0)+'% at step 300 under the short cap, '+(z.acc[n]*100).toFixed(0)+'% at 400 (the paper\'s 8.2k-step jump). With the long cap from the start the toy reaches 80% by step '+zl.s.find((s,i)=>zl.acc[i]>=0.8)+': in the toy the short cap was the bottleneck.'],
   ['ok','reproduces','Easy questions first, hard ones later (Figure 8): see the heatmap.'],
   ['ok','reproduces','A small clip ratio slows learning when 16 minibatches share a rollout (§3.2.1): ε = 0.2 clips '+(e2.clip[1]*100).toFixed(0)+'% of tokens early and ends at '+(e2.acc[n]*100).toFixed(1)+'% against '+(z.acc[n]*100).toFixed(1)+'% at ε = 10. The toy never shows the instability the paper warns of at high ε.'],
   ['ok','reproduces','A cold start gives RL a head start (§3, v1 §2.3): '+(cl.acc[0]*100).toFixed(0)+'% before RL against '+(zll.acc[0]*100).toFixed(0)+'%, and '+(cl.acc[n]*100).toFixed(1)+'% against '+(zll.acc[n]*100).toFixed(1)+'% after 400 steps.'],
   ['no','does not reproduce','Language mixing that persists (§3): with nothing rewarding either language, the toy drifts to one language, usually the one its corpus favoured (final A share '+z.lcLo[n].toFixed(2)+' to '+z.lcHi[n].toFixed(2)+' over seeds, answers mixing both '+(z.mix[n]*100).toFixed(0)+'%). R1-Zero\'s mixing must have had a cause the toy lacks.'],
   ['no','does not reproduce','A cost for the language reward (Appendix B.6): '+(zc.acc[n]*100).toFixed(1)+'% with it against '+(z.acc[n]*100).toFixed(1)+'% without. In the toy the languages are equally good by construction; the paper\'s cost (about a point, one run) may be noise or may come from what language does in a real model.'],
   ['mid','not testable','Dev1\'s drop below R1-Zero: the toy\'s cold-start data is better than its base model, unlike R1\'s against a converged R1-Zero.'],
   ['mid','a check on later work','Dr. GRPO\'s unbiased loss changes nothing here (final '+(dr.acc[n]*100).toFixed(1)+'%, '+dr.think[n].toFixed(2)+' thinking tokens): the toy\'s length growth is the reward\'s, not GRPO\'s 1/|o| bias.']];
  $('rnReproL').innerHTML=items.map(([c,t,x])=>'<li><span class="vd '+c+'">'+t+'</span> '+x+'</li>').join('')})();
onTab('t-run',()=>{desc();draw()});
})();
