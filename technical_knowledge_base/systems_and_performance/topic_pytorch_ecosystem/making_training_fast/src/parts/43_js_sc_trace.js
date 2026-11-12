// ---- Scene, Fig. 3 (2026-11-12, renderer v2): two recorded torch.profiler traces of one MPS step on one clock, before the hunt (front deck) and
// after it (back deck). Data: window.FST.hunt_trace.traces['mps:s0'] and ['mps:s6'] (src/exp/hunt.py trace, compacted by compact_trace.py).
// Each deck: the main thread's record_function ranges (data, forward, backward, optimizer, log loss) as slabs along the clock, the long op
// inside the waiting range (aten::_local_scalar_dense before, aten::copy_ after) as a raised block, and autograd's device thread as a second lane
// (its depth-0 events merged where less than 0.4 ms apart). An MPS trace has no GPU lane: the grey lane is drawn empty and labelled so;
// the dots show work queued to it and the one number that comes back, not its timing. Steps are #sx-trace. ----
(function(){
  if(!document.getElementById('stg-trace')||!window.S3||!window.FST||!window.FST.hunt_trace)return;const {mix}=S3,TR=window.FST.hunt_trace.traces;
  const B=TR['mps:s0'],A=TR['mps:s6'];if(!B||!A)return;
  const tmax=B.step_us,X=t=>-4+8*t/tmax,ms=u=>(u/1e3).toFixed(1)+' ms';
  const RC={data:'c5',forward:'c1',backward:'c4',optimizer:'c3','log loss (.item)':'c2'};
  const ranges=t=>t.events.filter(e=>e[5]&&e[0]===0&&e[4]===0&&RC[t.names[e[3]]]).map(e=>({n:t.names[e[3]],s:e[1],d:e[2]}));
  const waits=t=>t.events.filter(e=>e[0]===0&&/local_scalar_dense|^aten::copy_$/.test(t.names[e[3]])&&e[2]>2e4).map(e=>({n:t.names[e[3]],s:e[1],d:e[2]}));
  function busy(t){const ev=t.events.filter(e=>e[0]===1&&e[4]===0).map(e=>[e[1],e[1]+e[2]]).sort((a,b)=>a[0]-b[0]),out=[];
    ev.forEach(([s,f])=>{const l=out[out.length-1];if(l&&s-l[1]<400)l[1]=Math.max(l[1],f);else out.push([s,f])});return out}
  const DK=[{t:B,R:ranges(B),W:waits(B),Y:busy(B),z:1.05,lab:'before'},{t:A,R:ranges(A),W:waits(A),Y:busy(A),z:-.75,lab:'after'}];
  const SHOW={data:0,forward:1,backward:1,optimizer:2,'log loss (.item)':3};   // the step of the front deck at which each range appears
  const ZL=.42,ZG=.48;   // the autograd lane sits ZL behind the main lane; the empty GPU lane ZG in front
  // a deck seen only as a faint outline (before its step): lanes, no labels
  function deckLanes(R,d,a){d.R.forEach(r=>R.box([X(r.s+r.d/2),0,d.z],[Math.max(.02,8*r.d/tmax-.01),.2,.3],{fill:R.P.soft,a,shadow:false}))}
  function deck(R,d,k,a,e,front,nolab){const P=R.P,z=d.z,ph=R.W<520;
    R.box([0,0,z+ZG],[8.1,.01,.3],{fill:P.soft,a:a*.8,shadow:false});R.box([0,0,z],[8.1,.01,.3],{fill:P.soft,a:a*.5,shadow:false});
    if(a<.2)return deckLanes(R,d,a);
    R.label([-4.05,0,z+ZG],(ph?'GPU':'GPU, not traced'),{al:'right',dx:-8,fs:12,mono:true,c:P.mute,a,grp:'lane'});
    R.label([-4.05,0,z],d.lab+' · main',{al:'right',dx:-8,fs:12,mono:true,b:1,a,grp:'lane'});
    R.label([-4.05,0,z-ZL],'autograd',{al:'right',dx:-8,fs:12,mono:true,c:P.c4,a,grp:'lane'});
    d.R.forEach(r=>{const s=front?SHOW[r.n]:0;if(front&&k<s)return;const g=front&&k===s?e:1,x0=X(r.s),x1=X(r.s+r.d*g),c=P[RC[r.n]];
      R.box([(x0+x1)/2,0,z],[Math.max(.02,x1-x0-.01),.2,.3],{fill:mix(P.paper,c,.8),a});
      if(a<.2)return;const hasW=d.W.some(w=>w.s>=r.s&&w.s<r.s+r.d);
      const wpx=R.px([(x0+x1)/2,0,z],x1-x0),nm=r.n==='log loss (.item)'?'.item()':r.n,t=nm+' '+ms(r.d)+(hasW?(ph?'':' · waiting for the GPU'):'');
      if(nolab)return;if(hasW){if(g>=1)R.label([(x0+x1)/2,.48,z],t,{mono:true,fs:12,b:1,c:P.c2,dy:-10,a});return}
      if(g>=1&&wpx>t.length*7.4+6)R.label([(x0+x1)/2,.2,z],t,{mono:true,fs:12,b:1,c,dy:-9,a});
      else if(g>=1&&!ph&&(front?k===s:k===4))R.label([(x0+x1)/2,.2,z],t,{mono:true,fs:12,b:1,c,dy:-22,a})});
    d.W.forEach(w=>{const s=front?3:0;if(front&&k<s)return;const g=front&&k===s?e:1,x0=X(w.s),x1=X(w.s+w.d*g);
      R.box([(x0+x1)/2,0,z],[Math.max(.02,x1-x0-.01),.48,.22],{fill:mix(P.paper,P.c2,.55),a});
      });
    if(!front||k>=1)d.Y.forEach(([s,f])=>{const x0=X(s),x1=X(f);R.box([(x0+x1)/2,0,z-ZL],[Math.max(.02,x1-x0),.12,.22],{fill:mix(P.paper,P.c4,.6),a:a*(front&&k===1?Math.min(1,e*1.5):1),shadow:false})})}
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-1.6,1.9,.5);const [b,a]=DK;
    const fa=k>=4&&k<5?.28:1,ba=k<4?0:k===4?Math.min(1,e*1.4):1;
    deck(R,b,k,fa,e,true,k===5);if(k<4)deck(R,a,9,.1,1,false);else deck(R,a,9,ba,e,false,k===5);
    // queued work: forward, backward and optimizer only enqueue kernels on the GPU
    if(k>=1&&k<=3)b.R.forEach(r=>{if(SHOW[r.n]>=1&&SHOW[r.n]<=2&&SHOW[r.n]<=k){const x=X(r.s+r.d/2);R.flowArc([x,.2,b.z],[x+.35,.02,b.z+ZG],.25,{c:P[RC[r.n]],r:.05,n:5,speed:1,a:k===SHOW[r.n]?Math.min(1,e*1.5):.6})}});
    // .item(): the backlog drains, then one number comes back to the CPU
    if(k===3){const w=b.W[0];if(w){const p=[];for(let i=0;i<=24;i++)p.push([X(w.s+w.d*i/24),.03,b.z+ZG]);R.flow(p,{c:P.mute,r:.05,n:16,speed:1.5,a:e});
      R.flowArc([X(w.s+w.d),.03,b.z+ZG],[X(w.s+w.d)-.05,.48,b.z],.3,{c:P.c2,r:.07,n:3,speed:.8,a:e})}}
    // after: the next batch's copy waits for the GPU's queue
    if(k===4){const w=a.W[0];if(w){const p=[];for(let i=0;i<=24;i++)p.push([X(w.s+w.d*i/24),.03,a.z+ZG]);R.flow(p,{c:P.mute,r:.05,n:16,speed:1.5,a:ba})}}
    // one clock: where each step ends
    if(k===5){DK.forEach((d,i)=>{const x=X(d.t.step_us);R.box([x,0,d.z],[.04,.75,.04],{fill:P.ink,shadow:false});R.label([x,.75,d.z],(R.W<520?'':d.lab+' ')+ms(d.t.step_us),{al:i?'right':'left',dx:i?-6:6,mono:true,fs:12.5,b:1,dy:-6})});
      const xa=X(A.step_us),xb=X(B.step_us),zm=DK[0].z+ZG+.32;R.box([(xa+xb)/2,0,zm],[xb-xa,.03,.16],{fill:P.c3,shadow:false});
      R.label([(xa+xb)/2,0,zm],'saved '+ms(B.step_us-A.step_us)+' ('+Math.round(100*(1-A.step_us/B.step_us))+'%)',{fs:13,b:1,c:P.c3,mono:true,dy:14})}
  }
  const full={cam:[0,.85],bounds:[[-4.3,0,-1.35],[4.4,.8,2.05]]};
  S3.stage({id:'stg-trace',list:'sx-trace',fig:'Fig. 3 · one MPS step traced, before and after',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:5200,draw,
    margin:w=>w<520?[18,10,12,10]:[24,24,14,120],
    // the first three steps are about the first 45 ms of the front deck: the camera moves in on it; then the whole front deck, the back deck, and both
    view:k=>k<=2?{cam:[-.1,.75],bounds:[[-4.2,0,.4],[-1.3,.7,1.75]]}:k===3?{cam:[0,.8],bounds:[[-4.3,0,.4],[4.4,.8,1.75]]}:k===4?{cam:[0,.8],bounds:[[-4.3,0,-1.35],[4.4,.8,.1]]}:full});
})();
