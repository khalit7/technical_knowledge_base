// ---- Diffusion lab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('df-svg'))return;
  const st={m:'ddpm',s:'linear',c:2};let last=null,busy=false;const REAL=VI.moons(600,99);
  function lamOf(){const S=+$('df-n').value;if(st.m==='flow'){const a=[];for(let k=0;k<S;k++){const t=1-k/S;a.push(t>=1?-Infinity:2*Math.log((1-t)/t))}return a}
    return VI.tsteps(S).map(t=>{const ab=VI.abar(st.s,t);return Math.log(ab/(1-ab))})}
  function draw(){const el=$('df-svg'),W=Math.min(RD.width(el),720),H=Math.round(W*0.6),S=3.3,sc=Math.min(W,H)/(2*S),cx=W/2,cy=H/2;
    let s='<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none" stroke="var(--line)"/>';
    for(let p=0;p<600;p++)s+='<circle cx="'+(cx+REAL.X[2*p]*sc).toFixed(1)+'" cy="'+(cy-REAL.X[2*p+1]*sc).toFixed(1)+'" r="1.6" fill="var(--dim)"/>';
    if(last){const X=last.X;for(let p=0;p<X.length/2;p++){const x=cx+X[2*p]*sc,y=cy-X[2*p+1]*sc;if(x>-5&&x<W+5&&y>-5&&y<H+5)s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2" fill="var(--c1)" fill-opacity="0.8"/>'}}
    el.innerHTML=RD.svg(W,H,s,'Samples');
    // log-SNR strip
    const lam=lamOf(),w2=W,h2=46,L0=-14,L1=12,Xl=v=>10+(Math.max(L0,Math.min(L1,v))-L0)/(L1-L0)*(w2-20);let s2='<line x1="10" y1="22" x2="'+(w2-10)+'" y2="22" stroke="var(--mute)"/>';
    [-12,-8,-4,0,4,8,12].forEach(v=>{s2+='<line x1="'+Xl(v)+'" y1="19" x2="'+Xl(v)+'" y2="25" stroke="var(--mute)"/>'+RD.t(Xl(v),40,v,{a:'middle',fs:10})});
    lam.forEach(v=>{s2+='<circle cx="'+Xl(isFinite(v)?v:L0).toFixed(1)+'" cy="22" r="3" fill="var(--c2)" fill-opacity="0.6"/>'});
    s2+=RD.t(10,12,'noise ← log-SNR of each step → data',{fs:10.5});
    $('df-lam').innerHTML=RD.svg(w2,h2,s2,'Step positions in log-SNR')}
  function go(){if(busy)return;busy=true;const o={method:st.m,sched:st.s,S:+$('df-n').value,c:st.c,w:+$('df-w').value,n:+$('df-p').value,seed:+$('df-seed').value};
    const smp=VI.sampler(o),t0=performance.now();$('df-go').disabled=true;
    (function slice(){const tt=performance.now();while(!smp.done&&performance.now()-tt<40)smp.step();
      $('df-stat').textContent=smp.done?'':'sampling… '+Math.round(100*(1-(st.m==='flow'?(o.S-smp.k):smp.k+1)/o.S))+'%';
      if(!smp.done){setTimeout(slice,0);return}
      const ms=performance.now()-t0;last={X:smp.X,o};busy=false;$('df-go').disabled=false;
      const sc=VI.score(smp.X,o.c);let mx=0,my=0;const n=o.n;for(let p=0;p<n;p++){mx+=smp.X[2*p];my+=smp.X[2*p+1]}mx/=n;my/=n;let vx=0;for(let p=0;p<n;p++)vx+=(smp.X[2*p]-mx)**2;
      const evals=o.S*(o.c<2&&o.w>0?2:1);
      $('df-out').innerHTML=RD.stat('on data',(100*sc.on).toFixed(1)+'%','within 0.2 of a moon')+(o.c<2?RD.stat('on the requested moon',(100*sc.match).toFixed(1)+'%','nearest moon is the one asked for'):RD.stat('on the requested moon','n/a','unconditional'))+
        RD.stat('horizontal spread (sd)',Math.sqrt(vx/n).toFixed(3),o.c<2?'real single moon: about 1.0':'real data: about 1.24')+RD.stat('network evaluations per sample',String(evals),(ms/1000).toFixed(2)+' s for all points');
      $('df-stat').textContent='';draw();window.VI_DF={o,on:sc.on,match:sc.match,X:smp.X}})()}
  RD.seg($('df-m'),m=>{st.m=m;$('df-s').querySelectorAll('button').forEach(b=>b.disabled=m==='flow');if(m==='ddpm'&&+$('df-n').value<5)$('df-n').value='50';draw()});
  RD.seg($('df-s'),m=>{st.s=m;draw()});RD.seg($('df-c'),m=>{st.c=+m});
  $('df-w').addEventListener('input',()=>{$('df-wv').textContent=$('df-w').value});$('df-n').addEventListener('change',draw);
  $('df-go').addEventListener('click',go);
  let first=true;RD.onRender(()=>{draw();if(first){first=false;go()}},'t-diff');addEventListener('resize',()=>{if(!$('t-diff').hidden)draw()});
  window.VI_DFgo=go;
})();
