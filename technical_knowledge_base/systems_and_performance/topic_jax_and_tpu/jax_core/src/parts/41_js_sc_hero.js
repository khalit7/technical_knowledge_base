// ---- Scene, Fig. 1 (the hero): one sin under jit(vmap(jvp(f))) going down a stack of three interpreters, from the logged run.
// Data: JC.tr.dispatch_log (run_trace.py wrapped process_primitive of every trace class): JVPTrace receives sin on float32[3] and binds sin, cos and mul;
// BatchTrace batches each to float32[2,3]; DynamicJaxprTrace records the three equations of the printed jaxpr. Tensors are drawn by shape only.
// Mode "no transformation": one EvalTrace runs the impl. Steps are explained by #sx-hero and #sx-hero-e on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.JCS||!window.JC)return;const {at,off,mix}=S3,{lab,cubes,tint}=JCS;
  const L=JC.tr.dispatch_log,PR=['sin','cos','mul'];
  // the recorded equations, read from the printed jaxpr (avals dropped for the canvas; the full text is in the step list)
  const EQ=L.jaxpr.split('\n').filter(l=>/ = /.test(l)).map(l=>l.trim().replace(/:[a-z0-9]+\[[^\]]*\]/g,''));
  const inShape=PR.map(p=>{const e=L.log.find(x=>x.trace==='JVPTrace'&&x.prim===p)||L.log.find(x=>x.trace==='BatchTrace'&&x.prim===p);return e?e.in[0]:''});
  const outShape=PR.map(p=>{const e=L.log.find(x=>x.trace==='DynamicJaxprTrace'&&x.prim===p);return e?e.in[0]:''});
  const X=[-1.55,0,1.55],Y=[3.0,1.8,.6],YP=3.95,CS={cell:.27,size:.21};
  let mode='t';
  function plate(R,y,c,a){R.glass([-2.4,y,-.75],[4.8,0,0],[0,0,1.5],{c,a,nu:6,nv:2,th:.04})}
  function draw(R,k,e){const P=R.P;R.grid(-4,4.6,-1.6,1.6,.5);
    const pyA=1;R.box([0,YP,0],[2.6,.3,.6],{fill:tint(P,P.acc,.18),a:pyA,shadow:false});
    lab(R,[0,YP+.3,0],'lax.sin(x) · your Python, run once',{mono:true,fs:12.5,b:1,dy:-18,c:P.acc});
    if(mode==='e'){
      plate(R,Y[1],P.c3,k===0?Math.max(.2,e):1);lab(R,[-2.4,Y[1],0],'EvalTrace · no transformation',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c3,grp:'tr'});
      cubes(R,[0,YP+.32,0],2,3,Object.assign({fill:tint(P,P.c3,.6),a:k===0?e:off(k,e,1)*.9+.1},CS));
      if(k===0)lab(R,[1.3,YP+.15,0],'x: a real float32[2,3]',{al:'left',dx:8,mono:true,fs:12,c:P.c3,wide:1,a:e});
      if(k===1){R.flowArc([0,YP,0],[0,Y[1]+.05,0],.2,{c:P.c3,r:.07,a:e,n:7});
        cubes(R,[0,Y[1]+.05,0],2,3,Object.assign({fill:P.c3,a:e},CS));
        lab(R,[0,Y[1],.75],R.W<520?'impl: one dispatch':'impl runs: concrete float32[2,3], one dispatch',{mono:true,fs:12.5,b:1,dy:16,c:P.c3,a:e})}
      return}
    // the three interpreters, innermost transformation on top
    const cur=k===1?0:k>=2&&k<=4?1:k===5?2:-1;
    [[P.c5,'JVPTrace · jax.jvp'],[P.c6,'BatchTrace · jax.vmap'],[P.c4,'DynamicJaxprTrace · jax.jit']].forEach(([c,t],i)=>{
      const a=k===0?.3+.7*e:(i===cur||(k>=2&&k<=4&&i===2))?1:.45;plate(R,Y[i],c,a);
      lab(R,[-2.4,Y[i],0],t,{al:'right',dx:-8,mono:true,fs:12.5,b:i===cur,c,grp:'tr',a:Math.max(.55,a)})});
    if(k===0)lab(R,[2.4,Y[0]+.05,.75],'current trace',{al:'left',dx:8,fs:12.5,b:1,c:P.c5,a:e,wide:1});
    // 2. jvp's rule turns one sin into sin, cos and mul on the per-example shape
    if(k===1)PR.forEach((p,i)=>R.flowArc([0,YP,0],[X[i],Y[0]+.1,0],.25,{c:P.acc,r:.065,a:e,n:6}));
    PR.forEach((p,i)=>{const s=2+i,aJ=k<1?0:k===1?e:k<s?1:k===s?1-.55*e:.45;
      cubes(R,[X[i],Y[0]+.045,0],1,3,Object.assign({fill:tint(P,P.c5,.75),a:aJ},CS));
      if(k===1||k===s)lab(R,[X[i],Y[0]+.2,0],p+' · '+inShape[i],{mono:true,fs:12.5,b:1,dy:-12,c:P.c5,a:k===1?e:1-.6*e});
      // 3 to 5. vmap batches it, jit records it
      const aB=k<s?0:k===s?Math.min(1,e*1.6):k===5?.35:.55;
      if(aB>0){cubes(R,[X[i],Y[1]+.045,0],2,3,Object.assign({fill:tint(P,P.c6,.75),a:aB},CS));
        if(k===s)lab(R,[X[i],Y[1]+.25,0],outShape[i],{mono:true,fs:12.5,b:1,dy:-12,c:P.c6,a:e})}
      const aE=k<s?0:k===s?Math.max(0,e*1.5-.5):1;
      if(aE>0){cubes(R,[X[i],Y[2]+.045,0],2,3,Object.assign({fill:tint(P,P.c4,.8),a:aE},CS));
        lab(R,[X[i],Y[2]+.04,.75],EQ[i],{mono:true,fs:12.5,b:k===s||k===5,dy:14,c:P.c4,a:aE*(k===s||k===5?1:.8)})}
      if(k===s){R.flow([[X[i],Y[0]+.05,0],[X[i],Y[1]+.25,0]],{c:P.c5,r:.07,a:Math.min(1,e*2),n:4});R.flow([[X[i],Y[1]+.05,0],[X[i],Y[2]+.25,0]],{c:P.c6,r:.07,a:Math.max(0,e*2-.4),n:4})}});
    // 6. the finished jaxpr goes to XLA
    const aX=k===5?e:0;if(aX>0){R.box([3.6,0,0],[1.0,.5,.8],{fill:tint(P,P.c3,.3),a:aX});lab(R,[3.6,.5,0],'to XLA (section 3)',{mono:true,fs:12.5,b:1,dy:-12,c:P.c3,a:aX});
      R.flowArc([2.4,Y[2]+.05,0],[3.6,.5,0],.25,{c:P.c4,r:.07,a:aX,n:6});
      lab(R,[3.6,0,.4],'3 equations, no numbers',{fs:12.5,b:1,dy:16,c:P.c4,a:aX,wide:1})}
  }
  const full={cam:[.3,.3],bounds:[[-2.5,.3,-.8],[2.5,4.3,.8]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one sin, three interpreters (logged run)',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,190],
    // step 2 moves in close on the JVP trace; step 6 looks down on the recorded jaxpr and its way to XLA
    view:k=>mode==='e'?{cam:[.3,.36],bounds:[[-2.5,1.2,-.8],[2.5,4.5,.8]]}:k===1?{cam:[.3,.4],bounds:[[-2.5,1.5,-.8],[2.5,4.5,.8]]}:k===5?{cam:[.36,.36],bounds:[[-2.5,0,-.8],[4.4,3.4,.8]]}:full});
  const M=document.getElementById('jc-hero-mode');
  if(st&&M)M.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;
    M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    document.getElementById('sx-hero').hidden=mode!=='t';document.getElementById('sx-hero-e').hidden=mode!=='e';st.list(mode==='t'?'sx-hero':'sx-hero-e')});
  (window.JCSTG=window.JCSTG||{})['stg-hero']=st;
})();
