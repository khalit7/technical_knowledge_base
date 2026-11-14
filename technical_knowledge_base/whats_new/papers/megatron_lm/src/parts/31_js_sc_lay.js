// ---- Scene (Fig. 2): one MLP block split across t GPUs, forward and backward, Megatron against Option 1 (renderer v2) ----
// Each GPU is a lane in depth (GPU 1 in front). On each lane: the input X, the f gate, the weight A (H x 4H) as a glass plate, the hidden layer
// under it, Option 1's extra gate, B (4H x H) as a glass plate, the g gate and the block's output. Plates are drawn to the matrix's shape (rows up,
// columns across, one unit of H = U world units) and each GPU's plate is only its own slice: Megatron's A by columns and B by rows, Option 1's A
// and B both by rows; the outline is the whole matrix. Slabs on the lane are what that GPU holds for one token (blue own slice, orange partial
// sum, grey full). Dots along a lane are local work; dots between lanes are the collectives, at the gate the step names, and the column on the
// right is what each GPU has sent so far (ring formulas, 23_js_run.js), its outline the other split's whole block. Steps, sizes and counts are
// window.MEG_LAY's (23_js_run.js): the Table 1 model, t, link and micro-batch chosen under the step list.
(function(){
  if(!document.getElementById('stg-lay')||!window.S3||!window.MEG_LAY)return;const {at,mix}=S3,L=MEG_LAY;
  const U=.7,Y0=.1,SH=.07,LD=.46;
  const XX=-6.1,GF=-4.85,AX=-4.4,GM=-1.1,BX=-.55,GG=.6,OX=1.05,QX=2.75; // x of: input, f gate, A, Option 1's gate, B, g gate, output, sent column
  const REG={x:[XX,U],y:[AX,4*U],z:[BX,U],o:[OX,U]};
  const dz=t=>t>=8?.62:t>=4?1:1.5,zl=(i,t)=>((t-1)/2-i)*dz(t),zm=t=>(t-1)/2*dz(t)+.4;
  const sub=['₁','₂','₃','₄','₅','₆','₇','₈'],fm=v=>v.toLocaleString('en-GB');
  // a plate's slice for GPU i: [x0, width, y0 (bottom), height] in world units
  // (row block i is drawn i blocks up, so the slices of lanes further back sit higher and none hides another)
  function sliceA(m,i,t){return m==='meg'?[AX+i*4*U/t,4*U/t,Y0,U]:[AX,4*U,Y0+i*U/t,U/t]}
  function sliceB(m,i,t){return [BX,U,Y0+i*4*U/t,4*U/t]}
  function plate(R,s,z,c,a,nu,nv){R.glass([s[0],s[2],z],[s[1],0,0],[0,s[3],0],{c,a,nu:Math.max(1,nu),nv:Math.max(1,nv),th:.03})}
  function ghost(R,x,y,w,h,z,a){R.line([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z]],{c:R.P.mute,w:1,dash:[4,3],a})}
  function slab(R,S,i,t,z,a){const P=R.P,[kind,w]=S.L,[r0]=REG[S.at],full=w*U;let x0=r0,wd=full,c=mix(P.paper,P.ink,.28),fa=1;
    if(kind==='shard'){x0=r0+i*full/t;wd=full/t;c=P.c1}else if(kind==='part'){c=P.c2;fa=.5}
    R.box([x0+wd/2,.04,z],[wd,SH,LD*.8],{fill:c,a,fa,shadow:false,lw:.7});
    if(S.gelu&&a>.3)R.glow([x0+wd/2,.15,z],Math.min(.6,wd*.6),{c:P.c1,a:a*.5})}
  // where a local flow starts and ends on lane i
  function node(m,key,i,t,z){if(key==='A'){const s=sliceA(m,i,t);return [s[0]+s[1]/2,s[2]+s[3]/2,z]}if(key==='B'){const s=sliceB(m,i,t);return [s[0]+s[1]/2,s[2]+s[3]/2,z]}
    const r=REG[key];return [r[0]+r[1]/2,.14,z]}
  function gateX(g){return g==='f'?GF:g==='m'?GM:GG}
  function draw(R,k,e){const P=R.P,m=L.mode,t=L.P().t,ST=L.ST[m],S=ST[k],pv=k?ST[k-1]:null,zM=zm(t);R.grid(-6.6,3.6,-zM-.3,zM+.3,.5);
    const usedA=ST.slice(0,k+1).some(x=>(x.w||'').includes('A')),usedB=ST.slice(0,k+1).some(x=>(x.w||'').includes('B'));
    const focA=(S.w||'').includes('A')||(S.at==='y'&&!S.comm),focB=(S.w||'').includes('B');
    const comm=!!S.comm,cv=close(k);
    for(let i=0;i<t;i++){const z=zl(i,t);
      R.box([(XX-.25+QX-.45)/2,0,z],[QX-.45-XX+.25,.035,LD],{fill:P.paper,dz:50,shadow:false});
      if(cv!=='B')R.label([XX-.3,.02,z],'GPU '+(i+1),{al:'right',dx:-6,fs:12,mono:true,c:P.mute,grp:'lane'});
      // weight plates: each GPU's own slice; the whole matrix as an outline
      if(usedA){const a=(k===ST.findIndex(x=>(x.w||'').includes('A'))?e:1)*(focA?1:comm?.25:.4),s=sliceA(m,i,t);
        plate(R,s,z,P.c1,a,m==='meg'?Math.round(8/t):8,m==='meg'?3:1);ghost(R,AX,Y0,4*U,U,z,a*.45)}
      if(usedB){const a=(k===ST.findIndex(x=>(x.w||'').includes('B'))?e:1)*(focB?1:comm?.25:.4),s=sliceB(m,i,t);
        plate(R,s,z,P.c6||P.c4,a,2,m==='meg'?Math.round(8/t):Math.round(8/t));ghost(R,BX,Y0,U,4*U,z,a*.45)}
      // what this GPU holds for one token now (the previous step's slab fades out)
      if(pv&&e<1&&(pv.at!==S.at||pv.L[0]!==S.L[0]))slab(R,pv,i,t,z,1-e);
      slab(R,S,i,t,z,pv&&(pv.at!==S.at||pv.L[0]!==S.L[0])?e:1);
      // local work: dots along the lane
      if(S.fl){const a=node(m,S.fl[0],i,t,z),b=node(m,S.fl[1],i,t,z);const pts=[];
        if(S.bwd&&S.fl[0]==='o'&&S.fl[1]==='x'){const b1=node(m,'B',i,t,z),a1=node(m,'A',i,t,z);[[a,b1],[b1,a1],[a1,b]].forEach(([p,q],j)=>{for(let u=j?1:0;u<=12;u++)pts.push(R.arcPt(p,q,.15,u/12))})}
        else for(let u=0;u<=16;u++)pts.push(R.arcPt(a,b,.25,u/16));
        R.flow(pts,{c:S.bwd?P.c5:P.c1,a:Math.min(1,e*1.5)*(i===0?1:.7),r:.055,speed:1.4,n:6})}}
    // the gates: f and g on every split, Option 1's extra synchronisation in front of the GeLU
    const gates=[['f',GF,'f'],['g',GG,'g']];if(m==='row')gates.push(['m',GM,'sync']);
    gates.forEach(([g,x,nm])=>{const on=comm&&S.comm[2]===g;if(cv==='B'&&g==='f')return;
      R.line([[x,.05,zM-.15],[x,.05,-zM+.15]],{c:P.c2,w:on?3:1.6,dash:on?null:[5,4],a:on?1:.6});
      R.label([x,.05,zM-.15],nm,{serif:true,b:1,fs:15,c:P.c2,dy:16,a:on?1:.75})});
    // the collective: a ring of dots between neighbouring lanes at its gate, denser for 4H than for H
    if(comm){const x=gateX(S.comm[2]),sz=S.comm[1],y=.55,ag=S.comm[0]==='ag',c=ag?P.c4:P.c2;
      for(let i=0;i<t-1;i++)R.flowArc([x,y,zl(i,t)],[x,y,zl(i+1,t)],.18,{c,a:e,r:.035+.012*sz,n:sz>1?6:2,speed:1.1});
      if(t>1)R.flowArc([x,y,zl(t-1,t)],[x,y,zl(0,t)],.75,{c,a:e*.8,r:.035+.012*sz,n:sz>1?12:5,speed:1.6});
      R.label([x,.05,zM-.15],(ag?'all-gather of ':'all-reduce of ')+(sz===1?'H':sz+'H')+' per token',{fs:13,b:1,c,a:e,dy:36})}
    if(S.bwd&&!comm&&k>0&&!ST[k-1].bwd)R.label([OX+U/2,.6,zl(0,t)],'gradient of Z',{fs:12.5,b:1,c:P.c5,a:e});
    if(S.dup)R.label([OX+U/2,.6,zl(0,t)],'dropout, residual: on every GPU',{fs:12.5,c:P.ink,a:e});
    if(S.gelu)R.label([AX+2*U,1.2,zl(0,t)],m==='meg'?'GeLU on '+fm(4*L.P().h/t)+' values per GPU':'GeLU on all '+fm(4*L.P().h)+', on every GPU',{fs:13,b:1,c:P.c1,a:e});
    // plate names (front lane) with the model's sizes
    const h=L.P().h,z0=zl(0,t),ph=R.W<520;
    if(usedA&&cv!=='B'){const s=sliceA(m,0,t);R.label(ph?[s[0],s[2]+s[3],z0]:[s[0],0,z0+LD/2],'A'+sub[0]+': '+(m==='meg'?fm(h)+' × '+fm(4*h/t):fm(h/t)+' × '+fm(4*h)),{al:'left',fs:12.5,mono:true,b:1,c:P.c1,dx:ph?0:4,dy:ph?-10:14,a:focA?1:.6})}
    if(usedB&&cv!=='A'){const s=sliceB(m,0,t);R.label(ph?[BX,s[2]+s[3]/2,z0]:[BX+U,0,z0+LD/2],'B'+sub[0]+': '+fm(4*h/t)+' × '+fm(h),{al:'right',fs:12.5,mono:true,b:1,c:P.c6||P.c4,dx:ph?-8:0,dy:ph?0:14,a:focB?1:.6})}
    // sent so far per GPU (in H per token), against the other split's whole block; drawn in the whole-block view only
    if(close(k))return;
    const oth=m==='meg'?'row':'meg',mx=Math.max(L.tot('meg',t,99),L.tot('row',t,99)),sc=2.4/mx,
      me=L.tot(m,t,k)-(comm?L.ring(S.comm,t)*(1-e):0),ot=L.tot(oth,t,99),zc=zl(0,t)+.2;
    R.box([QX,0,zc],[.5,.05,.5],{shadow:false});
    if(me>0)R.box([QX,.05,zc],[.34,me*sc,.34],{fill:P.c2,shadow:false});
    R.line([[QX-.17,.05+ot*sc,zc+.17],[QX+.17,.05+ot*sc,zc+.17],[QX+.17,.05+ot*sc,zc-.17]],{c:P.mute,w:1.2,dash:[4,3]});
    R.label([QX,.05+Math.max(me,0)*sc,zc],'sent '+me.toFixed(2)+'H',{fs:12.5,mono:true,b:1,c:P.c2,dy:-12});
    R.label([QX+.2,.05+ot*sc,zc],(m==='meg'?'Option 1: ':'Megatron: ')+ot.toFixed(2)+'H',{fs:12,mono:true,c:P.mute,al:'left',dx:6,wide:1})
  }
  function close(k){const S=L.ST[L.mode][k];return (S.w||'')==='A'||(S.at==='y'&&!S.comm&&!S.bwd)?'A':(S.w||'')==='B'&&!S.bwd?'B':''}
  const full=()=>{const z=zm(L.P().t);return {cam:[.16,.5],bounds:[[-6.5,0,-z],[3.3,2.9,z]]}};
  const st=S3.stage({id:'stg-lay',list:'sx-lay-meg',fig:'Fig. 2 · one MLP block, t GPUs, forward and backward',cam:full().cam,bounds:()=>full().bounds,aspect:.5,dur:1400,hold:4800,draw,
    // steps about A or B move in close to that plate; collectives and the output show the whole block
    view:k=>{const z=zm(L.P().t),c=close(k);if(c==='A')return {cam:[.28,.5],bounds:[[-6.3,0,-z],[-.9,1.3,z]]};
      if(c==='B')return {cam:[.1,.42],bounds:[[-2.2,0,-z],[3.2,2.9,z]]};const v=full();return innerWidth<600?{cam:[.3,.6],bounds:[[-6.3,0,v.bounds[0][2]+.3],[3.1,2.9,v.bounds[1][2]-.3]]}:v},
    margin:w=>w<520?[16,8,12,8]:[18,110,14,70],
    onStep:k=>{L.k=k;L.counters()}});
  L.stage=st;
  const seg=document.getElementById('layM');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    L.mode=b.dataset.m;['meg','row'].forEach(m=>{document.getElementById('sx-lay-'+m).hidden=m!==L.mode});st.list('sx-lay-'+L.mode)}));
})();
