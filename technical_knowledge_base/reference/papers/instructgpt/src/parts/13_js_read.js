// ---- The paper tab: Figure 2 redrawn, Table 1, the RM widget, the episode animation, predict reveals, figures ----
const FG=window.PAPER.figs,SW=window.SWEEP;
const MODELS=['GPT','GPT (prompted)','SFT','PPO','PPO-ptx'];
// a line chart: series [{n,c,pts:[[x,v,lo,hi]],da}], o: {W,H,x,y,xlog,xt,yt,xl,yl,refs:[[v,label,c]],title}
function lineChart(o){const W=o.W,TT=o.title?titleSvg(o.title,W,12):null,H=(o.H||220)+(TT?TT.h-16:0),f=frame(Object.assign({pl:46,pr:12,pb:38},o,{H,pt:TT?TT.h+8:10}));let s=f.s;
  if(TT)s+=TT.s;
  (o.refs||[]).forEach(([v,l,c,al])=>{s+=ln2(f.sx(o.x[0]),f.sy(v),f.sx(o.x[1]),f.sy(v),c||'var(--mute)',{da:'4 3'})+(al==='start'?tx(f.sx(o.x[0])+4,f.sy(v)+13,l,{fs:11,c:c||'var(--mute)'}):tx(f.sx(o.x[1])-2,f.sy(v)-3,l,{fs:11,a:'end',c:c||'var(--mute)'}))});
  o.series.forEach(se=>{const P=se.pts.map(p=>[f.sx(p[0]),f.sy(p[1])]);s+=path(P,se.c,{sw:se.sw||2,da:se.da,op:se.op});
    se.pts.forEach((p,i)=>{if(p[2]!=null)s+=ln2(P[i][0],f.sy(p[2]),P[i][0],f.sy(p[3]),se.c,{sw:1.2,op:se.op});if(!se.nodot)s+='<circle cx="'+P[i][0].toFixed(1)+'" cy="'+P[i][1].toFixed(1)+'" r="3.2" fill="'+se.c+'"'+(se.op!=null?' opacity="'+se.op+'"':'')+'><title>'+escH(se.n)+': '+(o.fmt||(v=>v.toFixed(3)))(p[1])+(p[2]!=null?' ('+(o.fmt||(v=>v.toFixed(3)))(p[2])+' to '+(o.fmt||(v=>v.toFixed(3)))(p[3])+')':'')+'</title></circle>'})});
  const lg=legend(o.series.filter(se=>!se.nolg).map(se=>[se.n,se.c,se.da]),o.pl||46,H+14,W-(o.pl||46));
  return svgW(W,H+lg.h,s+lg.s,o.title||'chart')}
// Figure 2 redrawn: three steps, each with its training set to scale (Table 6)
fit($('pipeSvg'),W=>{const n=W<560,sz=RC.sizes,mx=sz.RM.train,steps=[['1','Supervised fine-tuning','labelers write demonstrations',sz.SFT.train,'prompts with a demonstration','var(--c3)'],
  ['2','Reward model','labelers rank 4 to 9 answers',sz.RM.train,'prompts with ranked answers','var(--c1)'],['3','PPO against the RM','no labels: prompts only',sz.PPO.train,'prompts, unlabeled','var(--c2)']];
  let s='',y=4;const bw=n?W-8:(W-40)/3;
  steps.forEach((st,i)=>{const x=n?0:i*(bw+20),yy=n?y+i*92:4,bh=14,len=(bw-20)*st[3]/mx;
    s+=rc(x,yy,bw,82,'var(--soft)',{s:'var(--line)'})+tx(x+10,yy+18,'Step '+st[0]+': '+st[1],{fs:13,w:600})+tx(x+10,yy+35,st[2],{fs:12,c:'var(--mute)'});
    s+=rc(x+10,yy+46,len,bh,st[5],{r:3})+tx(x+10,yy+74,fmt(st[3])+' '+st[4],{fs:12});
    if(!n&&i<2)s+=ln2(x+bw+3,yy+41,x+bw+17,yy+41,'var(--mute)',{sw:1.6})+'<path d="M'+(x+bw+17)+' '+(yy+37)+'l5 4l-5 4z" fill="var(--mute)"/>'});
  return $('pipeSvg').innerHTML=svgW(W,n?3*92:90,s,'The three steps with their training-set sizes')});
// Table 1 bars
fit($('t1Svg'),W=>{$('t1Svg').innerHTML=hbars(W,TB.t1.rows.map(r=>({n:r[0],v:parseFloat(r[1]),c:['Generation','Brainstorming'].includes(r[0])?'var(--c2)':['Classification','Open QA','Closed QA'].includes(r[0])?'var(--c1)':'var(--dim)'})),{fmt:v=>v.toFixed(1)+'%',dom:[0,50],title:'Use-case categories of API prompts (%)'})});
// ---- the reward-model widget: K live answers, one labeler's ranking, every pair's term of Eq. 1 ----
(function(){const out=$('rmwOut');let seed=1,K=4;
  function draw(){TM.need(S=>{const r=TOY.rng(900+seed),t=r.int(TOY.NT),ys=[];for(let k=0;k<K;k++)ys.push(TOY.sample(S.sft,t,r).y);
    const us=ys.map(y=>TOY.utility(t,y)),ord=TOY.rank(us,r,S.o.tau),rs=ys.map(y=>TOY.rmScore(S.rm,t,y));
    const pos=[];ord.forEach((i,p)=>pos[i]=p);const pairs=[];
    for(let a=0;a<K;a++)for(let b=a+1;b<K;b++){const w=ord[a],l=ord[b];const same=ys[w].join()===ys[l].join();pairs.push({w,l,same,d:rs[w]-rs[l]})};
    const live=pairs.filter(p=>!p.same),L=live.length?live.reduce((s,p)=>s-Math.log(TOY.sig(p.d)),0)/live.length:0;
    let h='<p class="small" style="margin:0 0 4px">Prompt: '+chips(words(TOY.promptSeq(t)),'p')+'</p><div class="samp"><div class="hd tn">labeler rank</div><div class="hd">answer from the SFT model</div><div class="hd sc">RM r</div>';
    ord.forEach((i,p)=>{h+='<div class="tn small">'+(p+1)+(p===0?' (best)':p===K-1?' (worst)':'')+'</div><div>'+chips(words(ys[i]))+'</div><div class="sc">'+rs[i].toFixed(2)+'</div>'});
    h+='</div>';out.innerHTML=h;
    fit($('rmwSvg'),W=>{const n=live.length,rh=W<560?16:15,x0=W<560?96:150,x1=W-60;const TT=titleSvg('The C('+K+',2) = '+pairs.length+' pairs: -log σ(r_w - r_l) for each',W,12),top=TT.h+6;let s=TT.s;
      const mx=Math.max(1,...pairs.map(p=>p.same?0:-Math.log(TOY.sig(p.d))));
      pairs.forEach((p,i)=>{const y=top+i*rh,v=p.same?0:-Math.log(TOY.sig(p.d));s+=tx(0,y+11,'#'+(pos[p.w]+1)+' over #'+(pos[p.l]+1),{fs:11,c:'var(--mute)'});
        if(p.same)s+=tx(x0,y+11,'identical texts: a tie, dropped',{fs:11,c:'var(--mute)'});else s+=rc(x0,y+2,(x1-x0)*v/mx,rh-5,p.d>0?'var(--c3)':'var(--c2)',{r:2})+tx(x0+(x1-x0)*v/mx+4,y+11,v.toFixed(2),{fs:11})});
      const y=top+pairs.length*rh+6;
      $('rmwSvg').innerHTML=svgW(W,y,s,'Pairwise loss terms')+'<p class="small" style="margin:4px 0 0">Loss for this prompt (one batch element) = the mean = <b>'+L.toFixed(3)+'</b>; the RM orders '+live.filter(p=>p.d>0).length+' of '+live.length+' pairs as the labeler did.<br><span class="mute">Cost: '+K+' RM forward passes in one batch element, against '+(K*(K-1))+' if each pair were a separate example ('+(K-1)+' times more).</span></p>'})})}
  $('rmwK').addEventListener('input',e=>{K=+e.target.value;$('rmwKv').textContent=K;draw()});$('rmwKv').textContent=K;
  $('rmwNew').addEventListener('click',()=>{seed++;draw()});
  if('IntersectionObserver' in window)new IntersectionObserver((es,ob)=>{if(es[es.length-1].isIntersecting){ob.disconnect();draw()}},{rootMargin:'300px'}).observe($('rmw'));else draw()})();
// ---- one PPO episode, token by token, with and without the pretraining term ----
(function(){let E=null,nEp=0,A=null;const BETA=.3,GAM=.1,ETA=.5;
  function build(){const S=TM.st.S,Rp=TM.st.runs[TM.key(TOY_PPO)],Rx=TM.st.runs[TM.key(TOY_PTX)];if(!Rp||!Rp.done||!Rx||!Rx.done)return null;
    const mk=(R,mode)=>{const r=TOY.rng(4242+nEp),t=r.int(TOY.NT),s=TOY.sample(R.pol,t,r),ref=TOY.seqLogps(S.sft,t,s.y),rm=TOY.rmScore(S.rm,t,s.y),n=s.y.length;
      const pen=s.lps.map((lp,i)=>-BETA*(lp-ref[i]));const tot=rm+pen.reduce((a,b)=>a+b,0);const V=R.st.Vt[t];
      const G=[];let acc=0;for(let i=n-1;i>=0;i--){acc+=pen[i]+(i===n-1?rm:0);G[i]=acc}
      const Ad=G.map((g,i)=>g-V[i]);const sd=R.st.last?R.st.last.sd:1,mu=R.st.last?R.st.last.mu:0;const An=Ad.map(a=>(a-mu)/sd);
      // one illustrative gradient step (plain step of size ETA, not the page's Adam) on this episode, with and without the mix
      const P=[];const rr=TOY.rng(77+nEp);for(let k=0;k<8*n;k++)P.push(S.ptxW[rr.int(S.ptxW.length)]);
      const ep={t,s,A:Float64Array.from(An)};const step=g=>{const p=TOY.cloneP(R.pol);['E','b1','U','b2'].forEach(k=>{for(let i=0;i<p[k].length;i++)p[k][i]+=ETA*g[k][i]});return p};
      const p0=step(TOY.ppoGrad(R.pol,[ep],[],0).g),p1=step(TOY.ppoGrad(R.pol,[ep],P,GAM).g);
      const lpAfter=p=>TOY.seqLogps(p,t,s.y).map(Math.exp);const ce=p=>TOY.meanCE(p,P);
      return {mode,t,y:s.y,pRL:s.lps.map(Math.exp),pSF:ref.map(Math.exp),pen,rm,tot,V:Array.from(V).slice(0,n),G,Ad,An,after0:lpAfter(p0),after1:lpAfter(p1),ce:[ce(R.pol),ce(p0),ce(p1)],P:P.slice(0,1)}};
    return {ppo:mk(Rp,'ppo'),ptx:mk(Rx,'ptx')}}
  const stepsFor=e=>{const L=[{t:'A prompt arrives',c:'The environment is a bandit: one random customer prompt, one response, one reward, then the episode ends ('+'§3.5). The policy writes the response word by word.'}];
    e.y.forEach((y,i)=>L.push({t:'Word '+(i+1)+': "'+escH(TOY.WORDS[y])+'"',c:'Sampled from the policy with probability '+e.pRL[i].toFixed(3)+'; the SFT model would give it '+e.pSF[i].toFixed(3)+'. The per-token KL penalty is -β log(π/π<sub>SFT</sub>) = '+e.pen[i].toFixed(3)+(Math.abs(e.pen[i])<.05?': almost nothing, the policy still writes what SFT would.':e.pen[i]<0?': a cost for moving away from SFT.':': a credit, the policy is less sure of this word than SFT.')}));
    L.push({t:'The reward model scores the whole response',c:'Only now does the RM see the response: r<sub>θ</sub>(x, y) = '+e.rm.toFixed(3)+'. Everything the policy learns about quality comes through this one number.'});
    L.push({t:'Total reward, value and advantage',c:'Reward = RM score plus the penalties = '+e.tot.toFixed(3)+'. With no discount, each word\'s return is the reward from it to the end; the value function (here a table started from the RM, in the paper a 6B network started from the RM) predicts it, and the advantage is the surprise: '+e.Ad.map(a=>a.toFixed(2)).join(', ')+'.'});
    L.push({t:'The update',c:'PPO raises the probability of words with positive advantage and lowers the others, clipped so no ratio moves past 0.8 to 1.2 in one batch. One illustrative step on this episode alone: '+e.y.map((y,i)=>escH(TOY.WORDS[y])+' '+e.pRL[i].toFixed(3)+' to '+e.after0[i].toFixed(3)).join('; ')+'. The held-out pretraining loss on 8 windows per word: '+e.ce[0].toFixed(3)+' to '+e.ce[1].toFixed(3)+'.'});
    if(e.mode==='ptx')L.push({t:'PPO-ptx: add the pretraining gradient',c:'The same minibatch also takes γ times the gradient of log-likelihood on pretraining text, accumulated into the same update (§C.4). Example window: "'+escH(words(e.P[0].c).join(' '))+' → '+escH(TOY.WORDS[e.P[0].y])+'". With it, the loss on those windows goes '+e.ce[0].toFixed(3)+' to '+e.ce[2].toFixed(3)+' instead of to '+e.ce[1].toFixed(3)+', while the response words move '+e.y.map((y,i)=>e.after1[i].toFixed(3)).join(', ')+'.'});
    return L};
  function draw(m,k,e,W){if(!E)return '<p class="small mute">Training the toy (pipeline, then PPO and PPO-ptx: a few seconds)...</p>';const d=E[m],n=d.y.length,nw=W<560;
    const pr=words(TOY.promptSeq(d.t));let s=tx(0,14,'prompt: '+pr.join(' '),{fs:12,c:'var(--mute)'});
    const cw=Math.min(96,(W-(nw?0:150))/Math.max(n,3)),bh=70,y0=34,shown=Math.min(n,k);
    for(let i=0;i<n;i++){const x=i*cw,vis=i<shown||(i===shown&&k<=n&&k>0&&i===k-1);const op=i<k?1:(i===k-1?e:0);if(i>=k)continue;
      const g=i===k-1?e:1;s+=G(1,tx(x+cw/2,y0+bh+30,escH(TOY.WORDS[d.y[i]]),{fs:12,a:'middle',w:600}));
      const b1=bh*d.pRL[i]*g,b2=bh*d.pSF[i]*g,bw=Math.min(16,cw/2-6);
      s+=rc(x+cw/2-bw-1,y0+bh-b1,bw,b1,'var(--acc)',{r:2})+rc(x+cw/2+1,y0+bh-b2,bw,b2,'var(--dim)',{r:2});
      s+=tx(x+cw/2,y0+bh+14,d.pRL[i].toFixed(2)+' | '+d.pSF[i].toFixed(2),{fs:11,a:'middle',c:'var(--mute)'});
      const pv=Math.abs(d.pen[i])<.005?0:d.pen[i];s+=tx(x+cw/2,y0+bh+46,(pv>0?'+':pv<0?'':'')+pv.toFixed(2),{fs:11,a:'middle',c:d.pen[i]<-.05?'var(--bad)':'var(--mute)'});
      if(k>=n+3){const a=d.after0[i],a1=d.after1[i],ua=m==='ptx'&&k>=n+4?a1:a,bb=bh*ua;s+=rc(x+cw/2-bw-1,y0+bh-bb,bw,bb,'none',{s:'var(--ink)',sw:1.2,da:'3 2',r:2})}}
    s+=ln2(0,y0+bh,Math.max(3,n)*cw,y0+bh,'var(--line)');
    const xr=nw?0:Math.max(3,n)*cw+20,yr=nw?y0+bh+66:y0;
    if(k>=n+1){s+=G(k===n+1?e:1,tx(xr,yr+12,'RM score',{fs:12,w:600})+tx(xr,yr+30,d.rm.toFixed(3),{fs:12}))}
    if(k>=n+2){s+=G(k===n+2?e:1,tx(xr,yr+52,'total reward',{fs:12,w:600})+tx(xr,yr+70,d.tot.toFixed(3),{fs:12}))}
    const H=nw?(k>=n+1?y0+bh+66+96:y0+bh+76):y0+bh+60;
    if(nw){s+=tx(0,H-16,'blue: policy π · grey: SFT π_SFT',{fs:11,c:'var(--mute)'})+tx(0,H-2,'dashed: after one update · red: KL penalty',{fs:11,c:'var(--mute)'})}
    else s+=tx(0,H-2,'blue: policy π · grey: SFT π_SFT · dashed: after one update · red: KL penalty',{fs:11,c:'var(--mute)'});
    return svgW(W,H+6,s,'One PPO episode')}
  function counters(m,k){if(!E)return '';const d=E[m],n=d.y.length,sh=Math.min(k,n);let kl=0;for(let i=0;i<sh;i++)kl+=-d.pen[i]/BETA;
    return stat('words written',sh+' of '+n,'stops at &lt;end&gt; or 8')+stat('log ratio so far',kl.toFixed(3),'Σ log π/π_SFT (KL sample)')+stat('RM score',k>n?d.rm.toFixed(3):'not yet','r_θ(x, y)')+stat('total reward',k>n+1?d.tot.toFixed(3):'not yet','r - β Σ log ratio')+stat('pretraining loss',k>n+2?(d.ce[0].toFixed(3)+' to '+(m==='ptx'&&k>n+3?d.ce[2]:d.ce[1]).toFixed(3)):'unchanged','nats per word, 8 windows per word')}
  const o={id:'epi',mode:'ppo',modes:{ppo:[{t:'',c:''}],ptx:[{t:'',c:''}]},draw,counters,dur:2600};
  function ready(){E=build();if(!E)return;o.modes.ppo=stepsFor(E.ppo);o.modes.ptx=stepsFor(E.ptx);if(A){A.st.k=0;A.st.t=RM?1:0;A.st.lk=-1;A.draw()}}
  A=makeAnim(o);
  const go=()=>{TM.train(TOY_PPO,null,()=>TM.train(TOY_PTX,null,ready))};
  $('epiNew').addEventListener('click',()=>{nEp++;ready()});
  if('IntersectionObserver' in window)new IntersectionObserver((es,ob)=>{if(es[es.length-1].isIntersecting){ob.disconnect();go()}},{rootMargin:'400px'}).observe($('epi'));else go()})();
// ---- predict: no KL penalty (curves from the offline sweep, the same numbers the Train button gives) ----
const runOf=(b,g,s)=>SW.runs.find(r=>r.beta===b&&r.gamma===(g||0)&&r.seed===(s||21));
PRED_REVEAL['pr-kl']=()=>{const a=runOf(0,0),b=runOf(.3,0);
  fit($('klSvg'),W=>{const y=[-9,12],it=[0,500];const ser=[{n:'β = 0: RM score',c:'var(--c2)',pts:a.hist.map(h=>[h.it,h.rm]),nodot:1,da:'5 3'},{n:'β = 0: labelers\' true score',c:'var(--c2)',pts:a.hist.map(h=>[h.it,h.u]),nodot:1},
    {n:'β = 0.3: RM score',c:'var(--c1)',pts:b.hist.map(h=>[h.it,h.rm]),nodot:1,da:'5 3'},{n:'β = 0.3: true score',c:'var(--c1)',pts:b.hist.map(h=>[h.it,h.u]),nodot:1}];
    $('klSvg').innerHTML=lineChart({W,H:230,x:it,y,xt:[0,100,200,300,400,500].map(v=>[v,v]),yt:[-8,-4,0,4,8,12].map(v=>[v,v]),xl:'PPO iteration (toy, seed 21)',yl:'score',series:ser,refs:[ [SW.sft.u,'SFT true score','var(--c3)']],title:'The toy: RM score against what labelers want'})});
  $('klOut').innerHTML='At β = 0 the RM score climbs to '+a.rm.toFixed(2)+' while the true score falls to '+a.u.toFixed(2)+': every answer becomes "sure" eight times. With β = 0.3 the true score ends at '+b.u.toFixed(2)+' (SFT '+SW.sft.u.toFixed(2)+'). Of the three seeds at β = 0, '+SW.runs.filter(r=>r.beta===0&&r.u<0).length+' collapse within 500 iterations; at β = 0.01 and 0.03 all three do.'};
// ---- Figure 1, decoded ----
PRED_REVEAL['pr-13']=()=>fit($('f1Svg'),W=>{const xs={'1.3B':1.3,'6B':6,'175B':175};
  $('f1Svg').innerHTML=lineChart({W,H:240,x:[1,230],xlog:1,y:[0,.8],xt:[[1.3,'1.3B'],[6,'6B'],[175,'175B']],yt:[0,.2,.4,.6,.8].map(v=>[v,(v*100)+'%']),xl:'model size (log scale)',yl:'win rate against 175B SFT',
    fmt:v=>(100*v).toFixed(1)+'%',series:MODELS.map(m=>({n:m,c:MCOL[m],pts:FG.fig1.series[m].map(r=>[xs[r.x],r.v,r.lo,r.hi])})),refs:[[.5,'= SFT 175B']],title:'Figure 1: win rate against 175B SFT'})});
// ---- Figure 4, decoded: one small chart per label ----
fit($('f4Svg'),W=>{let h='';const P=FG.fig4.panels;Object.keys(P).forEach(t=>{h+=hbars(W,MODELS.map(m=>({n:m,v:100*P[t][m].v,c:MCOL[m]})),{dom:[0,100],fmt:v=>v.toFixed(1)+'%',title:t})});$('f4Svg').innerHTML=h});
// ---- Figure 6, decoded ----
fit($('f6Svg'),W=>{const P=FG.fig6.panels['QA prompt'],m4=['GPT','SFT','PPO','PPO-ptx'],sz=['1.3B','6B','175B'],nw=W<560,lw=nw?0:110,x0=lw+6,x1=W-50,rh=nw?30:20;let s=tx(0,14,'TruthfulQA, QA prompt, human labels (%)',{fs:12,w:600}),y=24;
  m4.forEach(m=>{P[m].forEach((r,i)=>{const lab=m+' '+sz[i],X=v=>x0+(x1-x0)*v/100,by=nw?y+15:y+3;if(nw)s+=tx(0,y+11,lab,{fs:11});else s+=tx(lw,y+13,lab,{fs:11,a:'end'});
    s+=rc(x0,by,X(r.truthful)-x0,12,'var(--dim)',{r:2})+rc(x0,by+3,X(r.true_info)-x0,6,MCOL[m],{r:1})+tx(X(r.truthful)+4,by+10,r.truthful.toFixed(1)+' / '+r.true_info.toFixed(1),{fs:11});y+=rh})});
  $('f6Svg').innerHTML=svgW(W,y+6,s,'TruthfulQA human evaluation')});
// ---- predict: the alignment tax fix (Figures 33 and 34, decoded) ----
function taxChart(W,m){const F=m==='g'?FG.fig33:FG.fig34,P=F.panels,dr=P.F1.series['#db5f57'],sq=P.F1.series['#57db5f'],vr=P['Validation reward'].series['#5f57db'];
  const xr=m==='g'?[.35,160]:[7e-5,3],xt=m==='g'?[[1,'1'],[10,'10'],[27.8,'27.8'],[100,'100']]:[[1e-4,'0.0001'],[1e-3,'0.001'],[.02,'0.02'],[1,'1']];
  const xl=m==='g'?'pretraining loss coefficient γ (log)':'KL reward coefficient β (log), γ = 0';
  const a=lineChart({W,H:200,x:xr,xlog:1,y:[0,65],xt,yt:[0,20,40,60].map(v=>[v,v]),xl,yl:'F1',series:[{n:'DROP',c:'var(--c2)',pts:dr.map(r=>[r.x,r.v,r.lo,r.hi])},{n:'SQuAD v2',c:'var(--c3)',pts:sq.map(r=>[r.x,r.v,r.lo,r.hi])}],refs:[[25.4,'DROP, GPT-3','var(--c2)'],[59.2,'SQuAD v2, GPT-3','var(--c3)']],title:(m==='g'?'Figure 33':'Figure 34')+': benchmarks (1.3B)'});
  const lo=Math.min(...vr.map(r=>r.v)),hi=Math.max(...vr.map(r=>r.v));
  const b=lineChart({W,H:170,x:xr,xlog:1,y:[Math.floor(lo*2)/2-.1,Math.ceil(hi*2)/2+.1],xt,yt:m==='g'?[[-1.6,'-1.6'],[-1.2,'-1.2'],[-.8,'-0.8'],[-.4,'-0.4']]:[[-2,'-2'],[0,'0'],[2,'2'],[4,'4']],xl,yl:'reward',series:[{n:'validation reward',c:'var(--c1)',pts:vr.map(r=>[r.x,r.v])}],title:'validation reward'});
  return a+b}
let taxMode='g';
PRED_REVEAL['pr-tax']=()=>{const drawT=()=>fit($('taxSvg'),W=>{$('taxSvg').innerHTML=taxChart(W,taxMode)});drawT();
  const m=(b,g)=>{const rs=SW.runs.filter(r=>r.beta===b&&r.gamma===g);return {ce:rs.reduce((s,r)=>s+r.ce,0)/rs.length,win:rs.reduce((s,r)=>s+r.win,0)/rs.length}};
  const p=m(.3,0),x=m(.3,.1),k=m(3,0);
  $('taxOut').innerHTML='The toy, mean of 3 seeds: pretraining loss '+SW.sft.ce.toFixed(2)+' after SFT, '+p.ce.toFixed(2)+' after PPO (win rate against SFT '+p.win.toFixed(2)+'); PPO-ptx with γ = 0.1: '+x.ce.toFixed(2)+' (win '+x.win.toFixed(2)+'); PPO with β = 3 instead: '+k.ce.toFixed(2)+' (win '+k.win.toFixed(2)+'). <a href="#" data-tab="t-run" data-to="swf">The full sweep.</a>';
  $('taxOut').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('.tabs button[data-t="t-run"]').click();setTimeout(()=>$('swf').scrollIntoView({block:'start'}),50)}));
  segBind('taxM',v=>{taxMode=v;refit($('taxSvg'))})};
