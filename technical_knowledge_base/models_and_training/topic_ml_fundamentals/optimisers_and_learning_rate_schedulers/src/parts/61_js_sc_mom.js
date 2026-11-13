// ---- Scene (section 1, Fig. 1): plain SGD, momentum and Nesterov on the race's axis-aligned ravine (renderer v2) ----
// The race's engine at the race's tuned rates (torch.optim.SGD's rules in float64). The step list's numbers are written from the same runs (data-mo spans; check_stages.mjs compares).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-mom')||!window.SURF)return;const {at,off,lerp}=S3;
  const S=SURF.make('ravine',{D:4.4}),C=SURF.COL,gd=S.run('gd'),mo=S.run('mom'),ne=S.run('nes'),sf=S.sf;
  // momentum's own step at step t, in units of the rate: v_t = (theta_(t-1) - theta_t) / lr; the gradient it saw: g at theta_(t-1)
  const vx=t=>(mo.xs[t-1]-mo.xs[t])/mo.lr,gx=t=>sf.g(mo.xs[t-1],mo.ys[t-1])[0];
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-mo="'+k+'"]').forEach(e=>e.textContent=v);
    set('glr',gd.lr);set('mlr',mo.lr);set('nlr',ne.lr);set('gl',gd.ls[gd.T].toFixed(3));set('mf',mo.first);set('nf',ne.first);
    set('v12',Math.abs(vx(12)).toFixed(1));set('g12',Math.abs(gx(12)).toFixed(2));set('r12',(vx(12)/gx(12)).toFixed(1));
    set('ml',mo.ls[mo.T].toExponential(1));set('nl',ne.ls[ne.T].toExponential(1))}
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-2.4,2.4,.5);
    const far=k===2?e:k===3?1-e:0;S.mesh(R,k===0?Math.min(1,e*1.5):.85,far>0?c=>(c.q[0][0]+c.q[2][0])/2>-.2?1-.85*far:1:null);S.marks(R,1);
    // 1. the shape: the floor runs along x, the walls rise across it
    if(k===0){const fl=[],ac=[];for(let i=0;i<=30;i++){const x=-4+5*i/30;fl.push(S.pt(x,.6,.04))}for(let i=0;i<=30;i++){const y=1.75-1.6*i/30;ac.push(S.pt(-2.2,y,.04))}
      R.line(fl,{c:P.c3,w:2.6,head:8,a:e,top:1});R.line(ac,{c:P.c2,w:2.6,a:e,top:1});
      R.label(S.pt(-1.2,.6,.05),'along the floor: curvature 1',{fs:12.5,b:1,c:P.c3,dy:20,a:e});
      R.label(S.pt(-2.2,1.75,.05),'across: curvature 100',{fs:12.5,b:1,c:P.c2,dy:-14,a:e});
      R.label(S.pt(1,.6,.02),'minimum',{fs:12,c:P.ink,dy:-16,dx:8,al:'left',a:e});R.label(S.pt(sf.start[0],sf.start[1],.03),'start',{fs:12,c:P.ink,dy:-14,a:e})}
    // 2. plain SGD at its best rate
    const tg=k===1?150*e:k>1?150:0;
    if(k>=1){const end=S.trail(R,gd,tg,C.gd,{a:k===1?1:k===2?0:k===4?.55:.3,flow:k===1?10:0});if(k===1||k===4)R.label(end,'SGD',{fs:12.5,b:1,c:C.gd,dy:-16,grp:'end'})}
    // 3. momentum's first 12 steps, close up: the step along the floor grows while the across-steps keep flipping sign
    if(k===2){const t=12*e,end=S.trail(R,mo,t,C.mom,{flow:6}),n=Math.max(1,Math.min(12,Math.ceil(t)));
      R.label(end,'momentum',{fs:12.5,b:1,c:C.mom,dy:-18});
      for(let s=1;s<=n;s++){const p=S.pt(mo.xs[s-1],mo.ys[s-1],.04),g=sf.g(mo.xs[s-1],mo.ys[s-1]),q=S.pt(mo.xs[s-1]-mo.lr*g[0],mo.ys[s-1]-mo.lr*g[1],.04);
        R.line([p,q],{c:P.mute,w:1.4,head:6,a:.75,top:1})}
      R.label(S.pt(sf.start[0],sf.start[1],.03),'grey: −η·g, what each gradient alone would do',{fs:12,b:1,c:P.mute,al:'left',dx:-30,dy:24,wide:1})}
    // 4. momentum over the whole run
    if(k>=3){const t=k===3?12+138*e:150,end=S.trail(R,mo,t,C.mom,{a:k===3?1:.85,flow:k===3?10:0});R.label(end,'momentum',{fs:12.5,b:1,c:C.mom,dy:-16,grp:'end'})}
    // 5. Nesterov, then all three
    if(k===4){const end=S.trail(R,ne,150*e,C.nes,{flow:10});R.label(end,'Nesterov',{fs:12.5,b:1,c:C.nes,dy:16,grp:'end'})}
  }
  const full={cam:[-.75,.88],bounds:[[-3.7,0,-2.25],[3.7,1.7,2.25]]};
  S3.stage({id:'stg-mom',list:'sx-mom',fig:'Fig. 1 · three optimisers on one ravine (the race engine)',cam:full.cam,bounds:full.bounds,aspect:.62,dur:2600,hold:4600,draw,
    margin:w=>w<520?[16,10,16,10]:[24,20,20,20],
    view:k=>k===2?{cam:[-1.0,.85],bounds:[[-3.7,0,-2.25],[-.4,1.75,2.25]]}:full});
  writeList();
})();
