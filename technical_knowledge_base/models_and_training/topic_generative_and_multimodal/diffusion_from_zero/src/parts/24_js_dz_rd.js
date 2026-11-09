// ---- Reading tab: numbers in prose, predict-then-reveal, the toy animation ----
(function(){
  const D=window.DZ||{};
  // prose numbers and sentences are written into the HTML at build time (runs/fill_static.py)
  // predict then reveal: the right answer is the element's data-right, or DZ.right (written by make_data.py)
  const RIGHT=D.right||{};
  document.querySelectorAll('.pr').forEach(pr=>{const ok=pr.dataset.right!=null?pr.dataset.right:RIGHT[pr.id];const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a===String(ok))x.classList.add('right')});
      if(b.dataset.a!==String(ok))b.classList.add('wrong');ans.hidden=false}))});

  // ---- the toy animation: 160 paths, ODE against stochastic, exact denoiser. Its 51 frames are grouped into five explained stretches
  // (the step list sx-toyan): each stretch plays its frames when the animation moves forward onto it, and jumps to its end otherwise. ----
  const card=document.getElementById('dz-toyan');if(!card)return;
  const cv=document.getElementById('dz-toyan-cv'),cnt=document.getElementById('dz-toyan-cnt');
  const N=50,runs={};let mode='0';
  const get=m=>runs[m]||(runs[m]=DZT.sample({steps:N,eta:+m,tau:1,N:4000,seed:7,keep:160}));
  const color=m=>m==='0'?'#2f6fb5':'#c2703a';
  function committed(r,k){ // share of all 4,000 particles whose denoiser guess sits on a bump at frame k
    if(k===0)return 0;const t=r.ts[k-1],a=DZT.ab[t];let c=0;const x=r.trace&&r.trace[k];if(!x)return null;
    for(let j=0;j<x.length;j++){const g=DZT.x0hat(x[j],a,1);for(let q=0;q<3;q++)if(Math.abs(g-DZT.MU[q])<3*DZT.SD[q]){c++;break}}return c/x.length}
  function withTrace(m){const r=get(m);if(r.trace)return r;
    // rerun storing all particles at every step (positions after step k), for the counters
    const R=DZC.rng(7),n=N,ts=DZT.trailing(n),x=new Float64Array(4000);for(let i=0;i<4000;i++)x[i]=R.g();
    const tr=[Float64Array.from(x)];
    for(let i=0;i<n;i++){const t=ts[i],a=DZT.ab[t],ap=i+1<n?DZT.ab[ts[i+1]]:1,eta=+m;
      const sig=i+1<n&&eta>0?eta*Math.sqrt((1-ap)/(1-a)*(1-a/ap)):0,c=Math.sqrt(Math.max(1-ap-sig*sig,0));
      for(let j=0;j<4000;j++){const x0=DZT.x0hat(x[j],a,1),e=(x[j]-Math.sqrt(a)*x0)/Math.sqrt(1-a);x[j]=Math.sqrt(ap)*x0+c*e+(sig>0?sig*R.g():0)}
      tr.push(Float64Array.from(x))}
    r.trace=tr;return r}
  // the last frame of each stretch: start; high noise (t above 700); middle (t above 300); low noise; done
  function ends(r){const last=th=>{let k=0;for(let i=1;i<N;i++)if(r.ts[i-1]>th)k=i;return k};return [0,last(700),last(300),N-1,N]}
  function frame(k){const r=withTrace(mode);DZT.draw(cv,r,k,{color:color(mode)});
    const a=DZT.ab[k?(k<N?r.ts[k]:0):999],com=committed(r,k),sc=k===N?DZT.scores(r.x):null;
    cnt.innerHTML=RD.stat('Step',k+' / '+N,'network calls so far: '+k)+RD.stat('Timestep',k<N?String(k?r.ts[k]:999):'0','next noise level')+
      RD.stat('&sigma;',k<N?DZC.f(Math.sqrt((1-a)/a),2):'0','noise level in x&#771; units')+
      RD.stat('Committed',com==null?'n/a':DZC.pct(com,0),'denoiser guess on a bump')+
      RD.stat('Distance to truth',sc?DZC.f(sc.tv,3):'after the last step','total variation, 4,000 samples')}
  let prev=-1,raf=0;
  function draw(i){const r=withTrace(mode),E=ends(r),hi=E[i],lo=i>0?E[i-1]:0,fwd=i===prev+1&&card.classList.contains('rd-fwd');prev=i;cancelAnimationFrame(raf);
    if(!fwd||RD.RM||hi-lo<2||card.offsetParent===null){frame(hi);return}
    const t0=performance.now(),dur=Math.min(3200,(hi-lo)*140);   // the stretch plays its frames, then holds on its last one
    (function go(now){const f=Math.min(1,(now-t0)/dur),k=Math.round(lo+(hi-lo)*f);frame(k);if(f<1)raf=requestAnimationFrame(go)})(t0)}
  const an=RD.anim({card:'dz-toyan',ctl:'dz-toyan-ctl',n:5,ms:5200,label:'Stretch of the sampling run',list:'sx-toyan',draw});
  RD.seg(document.getElementById('dz-toyan-m'),m=>{mode=m;prev=-1;an.reset(5)});   // a mode switch restarts from the first stretch and replays
  RD.onResize(()=>an.redraw());
})();

// ---- section 3: where each recipe spends the loss, on the log-SNR axis ----
(function(){
  const el=document.getElementById('dz-w-chart');if(!el)return;
  const D=window.DZ||{},PM=D.edm?D.edm.pmean:-1.2,PS=D.edm?D.edm.pstd:1.2;
  let sch='lin';
  const COL={eps:'#2f6fb5',x0:'#c2703a',v:'#3f7f56',min:'#8a5cb8',edm:'#b8983a'};
  function curves(){
    const ab=DZC.sched(sch==='lin'?'linear':'scaled'),T=ab.length,lam=[],dens=[];
    for(let t=0;t<T;t++)lam.push(Math.log(ab[t]/(1-ab[t])));
    for(let t=0;t<T;t++){const a=lam[Math.max(0,t-1)],b=lam[Math.min(T-1,t+1)];dens.push((1/T)/(Math.abs(a-b)/((t>0&&t<T-1)?2:1)))}
    const mk=(w)=>{const pts=lam.map((l,t)=>[l,w(l)*dens[t]]);let z=0;for(let i=1;i<pts.length;i++)z+=Math.abs(pts[i][0]-pts[i-1][0])*(pts[i][1]+pts[i-1][1])/2;return pts.filter((p,i)=>i%4===0||i===T-1).map(p=>[p[0],p[1]/z])};
    const s=[{name:'ε (weight SNR)',color:COL.eps,pts:mk(l=>Math.exp(l)),mark:false},
      {name:'x₀ (weight 1)',color:COL.x0,pts:mk(()=>1),mark:false},
      {name:'v (SNR + 1)',color:COL.v,pts:mk(l=>Math.exp(l)+1),mark:false},
      {name:'Min-SNR, γ = 5',color:COL.min,pts:mk(l=>Math.min(Math.exp(l),5)),mark:false}];
    // EDM: ln sigma ~ N(PM, PS^2), lambda = -2 ln sigma; weight on x0 error 1/sigma_data^2 + 1/sigma^2 = 4 + e^lambda
    const ep=[];let z=0;for(let i=0;i<=200;i++){const l=-14+24*i/200,ls=-l/2,p=Math.exp(-0.5*((ls-PM)/PS)**2)/(PS*Math.sqrt(2*Math.PI))/2;ep.push([l,p*(4+Math.exp(l))])}
    for(let i=1;i<ep.length;i++)z+=(ep[i][0]-ep[i-1][0])*(ep[i][1]+ep[i-1][1])/2;
    s.push({name:'EDM (own noise sampling, σ_data 0.5)',color:COL.edm,pts:ep.map(p=>[p[0],p[1]/z]),mark:false,dash:'5 3'});
    return {s,lo:Math.min(...lam),hi:Math.max(...lam)};
  }
  function render(){const c=curves();
    DZC.chart({el,series:c.s,xlab:'λ = ln SNR  (left: pure noise, right: clean)',ylab:'share of the loss',x0:Math.floor(c.lo),x1:Math.ceil(c.hi),y0:0,ylog:false,label:'Loss weighting by noise level',
      vlines:[{x:0,label:'SNR = 1'}]});
    DZC.legend(document.getElementById('dz-w-leg'),c.s)}
  RD.seg(document.getElementById('dz-w-m'),m=>{sch=m;render()});
  RD.onRender(render,'t-read');RD.onResize(render);
})();

// ---- section 4: the toy with a hedging knob ----
(function(){
  const cv=document.getElementById('dz-toyx-cv');if(!cv)return;
  const st={tau:1,eta:0,n:50},cache={};
  function render(){
    const key=st.tau+'|'+st.eta+'|'+st.n;
    const r=cache[key]||(cache[key]=DZT.sample({steps:st.n,eta:st.eta,tau:st.tau,N:6000,seed:3,keep:60}));
    DZT.draw(cv,r,st.n,{color:st.eta===0?'#2f6fb5':st.eta===1?'#c2703a':'#8a5cb8'});
    const s=DZT.scores(r.x);
    document.getElementById('dz-toyx-cnt').innerHTML=RD.stat('Distance to truth',DZC.f(s.tv,3),'total variation (0 is perfect)')+
      RD.stat('Between bumps',DZC.pct(s.between,1),'true mixture: under 0.3%')+
      RD.stat('Bump shares',s.w.map(v=>DZC.pct(v,0)).join(' / '),'truth 50% / 30% / 20%')+
      RD.stat('Network calls',DZC.f(st.n),'one per step');
  }
  RD.seg(document.getElementById('dz-toyx-tau'),m=>{st.tau=+m;render()});
  RD.seg(document.getElementById('dz-toyx-eta'),m=>{st.eta=+m;render()});
  RD.seg(document.getElementById('dz-toyx-n'),m=>{st.n=+m;render()});
  RD.onRender(render,'t-read');RD.onResize(render);
})();

// ---- section 8: the bugs card (sentences are static, runs/fill_static.py) ----
(function(){
  const D=window.DZ;if(!D)return;const $=id=>document.getElementById(id);
  // bugs card
  const B=D.bugs||[];if(!$('dz-bug-m')||!B.length)return;
  $('dz-bug-m').innerHTML=B.map((b,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+RD.esc(b.label)+'</button>').join('');
  const img=new Image();
  const show=i=>{const b=B[i];img.onload=()=>{const cv=$('dz-bug-cv');cv.width=img.width;cv.height=img.height;cv.getContext('2d').drawImage(img,0,0)};img.src=D.strips[b.strip];
    $('dz-bug-cnt').innerHTML=RD.stat('FD',DZC.f(b.fd,1),'correct: '+DZC.f(B[0].fd,1))+RD.stat('Class accuracy',DZC.pct(b.acc,1),'correct: '+DZC.pct(B[0].acc,1))+RD.stat('Diversity',DZC.f(b.div,2),'real '+D.f.real_div);
    $('dz-bug-cap').textContent=b.cap};
  RD.seg($('dz-bug-m'),m=>show(+m));show(0);
})();
