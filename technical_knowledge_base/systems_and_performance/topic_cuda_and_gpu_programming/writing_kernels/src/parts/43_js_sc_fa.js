// ---- Scene, Fig. 6: FlashAttention's forward pass on one block of queries, tile by tile (renderer v2) ----
// An illustrative toy, computed here: 4 query rows, N = 16 keys in 4 tiles of 4, head dimension d = 4, values drawn from a seeded
// generator (window.WKFT, so the checks can recompute it). Global memory is the floor (Q orange, K teal, V purple); the on-chip
// memory floats above. Per tile: S = QK^T / sqrt(d) as a bar field, the running maximum m and sum l of each row, and the
// unnormalised output O, rescaled by e^(m_old - m_new) whenever a row's maximum rises. S and P never reach global memory.
// Steps: #sx-fa.
window.WKFT=(function(){
  function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const r=rng(5),g=()=>Math.round((r()*2-1)*100)/100,N=16,d=4,Br=4,Bc=4,T=N/Bc;
  const Q=[...Array(Br)].map(()=>[...Array(d)].map(()=>3*g())),K=[...Array(N)].map(()=>[...Array(d)].map(g)),V=[...Array(N)].map(()=>[...Array(d)].map(g));
  const sc=1/Math.sqrt(d),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  // states[j]: after tile j (j = 0: before any tile)
  const states=[{m:Q.map(()=>-Infinity),l:Q.map(()=>0),O:Q.map(()=>Array(d).fill(0)),S:null,rise:[]}];
  for(let j=0;j<T;j++){const p=states[j],S=Q.map(q=>K.slice(j*Bc,j*Bc+Bc).map(k=>dot(q,k)*sc)),m=[],l=[],O=[],rise=[];
    S.forEach((row,i)=>{const mn=Math.max(p.m[i],...row),f=Math.exp(p.m[i]-mn);if(j>0&&mn>p.m[i])rise.push(i);m.push(mn);
      const pr=row.map(v=>Math.exp(v-mn));l.push(p.l[i]*f+pr.reduce((a,b)=>a+b,0));O.push(p.O[i].map((o,c)=>o*f+pr.reduce((s,pv,t)=>s+pv*V[j*Bc+t][c],0)))});
    states.push({m,l,O,S,rise})}
  const last=states[T],out=last.O.map((o,i)=>o.map(v=>v/last.l[i]));
  // the direct computation, for the check: softmax over all N keys at once
  const ref=Q.map(q=>{const s=K.map(k=>dot(q,k)*sc),mx=Math.max(...s),e=s.map(v=>Math.exp(v-mx)),z=e.reduce((a,b)=>a+b,0);return V[0].map((_,c)=>e.reduce((a,w,t)=>a+w*V[t][c],0)/z)});
  return {N,d,Br,Bc,T,Q,K,V,states,out,ref};
})();
(function(){
  if(!document.getElementById('stg-fa')||!window.S3)return;const {at,mix}=S3,M=window.WKFT;
  // global memory on the left (the floor), the chip raised on the right
  const Y=1.5,KW=.26,KX=-4.3,OX=2.45,kx=t=>KX+t*KW,rz=i=>-1.15+i*.28,oz=i=>.35+i*.28,cx=c=>OX+.15+c*.32,mx=OX+1.75,lx=OX+2.25;
  const tileOf=k=>k>=2&&k<=5?k-2:-1;
  function draw(R,k,e){const P=R.P;R.grid(-6,5.6,-3,2.4,.5);const j=tileOf(k);
    // global memory: Q (4 x d), K and V (N x d) in 4 tiles; the N x N score matrix would sit behind them
    R.glass([-5.7,0,-1.2],[.9,0,0],[0,0,1.1],{c:P.q,a:.9,nu:M.d,nv:M.Br,th:.02});R.label([-5.25,0,-1.2],'Q',{serif:true,fs:15,b:1,c:P.q,dy:-10});
    R.glass([KX,0,-1.2],[M.N*KW,0,0],[0,0,1.1],{c:P.k,a:.8,nu:M.N,nv:M.d,th:.02});R.label([KX+M.N*KW,0,-.65],'K',{serif:true,fs:15,b:1,c:P.k,al:'left',dx:8});
    R.glass([KX,0,.3],[M.N*KW,0,0],[0,0,1.1],{c:P.v,a:.8,nu:M.N,nv:M.d,th:.02});R.label([KX+M.N*KW,0,.85],'V',{serif:true,fs:15,b:1,c:P.v,al:'left',dx:8});
    for(let t=1;t<M.T;t++)[[-1.25,-.08],[.28,1.42]].forEach(([z0,z1])=>R.line([[kx(t*M.Bc),.04,z0],[kx(t*M.Bc),.04,z1]],{c:P.ink,w:1.6,a:.5}));
    if(j>=0){const x0=kx(j*M.Bc);[[-1.2,P.k],[.3,P.v]].forEach(([z0,c])=>R.quad([[x0,.03,z0],[x0+M.Bc*KW,.03,z0],[x0+M.Bc*KW,.03,z0+1.1],[x0,.03,z0+1.1]],{fill:c,fa:.45,ec:c,a:at(k,e,k)}))}
    R.quad([[-3.4,.02,-2.9],[-1.9,.02,-2.9],[-1.9,.02,-1.6],[-3.4,.02,-1.6]],{ec:P.mute,dash:[5,4],a:.85});
    if(k!==3&&k!==4)R.label([-2.65,0,-2.9],'S, P: N × N, never written',{mono:true,fs:12,c:P.mute,dy:-10,wide:1});
    if(k===6){R.glass([-5.7,.01,.3],[.9,0,0],[0,0,1.1],{c:P.v,a:e,nu:M.d,nv:M.Br,th:.02});R.label([-5.25,0,1.4],'O and L written once',{mono:true,fs:12,b:1,c:P.v,dy:14,a:e,wide:1})}
    if(k<3)R.label([-5.7,0,2.0],'global memory',{mono:true,fs:12,c:P.mute,al:'left',wide:1});
    // on chip
    if(k>=1){const a=k===1?e:1;R.glass([OX-.25,Y,-1.45],[3.1,0,0],[0,0,2.9],{c:P.c1,a:a*.5,nu:1,nv:1,th:.02});
      R.label([OX+1.3,Y,1.45],'on chip: shared memory and registers',{mono:true,fs:12,c:P.c1,dy:14,a,wide:1});
      R.glass([OX-.15,Y+.02,-1.3],[.25,0,0],[0,0,1.05],{c:P.q,a,nu:1,nv:M.Br,th:.03})}
    if(k===1)R.flow([[-5.25,.05,-.65],[-1,1.4,-.9],[OX-.05,Y,-.8]],{c:P.q,a:e,n:9,r:.07});
    const s=M.states[Math.max(0,Math.min(M.T,k-1))],p=M.states[Math.max(0,Math.min(M.T,k-2))];
    if(j>=0){const x0=kx(j*M.Bc+M.Bc/2),a=Math.min(1,e*1.4);
      R.flow([[x0,.05,-.65],[0,1.3,-.4],[cx(1.5),Y+.05,rz(1.5)]],{c:P.k,a,n:9,speed:1.6});R.flow([[x0,.05,.85],[0,1.3,.6],[cx(1.5),Y+.05,oz(1.5)]],{c:P.v,a,n:9,speed:1.6});
      R.label([x0,0,-1.2],'tile '+(j+1),{mono:true,fs:12,b:1,c:P.k,dy:-10,a,wide:1});
      // the score tile: rows are queries, columns this tile's keys
      s.S.forEach((row,i)=>row.forEach((v,c)=>{const h=Math.abs(v)*.32*e;R.box([cx(c),v>=0?Y+.03:Y+.03-h,rz(i)],[.2,Math.max(.01,h),.2],{fill:v>=0?P.c5:mix(P.paper,P.c5,.45),shadow:false,lw:.6})}));
      R.label([cx(1.5),Y+.5,rz(0)-.2],'S = QKᵀ/√d',{mono:true,fs:12.5,b:1,c:P.c5,dy:-14})}
    // the running statistics m and l per row, and O (unnormalised until the last step)
    if(k>=1){const a=k===1?e:1,cur=k>=2?s:M.states[0],old=k>=3&&k<=5?p:cur,t=k>=2&&k<=5?e:1,lr=(x,y)=>isFinite(x)?x+(y-x)*t:y;
      for(let i=0;i<M.Br;i++){const mv=k===1?0:lr(old.m[i],cur.m[i]),lv=k===1?0:lr(old.l[i],cur.l[i]),hit=k>=3&&k<=5&&cur.rise.includes(i);
        const hm=Math.abs(mv)*.3;R.box([mx,mv>=0?Y+.03:Y+.03-hm,rz(i)],[.2,Math.max(.01,hm),.2],{fill:hit?P.c2:mix(P.paper,P.c2,.45),a,shadow:false,lw:.6});
        R.box([lx,Y+.03,rz(i)],[.2,Math.max(.01,lv*.12),.2],{fill:hit?P.c6:mix(P.paper,P.c6,.45),a,shadow:false,lw:.6});
        if(hit)R.glow([mx,Y+.3,rz(i)],.35,{c:P.c2,a:a*e});
        const ov=k>=6?cur.O[i].map(o=>o/((1-e)+e*cur.l[i])):k===1?[0,0,0,0]:cur.O[i].map((o,c)=>lr(old.O[i][c],o));
        ov.forEach((v,c)=>{const sc=k===6?.12+.48*e:.12,h=Math.abs(v)*sc;R.box([cx(c),v>=0?Y+.03:Y+.03-h,oz(i)],[.2,Math.max(.01,h),.2],{fill:v>=0?P.v:mix(P.paper,P.v,.45),a,shadow:false,lw:.6})})}
      R.label([mx,Y+.6,rz(0)-.2],'m',{serif:true,fs:15,b:1,c:P.c2,a,dy:-6});R.label([lx,Y+.6,rz(0)-.2],'ℓ',{serif:true,fs:15,b:1,c:P.c6,a,dy:-6});
      R.label([cx(3)+.2,Y,oz(1.5)],k===6?'O / ℓ':'O, unnormalised',{mono:true,fs:12,b:1,c:P.v,al:'left',dx:14,a})}
    if(k===6)R.flow([[cx(1.5),Y,oz(1.5)],[-1.5,1.2,.9],[-5.25,.05,.85]],{c:P.v,a:e,n:10,r:.08});
  }
  const full={cam:[.18,.62],bounds:[[-5.8,0,-3],[5.4,2.9,1.6]]},chip={cam:[.3,.7],bounds:[[OX-.5,.8,-1.6],[OX+2.9,2.9,1.6]]};
  const st=S3.stage({id:'stg-fa',list:'sx-fa',fig:'Fig. 6 · one query block, streamed over the keys (illustrative toy)',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[22,16,24,16],view:k=>k===3||k===4?chip:full});
  (window.WKSTG=window.WKSTG||{})['stg-fa']=st;
})();
