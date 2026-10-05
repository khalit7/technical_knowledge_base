// ---- The checkpoint model, a line-for-line port of src/recompute.py (simulate, eff_exact, eff_first, t_young, t_daly1, t_rfo, t_opt) ----
window.PWE=(function(){
  function mulberry32(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;
    t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^((t+(Math.imul(t^(t>>>7),t|61)>>>0))>>>0))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function arrivals(seed,mu,horizon){const rnd=mulberry32(seed);let t=0;const out=[];
    for(;;){const u=rnd();t+=-mu*Math.log(1-u);if(t>=horizon)return out;out.push(t)}}
  // segments: [kind, t0, t1, fate, fateTime]; kinds work, ck, down, rec, fail, lostmark (the stretch of work a failure threw away);
  // a work segment's fate is 'lost' (with the failure time) or 'saved' (with the checkpoint's completion time), unset while pending
  function simulate(fails,T,C,D,R,horizon,wantSegs){
    let t=0,i=0,committed=0,lost=0,ck=0,down=0,nfails=0;const seg=[];const nf=fails.length;
    const nextf=after=>{while(i<nf&&fails[i]<after)i++;return i<nf?fails[i]:Infinity};
    let phase='work',left=T-C,pending=0;let pidx=[];const mark=(fl,tt)=>{pidx.forEach(k=>{seg[k][3]=fl;seg[k][4]=tt});pidx=[]};
    while(t<horizon-1e-12){
      const f=nextf(t);
      if(phase==='down'){const d=Math.min(left,horizon-t);seg.push(['down',t,t+d]);down+=d;if(d===left){t=t+left;left=0}else{t+=d;left-=d}
        while(i<nf&&fails[i]<t)i++;
        if(left<=1e-12){phase='rec';left=R}continue}
      const end=Math.min(t+left,horizon);
      if(f<end){const d=f-t;
        if(phase==='work'){seg.push(['work',t,f]);pidx.push(seg.length-1);pending+=d}else if(phase==='ck'){seg.push(['ck',t,f]);ck+=d}else{seg.push(['rec',t,f]);down+=d}
        lost+=pending;mark('lost',f);seg.push(['fail',f,f]);if(pending>0)seg.push(['lostmark',f-pending,f]);
        pending=0;nfails++;t=f;i++;phase='down';left=D;if(D<=0){phase='rec';left=R}continue}
      const d=end-t;
      if(phase==='work'){seg.push(['work',t,end]);pidx.push(seg.length-1);pending+=d}else if(phase==='ck'){seg.push(['ck',t,end]);ck+=d}else{seg.push(['rec',t,end]);down+=d}
      if(end>=t+left){t=t+left;left=0}else{t=end;left-=d}
      if(left<=1e-12){
        if(phase==='work'){phase='ck';left=C;if(C<=0){committed+=pending;mark('saved',t);pending=0;phase='work';left=T-C}}
        else if(phase==='ck'){committed+=pending;mark('saved',t);pending=0;phase='work';left=T-C}
        else{phase='work';left=T-C}}
    }
    const res={committed,pending,lost,ck,down,fails:nfails};if(wantSegs)res.segs=seg;return res}
  const effExact=(T,mu,C,D,R)=>T<=C?0:(T-C)/((mu+D)*Math.exp(R/mu)*Math.expm1(T/mu));
  const effFirst=(T,mu,C,D,R)=>1-(C/T+(1-C/T)*(D+R+T/2)/mu);
  const tYoung=(mu,C)=>Math.sqrt(2*mu*C)+C;
  const tDaly=(mu,C,D,R)=>Math.sqrt(2*(mu+D+R)*C)+C;
  const tRfo=(mu,C,D,R)=>Math.sqrt(2*Math.max(mu-(D+R),0)*C);
  function tOpt(mu,C,D,R){let a=Math.log(C*1.0001+1e-9),b=Math.log(Math.max(50*mu,10*C));const g=(Math.sqrt(5)-1)/2;
    const f=x=>-effExact(Math.exp(x),mu,C,D,R);let c=b-g*(b-a),d=a+g*(b-a);
    for(let k=0;k<200;k++){if(f(c)<f(d))b=d;else a=c;c=b-g*(b-a);d=a+g*(b-a)}return Math.exp((a+b)/2)}
  const mtbfH=(gpus,rateK)=>24/(gpus/8*rateK/1000);
  return {mulberry32,arrivals,simulate,effExact,effFirst,tYoung,tDaly,tRfo,tOpt,mtbfH};
})();
// number formatting shared by this page's scripts
window.PWF={
  n:(x,d)=>x==null||!isFinite(x)?'n/a':x.toLocaleString('en-US',{maximumFractionDigits:d==null?0:d,minimumFractionDigits:d==null?0:d}),
  pct:(x,d)=>!isFinite(x)?'n/a':(x*100).toFixed(d==null?1:d)+'%',
  dur:h=>{if(!isFinite(h))return 'n/a';const m=h*60;if(m<1)return (m*60).toFixed(0)+' s';if(m<90)return m.toFixed(m<10?1:0)+' min';if(h<48)return h.toFixed(1)+' h';return (h/24).toFixed(1)+' days'}
};
