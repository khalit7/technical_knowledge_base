// ---- Scene (Expert dispatch): LLEP against PipelinedLLEP, chunk by chunk, on the replayed send matrices (renderer v2) ----
// One MoE layer at the paper's 65K shape (Table 5): 8 ranks x 65,536 tokens, 128 experts, top-8, K = 10 chunks of c = 6,554 tokens per source,
// routed by one of the paper's synthetic profiles (B.2) and assigned by LLEP's released plan at capacity factor 1.0 (rtData in 12b_js_route.js,
// the same algorithm as src/sim_dispatch.py, which reproduces Table 8's send ratios). The bar field is the current chunk's send matrix
// (sender rows, destination columns, height = routes); the towers in front are what each destination holds now; rings mark each tower's
// highest so far. Step 1 shows the whole layer's matrix as floor tiles; steps 3 and 4 play chunks 2 to 5 and 6 to 10 within the step;
// step 5 rescales to LLEP's whole batch and shows Eq. 1's guarantee as a glass plane. One step list covers both memberships; the toggle replays it.
(function(){
  if(!document.getElementById('stg-dsx'))return;const {at,lerp,mix}=S3;
  const T6={0:[52.660,21.430,21.464],1:[52.988,22.855,23.575],2:[52.988,22.861,23.514],3:[52.906,22.778,24.151],4:[52.906,22.772,null]};
  let pi=3,mode='str';
  const D=()=>rtData(pi),EP=RT.ep;
  const xd=d=>(d-3.5)*.62,zs=i=>.2+i*.46,ZT=-.8,CW=.42;
  // chunk position at step k, progress e: 0-based, fractional while chunks are being played
  const cpos=(k,e)=>k<=1?0:k===2?4*e:k===3?4+5*e:9;
  const recvAt=(M)=>D().recv(M);
  const morph=(A,B,t)=>A.map((r,i)=>r.map((v,j)=>lerp(v,B[i][j],t)));
  function chunkM(c){const S=D()[mode],a=Math.floor(c),b=Math.min(RT.K-1,a+1),t=c-a;return t>1e-6?morph(S[a],S[b],t):S[a]}
  // the highest each destination has held over chunks 0..floor(c)
  function peakTo(c){const S=D()[mode],p=new Array(EP).fill(0);for(let i=0;i<=Math.min(RT.K-1,Math.floor(c+1e-9));i++)recvAt(S[i]).forEach((v,d)=>{p[d]=Math.max(p[d],v)});return p}
  const hkC=()=>1.6/Math.max(D().maxRecv.str,D().maxRecv.cont),hkW=()=>2.3/Math.max(...recvAt(D().whole),RT.bound);
  function draw(R,k,e){const P=R.P,S=D(),col=mode==='str'?P.c3:P.c2;R.grid(-3.4,3.4,-1.6,4.2,.5);
    const hk=k===4?lerp(hkC(),hkW(),e):hkC();
    // the send-matrix floor
    R.box([0,0,zs(3.5)],[EP*.62+.2,.04,EP*.46+.2],{fill:P.paper,dz:40,shadow:false});
    for(let i=0;i<EP;i++)R.label([xd(0)-.36,0,zs(i)],'src '+i,{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'src'});
    for(let d=0;d<EP;d++)R.label([xd(d),0,ZT+.32],'d'+d,{mono:true,fs:12,c:P.mute,dy:12,al:'center',wide:1});
    // step 1: where the whole layer's routes go (LLEP's plan), as tinted floor tiles
    const wm=Math.max(...S.whole.flat()),tileA=k===0?1:k===1?1-e:0;
    if(tileA>.01)for(let i=0;i<EP;i++)for(let d=0;d<EP;d++){const v=S.whole[i][d]/wm;R.box([xd(d),.04,zs(i)],[CW,.012,CW*.95],{fill:mix(P.paper,P.c1,.08+.8*v),a:tileA,shadow:false,lw:.4})}
    // the bar field: this chunk's send matrix (step 5: the whole batch)
    if(k>=1){const c=cpos(k,e),M=k===4?morph(chunkM(9),S.whole,e):chunkM(c),g=k===1?e:1,cc=k===4?mix(col,P.c1,e):col;
      for(let i=0;i<EP;i++)for(let d=0;d<EP;d++){const v=M[i][d]*hk*g;if(v>.004)R.box([xd(d),.04,zs(i)],[CW,v,CW*.95],{fill:mix(P.paper,cc,.65),shadow:false,lw:.6})}
      // routes travel to their destination: dots along each column, denser where more arrive
      const rv=recvAt(M),mx=Math.max(...rv);rv.forEach((v,d)=>{const r=v/Math.max(1,mx);if(v>0)R.flow([[xd(d),.07,zs(EP-1)+.3],[xd(d),.07,ZT+.3]],{c:cc,r:.035+.035*r,n:Math.round(3+9*r),speed:1.3,a:g*(.35+.65*r)})});
      // the receive towers and the highest-so-far rings
      const pk=peakTo(k===4?9:c);
      rv.forEach((v,d)=>{const h=v*hk*g;R.box([xd(d),0,ZT],[.48,Math.max(.01,h),.48],{fill:mix(P.paper,cc,.8),lw:.8});
        const y=pk[d]*hk,m=.3;if(k>=2&&y>.02)R.line([[xd(d)-m,y,ZT-m],[xd(d)+m,y,ZT-m],[xd(d)+m,y,ZT+m],[xd(d)-m,y,ZT+m],[xd(d)-m,y,ZT-m]],{c:P.ink,w:1.6,top:true,a:k===4?1:.8})});
      const big=rv.indexOf(mx);R.label([xd(big),mx*hk*g,ZT],fmt(Math.round(mx)),{mono:true,fs:12.5,b:1,dy:-14,c:cc,al:'center'});
      if(k===4){const pmax=Math.max(...pk);R.label([xd(0)-.3,pmax*hk,ZT],'chunk peak · '+fmt(pmax),{mono:true,fs:12,al:'right',dx:-8,c:col,a:e,grp:'lv'});
        // Eq. 1's guarantee for one chunk, as a glass plane over the towers
        const yb=RT.bound*hk;R.glass([xd(0)-.4,yb,ZT-.4],[xd(EP-1)-xd(0)+.8,0,0],[0,0,.8],{c:P.bad,a:.5*e,nu:12,nv:2});
        R.label([xd(EP-1)+.4,yb,ZT],'Eq. 1 guarantee · '+fmt(RT.bound),{mono:true,fs:12,b:1,al:'left',dx:8,c:P.bad,a:e,grp:'rv'});
        R.label([xd(EP-1)+.4,mx*hk*g,ZT],'LLEP whole batch · '+fmt(Math.round(mx)),{mono:true,fs:12,al:'left',dx:8,c:P.c1,a:e,grp:'rv'})}}
    if(k===0)R.label([0,0,zs(EP-1)+.35],'65,536 tokens × top-8 = 524,288 routes per sender',{fs:12.5,b:1,dy:40,al:'center'});
    R.label([0,0,zs(EP-1)+.35],'send matrix · rows send, columns receive · towers: what each destination holds',{fs:12,c:P.mute,dy:22,al:'center',wide:1});
  }
  // counters: the current chunk (or batch), the peak so far, the worst send ratio so far
  const ratio=M=>Math.max(...M.map(row=>{const s=row.reduce((a,b)=>a+b,0);return s?Math.max(...row)/(s/EP):0}));
  function counters(k){const S=D(),B=v=>fmtBytes(2*v*RT.H*RT.b);let now=0,pk=0,r=0,lab='';
    if(k===0){lab='nothing in flight yet'}
    else if(k<4){const c=Math.round(cpos(k,1));now=Math.max(...recvAt(S[mode][c]));for(let i=0;i<=c;i++){pk=Math.max(pk,...recvAt(S[mode][i]));r=Math.max(r,ratio(S[mode][i]))}lab='chunk '+(c+1)+' of '+RT.K}
    else{now=Math.max(...recvAt(S.whole));pk=now;r=ratio(S.whole);lab='LLEP, whole batch'}
    document.getElementById('dsxCnt').innerHTML=stat('Busiest destination now',fmt(now)+' routes',lab+(now?', '+B(now)+' of buffers':''))+
      stat('Peak so far',fmt(pk)+' routes',pk?(100*pk/RT.bound).toFixed(1)+'% of the Eq. 1 guarantee':'')+stat('Worst send ratio so far',r?r.toFixed(2)+'×':'none yet','largest send to one destination ÷ the sender\'s mean')}
  const AX=(a,t)=>'<a href="'+PAPER.meta.ax+'#'+a+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  function note(){const T=T6[pi];document.getElementById('dsxNote').innerHTML='Measured at this shape and profile ('+AX('A2.T6','Table 6')+', '+AX('A2.T8','Table 8')+'): peak allocated memory LLEP '+T[0]+' GiB, PipelinedLLEP strided '+T[1]+' GiB'+(T[2]?', contiguous '+T[2]+' GiB':'')+'. The counters count dispatch buffers only (2 R H b at H = 7,168, BF16); the measured peaks also hold combine buffers, expert intermediates and weights.'}
  const full={cam:[.22,.6],bounds:[[-2.9,0,-1.2],[2.9,2.4,3.8]]};
  const cfg={id:'stg-dsx',list:'sx-dsx',fig:'one MoE layer · 8 ranks · chunk by chunk',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.2,.86],bounds:[[-2.9,0,-.4],[2.9,.4,4.0]]}:full,
    margin:w=>w<520?[20,8,16,8]:[22,150,16,70],
    // a step that plays several chunks takes longer
    onStep:k=>{cfg.dur=k===2||k===3?4600:1500;try{counters(k)}catch(e){}}};
  const stg=S3.stage(cfg);
  window.MM_DSX={stage:stg,get pi(){return pi},get mode(){return mode}};
  const seg=document.getElementById('dsxM');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    mode=b.dataset.m;stg.list('sx-dsx')}));
  document.getElementById('dsxP').addEventListener('change',e=>{pi=+e.target.value;note();counters(stg.st.k);stg.draw()});
  note();counters(0);
})();
