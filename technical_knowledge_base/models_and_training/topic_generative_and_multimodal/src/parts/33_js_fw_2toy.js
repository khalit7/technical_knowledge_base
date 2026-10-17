// ---- Flow lab: the 2-D toy, run live. The four MLPs trained by src/flow/toy2d.py (int8 weights, per-row scales) ----
(function(){const FW=window.FW;if(!FW)return;const {D,$,RM}=FW;const T=D.toy;if(!T||!$('fw-toy'))return;
  const SET=T.setup,R=SET.ring_radius,SD=SET.mode_std,K=SET.modes;
  const CEN=[];for(let k=0;k<K;k++)CEN.push([R*Math.cos(2*Math.PI*k/K),R*Math.sin(2*Math.PI*k/K)]);
  // ---- the networks
  const NETS={};
  Object.keys(T.nets).forEach(k=>{NETS[k]=T.nets[k].map(L=>{const q=FW.b64(L.q),W=new Float32Array(L.o*L.i);
    for(let r=0;r<L.o;r++)for(let c=0;c<L.i;c++){const v=q[r*L.i+c];W[r*L.i+c]=(v>127?v-256:v)*L.s[r]}
    return {o:L.o,i:L.i,W,b:Float32Array.from(L.b)}})});
  const HMAX=64;const hA=new Float32Array(HMAX),hB=new Float32Array(HMAX);
  // f(x, y, t) -> out[0..1]; SiLU between layers (the same MLP as toy2d.py)
  function f(net,x,y,t,out){let a=hA,b=hB;a[0]=x;a[1]=y;a[2]=t;let n=3;
    for(let l=0;l<net.length;l++){const L=net[l],W=L.W,last=l===net.length-1;
      for(let r=0;r<L.o;r++){let s=L.b[r];const o=r*L.i;for(let c=0;c<n;c++)s+=W[o+c]*a[c];b[r]=last?s:s/(1+Math.exp(-s))}
      const t2=a;a=b;b=t2;n=L.o}
    out[0]=a[0];out[1]=a[1]}
  // linear DDPM schedule (Diffusion lab): betas 1e-4..0.02, T = 1000
  const AB=new Float64Array(1000);{let p=1;for(let i=0;i<1000;i++){p*=1-(1e-4+(0.02-1e-4)*i/999);AB[i]=p}}
  const tmp=[0,0],tmp2=[0,0];
  // n steps from z (Float32Array 2N) -> path Float32Array((n+1)*2N)
  function solve(kind,solver,z,n){const N=z.length/2,P=new Float32Array((n+1)*2*N);P.set(z,0);const net=NETS[kind];
    if(kind==='ddpm'){const ts=[];for(let k=0;k<n;k++)ts.push(Math.round(1000-k*1000/n)-1);
      for(let k=0;k<n;k++){const t=ts[k],ab=AB[t],abp=k+1<n?AB[ts[k+1]]:1,o=k*2*N,o2=o+2*N;
        for(let i=0;i<N;i++){const x=P[o+2*i],y=P[o+2*i+1];f(net,x,y,t/1000,tmp);
          const x0=(x-Math.sqrt(1-ab)*tmp[0])/Math.sqrt(ab),y0=(y-Math.sqrt(1-ab)*tmp[1])/Math.sqrt(ab);
          P[o2+2*i]=Math.sqrt(abp)*x0+Math.sqrt(1-abp)*tmp[0];P[o2+2*i+1]=Math.sqrt(abp)*y0+Math.sqrt(1-abp)*tmp[1]}}
      return P}
    const h=1/n;
    for(let k=0;k<n;k++){const t=k*h,o=k*2*N,o2=o+2*N;
      for(let i=0;i<N;i++){const x=P[o+2*i],y=P[o+2*i+1];f(net,x,y,t,tmp);let vx=tmp[0],vy=tmp[1];
        if(solver==='heun'){f(net,x+h*vx,y+h*vy,t+h,tmp2);vx=(vx+tmp2[0])/2;vy=(vy+tmp2[1])/2}
        else if(solver==='midpoint'){f(net,x+.5*h*vx,y+.5*h*vy,t+.5*h,tmp2);vx=tmp2[0];vy=tmp2[1]}
        P[o2+2*i]=x+h*vx;P[o2+2*i+1]=y+h*vy}}
    return P}
  // seeded noise (mulberry32 + Box-Muller), so every model starts from the same points
  function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  function gauss(n,seed){const r=rng(seed),z=new Float32Array(2*n);for(let i=0;i<n;i++){const u=Math.max(1e-12,r()),v=r(),m=Math.sqrt(-2*Math.log(u));z[2*i]=m*Math.cos(2*Math.PI*v);z[2*i+1]=m*Math.sin(2*Math.PI*v)}return z}
  function dataPts(n,seed){const r=rng(seed),g=gauss(n,seed+1),x=new Float32Array(2*n);for(let i=0;i<n;i++){const k=Math.floor(r()*K);x[2*i]=CEN[k][0]+SD*g[2*i];x[2*i+1]=CEN[k][1]+SD*g[2*i+1]}return x}
  const nearest=(x,y)=>{let b=0,bd=1e9;for(let k=0;k<K;k++){const d=(x-CEN[k][0])**2+(y-CEN[k][1])**2;if(d<bd){bd=d;b=k}}return [b,Math.sqrt(bd)]};
  const NP=400;let seed=1;let Z=gauss(NP,seed);
  const st={kind:'cfm',solver:'euler',n:4,u:0,play:false,trails:true,arrows:true,vis:false,started:false,raf:0,last:0,spd:1};
  let P=null,ref={},endCol=null;
  const COL=['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7'];
  function refFor(kind){const k=kind+'|'+seed;if(!ref[k]){const n=64,Q=solve(kind,'heun',Z,n);const o=n*2*NP;
      let len=0;for(let i=0;i<NP;i++){let L=0;for(let s=0;s<n;s++){const a=s*2*NP+2*i,b=a+2*NP;L+=Math.hypot(Q[b]-Q[a],Q[b+1]-Q[a+1])}len+=Math.hypot(Q[o+2*i]-Q[2*i],Q[o+2*i+1]-Q[2*i+1])/Math.max(1e-9,L)}
      ref[k]={end:Q.slice(o),ratio:len/NP}}return ref[k]}
  const cv=$('fw-toy-cv'),cx=cv.getContext('2d');
  function recompute(){P=solve(st.kind,st.solver,Z,st.n);const o=st.n*2*NP;endCol=new Array(NP);let on=0,gap=0;const rf=refFor(st.kind);
    for(let i=0;i<NP;i++){const x=P[o+2*i],y=P[o+2*i+1],nn=nearest(x,y);const ok=nn[1]<3*SD;on+=ok;endCol[i]=ok?COL[nn[0]]:'#888';gap+=Math.hypot(x-rf.end[2*i],y-rf.end[2*i+1])}
    const nfe=st.kind==='ddpm'||st.solver==='euler'?st.n:2*st.n;
    $('fw-toy-out').innerHTML=FW.stat('Network evaluations',nfe,st.kind==='ddpm'?'DDIM, one per step':st.solver==='euler'?'one per step':'two per step')+
      FW.stat('Landed on a mode',(100*on/NP).toFixed(0)+'%','within '+(3*SD).toFixed(2)+' of a centre')+
      FW.stat('Gap to the fine answer',(gap/NP).toFixed(2),'mean distance to the 64-step Heun end point')+
      FW.stat('Straightness',rf.ratio.toFixed(3),'distance / path length of the fine path; 1 = straight');
    $('fw-toy-cap').innerHTML=caption(on/NP)}
  function caption(on){const nm={cfm:'Flow matching with random pairs',reflow:'The same noise after one reflow',ot:'Flow matching with minibatch-OT pairs',ddpm:'Diffusion (DDPM-trained, DDIM sampler)'}[st.kind];
    let s='<b>'+nm+'</b>, '+st.n+' step'+(st.n>1?'s':'')+(st.kind==='ddpm'?'':' of '+{euler:'Euler',heun:'Heun',midpoint:'midpoint'}[st.solver])+'. ';
    if(st.n===1&&st.kind==='cfm')s+='One Euler step follows the velocity at t = 0, which is the average direction to all the data: every particle moves towards the middle of the ring, where there is no data.';
    else if(st.n===1&&st.kind==='reflow')s+='After reflow the paths barely bend, so one Euler step already lands most particles on a mode.';
    else if(st.kind==='ddpm')s+='DDIM follows the probability-flow ODE of the diffusion model: the paths are curved (the image is scaled down and noise is swapped for signal at a varying rate), so few steps land off the modes.';
    else if(on>.9)s+='Enough steps: the paths are followed closely and the particles land on the modes.';
    else s+='Too few steps for these curved paths: each step goes straight along the current velocity and overshoots the bends.';
    return s}
  function draw(){const W=Math.min(FW.width(cv.parentNode),520),dpr=window.devicePixelRatio||1;if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(W*dpr);cv.style.width=W+'px';cv.style.height=W+'px'}
    const S=cv.width,sc=S/9.6,X=x=>S/2+x*sc,Y=y=>S/2-y*sc;cx.setTransform(1,0,0,1,0,0);
    const cs=getComputedStyle(document.documentElement);cx.fillStyle=cs.getPropertyValue('--soft')||'#f4f4f4';cx.fillRect(0,0,S,S);
    cx.strokeStyle=cs.getPropertyValue('--line')||'#ccc';cx.lineWidth=dpr;cx.setLineDash([4*dpr,3*dpr]);
    CEN.forEach(c=>{cx.beginPath();cx.arc(X(c[0]),Y(c[1]),3*SD*sc,0,2*Math.PI);cx.stroke()});cx.setLineDash([]);
    if(!P)return;const n=st.n,u=Math.min(st.u,n),k=Math.min(n-1,Math.floor(u)),fr=u-k;
    const tcur=st.kind==='ddpm'?(n===0?0:k/n):k/n;
    if(st.arrows){cx.strokeStyle=cs.getPropertyValue('--mute')||'#888';cx.lineWidth=dpr;const G=13;const step=9/(G-1);
      for(let a=0;a<G;a++)for(let b=0;b<G;b++){const x=-4.5+a*step,y=-4.5+b*step;let dx,dy;
        if(st.kind==='ddpm'){const ts=Math.round(1000-k*1000/n)-1,ab=AB[ts];f(NETS.ddpm,x,y,ts/1000,tmp);const x0=(x-Math.sqrt(1-ab)*tmp[0])/Math.sqrt(ab),y0=(y-Math.sqrt(1-ab)*tmp[1])/Math.sqrt(ab);dx=x0-x;dy=y0-y}
        else{f(NETS[st.kind],x,y,tcur,tmp);dx=tmp[0];dy=tmp[1]}
        const m=Math.hypot(dx,dy)||1,L=Math.min(m*.12,step*.45)*sc,ux=dx/m,uy=-dy/m,x1=X(x),y1=Y(y),x2=x1+ux*L,y2=y1+uy*L;
        cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.lineTo(x2-ux*3*dpr-uy*2*dpr,y2-uy*3*dpr+ux*2*dpr);cx.stroke()}}
    const pos=i=>{const a=k*2*NP+2*i,b=a+2*NP;return [P[a]+(P[b]-P[a])*fr,P[a+1]+(P[b+1]-P[a+1])*fr]};
    if(st.trails){cx.lineWidth=dpr;cx.globalAlpha=.55;for(let i=0;i<120;i++){cx.strokeStyle=endCol[i];cx.beginPath();cx.moveTo(X(P[2*i]),Y(P[2*i+1]));
      for(let s=1;s<=k;s++)cx.lineTo(X(P[s*2*NP+2*i]),Y(P[s*2*NP+2*i+1]));const p=pos(i);cx.lineTo(X(p[0]),Y(p[1]));cx.stroke()}cx.globalAlpha=1}
    for(let i=0;i<NP;i++){const p=pos(i);cx.fillStyle=endCol[i];cx.beginPath();cx.arc(X(p[0]),Y(p[1]),2.2*dpr,0,2*Math.PI);cx.fill()}
    cx.fillStyle=cs.getPropertyValue('--ink')||'#222';cx.font=(12*dpr)+'px system-ui,sans-serif';
    cx.fillText((st.kind==='ddpm'?'step ':'t = ')+(st.kind==='ddpm'?Math.min(n,Math.round(u))+' of '+n:(u/n).toFixed(2)),8*dpr,16*dpr);
    $('fw-toy-u').value=Math.round(1000*u/n)}
  // continuous animation, about 2.4 s noise to data whatever the step count; only on screen, paused under reduced motion
  const live=()=>st.vis&&!document.hidden&&cv.offsetParent!==null;
  function frame(ts){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(.1,(ts-st.last)/1000):0;st.last=ts;
    st.u+=dt*st.spd*st.n/2.4;if(st.u>=st.n){st.u=st.n;draw();setPlay(false);return}draw();st.raf=requestAnimationFrame(frame)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(frame)}}
  function setPlay(v){st.play=v;const b=$('fw-toy-p');b.innerHTML=v?'&#10073;&#10073; Pause':'&#9654; Play';b.setAttribute('aria-label',v?'Pause':'Play');if(v&&st.u>=st.n)st.u=0;kick()}
  function rerun(play){recompute();st.u=play&&!RM?0:st.n;draw();if(play&&!RM)setPlay(true)}
  FW.seg($('fw-toy-m'),m=>{st.kind=m;$('fw-toy-s').style.opacity=m==='ddpm'?.45:1;rerun(true)});
  FW.seg($('fw-toy-n'),m=>{st.n=+m;rerun(true)});
  FW.seg($('fw-toy-s'),m=>{if(st.kind==='ddpm')return;st.solver=m;rerun(true)});
  $('fw-toy-p').addEventListener('click',()=>setPlay(!st.play));
  $('fw-toy-u').addEventListener('input',e=>{setPlay(false);st.u=st.n*e.target.value/1000;draw()});
  $('fw-toy-tr').addEventListener('change',e=>{st.trails=e.target.checked;draw()});
  $('fw-toy-ar').addEventListener('change',e=>{st.arrows=e.target.checked;draw()});
  $('fw-toy-new').addEventListener('click',()=>{seed++;Z=gauss(NP,seed);rerun(true)});
  $('fw-toy-v').addEventListener('change',e=>{st.spd=+e.target.value});
  // before / after reflow on the same noise
  $('fw-toy-ba').addEventListener('click',()=>{const m=st.kind==='cfm'?'reflow':'cfm';st.kind=m;FW.setSeg($('fw-toy-m'),m);$('fw-toy-s').style.opacity=1;rerun(true)});
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&cv.offsetParent){st.started=true;rerun(true)}kick()},{threshold:.2}).observe(cv)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  FW.onRender(()=>{if(!P)recompute();draw();kick()});

  // ---- the pairs the model is trained on: random, minibatch OT, reflow
  const pc=$('fw-pairs-cv');
  function hungarian(C,n){// square assignment, O(n^3) (Kuhn-Munkres with potentials); returns col for each row
    const u=new Float64Array(n+1),v=new Float64Array(n+1),p=new Int32Array(n+1),way=new Int32Array(n+1);
    for(let i=1;i<=n;i++){p[0]=i;let j0=0;const minv=new Float64Array(n+1).fill(Infinity),used=new Uint8Array(n+1);
      do{used[j0]=1;const i0=p[j0];let d=Infinity,j1=0;for(let j=1;j<=n;j++)if(!used[j]){const cur=C[(i0-1)*n+j-1]-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0}if(minv[j]<d){d=minv[j];j1=j}}
        for(let j=0;j<=n;j++)if(used[j]){u[p[j]]+=d;v[j]-=d}else minv[j]-=d;j0=j1}while(p[j0]!==0);
      do{const j1=way[j0];p[j0]=p[j1];j0=j1}while(j0)}
    const a=new Int32Array(n);for(let j=1;j<=n;j++)a[p[j]-1]=j-1;return a}
  let pm='random';const PN=60;
  function drawPairs(){const W=Math.min(FW.width(pc.parentNode),420),dpr=window.devicePixelRatio||1;if(pc.width!==Math.round(W*dpr)){pc.width=Math.round(W*dpr);pc.height=Math.round(W*dpr);pc.style.width=W+'px';pc.style.height=W+'px'}
    const S=pc.width,sc=S/9.6,X=x=>S/2+x*sc,Y=y=>S/2-y*sc,c=pc.getContext('2d'),cs=getComputedStyle(document.documentElement);
    c.fillStyle=cs.getPropertyValue('--soft')||'#f4f4f4';c.fillRect(0,0,S,S);
    const z=gauss(PN,77);let x=dataPts(PN,78);
    if(pm==='ot'){const C=new Float64Array(PN*PN);for(let i=0;i<PN;i++)for(let j=0;j<PN;j++)C[i*PN+j]=(z[2*i]-x[2*j])**2+(z[2*i+1]-x[2*j+1])**2;const a=hungarian(C,PN),y=new Float32Array(2*PN);for(let i=0;i<PN;i++){y[2*i]=x[2*a[i]];y[2*i+1]=x[2*a[i]+1]}x=y}
    if(pm==='reflow'){const Q=solve('cfm','heun',z,64);x=Q.slice(64*2*PN)}
    let cost=0,cross=0;
    for(let i=0;i<PN;i++)cost+=(z[2*i]-x[2*i])**2+(z[2*i+1]-x[2*i+1])**2;
    const inter=(a,b,c2,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c2)*o(a,b,d)<0&&o(c2,d,a)*o(c2,d,b)<0};
    for(let i=0;i<PN;i++)for(let j=i+1;j<PN;j++)if(inter([z[2*i],z[2*i+1]],[x[2*i],x[2*i+1]],[z[2*j],z[2*j+1]],[x[2*j],x[2*j+1]]))cross++;
    c.lineWidth=dpr;c.strokeStyle=cs.getPropertyValue('--mute')||'#888';c.globalAlpha=.6;
    for(let i=0;i<PN;i++){c.beginPath();c.moveTo(X(z[2*i]),Y(z[2*i+1]));c.lineTo(X(x[2*i]),Y(x[2*i+1]));c.stroke()}c.globalAlpha=1;
    for(let i=0;i<PN;i++){c.fillStyle='#4e79a7';c.beginPath();c.arc(X(z[2*i]),Y(z[2*i+1]),2.6*dpr,0,7);c.fill();c.fillStyle='#e15759';c.beginPath();c.arc(X(x[2*i]),Y(x[2*i+1]),2.6*dpr,0,7);c.fill()}
    $('fw-pairs-out').innerHTML=FW.stat('Lines that cross',cross,'of '+(PN*(PN-1)/2)+' pairs of lines')+FW.stat('Mean squared length',(cost/PN).toFixed(2),'average |x1 &minus; x0|&sup2;')}
  FW.seg($('fw-pairs-m'),m=>{pm=m;drawPairs()});
  FW.onRender(drawPairs);

  // ---- recorded Python scores (2,000 particles, toy2d.py)
  const NM={cfm:['Random pairs','var(--c1)'],reflow:['After reflow','var(--c3)'],ot:['Minibatch-OT pairs','var(--c4)'],ddpm:['Diffusion, DDIM','var(--c2)']};
  function drawRec(){const m=FW.segVal($('fw-toyrec-m'))||'on_mode';const ser=Object.keys(NM).map(k=>({name:NM[k][0],color:NM[k][1],pts:T.results.filter(r=>r.model===k&&(r.solver==='euler'||r.solver==='ddim')).map(r=>[r.steps,m==='on_mode'?100*r.on_mode:r[m]])}));
    FW.chart($('fw-toyrec'),ser,{logx:true,xticks:[1,2,4,8,16,32,64],xlab:'steps (1 evaluation each)',ylab:m==='on_mode'?'% on a mode':m==='w2'?'W2 to the data':'gap to 512-step answer',logy:m!=='on_mode',ymin:m==='on_mode'?0:null,ymax:m==='on_mode'?100:null,hline:m==='w2'?{y:T.w2_floor,label:'two real samples: '+T.w2_floor}:null,label:'Toy scores by steps'});
    FW.leg($('fw-toyrec-l'),Object.keys(NM).map(k=>NM[k]))}
  FW.seg($('fw-toyrec-m'),drawRec);FW.onRender(drawRec);
})();
