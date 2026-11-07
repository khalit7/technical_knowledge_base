// ---- Reading section 6: Reno against CUBIC on one path, computed from RFC 5681 and RFC 9438 (illustrative) ----
// One step per round trip (100 ms) for 60 s. The path holds CAP segments in flight; a window above CAP overflows the
// bottleneck buffer and loses a packet (congestion). One extra, non-congestive loss happens at 25 s for both.
// Reno: halve on loss, +1 segment per RTT (RFC 5681). CUBIC: cwnd = max(W_cubic(t), W_est) with C = 0.4, beta = 0.7,
// K = cbrt(W_max (1 - beta) / C) (RFC 9438 s4.2, 4.3); fast convergence (s4.7) is not modelled. Both start in slow start
// from 10 segments (RFC 6928) and leave it at their first loss.
window.NFCC=(function(){
  const RTT=0.1,CAP=1000,T=60,EXTRA=25,MSS=1460,C=0.4,B=0.7,AL=3*(1-B)/(1+B);
  function run(alg){
    let w=10,ss=true,wmax=0,K=0,te=0,west=0;const pts=[],ev=[];let sum=0;
    for(let i=0;i<=T/RTT;i++){
      const t=+(i*RTT).toFixed(1);pts.push([t,w]);sum+=Math.min(w,CAP);
      const loss=w>CAP||Math.abs(t-EXTRA)<1e-9;
      if(loss){const before=w;
        if(alg==='reno'){w=Math.max(2,w/2)}else{wmax=w;w=Math.max(2,w*B);K=Math.cbrt(wmax*(1-B)/C);te=t+RTT;west=w}
        ev.push({t,before,after:w,kind:Math.abs(t-EXTRA)<1e-9&&before<=CAP?'random':'congestion',K});ss=false;continue}
      if(ss){w=w*2}
      else if(alg==='reno'){w=w+1}
      else{const tt=t+RTT-te;const wc=C*Math.pow(tt-K,3)+wmax;west=west+AL;w=Math.max(wc,west)}
    }
    return {pts,ev,util:sum/((T/RTT+1)*CAP)};
  }
  return {RTT,CAP,T,EXTRA,MSS,C,B,run,reno:run('reno'),cubic:run('cubic')};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('rd-cc-card'))return;
  // five explained stretches (the long-replay rule): each step plays the round trips from the end of the last stretch to the end of its own
  const M=NFCC,F=NFC.fmt;let mode='reno';const E=[2,10,24,26,60];window.NFCC_STRETCH=E;
  const rate=w=>Math.min(w,M.CAP)*M.MSS*8/M.RTT/1e6;
  let shown=E[0],raf=0;
  function frame(t){
    const el=$('rd-cc-svg');const show=mode==='both'?['reno','cubic']:[mode];
    const cols={reno:'var(--c2)',cubic:'var(--c1)'},nm={reno:'Reno',cubic:'CUBIC'};
    const series=show.map(k=>({pts:M[k].pts.filter(p=>p[0]<=t+1e-9),col:cols[k],w:1.8,dash:mode==='both'&&k==='reno'?'5 3':null,label:nm[k]}));
    const marks=[];show.forEach(k=>M[k].ev.filter(e=>e.t<=t+1e-9).forEach(e=>marks.push({x:e.t,y:Math.min(e.before,1350),col:cols[k],shape:'x'})));
    NFC.plot({el,h:240,x:[0,M.T],y:[0,1400],xl:'seconds (one round trip = 100 ms)',yl:'congestion window (segments)',
      hlines:[{y:M.CAP,col:'var(--c3)',label:'path capacity: 1,000 segments in flight'}],vlines:[{x:M.EXTRA,col:'var(--mute)',label:'random loss'}],series,marks});
    $('rd-cc-cnt').innerHTML=show.map(k=>{const p=M[k].pts.filter(q=>q[0]<=t+1e-9);const w=p[p.length-1][1];const avg=p.reduce((a,q)=>a+Math.min(q[1],M.CAP),0)/(p.length*M.CAP);const L=M[k].ev.filter(e=>e.t<=t+1e-9).length;
      return RD.stat(nm[k]+' at '+F(t,1)+' s',F(w)+' segments',F(rate(w),0)+' Mbit/s')+RD.stat(nm[k]+': average so far',F(100*avg,0)+'% of capacity',L+' loss'+(L===1?'':'es')+' so far')}).join('');
  }
  function draw(i){
    const to=E[i],fwd=$('rd-cc-card').classList.contains('rd-fwd')&&!RD.RM&&to>shown;cancelAnimationFrame(raf);
    if(!fwd){shown=to;frame(to);return}
    const from=shown,t0=performance.now(),dur=Math.min(2600,700+(to-from)*60);
    const go=now=>{const u=Math.min(1,(now-t0)/dur);shown=from+(to-from)*u;frame(Math.round(shown*10)/10);if(u<1)raf=requestAnimationFrame(go);else{shown=to;frame(to)}};raf=requestAnimationFrame(go);
  }
  const h=RD.anim({card:'rd-cc-card',ctl:'rd-cc-ctl',n:E.length,draw,ms:5200,label:'Stretch',list:'sx-cc-reno'});
  RD.seg($('rd-cc-seg'),m=>{mode=m;['reno','cubic','both'].forEach(k=>{$('sx-cc-'+k).hidden=k!==m});shown=E[0];h.reset(E.length,'sx-cc-'+m)});
  RD.onResize(()=>{cancelAnimationFrame(raf);frame(shown)});
})();
