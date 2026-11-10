// ---- Scene (Fig. 5, Gemma 4 on one machine, sparse against dense): each model a tower whose height is its weights in GB (window.GEMMA,
// the Gemma 4 report's memory table, 17_js_gemma.js), on one card whose memory is the glass plane. The MoE tower is a shared part (teal)
// plus 128 expert columns, each one expert's weights across all 30 layers, with P_expert and P_shared back-solved from the report's
// resident and active figures as on the Gemma on one machine tab. The KV cache at 32K tokens in int8 (the report's figures) is gold. ----
(function(){
  if(!document.getElementById('stg-sd')||!window.GEMMA)return;const {lerp,mix}=S3,G=GEMMA,by=k=>G.GM.find(m=>m.k===k);
  const M26=by('26b'),M31=by('31b'),M12=by('12b'),N=128,K=8,B=32;
  const pexp=w=>(M26.wt[w]-M26.aw[w])/(N-K),psh=w=>M26.aw[w]-K*pexp(w);
  const E=b=>N*(1-Math.pow(1-K/N,b));                       // experts a batch of b tokens touches under uniform routing
  // per step: weight precision, the card's memory (GB), and the scale (world units per GB)
  const ST=[{w:'bf',cap:80,hs:.05},{w:'bf',cap:80,hs:.05},{w:'q4',cap:24,hs:.15},{w:'q4',cap:16,hs:.15},{w:'bf',cap:80,hs:.05}];
  const CAPN={80:'80 GB · one H100',24:'24 GB card',16:'16 GB card'};
  window.GGSD={pexp,psh,E,B,K,N,rep:{m26:M26.rep,m31:M31.rep,m12:M12.rep}};
  // which experts light: seeded and illustrative (each layer routes on its own; a column stands for one expert in all 30 layers)
  const rnd=mulberry32(7),ord=[...Array(N).keys()].map(i=>[rnd(),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  const lit1=new Set(ord.slice(0,K)),litB=new Set(ord.slice(0,Math.round(E(B))));
  const FW=1.6,FD=.8,XM=-1.4,XD=1.4,X12=3.9,OUT=[0,.25,2.1];
  const col=i=>[XM-FW/2+(i%16+.5)*FW/16,FD/2-((Math.floor(i/16))+.5)*FD/8];
  function draw(R,k,e,st){const P=R.P,pk=st.pk,t=pk===k?1:e,A=ST[pk],Z=ST[k];R.grid(-4,6,-2,2.6,.5);
    const hv=f=>lerp(f(A.w)*A.hs,f(Z.w)*Z.hs,t),hs=lerp(A.hs,Z.hs,t),w=t<.5?A.w:Z.w,cap=t<.5?A.cap:Z.cap,capY=lerp(A.cap*A.hs,Z.cap*Z.hs,t);
    const in12=(k===3?t:pk===3?1-e:0),batch=(k===4?t:pk===4?1-e:0);
    const moeIn=.14+.86*(k===0?(pk===0?0:1-e):pk===0?e:1); // drawn faintly at step 1, so the frame shows what is coming
    // the card's memory as a glass plane
    const px1=lerp(2.6,X12+1.1,in12);R.glass([-2.6,capY,-.9],[px1+2.6,0,0],[0,0,1.8],{c:P.c2,a:.75,nu:12,nv:3,th:.02});
    R.label([-2.6,capY,0],CAPN[cap],{al:'right',dx:-10,fs:12.5,b:1,c:P.c2});
    // the dense 31B: 60 layer slabs, all of it read for every token
    const d=hv(w=>M31.wt[w]),L=60,sh=d/L,kv31=M31.rep*hs;
    for(let i=0;i<L;i++)R.box([XD,i*sh,0],[FW,sh*.82,FD],{fill:mix(P.paper,P.mute,.42),shadow:i===0,lw:.35});
    const kvA=(k===2||k===3)?t:(pk===2||pk===3)?1-e:0,kvOn=(k===2||k===3)&&(pk===2||pk===3)?1:kvA;
    if(kvOn>.01)R.box([XD,d,0],[FW,Math.max(.012,kv31),FD],{fill:P.c5,a:kvOn,shadow:false,lw:.5});
    // the MoE 26B A4B: shared part plus 128 expert columns; lit: read for this token (step 2 to 4) or this batch (step 5)
    const ps=hv(psh),ce=hv(w=>pexp(w)*N),kv26=M26.rep*hs,lit=batch>.5?litB:lit1,ra=moeIn>.01;
    if(ra){R.box([XM,0,0],[FW,ps,FD],{fill:P.c6,a:moeIn,lw:.6});
      for(let i=0;i<N;i++){const [x,z]=col(i),on=lit.has(i);R.box([x,ps,z],[FW/16*.78,ce,FD/8*.78],{fill:on?P.c1:mix(P.paper,P.c1,.2),a:moeIn,fa:on?1:.22,ea:on?.8:.3,shadow:false,lw:.3})}
      if(kvOn>.01)R.box([XM,ps+ce,0],[FW,Math.max(.012,kv26),FD],{fill:P.c5,a:kvOn*moeIn,shadow:false,lw:.5})}
    // the 12B Unified, step 4
    if(in12>.01){const h=hv(w=>M12.wt[w]);R.box([X12,0,0],[FW*.8,h,FD],{fill:P.c3,a:in12,lw:.6});R.box([X12,h,0],[FW*.8,Math.max(.012,M12.rep*hs),FD],{fill:P.c5,a:in12,shadow:false,lw:.5});
      R.label([X12,0,FD/2],'12B Unified',{fs:13,b:1,dy:18,c:P.c3,a:in12});R.label([X12,h,-FD/2],fmt(M12.wt.q4,2)+' + '+M12.rep.toFixed(2)+' GB · fits',{dy:-16,fs:12.5,b:1,c:P.good,a:in12})}
    // what one decode step reads, as flows to the token being generated
    R.glow(OUT,.14,{c:P.ink,a:.5});
    R.flowArc([XD,d,FD/2],OUT,.5,{c:P.mute,a:1,r:.06,n:Math.round(4+M31.aw[w]/M31.wt[w]*12),speed:1.3});
    if(ra){const fa=Math.max(0,(moeIn-.14)/.86);R.flowArc([XM,ps*.6,FD/2],OUT,.25,{c:P.c6,a:fa,r:.05,n:5,speed:1.3});
      const show=[...lit].slice(0,batch>.5?14:K);show.forEach(i=>{const [x,z]=col(i);R.flowArc([x,ps+ce,z],OUT,.5,{c:P.c1,a:fa*.9,r:.04,n:4,speed:1.4})})}
    // labels: names under the towers, then each step's numbers beside them (the outgoing set gone by mid-transition)
    R.label([XD,0,FD/2],'31B dense',{fs:13,b:1,dy:18,c:P.ink});
    if(ra)R.label([XM,0,FD/2],'26B A4B · MoE',{fs:13,b:1,dy:18,c:P.c1,a:moeIn});
    const la=s=>{const a=k===s?t:pk===s?1-e:0;return a>.5?(a-.5)*2:0};
    const mH=ps+ce,gb=v=>fmt(v,v<1?2:1)+' GB';
    [[0,()=>{R.label([XD+FW/2,d*.6,0],gb(M31.wt.bf)+' · all read',{al:'left',dx:12,fs:12.5,mono:true,b:1,c:P.ink,a:la(0)});R.label([XD+FW/2,d*.6,0],'61.4 GFLOP per token',{al:'left',dx:12,dy:18,wide:1,fs:12,mono:true,c:P.mute,a:la(0)})}],
     [1,()=>{R.label([XM-FW/2,mH*.7,0],gb(M26.wt.bf)+' resident',{al:'right',dx:-12,fs:12.5,mono:true,b:1,c:P.c1,a:la(1)});R.label([XM-FW/2,mH*.7,0],gb(M26.aw.bf)+' read · 7.6 GFLOP',{al:'right',dx:-12,dy:18,wide:1,fs:12,mono:true,c:P.c1,a:la(1)});
        R.label([XM-FW/2,ps*.5,0],'shared '+psh('bf').toFixed(2)+' GB',{al:'right',dx:-12,wide:1,fs:12,mono:true,c:P.c6,a:la(1)});R.label([XD+FW/2,d*.6,0],gb(M31.wt.bf),{al:'left',dx:12,fs:12.5,mono:true,b:1,c:P.ink,a:la(1)})}],
     [2,()=>{R.label([XM-FW/2,mH,0],fmt(M26.wt.q4,1)+' + '+M26.rep.toFixed(2)+' GB',{al:'right',dx:-12,wide:1,fs:12.5,mono:true,b:1,c:P.c1,a:la(2)});R.label([XM-FW/2,mH,0],gb(M26.aw.q4)+' read per token',{al:'right',dx:-12,dy:18,wide:1,fs:12,mono:true,c:P.c1,a:la(2)});
        R.label([XD+FW/2,d,0],fmt(M31.wt.q4,1)+' + '+M31.rep.toFixed(2)+' GB',{al:'left',dx:12,wide:1,fs:12.5,mono:true,b:1,c:P.ink,a:la(2)});R.label([XD+FW/2,d,0],'all '+gb(M31.aw.q4)+' read',{al:'left',dx:12,dy:18,wide:1,fs:12,mono:true,c:P.mute,a:la(2)})}],
     [3,()=>{R.label([XM,mH+kv26,-FD/2],fmt(M26.wt.q4,1)+' + '+M26.rep.toFixed(2)+' GB · does not fit',{dy:-16,fs:12.5,b:1,c:P.bad,a:la(3)});R.label([XD,d+kv31,-FD/2],fmt(M31.wt.q4,1)+' + '+M31.rep.toFixed(2)+' GB · does not fit',{dy:-34,fs:12.5,b:1,c:P.bad,a:la(3)})}],
     [4,()=>{const n=Math.round(E(B));R.label([XM-FW/2,mH*.7,0],'batch of '+B+': '+n+' of '+N+' experts',{al:'right',dx:-12,fs:12.5,mono:true,b:1,c:P.c1,a:la(4)});
        R.label([XM-FW/2,mH*.7,0],'≈ '+fmt(psh('bf')+E(B)*pexp('bf'),0)+' GB read per step',{al:'right',dx:-12,dy:18,wide:1,fs:12,mono:true,c:P.c1,a:la(4)});R.label([XD+FW/2,d*.6,0],gb(M31.wt.bf)+' read per step',{al:'left',dx:12,fs:12.5,mono:true,b:1,c:P.ink,a:la(4)})}]
    ].forEach(([s,f])=>{if(la(s)>.01)f()});
  }
  const full={cam:[.36,.42],bounds:[[-4.4,0,-1],[4.4,4.1,2.2]]};
  S3.stage({id:'stg-sd',list:'sx-sd',fig:'Fig. 5 · Gemma 4 on one card: weights resident against weights read',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:5200,draw,
    margin:w=>w<520?[14,8,30,8]:[18,20,30,20],
    view:k=>k===3?{cam:[.36,.42],bounds:[[-4.2,0,-1],[5.6,3.1,2.2]]}:full});
  // the step list's numbers that depend on the data
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  const n32=Math.round(E(B));set('sd-c12',M12.rep.toFixed(2));set('sd-e32',n32);set('sd-e32b',n32);set('sd-p32',Math.round(E(B)/N*100));set('sd-g32',fmt(psh('bf')+E(B)*pexp('bf'),0));
})();
