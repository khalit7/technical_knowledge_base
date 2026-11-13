// ---- Scene (section 7, Fig. 5): Adam and Nesterov on the race's noisy ravine under a constant rate, cosine and WSD (renderer v2) ----
// The race's engine and tuned rates, seed 1 for the paths; the 20-seed averages are computed here the way checks/race_facts.mjs computes them
// (mean loss over the last 60 steps for the floor; final loss for cosine). Step-list numbers are written from these runs (data-nz spans).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-nz')||!window.SURF)return;const {at,off,lerp,mix}=S3;
  const S=SURF.make('noisy',{D:4.4}),C=SURF.COL,E=SURF.E,LR=SURF.LR,T=S.sf.steps,SCH=['const','const','cosine','wsd'];
  const floor20=ok=>{let m=0;for(let s=1;s<=20;s++){const q=E.run('noisy',ok,LR.noisy[ok],{seed:s});let a=0;for(let i=q.T-60;i<=q.T;i++)a+=q.ls[i];m+=a/61}return m/20};
  const cos20=ok=>{let m=0;for(let s=1;s<=20;s++){const q=E.run('noisy',ok,LR.noisy[ok],{seed:s,sched:'cosine'});m+=q.ls[q.T]}return m/20};
  const e2=v=>v.toExponential(1);
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-nz="'+k+'"]').forEach(e=>e.textContent=v),r=(o,s)=>S.run(o,s);
    set('alr',LR.noisy.adam);set('nlr',LR.noisy.nes);set('ac',e2(r('adam','const').ls[T]));set('nc',e2(r('nes','const').ls[T]));
    set('afl',floor20('adam').toFixed(3));set('acos',e2(r('adam','cosine').ls[T]));set('ncos',e2(r('nes','cosine').ls[T]));set('acos20',cos20('adam').toFixed(3));
    set('aw',e2(r('adam','wsd').ls[T]));set('nw',e2(r('nes','wsd').ls[T]));set('ws',Math.round(.8*T))}
  // the last 60 positions of a run: where it hovers
  function cloud(R,run,c,a){for(let i=run.T-60;i<=run.T;i++)R.ball(S.pt(run.xs[i],run.ys[i],.012),.03,{c,a:a*.7,top:1})}
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-2.4,2.4,.5);S.mesh(R,k===0?.85:.7);S.marks(R,1,null,k?.5:1);
    const sch=SCH[k],t=k===1?T:T*e;
    ['nes','adam'].forEach(o=>{const run=S.run(o,sch),end=S.trail(R,run,t,C[o],{w:k===0?2:1.6,flow:8,a:o==='adam'?1:.8});
      R.label(end,SURF.NAME[o],{fs:12.5,b:1,c:C[o],dy:o==='adam'?-16:18,grp:'nz'});if(k>=1&&(k===1||e>.98))cloud(R,run,C[o],k===1?Math.min(1,e*1.5):1)});
    // the rate schedule on a strip along the back of the surface: height = the rate's share of its peak, a dot at the current step
    const nr=k>0,bz=nr?.62:S.Z(S.b[2])+.35,bx0=nr?1.5:S.X(S.b[0]),bx1=nr?2.75:S.X(S.b[1]),y0=nr?.04:.15,hh=nr?.16:.6,mul=i=>E.sched(sch,i,T),pts=[];
    for(let i=0;i<=60;i++){const s=i*T/60;pts.push([bx0+(bx1-bx0)*s/T,y0+hh*mul(Math.min(T-1,s)),bz])}
    R.line(pts,{c:P.c2,w:2.2,a:.9,top:1});const s=Math.min(T-1,t);R.ball([bx0+(bx1-bx0)*s/T,y0+hh*mul(s),bz],nr?.04:.06,{c:P.c2,top:1});
    R.label([bx0,y0+hh,bz],sch==='const'?'rate: constant':sch==='cosine'?'rate: cosine to 0':'rate: constant, then 1−sqrt over the last 20%',{fs:12.5,b:1,c:P.c2,al:'left',dy:-12});
  }
  const full={cam:[-.75,.88],bounds:[[-3.7,0,-2.25],[3.7,1.7,2.6]]},near={cam:[-.75,.95],bounds:[[1.4,0,-.4],[2.85,.25,.78]]};
  S3.stage({id:'stg-nz',list:'sx-nz',fig:'Fig. 5 · noisy gradients: the floor a constant rate cannot go below',cam:full.cam,bounds:full.bounds,aspect:.56,dur:2600,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[24,20,22,20],view:k=>k===0?full:near});
  writeList();
})();
