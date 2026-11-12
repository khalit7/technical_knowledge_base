// ---- Scene, Fig. 3 (2026-11-12, renderer v2): one call of the custom op tda::scale walked down the dispatch keys, one recorded situation per step.
// Which kernels ran, in what order, with which key set and dtype is the record of src/exp/dispatch.py (window.TDA.dsp.walk: a logging Python
// kernel at AutocastCPU, AutogradCPU, ADInplaceOrView, CPU and Meta, and a TorchDispatchMode at the Python key). Steps: #sx-walk.
// The plain tensor and the tensor requiring grad took the same route and share step 1, so the seven steps show walk[1..7].
(function(){
  if(!document.getElementById('stg-walk')||!window.S3||!window.TDA)return;const {at,off,lerp,mix}=S3,W=window.TDA.dsp.walk;
  const SIT=[1,2,3,4,5,6,7].map(i=>W[i]);
  const PL=[['AutocastCPU',4.3],['AutogradCPU',3.25],['ADInplaceOrView',2.2],['Python (TorchDispatchMode)',1.15]];
  const KX={CPU:-.85,Meta:.85},KB=[1.2,.5,1.0],TOP=5.2,PW=1.5,PD=.95;
  // why a key did not run in a situation (the record says which ran; the reasons are the key-set rule of section 2.2)
  function why(w,k){const nm=w.name;
    if(k==='AutocastCPU')return 'excluded by the thread';
    if(k==='AutogradCPU'){if(nm.includes('inference_mode'))return 'excluded: inference_mode';if(nm.includes('inference tensor'))return 'not in the key set';if(nm.includes('meta'))return 'AutogradMeta ran (not logged)';return ''}
    if(k.startsWith('Python'))return 'not in the key set';return ''}
  const short=k=>k.replace(' (TorchDispatchMode)','');
  function draw(R,k,e){const P=R.P,w=SIT[k],narrow=R.W<520,v=w.visits,meta=w.name.includes('meta');R.grid(-3,3,-1.8,1.8,.5);
    // the stops this call makes: its visits in order, each at a plate or a kernel on the floor
    const yOf=key=>{const p=PL.find(q=>q[0]===key);return p?p[1]:KB[1]+.12};
    const stops=v.map(x=>yOf(x.key)),nS=stops.length,pr=e*nS,cur=Math.min(nS-1,Math.floor(pr)),fr=pr-cur;
    const yb=lerp(cur===0?TOP:stops[cur-1],stops[cur],Math.min(1,fr*1.6)),reached=j=>j<cur||(j===cur&&fr>.55);
    // dtype of the call where the ball is: the autocast kernel receives float32 and hands bfloat16 down
    const dt=v[cur].dtype,col=dt==='bfloat16'?P.c5:P.c2;
    PL.forEach(([key,y])=>{const j=v.findIndex(x=>x.key===key),ran=j>=0,on=ran&&reached(j),c=key==='AutogradCPU'?P.acc:key.startsWith('Python')?P.c6:P.c4;
      const a=ran?(on?1:.55):.2;R.glass([-PW,y,-PD],[2*PW,0,0],[0,0,2*PD],{c,a,nu:4,nv:3,th:.04});
      if(!ran)R.line([[-PW,y,-PD],[PW,y,-PD],[PW,y,PD],[-PW,y,PD],[-PW,y,-PD]],{c,w:1.2,dash:[5,4],a:.45});
      R.label([-PW,y,0],short(key),{al:'right',dx:-10,mono:true,fs:12.5,b:on,c:on?c:ran?P.ink:P.mute,a:ran?1:.6});
      if(narrow)return;
      if(ran){if(on)R.label([PW,y,0],'ran #'+(j+1)+' · '+v[j].dtype,{al:'left',dx:10,mono:true,fs:12.5,b:1,c})}
      else R.label([PW,y,0],'skipped: '+why(w,key),{al:'left',dx:10,mono:true,fs:12,c:P.mute})});
    // the kernels on the floor: CPU does x * 2, Meta computes the shape only
    ['CPU','Meta'].forEach(nm=>{const j=v.findIndex(x=>x.key===nm),ran=j>=0,on=ran&&reached(j),x=KX[nm];
      R.box([x,0,0],KB,{fill:nm==='CPU'?mix(P.paper,P.c1,.45):P.paper,fa:nm==='Meta'?.3:1,a:ran?(on?1:.6):.25});
      R.label([x,0,PD-.4],nm+(nm==='CPU'?': x * 2':': shape only'),{mono:true,fs:12.5,b:on,dy:14,c:on?P.ink:P.mute,a:ran?1:.55})});
    // the call: a ball going down its stops, dots streaming along the path taken; at each kernel it ran, a glow
    const kx=meta?KX.Meta:KX.CPU,xAt=y=>y<1?lerp(0,kx,Math.min(1,(1-y)/.45)):0;
    R.ball([xAt(yb),yb+.12,0],.13,{c:col,top:1});R.glow([xAt(yb),yb+.12,0],.42,{c:col,a:.6,top:1});
    const path=[[0,TOP,0]];stops.slice(0,cur).forEach(y=>path.push([xAt(y),y+.1,0]));path.push([xAt(yb),yb+.1,0]);
    if(path.length>1)R.flow(path,{c:col,r:.055,speed:1.3,a:.7});
    v.forEach((x,j)=>{if(reached(j)&&j<cur)R.glow([xAt(stops[j]),stops[j]+.1,0],.3,{c:P.acc,a:.35})});
    R.label([0,TOP,0],narrow?w.name:w.code,{mono:true,fs:12.5,b:1,c:P.ink,dy:-34});
    // the key set the kernel the ball last reached was handed: each kernel masks its own key off before it redispatches
    const lj=[...Array(nS).keys()].filter(reached).pop();if(lj!==undefined&&!narrow){const vv=v[lj];R.label([0,TOP,0],short(vv.key)+' was handed: '+(vv.keyset?vv.keyset.join(', '):'(called by the Python fallback)'),{mono:true,fs:12,c:P.mute,dy:-15})}
    if(narrow)R.label([0,TOP,0],v.length+' kernels ran',{mono:true,fs:12,c:P.mute,dy:-15});
    if(fr>.6&&cur===nS-1&&!narrow)R.label([kx,KB[1],0],'result '+w.result.dtype+' · '+v.length+' kernels ran',{mono:true,fs:12,b:1,c:P.ink,al:kx<0?'right':'left',dx:kx<0?-40:40,dy:-6})
  }
  S3.stage({id:'stg-walk',list:'sx-walk',fig:'Fig. 3 · one call down the keys, seven situations',cam:[.32,.3],bounds:[[-1.7,0,-1.1],[1.7,5.3,1.1]],aspect:.8,dur:3000,hold:4200,draw,
    margin:w=>w<520?[46,10,14,120]:[46,230,14,170]});
})();
