// ---- Calibration tab: reliability diagrams from inputs/calibration.json ----
(function(){
  const $=id=>document.getElementById(id);if(!$('cal-seg')||!window.CAL_DATA)return;
  const C=window.CAL_DATA.models,keys=Object.keys(C),f=PM.f;let mk='gpt2';
  const esc=RD.esc;
  $('cal-seg').innerHTML=keys.map(k=>'<button data-m="'+k+'"'+(k===mk?' class="on"':'')+'>'+esc(C[k].name)+'</button>').join('');
  const Tkey=i=>{const v=Math.round((0.5+0.05*i)*100)/100;return Number.isInteger(v)?v.toFixed(1):String(v)};
  function stats(M,T){const d=M.per_T[T],n=d.bins.reduce((s,b)=>s+b[0],0);
    const ece=d.bins.reduce((s,b)=>s+Math.abs(b[1]-b[2]),0)/n,conf=d.bins.reduce((s,b)=>s+b[1],0)/n,acc=d.bins.reduce((s,b)=>s+b[2],0)/n;return {ece,conf,acc,n,nll:d.nll}}
  function best(M){let bt=null,bv=1e9;Object.keys(M.per_T).forEach(T=>{if(M.per_T[T].nll<bv){bv=M.per_T[T].nll;bt=T}});return bt}
  function draw(){
    const M=C[mk],i=+$('cal-t').value,T=Tkey(i),d=M.per_T[T],s=stats(M,T),bt=best(M),sb=stats(M,bt);
    $('cal-tv').textContent=(+T).toFixed(2);
    $('cal-stats').innerHTML=RD.stat('ECE',f(s.ece,3),'at T = '+(+T).toFixed(2))+RD.stat('NLL',f(s.nll,3),'nats per token')+RD.stat('Average confidence',f(100*s.conf,1)+'%','top-1 probability')+
      RD.stat('Top-1 accuracy',f(100*s.acc,1)+'%','the same at every T')+RD.stat('Best T by NLL',(+bt).toFixed(2),'ECE '+f(sb.ece,3)+', NLL '+f(sb.nll,3));
    // reliability diagram
    let box=$('cal-svg'),W=Math.min(RD.width(box),620),H=Math.min(W,420)+40,L=40,R=W-12,T0=10,B=H-70;const sz=Math.min(R-L,B-T0);const R2=L+sz,B2=T0+sz;
    const X=v=>L+sz*v,Y=v=>B2-sz*v;let g='';
    g+='<rect x="'+L+'" y="'+T0+'" width="'+sz+'" height="'+sz+'" fill="none" stroke="var(--line)"/>';
    g+='<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(1)+'" y2="'+Y(1)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    const NB=d.bins.length,bw=1/NB;
    d.bins.forEach((b,k)=>{if(!b[0])return;const acc=b[2]/b[0],cf=b[1]/b[0],x0=X(k*bw)+1,w=sz*bw-2;
      g+='<rect x="'+x0.toFixed(1)+'" y="'+Y(acc).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(Y(0)-Y(acc)).toFixed(1)+'" fill="var(--c1)" fill-opacity=".8"/>';
      const top=Math.max(acc,cf),bot=Math.min(acc,cf);
      g+='<rect x="'+x0.toFixed(1)+'" y="'+Y(top).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(0.5,Y(bot)-Y(top)).toFixed(1)+'" fill="var(--c2)" fill-opacity="'+(cf>acc?'.55':'.3')+'"/>';
      const hh=40*b[0]/s.n/0.2;g+='<rect x="'+x0.toFixed(1)+'" y="'+(B2+48-Math.min(hh,40)).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.min(hh,40).toFixed(1)+'" fill="var(--dim)"/>'});
    for(let v=0;v<=1.001;v+=0.2){g+=RD.t(X(v),B2+14,f(v,1),{a:'middle',fill:'var(--mute)',fs:10})+RD.t(L-4,Y(v)+4,f(v,1),{a:'end',fill:'var(--mute)',fs:10})}
    g+=RD.t(X(0.5),B2+26,'confidence (top-1 probability)',{a:'middle',fill:'var(--mute)',fs:11});
    g+='<text transform="translate(11 '+(T0+sz/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">accuracy</text>';
    box.innerHTML=RD.svg(W,B2+52,g,'Reliability diagram');
    box.dataset.ece=f(s.ece,4);box.dataset.nll=f(s.nll,4);box.dataset.bestT=bt;
    // ECE and NLL against T
    box=$('cal-svg2');W=Math.min(RD.width(box),620);const H2=200,L2=44,Rr=W-48,Tt=12,Bb=H2-28;
    const Ts=M.T.map(v=>Tkey(Math.round((v-0.5)/0.05))),E=Ts.map(t=>stats(M,t).ece),N=Ts.map(t=>M.per_T[t].nll);
    const emax=Math.max(...E)*1.08,nmin=Math.min(...N),nmax=Math.max(...N);const Xt=t=>L2+(Rr-L2)*(t-0.5)/1.5,Ye=v=>Bb-(Bb-Tt)*v/emax,Yn=v=>Bb-(Bb-Tt)*(v-nmin)/((nmax-nmin)||1);
    g='<line x1="'+L2+'" y1="'+Bb+'" x2="'+Rr+'" y2="'+Bb+'" stroke="var(--mute)"/>';
    g+='<path d="'+Ts.map((t,k)=>(k?'L':'M')+Xt(+t).toFixed(1)+' '+Ye(E[k]).toFixed(1)).join('')+'" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    g+='<path d="'+Ts.map((t,k)=>(k?'L':'M')+Xt(+t).toFixed(1)+' '+Yn(N[k]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    g+='<line x1="'+Xt(+T)+'" y1="'+Tt+'" x2="'+Xt(+T)+'" y2="'+Bb+'" stroke="var(--ink)"/>';
    [0.5,1,1.5,2].forEach(v=>{g+=RD.t(Xt(v),Bb+14,v.toFixed(1),{a:'middle',fill:'var(--mute)',fs:10})});
    g+=RD.t(L2-4,Ye(emax/1.08)+4,f(emax/1.08,3),{a:'end',fill:'var(--c2)',fs:10})+RD.t(L2-4,Bb,'0',{a:'end',fill:'var(--c2)',fs:10})+RD.t(Rr+4,Yn(nmax)+8,f(nmax,2),{fill:'var(--c1)',fs:10})+RD.t(Rr+4,Yn(nmin),f(nmin,2),{fill:'var(--c1)',fs:10});
    g+=RD.t((L2+Rr)/2,H2-2,'temperature T',{a:'middle',fill:'var(--mute)',fs:11});
    box.innerHTML=RD.svg(W,H2,g,'ECE and NLL against temperature');
    $('cal-ex').innerHTML=M.examples.map(e=>'<div class="ex">Context: <code>'+esc(e.context)+'</code><br>Right token: <code>'+esc(JSON.stringify(e.target))+'</code>, given probability '+f(e.p_target,3)+' at T = 1. Top 5: '+e.top.map(t=>'<code>'+esc(JSON.stringify(t[0]))+'</code> '+f(t[1],3)).join(', ')+'</div>').join('');
  }
  RD.seg($('cal-seg'),m=>{mk=m;draw()});$('cal-t').addEventListener('input',draw);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cal']=window.TAB_RENDER['t-cal']||[]).push(draw);
  addEventListener('resize',()=>{const t=$('t-cal');if(t&&!t.hidden)draw()});
  draw();
})();
