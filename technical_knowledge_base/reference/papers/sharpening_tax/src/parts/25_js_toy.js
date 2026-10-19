// ---- Train with PTGS tab: one batch through both samplers, the ten-seed sweep, a live run ----
(function(){
if(!window.TOY||!window.TOYD||!$('pt'))return;
const D=TOYD,pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%',n=TOY.CFG.group;
const AC={base:'var(--c6)',fixed:'var(--c2)',globalT:'var(--c5)',ptgs:'var(--c1)'},AN={base:'base (untrained)',fixed:'fixed T = 1',globalT:'global T = '+D.globalT.toFixed(2),ptgs:'PTGS, τ = 1.5'};
const I=q=>1-Math.pow(1-q,n),J=q=>1-Math.pow(q,n)-Math.pow(1-q,n);
$('ptSnapStep').textContent=D.snap.step;$('tyGT').textContent='T = '+D.globalT.toFixed(3);
// 1. one batch, two samplers (Theorem 3 on real toy prompts)
const B=D.snap.batch;
const SF=[{t:'Eight prompts',c:'Each row is one prompt of this training step; the dot is the policy\'s exact chance of solving it in one attempt at T = 1. Four are solved most of the time, four almost never.'},
  {t:'One temperature for all',c:'The fixed sampler uses T = 1 for every group, whatever the prompt\'s history.'},
  {t:'What a group of 8 can teach',c:'Right-hand bars: the chance the group of 8 rollouts contains at least one success (I, what PPO needs to reinforce a success) and the chance it is mixed (J, the only groups that give GRPO a nonzero advantage). For the four hard prompts both are close to zero: their groups will almost certainly all fail and teach nothing. The mastered ones produce mixed groups only because they still fail now and then.'}];
const SP=[{t:'Eight prompts, and what PTGS remembers',c:'The same prompts and weights. The hollow tick is PTGS\'s posterior mean for each prompt, built from its discounted past successes and failures. Prompt 65 is the interesting one: the policy now solves it 78% of the time, but its posterior still remembers earlier failures and sits near 9%.'},
  {t:'A Thompson draw sets each temperature',c:'PTGS draws p̂ from each posterior and maps it to a temperature with Eq. 4: low draws are heated toward τ = 1.5, high draws cooled toward 1/τ. The four prompts with failing histories, and prompt 65, get 1.37 to 1.50; the three the posterior rates as mastered get 0.72 to 0.90.'},
  {t:'The temperature changes the odds',c:'Heating raises the hard prompts\' success probabilities (several-fold, from tiny bases), and cooling pushes the mastered ones closer to certain. But prompt 65, heated on stale evidence, falls from 78% to 53%: Theorem 3\'s assumption, that heating raises a hard prompt\'s success probability, fails when the posterior lags.'},
  {t:'What a group of 8 can teach now',c:'Compare with the fixed sampler\'s last step. Heating the four hard prompts raises their chance of a group with a success from 0.08 to 0.27 combined (Theorem 3 (i)). Cooling the three mastered prompts turns most of their mixed groups into all-success groups (Proposition 5), so at this one step the expected number of mixed groups, the only ones GRPO learns from, falls. Over training the balance goes the other way (the trace below: more mixed groups than the fixed sampler late in training), because hard prompts that start to succeed stay in play. The realised groups at this step had '+B.map(b=>b.k).join(', ')+' successes of 8.'}];
makeAnim({id:'pt',mode:'ptgs',modes:{fixed:SF,ptgs:SP},dur:2600,
  draw(m,k,e,w){const narrow=w<480,rh=30,top=34,H=top+B.length*rh+30,lw=narrow?40:62,rw=narrow?118:176,x0=lw+6,x1=w-rw-8;
    const lx=p=>x0+(x1-x0)*(Math.log10(Math.max(p,1e-4))+4)/4;let s='';
    [1e-4,1e-3,1e-2,1e-1,1].forEach((v,i)=>{s+=ln2(lx(v),top-6,lx(v),top+B.length*rh,'var(--line)')+tx(lx(v),top+B.length*rh+14,['0.01%','0.1%','1%','10%','100%'][i],{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((x0+x1)/2,14,'success per attempt (log scale)',{fs:11,a:'middle',c:'var(--mute)'});
    const cT=x1+8,cI=cT+(narrow?40:56),bwid=narrow?30:48;
    s+=tx(cT,14,'T',{fs:11,c:'var(--mute)'})+tx(cI,14,'≥1',{fs:11,c:'var(--mute)'})+tx(cI+bwid+6,14,'mixed',{fs:11,c:'var(--mute)'});
    const ptgs=m==='ptgs';let sI=0,sJ=0;
    B.forEach((b,i)=>{const y=top+i*rh+rh/2;s+=tx(lw,y+4,(narrow?'':'task ')+b.x,{fs:11,a:'end',c:'var(--mute)'});
      const T=ptgs&&k>=1?b.T:1,showT=k>=1,moved=ptgs&&k>=2,pNow=moved?(k===2?Math.exp(Math.log(Math.max(b.p1,1e-6))+(Math.log(Math.max(b.pT,1e-6))-Math.log(Math.max(b.p1,1e-6)))*e):b.pT):b.p1;
      if(ptgs){const pm=b.a/(b.a+b.b);s+=ln2(lx(pm),y-8,lx(pm),y+8,'var(--ink)',{sw:1.6,op:.7})}
      if(moved)s+=dotS(lx(b.p1),y,3.5,'var(--mute)',{hollow:true});
      s+=dotS(lx(pNow),y,5.5,ptgs?(b.T>1.05?'var(--bad)':b.T<0.95?'var(--good)':'var(--c1)'):'var(--c2)');
      if(ptgs&&k===1)s+=tx(lx(Math.max(b.pHat,1e-4)),y-9,'p̂',{fs:11,a:'middle',c:'var(--mute)'});
      if(showT)s+=tx(cT,y+4,T.toFixed(2),{fs:11,c:T>1.05?'var(--bad)':T<0.95?'var(--good)':'var(--ink)',w:'600'});
      const q=ptgs?(k>=2?pNow:b.p1):b.p1,show=ptgs?k>=3:k>=2;
      if(show){const iv=I(q),jv=J(q);sI+=iv;sJ+=jv;s+=rc(cI,y-6,bwid,12,'var(--soft)',{r:2})+rc(cI,y-6,bwid*iv,12,'var(--c1)',{r:2})+rc(cI+bwid+6,y-6,bwid,12,'var(--soft)',{r:2})+rc(cI+bwid+6,y-6,bwid*jv,12,'var(--c4)',{r:2})}});
    return svgW(w,H,s,'one batch through '+m)},
  counters(m,k,e){const ptgs=m==='ptgs',q=b=>ptgs?b.pT:b.p1,show=ptgs?k>=3:k>=2;const fI=B.reduce((a,b)=>a+I(b.p1),0),fJ=B.reduce((a,b)=>a+J(b.p1),0),pI=B.reduce((a,b)=>a+I(b.pT),0),pJ=B.reduce((a,b)=>a+J(b.pT),0);
    if(!show)return '<span>8 prompts, groups of '+n+'</span> <span>target p̃ = '+D.snap.pivot.toFixed(3)+' at this step</span>';
    return '<span>expected groups with a success: fixed <b>'+fI.toFixed(2)+'</b>'+(ptgs?', PTGS <b>'+pI.toFixed(2)+'</b>':'')+'</span> <span>expected mixed groups: fixed <b>'+fJ.toFixed(2)+'</b>'+(ptgs?', PTGS <b>'+pJ.toFixed(2)+'</b>':'')+'</span>'}});
// 2. the ten-seed sweep
const arms=['base','fixed','globalT','ptgs'],S=D.summary;
function sweepChart(el,w){const H=w<480?220:250,lg=Math.log2;const F=linFrame({W:w,H,pl:42,pr:14,pt:10,pb:34,x:[0,7],y:[0,1],xt:[0,1,2,3,4,5,6,7],fx:v=>String(2**v),fy:v=>Math.round(v*100)+'%',yt:[0,.25,.5,.75,1],xl:'budget k'});
  let s=F.s;arms.forEach(a=>{s+=lineS(D.KS.map((k,i)=>[lg(k),S[a].cov[i]]),F.X,F.Y,AC[a],{sw:2.2});D.KS.forEach((k,i)=>{s+=dotS(F.X(lg(k)),F.Y(S[a].cov[i]),2.5,AC[a])})});
  const L=legendW(arms.map(a=>[AN[a],AC[a],'l']),46,H+14,w-50);el.innerHTML=svgW(w,H+L.h+6,s+L.s,'toy pass@k')}
fit($('tySvg'),w=>sweepChart($('tySvg'),w));
$('tyTab').innerHTML='<div class="tw"><table class="t3"><thead><tr><th>arm (this page, 10 seeds)</th><th class="num">pass@1</th><th class="num">pass@128</th><th class="num">pass<sup>128</sup></th><th class="num">Tax<sub>S</sub>(128)</th><th class="num">always / some / never</th></tr></thead><tbody>'
  +arms.map(a=>'<tr><td><i class="kchip" style="background:'+AC[a]+'"></i>'+AN[a]+'</td><td class="num">'+pct(S[a].p1)+' ± '+(100*S[a].p1sd).toFixed(1)+'</td><td class="num">'+pct(S[a].pK)+' ± '+(100*S[a].pKsd).toFixed(1)+'</td><td class="num">'+pct(S[a].conK)+'</td><td class="num">'+(S[a].taxS==null?'–':S[a].taxS.toFixed(3)+' ± '+S[a].taxSsd.toFixed(3))+'</td><td class="num">'+S[a].cat.map(v=>Math.round(100*v)).join(' / ')+'%</td></tr>').join('')+'</tbody></table></div>';
const vf=S.fixed.vsPtgs,vg=S.globalT.vsPtgs;
$('tyNote').innerHTML='Mean ± standard deviation over 10 seeds (each seed a new task pool, shared by all arms). Paired per seed, PTGS beats fixed by '+(100*vf.d1).toFixed(1)+' points of pass@1 (on '+vf.won1+' of 10 seeds) and '+(100*vf.dK).toFixed(1)+' of pass@128 ('+vf.wonK+' of 10), and global T by '+(100*vg.d1).toFixed(1)+' ('+vg.won1+' of 10) and '+(100*vg.dK).toFixed(1)+' ('+vg.wonK+' of 10). Measured with the page\'s engine (toy_sweep.mjs); deterministic, so a rerun gives the same numbers.';
$('tyWin').textContent='pass@128 '+pct(S.ptgs.pK)+' against '+pct(S.fixed.pK)+' and '+pct(S.globalT.pK)+'; pass@1 '+pct(S.ptgs.p1)+' against '+pct(S.fixed.p1)+' and '+pct(S.globalT.p1);
$('tyTax').textContent=S.fixed.taxS.toFixed(3)+' (fixed) to '+S.ptgs.taxS.toFixed(3)+' (PTGS), within one standard deviation across seeds ('+S.ptgs.taxSsd.toFixed(3)+')';
$('tyHot').textContent='reaches pass@128 '+pct(S.globalT.pK)+', against '+pct(S.fixed.pK)+' for fixed and '+pct(S.ptgs.pK)+' for PTGS (the authors\' toy: '+(()=>{const r=PAPER.tables.toyA.rows;const g=r.find(x=>x.arm==='globalT'),f=r.find(x=>x.arm==='fixed'),p=r.find(x=>x.arm==='ptgs');return g.p128[0].toFixed(1)+'%, '+f.p128[0].toFixed(1)+'% and '+p.p128[0].toFixed(1)+'%'})()+').';
// the authors' toy table
$('tyA').querySelector('tbody').innerHTML=PAPER.tables.toyA.rows.map(r=>'<tr><td>'+(r.arm==='globalT'?'global T = '+PAPER.tables.toyA.globalT.toFixed(3):r.arm)+'</td><td class="num">'+r.p1[0].toFixed(1)+' ± '+r.p1[1].toFixed(1)+'</td><td class="num">'+r.p128[0].toFixed(1)+' ± '+r.p128[1].toFixed(1)+'</td><td class="num">'+r.con128[0].toFixed(1)+'</td><td class="num">'+(r.taxS?r.taxS[0].toFixed(3)+' ± '+r.taxS[1].toFixed(3):'–')+'</td></tr>').join('');
const C=window.TOYCHECK;
$('tyChk').innerHTML='Above: the authors\' numpy toy, run unmodified (seeds 0 to 4, its own random generator), so it agrees with this page in direction and rough size, not draw for draw. The page\'s engine was checked piece by piece against the authors\' code on fixed inputs (check_toy.py): decision probabilities within '+(C?C.probs_maxdiff.toExponential(1):'?')+', policy-gradient update within '+(C?C.grad_maxdiff.toExponential(1):'?')+', tempering rule within '+(C?C.temp_maxdiff.toExponential(1):'?')+', pass@k and S(K) identical, Beta sampler moments within sampling error: '+(C?C.verdict:'not run')+'.';
if(D.sens)$('tySens').innerHTML='How noisy is one run? Rerunning the global-T arm with its temperature rounded to four decimals (a change of '+D.sens.dT.toExponential(1)+') moves one seed\'s pass@128 by up to '+(100*D.sens.dPassK).toFixed(1)+' points: training is chaotic, so single runs say little, and every comparison above is paired over ten seeds. The paper\'s PTGS results rest on five runs per arm.';
// 3. training traces
let trF='any';const TL={any:'groups with ≥ 1 success',mixed:'mixed groups',temp:'mean sampling temperature',ent:'mean decision entropy (nats)'};
function trace(){const el=$('trSvg2');fit(el,w=>{const H=w<480?200:230,tr=D.trace,ar=['fixed','globalT','ptgs'];let mn=1e9,mx=-1e9;ar.forEach(a=>tr[a][trF].forEach(v=>{mn=Math.min(mn,v);mx=Math.max(mx,v)}));if(trF!=='temp'&&trF!=='ent')mn=0;const pad=(mx-mn)*0.08||0.05;
  const F=linFrame({W:w,H,pl:44,pr:14,pt:10,pb:34,x:[0,200],y:[Math.max(0,mn-pad),mx+pad],fy:v=>trF==='any'||trF==='mixed'?Math.round(v*100)+'%':v.toFixed(2),xl:'training step',nx:w<480?4:5});
  let s=F.s;ar.forEach(a=>{s+=lineS(tr[a][trF].map((v,i)=>[i,v]),F.X,F.Y,AC[a],{sw:2})});const L=legendW(ar.map(a=>[AN[a],AC[a],'l']),46,H+14,w-50);
  el.innerHTML=svgW(w,H+L.h+6,s+L.s,TL[trF]);const l5=D.last50;
  $('trNote2').innerHTML=TL[trF]+'. Last 50 steps: groups with a success '+pct(l5.fixed.any)+' (fixed), '+pct(l5.globalT.any)+' (global T), '+pct(l5.ptgs.any)+' (PTGS); mixed groups '+pct(l5.fixed.mixed)+', '+pct(l5.globalT.mixed)+', '+pct(l5.ptgs.mixed)+'; mean T 1.00, '+l5.globalT.temp.toFixed(2)+', '+l5.ptgs.temp.toFixed(2)+'.'})}
segBind('trM',m=>{trF=m;trace()});trace();
// 4. live training
const ss=$('tySeed');ss.innerHTML=[...Array(D.seeds).keys()].map(i=>'<option value="'+i+'">'+i+'</option>').join('');
const tau=$('tyTau'),tv=()=>$('tyTauV').textContent=(+tau.value).toFixed(1);tau.addEventListener('input',tv);tv();
let live=null;
function liveDraw(){if(!live)return;fit($('tyLiveSvg'),w=>{$('tyLiveSvg').innerHTML=kchart(w,live.arms.map(a=>({n:AN[a].replace('τ = 1.5','τ = '+live.tau.toFixed(1)),c:AC[a],cov:live.res[a].cov,con:live.res[a].con})),{noCon:true,H:w<480?200:230,label:'live toy run'})})}
$('tyGo').addEventListener('click',()=>{const seed=+ss.value,t=+tau.value,tk=TOY.makeTasks(TOY.CFG,seed),res={},arms=['base','fixed','globalT','ptgs'];
  arms.forEach(a=>{const W=a==='base'?tk.W0:TOY.train(tk,a,seed,{tau:t,globalT:D.globalTfull}).W,c=TOY.evaluate(tk,W,seed),cv=TOY.curves(c,128,128),sc=TOY.scal(cv.cov,128);res[a]={cov:cv.cov,con:cv.con,S:sc.S}});
  live={seed,tau:t,res,arms};liveDraw();
  let same=Math.abs(t-1.5)<1e-9,md=0;if(same)arms.forEach(a=>{const ps=D.perSeed[a][seed];D.KS.forEach((k,i)=>{md=Math.max(md,Math.abs(ps.cov[i]-Math.round(res[a].cov[k-1]*1e4)/1e4))})});
  $('tyLiveOut').innerHTML='<p>Seed '+seed+', τ = '+t.toFixed(1)+': pass@1 / pass@128 / Tax<sub>S</sub>(128): '+['fixed','globalT','ptgs'].map(a=>'<b>'+(a==='globalT'?'global T':a)+'</b> '+pct(res[a].cov[0])+' / '+pct(res[a].cov[127])+' / '+(res.base.S-res[a].S).toFixed(3)).join('; ')+' (base '+pct(res.base.cov[0])+' / '+pct(res.base.cov[127])+').</p><p class="mute">'+(same?(md<1e-4?'Matches the ten-seed sweep for this seed exactly ✓':'Differs from the sweep by '+md.toFixed(4)):'τ differs from the sweep\'s 1.5, so there is nothing to match; the global-T arm stays at the sweep\'s heat-matched '+D.globalT.toFixed(3)+'.')+'</p>'});
onTab('t-toy',()=>{liveDraw()});
})();
