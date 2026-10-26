// ---- The two-moons block (section 5, closed; guidance table in section 6): forward-then-back animation, straightness of
// DDIM against flow-matching paths, and the sampler lab. Moved from the Variational inference maths page, 2026-10-26.
// Nothing runs until the reader opens the block; the animation waits on step 0 until the reader plays or steps.
(function(){
  const $=id=>document.getElementById(id);
  const NP=300,D=DZM.moons(NP,21);
  // ---- run one mode, frames captured along the way; computed in slices so the page stays responsive ----
  const RUNS={};
  function startRun(mode,onDone){
    if(RUNS[mode])return RUNS[mode];
    const R={frames:[],labels:[],evals:[],done:false,progress:0};RUNS[mode]=R;
    const X=Float64Array.from(D.X);R.frames.push(Float64Array.from(X));R.labels.push(['data','t = 0']);R.evals.push(0);
    const nets=DZM.nets();const E=new Float64Array(2*NP),U=new Float64Array(2*NP);let ev=0;
    const jobs=[];
    if(mode==='ddpm'){
      const r=DZM.rng(31);let t=0;
      jobs.push(()=>{for(let k=0;k<50;k++){t++;const b=1e-4+(0.02-1e-4)*(t-1)/999,sb=Math.sqrt(b),sa=Math.sqrt(1-b);for(let i=0;i<2*NP;i++)X[i]=sa*X[i]+sb*r.g()}
        R.frames.push(Float64Array.from(X));R.labels.push(['forward','t = '+t+' of 1000']);R.evals.push(ev);return t>=1000});
      let s=null;
      jobs.push(()=>{if(!s)s=DZM.sampler({method:'ddpm',sched:'linear',S:1000,c:2,w:0,n:NP,seed:32,X0:X});
        for(let k=0;k<50&&!s.done;k++){s.step();ev++}const lev=s.done?0:s.k+1;
        R.frames.push(Float64Array.from(s.X));R.labels.push(['reverse',s.done?'t = 0: samples':'t = '+lev+' of 1000']);R.evals.push(ev);return s.done});
    }else if(mode==='ddim'){
      const ts=DZM.tsteps(50),ab=DZM.SCH.linear;let i=-1;
      jobs.push(()=>{for(let k=0;k<5;k++){const a=i<0?1:ab[ts[i]-1],b=ab[ts[i+1]-1],lev=ts[Math.max(i,0)];
          DZM.net(nets.eps,X,NP,Math.log(ab[lev-1]/(1-ab[lev-1]))/12,2,E);ev++;
          for(let j=0;j<2*NP;j++){const x0=(X[j]-Math.sqrt(1-a)*E[j])/Math.sqrt(a);X[j]=Math.sqrt(b)*x0+Math.sqrt(1-b)*E[j]}i++}
        R.frames.push(Float64Array.from(X));R.labels.push(['encode (DDIM inversion)','t = '+ts[i]+' of 1000']);R.evals.push(ev);return i>=49});
      let s=null;
      jobs.push(()=>{if(!s)s=DZM.sampler({method:'ddim',sched:'linear',S:50,c:2,w:0,n:NP,seed:1,X0:X});
        for(let k=0;k<5&&!s.done;k++){s.step();ev++}
        R.frames.push(Float64Array.from(s.X));R.labels.push(['decode (DDIM)',s.done?'t = 0: decoded':'t = '+ts[s.k]+' of 1000']);R.evals.push(ev);return s.done});
    }else{
      let k=0;
      jobs.push(()=>{for(let q=0;q<5;q++){DZM.net(nets.flow,X,NP,2*(k/50)-1,2,E);ev++;for(let j=0;j<2*NP;j++)X[j]+=E[j]/50;k++}
        R.frames.push(Float64Array.from(X));R.labels.push(['encode (Euler, forward in t)','t = '+(k/50).toFixed(1)]);R.evals.push(ev);return k>=50});
      let s=null;
      jobs.push(()=>{if(!s)s=DZM.sampler({method:'flow',S:50,c:2,w:0,n:NP,seed:1,X0:X});
        for(let q=0;q<5&&!s.done;q++){s.step();ev++}
        R.frames.push(Float64Array.from(s.X));R.labels.push(['decode (Euler, backward in t)',s.done?'t = 0: decoded':'t = '+(s.k===0?1:(1-s.k/50)).toFixed(1)]);R.evals.push(ev);return s.done});
    }
    let j=0;
    (function tick(){try{if(jobs[j]())j++;R.progress=R.frames.length;if(j>=jobs.length){R.done=true;onDone&&onDone();return}}catch(e){window.__jsErr&&__jsErr(e.message);return}
      setTimeout(tick,0)})();
    return R}
  const NF={ddpm:41,ddim:21,flow:21};
  let mode='ddpm',A=null;const cache={};
  function stats(F){const n=NP;let d=0,own=0;const sc=DZM.score(F,2);
    for(let p=0;p<n;p++){d+=Math.hypot(F[2*p]-D.X[2*p],F[2*p+1]-D.X[2*p+1]);
      const s1=DZM.score(F.subarray(2*p,2*p+2),D.Y[p]);if(s1.match===1&&s1.on===1)own++}
    return {dist:d/n,on:sc.on,own:own/n}}
  function draw(i){
    const el=$('dzm-fr-svg'),W=Math.min(RD.width(el),640),H=Math.round(W*0.62);const R=RUNS[mode];
    if(!R||R.frames.length<=i){el.innerHTML=RD.svg(W,H,RD.t(W/2,H/2,'computing the trained model’s steps… '+(R?Math.round(100*R.frames.length/NF[mode]):0)+'%',{a:'middle',fs:13}),'computing');
      $('dzm-fr-cap').innerHTML='<div class="t">Running the network in your browser</div><p>'+(mode==='ddpm'?'1,000 reverse steps for 300 points: a few seconds.':'50 steps each way.')+'</p>';$('dzm-fr-cnt').innerHTML='';return}
    const F=R.frames[i],S=3.4,sc=Math.min(W,H)/(2*S)*1.0,cx=W/2,cy=H/2;let s='<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none" stroke="var(--line)"/>';
    for(let p=0;p<NP;p++){s+='<circle cx="'+(cx+F[2*p]*sc).toFixed(1)+'" cy="'+(cy-F[2*p+1]*sc).toFixed(1)+'" r="2.2" fill="'+(D.Y[p]?'var(--c2)':'var(--c1)')+'" fill-opacity="0.85"/>'}
    el.innerHTML=RD.svg(W,H,s,'Points through the forward and reverse processes');
    const key=mode+i;const st=cache[key]||(cache[key]=stats(F));const lab=R.labels[i];
    const last=i===NF[mode]-1,first=i===0,mid=(NF[mode]-1)/2;
    let cap;
    if(first)cap='300 points from the two-moons data, coloured by the moon each started on.';
    else if(i<mid)cap=mode==='ddpm'?'Forward process: each step shrinks every point by √(1−βₜ) and adds fresh Gaussian noise. No network involved.':mode==='ddim'?'DDIM run backwards (inversion): the network’s noise guess pushes each point deterministically towards higher noise.':'The flow model’s velocity carries each point forward along (nearly) straight paths towards noise.';
    else if(i===mid)cap='Pure noise at t = 1000 (or t = 1): the moons are gone; what remains is (close to) a standard Gaussian cloud.';
    else if(!last)cap=mode==='ddpm'?'Reverse process: each step applies the trained network’s mean and adds fresh noise of variance β̃ₜ. Structure appears late, in the last few hundred steps.':'Decoding: the same deterministic steps, run backwards in noise level.';
    else cap=mode==='ddpm'?'Back on the moons, but each point landed wherever the fresh noise took it: only about half are on their own moon (chance), mean distance from start '+st.dist.toFixed(2)+'.':'Back on the moons, each point near its own starting place: '+Math.round(100*st.own)+'% on their own moon, mean distance from start '+st.dist.toFixed(2)+' (not 0: 50 steps each way are approximate).';
    $('dzm-fr-cap').innerHTML='<div class="t">'+lab[0]+': '+lab[1]+'</div><p>'+cap+'</p>';
    $('dzm-fr-cnt').innerHTML=RD.stat('on the data',Math.round(100*st.on)+'%','within 0.2 of a moon')+RD.stat('on their own moon',Math.round(100*st.own)+'%','by starting colour')+RD.stat('mean distance from start',st.dist.toFixed(2),'standardised units')+RD.stat('network evaluations',String(R.evals[i]),mode==='ddpm'?'1,000 for the full reverse':'50 + 50');
  }
  let seen=false;
  function boot(){if(!$('dzm-fr-svg'))return;A=RD.anim({card:'dzm-fr-card',ctl:'dzm-fr-ctl',n:NF[mode],draw:i=>{if(seen&&!RUNS[mode])startRun(mode,()=>A&&A.redraw());draw(i)},ms:450,label:'Animation frame'});
    RD.seg($('dzm-fr-seg'),m=>{mode=m;startRun(m,()=>A.redraw());A.reset(NF[m])});RD.onResize(()=>A.redraw());
    const card=$('dzm-fr-card');
    if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[es.length-1].isIntersecting&&!seen&&card.offsetParent){seen=true;startRun(mode,()=>A.redraw());A.redraw()}},{rootMargin:'300px'}).observe(card);else{seen=true;startRun(mode,()=>A.redraw())}}
  boot();
  // ===== straightness: DDIM against flow matching from the same noise =====
  function straight(){const el=$('dzm-st-svg');if(!el)return;const n=40,r=DZM.rng(77),X0=new Float64Array(2*n);for(let i=0;i<2*n;i++)X0[i]=r.g();
    const res={};
    ['ddim','flow'].forEach(m=>{const s=DZM.sampler({method:m,sched:'linear',S:50,c:2,w:0,n,seed:1,X0});const P=[Float64Array.from(s.X)];while(s.step())P.push(Float64Array.from(s.X));P.push(Float64Array.from(s.X));
      let ratio=0;for(let p=0;p<n;p++){let len=0;for(let k=1;k<P.length;k++)len+=Math.hypot(P[k][2*p]-P[k-1][2*p],P[k][2*p+1]-P[k-1][2*p+1]);
        const dd=Math.hypot(P[P.length-1][2*p]-P[0][2*p],P[P.length-1][2*p+1]-P[0][2*p+1]);ratio+=dd/len}
      res[m]={P,ratio:ratio/n}});
    const W0=Math.min(RD.width(el),680),narrow=W0<520,w=narrow?W0:Math.floor((W0-12)/2),h=Math.round(w*0.8);
    const panel=(m,title)=>{const P=res[m].P,S=3.4,sc=Math.min(w,h)/(2*S),cx=w/2,cy=h/2;let s='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="none" stroke="var(--line)"/>'+RD.t(6,14,title,{fs:11.5,w:600});
      for(let p=0;p<n;p++){let d='';P.forEach((F,k)=>{d+=(k?'L':'M')+(cx+F[2*p]*sc).toFixed(1)+' '+(cy-F[2*p+1]*sc).toFixed(1)});
        s+='<path d="'+d+'" fill="none" stroke="'+(m==='ddim'?'var(--c1)':'var(--c3)')+'" stroke-opacity="0.55" stroke-width="1"/>';
        const L=P[P.length-1];s+='<circle cx="'+(cx+L[2*p]*sc).toFixed(1)+'" cy="'+(cy-L[2*p+1]*sc).toFixed(1)+'" r="2.2" fill="var(--ink)"/>'}
      return RD.svg(w,h,s,title)};
    el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:12px">'+panel('ddim','DDIM, noise-prediction network')+panel('flow','Euler, flow-matching network')+'</div>';
    $('dzm-st-out').innerHTML=RD.stat('straightness, DDIM',res.ddim.ratio.toFixed(3),'mean over 40 paths')+RD.stat('straightness, flow matching',res.flow.ratio.toFixed(3),'1 = straight line');
    window.DZM_ST={ddim:res.ddim.ratio,flow:res.flow.ratio}}
  let stDone=false;const stEl=$('dzm-st-card');
  if(stEl&&'IntersectionObserver' in window){new IntersectionObserver(es=>{if(es[es.length-1].isIntersecting&&!stDone){stDone=true;straight()}},{rootMargin:'200px'}).observe(stEl)}else straight();
  RD.onResize(()=>{if(stDone)straight()});
})();

// ---- Sampler lab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('dzm-svg'))return;
  const st={m:'ddpm',s:'linear',c:2};let last=null,busy=false;const REAL=DZM.moons(600,99);
  function lamOf(){const S=+$('dzm-n').value;if(st.m==='flow'){const a=[];for(let k=0;k<S;k++){const t=1-k/S;a.push(t>=1?-Infinity:2*Math.log((1-t)/t))}return a}
    return DZM.tsteps(S).map(t=>{const ab=DZM.abar(st.s,t);return Math.log(ab/(1-ab))})}
  function draw(){const el=$('dzm-svg'),W=Math.min(RD.width(el),720),H=Math.round(W*0.6),S=3.3,sc=Math.min(W,H)/(2*S),cx=W/2,cy=H/2;
    let s='<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none" stroke="var(--line)"/>';
    for(let p=0;p<600;p++)s+='<circle cx="'+(cx+REAL.X[2*p]*sc).toFixed(1)+'" cy="'+(cy-REAL.X[2*p+1]*sc).toFixed(1)+'" r="1.6" fill="var(--dim)"/>';
    if(last){const X=last.X;for(let p=0;p<X.length/2;p++){const x=cx+X[2*p]*sc,y=cy-X[2*p+1]*sc;if(x>-5&&x<W+5&&y>-5&&y<H+5)s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2" fill="var(--c1)" fill-opacity="0.8"/>'}}
    el.innerHTML=RD.svg(W,H,s,'Samples');
    // log-SNR strip
    const lam=lamOf(),w2=W,h2=46,L0=-14,L1=12,Xl=v=>10+(Math.max(L0,Math.min(L1,v))-L0)/(L1-L0)*(w2-20);let s2='<line x1="10" y1="22" x2="'+(w2-10)+'" y2="22" stroke="var(--mute)"/>';
    [-12,-8,-4,0,4,8,12].forEach(v=>{s2+='<line x1="'+Xl(v)+'" y1="19" x2="'+Xl(v)+'" y2="25" stroke="var(--mute)"/>'+RD.t(Xl(v),40,v,{a:'middle',fs:10})});
    lam.forEach(v=>{s2+='<circle cx="'+Xl(isFinite(v)?v:L0).toFixed(1)+'" cy="22" r="3" fill="var(--c2)" fill-opacity="0.6"/>'});
    s2+=RD.t(10,12,'noise ← log-SNR of each step → data',{fs:10.5});
    $('dzm-lam').innerHTML=RD.svg(w2,h2,s2,'Step positions in log-SNR')}
  function go(){if(busy)return;busy=true;const o={method:st.m,sched:st.s,S:+$('dzm-n').value,c:st.c,w:+$('dzm-w').value,n:+$('dzm-p').value,seed:+$('dzm-seed').value};
    const smp=DZM.sampler(o),t0=performance.now();$('dzm-go').disabled=true;
    (function slice(){const tt=performance.now();while(!smp.done&&performance.now()-tt<40)smp.step();
      $('dzm-stat').textContent=smp.done?'':'sampling… '+Math.round(100*(1-(st.m==='flow'?(o.S-smp.k):smp.k+1)/o.S))+'%';
      if(!smp.done){setTimeout(slice,0);return}
      const ms=performance.now()-t0;last={X:smp.X,o};busy=false;$('dzm-go').disabled=false;
      const sc=DZM.score(smp.X,o.c);let mx=0,my=0;const n=o.n;for(let p=0;p<n;p++){mx+=smp.X[2*p];my+=smp.X[2*p+1]}mx/=n;my/=n;let vx=0;for(let p=0;p<n;p++)vx+=(smp.X[2*p]-mx)**2;
      const evals=o.S*(o.c<2&&o.w>0?2:1);
      $('dzm-out').innerHTML=RD.stat('on data',(100*sc.on).toFixed(1)+'%','within 0.2 of a moon')+(o.c<2?RD.stat('on the requested moon',(100*sc.match).toFixed(1)+'%','nearest moon is the one asked for'):RD.stat('on the requested moon','n/a','unconditional'))+
        RD.stat('horizontal spread (sd)',Math.sqrt(vx/n).toFixed(3),o.c<2?'real single moon: about 1.0':'real data: about 1.24')+RD.stat('network evaluations per sample',String(evals),(ms/1000).toFixed(2)+' s for all points');
      $('dzm-stat').textContent='';draw();window.DZM_DF={o,on:sc.on,match:sc.match,X:smp.X}})()}
  RD.seg($('dzm-meth'),m=>{st.m=m;$('dzm-sch').querySelectorAll('button').forEach(b=>b.disabled=m==='flow');if(m==='ddpm'&&+$('dzm-n').value<5)$('dzm-n').value='50';draw()});
  RD.seg($('dzm-sch'),m=>{st.s=m;draw()});RD.seg($('dzm-cond'),m=>{st.c=+m});
  $('dzm-w').addEventListener('input',()=>{$('dzm-wv').textContent=$('dzm-w').value});$('dzm-n').addEventListener('change',draw);
  $('dzm-go').addEventListener('click',go);
  let first=true;const det=$('dzm-blk');if(det)det.addEventListener('toggle',()=>{if(det.open){draw();if(first){first=false;go()}}});RD.onResize(()=>{if(det&&det.open)draw()});
  window.DZM_go=go;
})();
