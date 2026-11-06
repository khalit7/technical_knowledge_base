// ---- Scene (section 2, Fig. 2): behaviour cloning and DAgger on the lane-keeping task, side by side (renderer v2: few large objects per step, flows, camera per step).
// Each road: lanes across, time running toward the viewer; a bar is the exact probability of that lane at that step (OF.exact), blue where the learner has an
// expert label for the state, red where it has none. The tiles behind each road are the 27 states (lane by heading), raised where labelled. The ball is one
// sampled car (same draws for both learners). A 61-frame replay grouped into four stretches (2026-11-06 rule), each playing its frames during its step. ----
(function(){
  const E=window.OF,$=id=>document.getElementById(id);if(!E||!$('stg-dv'))return;const {at,off,lerp,mix}=S3;
  let D=null,api=null;
  // the displayed car: the first seed whose behaviour-cloning run first leaves the lane between 15% and 40% of the horizon
  function carSeed(ds,eps,T){for(let s=1;s<40;s++){const v=E.sample(ds[0],eps,T,s),f=v.findIndex(i=>E.SX(i)!==0);if(f>=Math.round(T*.15)&&f<=Math.round(T*.4))return s}return 1}
  function compute(){const eps=+$('dv-E').value,T=+$('dv-H').value,R=+$('dv-R').value,ds=E.dagger(eps,T,8,5,7),seed=carSeed(ds,eps,T);
    const mk=d=>{const ex=E.exact(d,eps,T),cum=[0];ex.per.forEach((v,t)=>cum.push(cum[t]+v));return {data:d,inD:new Set(d),ex,cum,car:E.sample(d,eps,T,seed)}};
    const cps=[0,Math.round(T/6),Math.round(T*5/12),Math.round(T*2/3),T];
    D={eps,T,R,seed,cps,bc:mk(ds[0]),dag:mk(ds[R-1])};
    window.OF3=Object.assign(window.OF3||{},{dv:{eps,T,R,cps,bcJ:D.bc.ex.J,dagJ:D.dag.ex.J,bcL:D.bc.data.length,dagL:D.dag.data.length,
      at:cps.map(t=>({t,bcOut:t?D.bc.ex.per[t-1]:0,bcCum:D.bc.cum[t],dagOut:t?D.dag.ex.per[t-1]:0,dagCum:D.dag.cum[t]}))}});
    fill()}
  // the step list's numbers for the current settings (the static text holds the defaults: ε = 0.02, T = 60, 5 rounds)
  function fill(){const f=(v,d)=>RD.n(v,d==null?2:d),c=D.cps,set=(k,v)=>document.querySelectorAll('[data-dv="'+k+'"]').forEach(s=>s.textContent=v);
    set('R',D.R);set('bcL',D.bc.data.length);set('dagL',D.dag.data.length);set('T',D.T);
    for(let i=1;i<c.length;i++){set('t'+i,c[i]);set('t'+i+'a',c[i-1]+1);set('bo'+i,f(D.bc.ex.per[c[i]-1],3));set('bc'+i,f(D.bc.cum[c[i]]));set('do'+i,f(D.dag.ex.per[c[i]-1],3));set('dc'+i,f(D.dag.cum[c[i]]));
      set('bu'+i,RD.pct(D.bc.ex.unl[c[i]-1],0))}
    set('bnd',f(D.eps*D.T*D.T,0));set('lin',f(D.eps*D.T,1));set('two',f(2*D.eps*D.T,1))}
  const LW=.42,XO={bc:-2.35,dag:2.35},HB=1.5,DEP=5.2,Z0=-2.2,NR=20;
  const zt=t=>Z0+t/D.T*DEP,xl=(m,x)=>XO[m]+x*LW;
  // the frame shown at step k with eased progress e: steps 2 to 5 play their stretch of steps
  const frame=(k,e)=>k===0?0:Math.round(lerp(D.cps[k-1],D.cps[k],e));
  function lanes(c,t){const P=c.ex.dist[t],out=[];for(let x=-4;x<=4;x++){let p=0,u=0;for(let h=-1;h<=1;h++){const i=E.SI(x,h);p+=P[i];if(!c.inD.has(i))u+=P[i]}out.push([x,p,u])}return out}
  function road(R,m,f,k,e){const P=R.P,c=D[m],cB=mix(P.paper,P.c1,.6),cR=mix(P.paper,P.bad,.78);
    // the road: lane lines on the floor, the own lane tinted
    R.quad([[xl(m,-.5),0,Z0],[xl(m,.5),0,Z0],[xl(m,.5),0,Z0+DEP],[xl(m,-.5),0,Z0+DEP]],{fill:P.c1,fa:.08,edge:false,dz:6});
    for(let x=-4.5;x<=4.5;x++)R.line([[xl(m,x),0,Z0],[xl(m,x),0,Z0+DEP]],{c:P.line,w:x===-4.5||x===4.5?1.4:.8,a:.9});
    // rows of bars up to the current frame (every T/20 steps, plus the current step)
    const rows=[];for(let r=0;r<=NR;r++){const t=Math.round(r*D.T/NR);if(t<f)rows.push(t)}rows.push(f);
    rows.forEach(t=>{const cur=t===f,a=cur?1:.5;lanes(c,t).forEach(([x,p,u])=>{if(p<2e-3)return;const lab=p-u,z=zt(t);
      if(lab>1e-3)R.box([xl(m,x),0,z],[LW*.72,lab*HB,cur?.2:.13],{fill:cB,a,shadow:false,lw:.6});
      if(u>1e-3)R.box([xl(m,x),lab*HB,z],[LW*.72,u*HB,cur?.2:.13],{fill:cR,a,shadow:false,lw:.6})})});
    // the sampled car: its trail on the floor and a ball at the current step
    const tr=[];for(let t=0;t<=f;t++)tr.push([xl(m,E.SX(c.car[t])),.02,zt(t)]);if(tr.length>1)R.line(tr,{c:P.ink,w:1.8,a:.85});
    R.ball([xl(m,E.SX(c.car[f])),.16,zt(f)],.16,{c:P.ink,top:1});
    // the 27 states behind the road: raised and blue where the learner has an expert label
    const ta=k===0?1:.55;for(let h=-1;h<=1;h++)for(let x=-4;x<=4;x++){const i=E.SI(x,h),has=c.inD.has(i),z=Z0-.45-(1-h)*.32;
      R.box([xl(m,x),0,z],[LW*.86,has?.12:.03,.26],{fill:has?mix(P.paper,P.c1,.65):P.paper,a:has?ta:ta*.6,shadow:false,lw:.6})}
    const nm=m==='bc'?'behaviour cloning':'DAgger, '+D.R+' rounds';
    if(k>0){R.label([XO[m],0,Z0+DEP],nm,{dy:22,fs:13.5,b:1,c:m==='bc'?P.bad:P.c1});R.label([XO[m],0,Z0+DEP],'cost so far '+RD.n(c.cum[f],2),{dy:40,mono:true,fs:12.5,c:P.ink})}
    else R.label([xl(m,0),.15,Z0-1.1],nm+' · '+c.data.length+' of 27 labelled',{dy:-26,fs:12.5,b:1,c:m==='bc'?P.bad:P.c1,a:e})}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-3.6,3.4,.42);const f=frame(k,e);
    road(R,'bc',f,k,e);road(R,'dag',f,k,e);
    // step 1: DAgger's labels came from the expert, asked at the states its own runs reached
    if(k===0){const ex=[XO.dag+1.3,1.3,Z0-1.2];R.ball(ex,.15,{c:P.c3,a:e});R.label(ex,'expert',{dy:-16,fs:12.5,b:1,c:P.c3,a:e});
      D.dag.data.forEach(i=>{const h=E.SH(i),z=Z0-.45-(1-h)*.32;R.flowArc(ex,[xl('dag',E.SX(i)),.14,z],.25,{c:P.c3,a:.75*e,r:.045,n:3,speed:1.2})})}
    if(k>0)R.label([XO.bc-2.1,0,Z0+DEP*.5],'time →',{al:'right',dx:-4,mono:true,fs:12,c:P.mute,wide:1});
    readout(f)}
  function readout(f){const o=$('dv-out');if(!o)return;const b=D.bc,d=D.dag,po=c=>f?RD.n(c.ex.per[f-1],3):'0';
    o.textContent='step '+f+' of '+D.T+' · P(out of lane): cloning '+po(b)+', DAgger '+po(d)+' · cost so far: '+RD.n(b.cum[f],2)+' against '+RD.n(d.cum[f],2)}
  compute();
  const full={cam:[-.05,.75],bounds:[[-4.4,0,-3.2],[4.4,1.5,3.1]]};
  let k0=0;
  api=S3.stage({id:'stg-dv',list:'sx-dv',fig:'Fig. 2 · the same slip, two learners',cam:full.cam,bounds:full.bounds,aspect:.6,hold:4600,draw,
    get dur(){return api&&api.st.k>0?3400:1300},
    margin:w=>w<520?[14,8,26,8]:[16,14,40,14],
    // step 1 moves in close on the label tiles; the last step looks down on both roads
    view:k=>k===0?{cam:[-.05,.7],bounds:[[-4.4,0,-3.4],[4.4,1.2,-1.6]]}:k===4?{cam:[-.05,.82],bounds:full.bounds}:full});
  ['dv-E','dv-H','dv-R'].forEach(id=>$(id).addEventListener('change',()=>{compute();api.draw()}));
})();
