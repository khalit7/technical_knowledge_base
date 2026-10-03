// ---- Replay the MoE training run (Figures 6 and 8, decoded) ----
(function(){
  const A3=T.a3,rwOf=b=>reward(A3.baseline_bpb/b,A3.ref),R=24;
  const MODE={opus:'Claude Opus 5',q37:'Qwen3.7 Max',ds:'DeepSeek V4Pro'};
  // per mode: submissions, failed flags, best so far
  const D={};Object.entries(MODE).forEach(([k,m])=>{const f=T.F8[m],fail=new Set(f.failed);let best=null;
    D[k]=f.pts.map(([r,v])=>{const rr=Math.round(r),bad=fail.has(rr);if(!bad)best=best==null?v:Math.min(best,v);return {r:rr,v,bad,best}})});
  const SPEC={
    opus:{1:'First submission: 1.412 BPB, already better than the final best of GPT-5.6 Sol, GLM-5.2, Qwen3.7 Max and DeepSeek-V4-Pro. The paper credits cheap local experiments run before submitting.',
      5:'1.3646, a new best. This is the starting point of the paper\'s example of noise control.',
      7:'1.3932 after a learning-rate schedule change: worse than 1.3646. Same seed, same number of steps, nearly identical runtime, so Opus treats the loss as real evidence that too long at very low learning rates hurts (the paper\'s example, rounds 5 and 7 here).',
      8:'1.3248 with a warmup-stable-decay schedule: a new best, the outcome the paper describes.',
      21:'1.2726: the first submission below the reference recipe\'s 1.2747. Only now does the task\'s reward rise above zero, to 0.004.',
      24:'Final best 1.2720 BPB, reward about 0.005 on the task\'s scale. No submission failed the correctness check in 24 rounds.'},
    q37:{1:'First submission 2.2165 BPB, worse than the shipped dense starter\'s calibrated 1.955. Qwen3.7 Max implements, submits and observes without local validation (the paper).',
      2:'Failed the correctness check: the round is spent and scores nothing.',4:'Failed again.',
      11:'2.1877: a large regression from 1.85. The paper says many of its single-variable experiments produce differences comparable to measurement noise.',
      24:'Final best 1.7010 BPB, still far above the reference recipe; reward 0.'},
    ds:{1:'Failed the correctness check. Formal submissions double as debugging, hypothesis test and evaluation (the paper). Its example of a wasted round is torch.compile applied to the expert modules without checking the checkpoint still loads; it does not say which round.',
      2:'Failed again: no valid result after two rounds.',3:'First valid result: 1.6234 BPB.',4:'Failed.',6:'Failed.',
      7:'2.0020: a large regression. The paper says DeepSeek often changes several variables at once, so a result like this cannot be attributed.',16:'Failed.',
      24:'Final best 1.4637 BPB (round 21); reward 0. Five of its 24 submissions failed the correctness check.'}};
  const steps=k=>D[k].map((p,i)=>{const t='round '+p.r+(p.bad?': failed the correctness check':': '+p.v.toFixed(4)+' BPB');
    const c=SPEC[k][p.r]||(p.bad?'The submission failed the correctness check and scores nothing.':(p.v<=p.best+1e-9&&(i===0||p.v<D[k][i-1].best-1e-9)?'A new best: ':'Not a new best: ')+'submitted '+p.v.toFixed(4)+', best so far '+(p.best==null?'none':p.best.toFixed(4))+'.');return {t,c}});
  const modes={};Object.keys(MODE).forEach(k=>modes[k]=steps(k));
  const yr=[1.15,2.3];
  function frame(w,H,pl,pr,pt,pb){const lx=r=>pl+(w-pl-pr)*(r-1)/(R-1),ly=v=>pt+(H-pt-pb)*(1-(v-yr[0])/(yr[1]-yr[0]));let s='';
    [1.2,1.4,1.6,1.8,2.0,2.2].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-6,ly(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
    [1,4,8,12,16,20,24].forEach(r=>{s+=tx(lx(r),H-pb+15,r,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-3,'round',{fs:11,a:'middle',c:'var(--mute)'});
    const refl=[[A3.baseline_bpb,'dense starter 1.955','var(--mute)','2 3'],[A3.oracle_bpb,'reference recipe 1.275','var(--c3)','6 3'],[A3.ceiling_bpb,'ceiling about 1.22','var(--mute)','1 3']];
    refl.forEach(([v,l,c,da],i)=>{s+=ln2(pl,ly(v),w-pr,ly(v),c,{sw:1.4,da})+tx(w-pr-2,ly(v)+(i===2?13:-4),l,{fs:11,a:'end',c})});
    return {s,lx,ly}}
  const an=makeAnim({id:'rp',mode:'opus',modes,dur:1700,
    draw:(m,k,e,w)=>{const H=Math.max(230,Math.min(300,w*.5)),{s,lx,ly}=frame(w,H,40,10,10,32);let g=s;const d=D[m];
      let bp='',pb=null;for(let i=0;i<=k;i++){const p=d[i];if(p.best==null)continue;const x1=lx(p.r).toFixed(1);bp+=pb==null?'M'+x1+','+ly(p.best).toFixed(1):'L'+x1+','+ly(pb).toFixed(1)+'L'+x1+','+ly(p.best).toFixed(1);pb=p.best}
      g+='<path d="'+bp+'" fill="none" stroke="'+MC[MODE[m]]+'" stroke-width="2.4"/>';
      for(let i=0;i<=k;i++){const p=d[i],op=i===k?e:1,x=lx(p.r),y=ly(Math.min(yr[1],p.v));
        if(p.bad)g+=G(op,'<path d="M'+(x-5)+','+(y-5)+'L'+(x+5)+','+(y+5)+'M'+(x-5)+','+(y+5)+'L'+(x+5)+','+(y-5)+'" stroke="var(--bad)" stroke-width="2.2"/>');
        else g+=G(op,'<circle cx="'+x+'" cy="'+y+'" r="'+(i===k?5:3.4)+'" fill="'+MC[MODE[m]]+'" stroke="var(--bg)" stroke-width="1"/>')}
      return svgW(w,H,g,'Submissions by round')},
    counters:(m,k)=>{const d=D[m],p=d[k],nf=d.slice(0,k+1).filter(x=>x.bad).length;
      return stat('Round',p.r+' of 24')+stat('This submission',p.bad?'failed':p.v.toFixed(4)+' BPB')+stat('Best so far',p.best==null?'none':p.best.toFixed(4)+' BPB')+stat('Task reward of the best',p.best==null?'0':rwOf(p.best).toFixed(3),'0 until below 1.275')+stat('Failed submissions',nf)}});
  window.__rp=an;
  // All eight models, best so far
  let lens='bpb';const order=MS.slice();
  function drawAll(w){const H=Math.max(240,Math.min(320,w*.55)),pr=Math.min(118,w*.3);
    if(lens==='bpb'){const {s,lx,ly}=frame(w,H,40,pr,10,32);let g=s;const ends=[];
      order.forEach(m=>{const pts=T.F6[m];let d='';pts.forEach(([r,v],i)=>{d+=(i?'L':'M')+lx(r).toFixed(1)+','+ly(Math.min(yr[1],v)).toFixed(1)});
        g+='<path d="'+d+'" fill="none" stroke="'+MC[m]+'" stroke-width="'+(m==='Claude Opus 5'?2.6:1.6)+'"/>';ends.push({y:ly(pts[pts.length-1][1]),n:MN[m],c:MC[m],how:'final best '+pts[pts.length-1][1].toFixed(4)})});
      g+=endLabels(ends,w-pr+6,13);$('bsPlot').innerHTML=svgW(w,H,g,'Best so far, bits per byte')}
    else{const pl=44,pt=10,pb=32,lx=r=>pl+(w-pl-pr)*(r-1)/(R-1),top=.15,ly=v=>pt+(H-pt-pb)*(1-v/top);let g='';
      [0,.05,.1,.15].forEach(v=>{g+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-6,ly(v)+4,v.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
      [1,4,8,12,16,20,24].forEach(r=>{g+=tx(lx(r),H-pb+15,r,{fs:11,a:'middle',c:'var(--mute)'})});
      g+=tx((pl+w-pr)/2,H-3,'round',{fs:11,a:'middle',c:'var(--mute)'});
      const ends=[];order.forEach(m=>{const pts=T.F6[m];let d='';pts.forEach(([r,v],i)=>{d+=(i?'L':'M')+lx(r).toFixed(1)+','+ly(rwOf(v)).toFixed(1)});
        g+='<path d="'+d+'" fill="none" stroke="'+MC[m]+'" stroke-width="'+(m==='Claude Opus 5'?2.6:1.4)+'"/>'});
      ends.push({y:ly(0),n:'seven models: 0',c:'var(--mute)',how:'never below 1.275 BPB'});ends.push({y:ly(rwOf(T.F6['Claude Opus 5'][23][1]))-14,n:'Opus 5: 0.005',c:MC['Claude Opus 5'],how:'from round 21'});
      const mo=rwOf(1.1999);g+=ln2(pl,ly(mo),w-pr,ly(mo),'var(--c2)',{da:'4 3'})+tx(pl+6,ly(mo)-5,'Opus 5 in the main evaluation (a different run): '+mo.toFixed(2),{fs:11,c:'var(--c2)'});
      g+=endLabels(ends,w-pr+6,14);$('bsPlot').innerHTML=svgW(w,H,g,'Best so far, as the task reward')}}
  segBind('bsM',m=>{lens=m;document.querySelectorAll('#bsM button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));refit($('bsPlot'))});
  onTab('t-run',()=>{fit($('bsPlot'),drawAll);refit($('rpSvg'))});
  let h='<thead><tr><th>Model</th><th class="num">First valid round</th><th class="num">First valid BPB</th><th class="num">Final best BPB</th><th class="num">Task reward</th></tr></thead><tbody>';
  MS.slice().sort((a,b)=>T.F6[a][T.F6[a].length-1][1]-T.F6[b][T.F6[b].length-1][1]).forEach(m=>{const p=T.F6[m],l=p[p.length-1][1];h+='<tr><td>'+MN[m]+'</td><td class="num">'+Math.round(p[0][0])+'</td><td class="num">'+p[0][1].toFixed(4)+'</td><td class="num">'+l.toFixed(4)+'</td><td class="num">'+rwOf(l).toFixed(3)+'</td></tr>'});
  $('bsTab').innerHTML=h+'</tbody>';
})();
