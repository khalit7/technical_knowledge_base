// ---- Replay the MoE training run (Figures 6 and 8, decoded) ----
(function(){
  const A3=T.a3,rwOf=b=>reward(A3.baseline_bpb/b,A3.ref),R=24;
  const MODE={opus:'Claude Opus 5',q37:'Qwen3.7 Max',ds:'DeepSeek V4Pro'};
  // per mode: submissions, failed flags, best so far
  const D={};Object.entries(MODE).forEach(([k,m])=>{const f=T.F8[m],fail=new Set(f.failed);let best=null;
    D[k]=f.pts.map(([r,v])=>{const rr=Math.round(r),bad=fail.has(rr);if(!bad)best=best==null?v:Math.min(best,v);return {r:rr,v,bad,best}})});
  // the long-replay rule (2026-11-06): 24 rounds play in at most 7 explained stretches per model, one item of the step lists
  // sx-rp-opus, sx-rp-q37 and sx-rp-ds (04_run.html) per stretch; each stretch adds its rounds one by one while it plays
  const STR={opus:[[1,1],[2,5],[6,7],[8,8],[9,20],[21,21],[22,24]],q37:[[1,1],[2,4],[5,10],[11,12],[13,23],[24,24]],ds:[[1,2],[3,6],[7,7],[8,9],[10,20],[21,24]]};
  const modes={};Object.keys(MODE).forEach(k=>modes[k]=STR[k].map(([a,b])=>({t:a===b?'round '+a:'rounds '+a+' to '+b,r0:a,r1:b})));
  window.PHIRUN={STR,D,A3:{oracle:A3.oracle_bpb,baseline:A3.baseline_bpb,ref:A3.ref},reward:rwOf};
  // how many rounds a stretch has shown at progress e (rounds before the stretch are always shown)
  const upto=(m,k,e)=>{const S=modes[m][k],n=S.r1-S.r0+1;return S.r0-1+Math.max(1,Math.min(n,Math.ceil(e*n-1e-9)))};
  const yr=[1.15,2.3];
  function frame(w,H,pl,pr,pt,pb){const lx=r=>pl+(w-pl-pr)*(r-1)/(R-1),ly=v=>pt+(H-pt-pb)*(1-(v-yr[0])/(yr[1]-yr[0]));let s='';
    [1.2,1.4,1.6,1.8,2.0,2.2].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-6,ly(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
    [1,4,8,12,16,20,24].forEach(r=>{s+=tx(lx(r),H-pb+15,r,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-3,'round',{fs:11,a:'middle',c:'var(--mute)'});
    const refl=[[A3.baseline_bpb,'dense starter 1.955','var(--mute)','2 3'],[A3.oracle_bpb,'reference recipe 1.275','var(--c3)','6 3'],[A3.ceiling_bpb,'ceiling about 1.22','var(--mute)','1 3']];
    refl.forEach(([v,l,c,da],i)=>{s+=ln2(pl,ly(v),w-pr,ly(v),c,{sw:1.4,da})+tx(w-pr-2,ly(v)+(i===2?13:-4),l,{fs:11,a:'end',c})});
    return {s,lx,ly}}
  const an=makeAnim({id:'rp',mode:'opus',modes,lists:{opus:'sx-rp-opus',q37:'sx-rp-q37',ds:'sx-rp-ds'},dur:4600,move:.7,
    draw:(m,k,e,w)=>{const H=Math.max(230,Math.min(300,w*.5)),{s,lx,ly}=frame(w,H,40,10,10,32);let g=s;const d=D[m];
      let bp='',pb=null;const last=upto(m,k,e)-1,ek=(()=>{const S=modes[m][k],n=S.r1-S.r0+1;return RM?1:Math.min(1,Math.max(0,e*n-(last-(S.r0-1))))})();for(let i=0;i<=last;i++){const p=d[i];if(p.best==null)continue;const x1=lx(p.r).toFixed(1);bp+=pb==null?'M'+x1+','+ly(p.best).toFixed(1):'L'+x1+','+ly(pb).toFixed(1)+'L'+x1+','+ly(p.best).toFixed(1);pb=p.best}
      g+='<path d="'+bp+'" fill="none" stroke="'+MC[MODE[m]]+'" stroke-width="2.4"/>';
      for(let i=0;i<=last;i++){const p=d[i],op=i===last?Math.max(.15,ek):1,x=lx(p.r),y=ly(Math.min(yr[1],p.v));
        if(p.bad)g+=G(op,'<path d="M'+(x-5)+','+(y-5)+'L'+(x+5)+','+(y+5)+'M'+(x-5)+','+(y+5)+'L'+(x+5)+','+(y-5)+'" stroke="var(--bad)" stroke-width="2.2"/>');
        else g+=G(op,'<circle cx="'+x+'" cy="'+y+'" r="'+(i===last?5:3.4)+'" fill="'+MC[MODE[m]]+'" stroke="var(--bg)" stroke-width="1"/>')}
      return svgW(w,H,g,'Submissions by round')},
    counters:(m,k,e)=>{const d=D[m],j=upto(m,k,e)-1,p=d[j],nf=d.slice(0,j+1).filter(x=>x.bad).length;
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
