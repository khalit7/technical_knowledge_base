// ---- Reading: pass@k, one problem, 20 samples; Codex estimator against the plug-in ----
(function(){
  const N=20,K=5,P=0.15;
  // one fixed illustrative draw: samples 4, 11 and 17 pass (c = 3 of 20, so c/n = p exactly)
  const OUT=Array.from({length:N},(_,i)=>[3,10,16].includes(i)?1:0);
  const truth=1-Math.pow(1-P,K);
  let mode='unb';
  const svgEl=document.getElementById('rd-pk-svg'),cap=document.getElementById('rd-pk-cap'),cnt=document.getElementById('rd-pk-cnt');
  if(!svgEl)return;
  const col={unb:'var(--c1)',plug:'var(--c2)'};
  function draw(i){
    const W=RD.width(svgEl),H=230,L=40,R=12,T=14,B=34,iw=W-L-R,ih=H-T-B;
    let s='';const y=v=>T+ih*(1-v);
    for(const g of [0,.25,.5,.75,1]){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)"/>'+RD.t(L-5,y(g)+4,Math.round(g*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
    if(i<=N){
      const x=n=>L+iw*(n-0.5)/N;
      for(let n=1;n<=N;n++){const on=n<=i;s+='<rect x="'+(x(n)-iw/N*0.38)+'" y="'+(H-B+6)+'" width="'+(iw/N*0.76)+'" height="9" rx="2" fill="'+(on?(OUT[n-1]?'var(--good)':'var(--bad)'):'var(--dim)')+'"/>'}
      s+=RD.t(L+iw/2,H-3,'samples drawn so far (green passes, orange fails)',{a:'middle',fs:10,fill:'var(--mute)'});
      s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(truth)+'" y2="'+y(truth)+'" stroke="var(--ink)" stroke-dasharray="5 4"/>'+RD.t(W-R,y(truth)-5,'true pass@5 = '+CM.pct(truth),{a:'end',fs:10.5});
      for(const m of ['plug','unb']){
        let d='';let c=0;
        for(let n=1;n<=i;n++){c+=OUT[n-1];if(m==='unb'&&n<K)continue;const v=m==='unb'?CM.passk(n,c,K):CM.plug(n,c,K);d+=(d?'L':'M')+x(n).toFixed(1)+','+y(v).toFixed(1)}
        if(d)s+='<path d="'+d+'" fill="none" stroke="'+col[m]+'" stroke-width="'+(m===mode?2.6:1.3)+'" opacity="'+(m===mode?1:.45)+'"/>';
      }
    }else{
      // all possible draws: estimate as a function of c, with the probability of each c as bars
      const x=c=>L+iw*(c+0.5)/(N+1);let pm=0;const pr=[];
      for(let c=0;c<=N;c++){pr.push(CM.binom(N,c,P));pm=Math.max(pm,pr[c])}
      for(let c=0;c<=N;c++){const h=ih*0.45*pr[c]/pm;s+='<rect x="'+(x(c)-iw/(N+1)*0.35)+'" y="'+(T+ih-h)+'" width="'+(iw/(N+1)*0.7)+'" height="'+h+'" fill="var(--acc2)"/>'}
      for(const m of ['plug','unb']){let d='';for(let c=0;c<=N;c++){const v=m==='unb'?CM.passk(N,c,K):CM.plug(N,c,K);d+=(d?'L':'M')+x(c).toFixed(1)+','+y(v).toFixed(1)}
        s+='<path d="'+d+'" fill="none" stroke="'+col[m]+'" stroke-width="'+(m===mode?2.6:1.3)+'" opacity="'+(m===mode?1:.45)+'"/>'}
      const eu=CM.expect(N,P,K,CM.passk),ep=CM.expect(N,P,K,CM.plug);
      s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(truth)+'" y2="'+y(truth)+'" stroke="var(--ink)" stroke-dasharray="5 4"/>';
      s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(ep)+'" y2="'+y(ep)+'" stroke="var(--c2)" stroke-dasharray="2 3"/>'+RD.t(W-R,y(ep)+13,'plug-in average '+CM.pct(ep),{a:'end',fs:10.5,fill:'var(--c2)'});
      s+=RD.t(W-R,y(truth)-5,'Codex average = truth = '+CM.pct(truth),{a:'end',fs:10.5});
      for(let c=0;c<=N;c+=4)s+=RD.t(x(c),H-B+16,String(c),{a:'middle',fs:10,fill:'var(--mute)'});
      s+=RD.t(L+iw/2,H-3,'c, the number of passing samples out of 20 (bars: how likely each c is)',{a:'middle',fs:10,fill:'var(--mute)'});
    }
    svgEl.innerHTML=RD.svg(W,H,s,'pass@5 estimates as samples arrive');
    let c=0;for(let n=1;n<=Math.min(i,N);n++)c+=OUT[n-1];
    const n=Math.min(i,N);
    const u=n>=K?CM.passk(n,c,K):null,pl=n?CM.plug(n,c,K):null;
    const nm=mode==='unb'?'Codex estimator':'Plug-in';
    let t,p;
    if(i===0){t='One problem, true pass rate 15%';p='We want pass@5: the chance that at least one of 5 samples passes. The truth is 1 − 0.85<sup>5</sup> = 55.6%. Samples arrive one at a time; both estimators use the same samples.'}
    else if(i<=N){t='Sample '+i+(OUT[i-1]?' passes':' fails')+': c = '+c+' of n = '+n;
      p=(n<K?'The Codex estimator needs n ≥ k = 5 samples, so only the plug-in has a value yet. ':'')+(u!=null?'Codex: 1 − C('+(n-c)+',5)/C('+n+',5) = '+CM.pct(u)+'. ':'')+'Plug-in: 1 − (1 − '+c+'/'+n+')<sup>5</sup> = '+CM.pct(pl)+'.'+(i===N?' On this draw c/n equals the true rate, so the plug-in lands on the truth and the Codex estimate is above it: one draw cannot show bias. The next step averages over all draws.':'')}
    else{const eu=CM.expect(N,P,K,CM.passk),ep=CM.expect(N,P,K,CM.plug);t='Averaged over every possible draw of 20 samples';
      p='For every c the plug-in curve sits below the Codex curve. Weighted by how likely each c is, the Codex estimator averages exactly '+CM.pct(eu)+', the truth; the plug-in averages '+CM.pct(ep)+', '+((truth-ep)*100).toFixed(1)+' points low. That is the "consistent underestimate" of the Codex paper\'s Appendix A.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p><p class="small mute">Showing: '+nm+' (bold line).</p>';
    cnt.innerHTML=RD.stat('Samples n / passing c',i>N?'all draws':n+' / '+c,'')+RD.stat('Codex estimate of pass@5',i>N?CM.pct(CM.expect(N,P,K,CM.passk)):(u==null?'needs n ≥ 5':CM.pct(u)),i>N?'average':'')+RD.stat('Plug-in estimate',i>N?CM.pct(CM.expect(N,P,K,CM.plug)):(pl==null?'none yet':CM.pct(pl)),i>N?'average':'')+RD.stat('True pass@5',CM.pct(truth),'1 − 0.85⁵');
  }
  const A=RD.anim({card:'rd-pk-card',ctl:'rd-pk-ctl',n:N+2,draw,ms:900,label:'Sample'});
  RD.seg(document.getElementById('rd-pk-mode'),m=>{mode=m;A.redraw()});
  RD.onResize(()=>A.redraw());
})();
