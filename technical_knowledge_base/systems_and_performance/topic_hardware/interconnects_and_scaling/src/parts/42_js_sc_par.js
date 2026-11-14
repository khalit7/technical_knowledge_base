// ---- Scene, Fig. 5 (section 9): where each kind of parallelism sends its traffic, on the two servers, rails and spine of Fig. 1, with a pair of
// bars beside them: the step's compute time and its communication time, to scale. Every ratio is the page's own (window.IC.par from recompute.py):
// link intensity over NVLink 4 and a 400 Gb/s NIC (H100 at 40% of dense BF16 peak); TP 8 for Llama 3.1 70B over NVLink and over the NIC; pipeline
// for Llama 3.1 405B in 16 stages; data parallelism's break-even tokens against Llama 3 405B's 16M-token batch over 128 replicas (2^24 / 128 tokens,
// section 9's derivation); expert parallelism at DeepSeek-V3's stated 1:1. No overlap assumed, as in section 9's table. Steps: #sx-par on the left. ----
(function(){
  if(!document.getElementById('stg-par')||!window.ICG||!window.IC)return;const {mix,lerp}=S3,G=ICG,PR=IC.par;
  const bwOf=re=>IC.ladder.find(r=>re.test(r.nm)).bw;
  const BW={nvl:bwOf(/NVLink 4/),pcie:bwOf(/PCIe/),nic:bwOf(/400 Gb\/s NIC/)};BW.spine=BW.nic/7;
  const TOK=Math.pow(2,24)/128;
  const R_={tpn:PR.tp70.nvl,tpi:PR.tp70.ib,pp:PR.pp405.ratio,dp:PR.ib.dp_tokens/TOK,ep:1};
  window.IC_PAR={I:[PR.nvl.I,PR.ib.I],ratio:R_,tok:TOK,wait:PR.tp70.wait_ib}; // checked by check/check_stages.mjs
  const S0=G.server(2,1),S1=G.server(-2,-1),pct=x=>x<.01?(100*x).toFixed(2)+'%':Math.round(100*x)+'%',f=n=>Math.round(n).toLocaleString('en-US');
  // per step: which link carries the traffic, its colour key, the comm / compute ratio, and the alphas of the network tiers
  const ST=[{kind:'I'},{kind:'tpn',c:'c3',r:R_.tpn,lab:'TP 8 inside the server'},{kind:'tpi',c:'bad',r:R_.tpi,lab:'TP 8 across the NIC'},
    {kind:'pp',c:'c5',r:R_.pp,lab:'pipeline, 16 stages'},{kind:'dp',c:'c2',r:R_.dp,lab:'data parallel'},{kind:'ep',c:'c4',r:R_.ep,lab:'expert parallel'}];
  const TIER=[{nvl:1,rail:1,up:.25},{nvl:1,rail:.2,up:.05},{nvl:.25,rail:1,up:.05},{nvl:.25,rail:.8,up:.05},{nvl:.25,rail:1,up:.05},{nvl:.4,rail:.6,up:1}];
  const BX=9.1,HS=1.7; // the bars: x position, height of 100%
  function draw(R,k,e,st){const P=R.P,pk=st.pk==null?k:st.pk,a=n=>lerp(TIER[pk][n],TIER[k][n],e),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{})),s=ST[k];
    R.grid(-7.5,10.5,-4,4,.5);
    [S0,S1].forEach(S=>{G.drawServer(R,S,{hbm:.1+.15*a('nvl'),nvs:.4+.6*a('nvl'),pci:.12+.18*a('nvl'),nic:.6,cpu:.12+.18*a('nvl')});G.links(R,S,BW,{nvl:a('nvl'),pcie:.2})});
    for(let r=0;r<8;r++){const L=G.leaf(r);R.box([L[0],L[1]-.15,0],[.9,.3,.6],{fill:mix(P.paper,P.c2,.45),a:.2+.8*a('rail'),shadow:false});
      [S0,S1].forEach(S=>G.pipe(R,G.top(S.nic(r)),[L[0],L[1]-.15,0],BW.nic,{c:P.c2,a:a('rail')*.8}))}
    for(let q=0;q<4;q++){const Sp=G.spine(q);R.box([Sp[0],Sp[1]-.18,0],[1.5,.36,.75],{fill:mix(P.paper,P.bad,.55),a:.15+.85*a('up'),shadow:false});
      for(let r=0;r<8;r++){const L=G.leaf(r);G.pipe(R,[L[0],L[1]+.15,0],[Sp[0],Sp[1]-.18,0],BW.spine,{c:P.bad,a:a('up')*.7})}}
    // traffic
    const z0=S0.nvs(0)[2],z1=S1.nvs(0)[2],via=(S,g,z)=>[[G.XG(g),.44,S.z0],[G.XG(g),.44,z]];
    const rail=(g,from,to)=>{const L=G.leaf(g);return [G.top(from.nic(g)),[L[0],L[1]-.15,0],G.top(to.nic(g))]};
    if(k===1)for(let g=0;g<8;g++){R.flow([...via(S0,g,z0),...via(S0,(g+3)%8,z0).reverse()],{c:P.c3,a:e,r:.07,n:7,speed:1.4})}
    if(k===2)for(let g=0;g<8;g++)R.flow(rail(g,g%2?S1:S0,g%2?S0:S1),{c:P.bad,a:e,r:.07,n:10,speed:1.4});
    if(k===3)for(let g=0;g<8;g+=2)R.flow(rail(g,S0,S1),{c:P.c5,a:e,r:.06,n:2,speed:.6});
    if(k===4)for(let g=0;g<8;g++)R.flow(rail(g,g%2?S1:S0,g%2?S0:S1),{c:P.c2,a:e,r:.06,n:4,speed:.8});
    if(k===5)[[0,5,1],[2,7,2],[6,1,0],[4,3,3]].forEach(([x,y,q],i)=>{const Lx=G.leaf(x),Ly=G.leaf(y),Sp=G.spine(q),A0=i%2?S1:S0,B0=i%2?S0:S1;
      R.flow([G.top(A0.nic(x)),[Lx[0],Lx[1],0],[Sp[0],Sp[1]-.18,0],[Ly[0],Ly[1],0],G.top(B0.nic(y))],{c:P.c4,a:e,r:.06,n:14,speed:1.3})});
    // the bars beside the cluster
    R.box([BX,0,0],[2.1,.08,1.1],{fill:mix(P.paper,P.ink,.06),a:1});
    if(k===0){const m=Math.max(PR.nvl.I,PR.ib.I),h=v=>HS*1.4*v/m;
      [[PR.nvl.I,P.c3,'NVLink 4'],[PR.ib.I,P.c2,'400G NIC']].forEach(([v,c,n],i)=>{const x=BX+(i?.45:-.45);R.box([x,.08,0],[.6,Math.max(.02,h(v)*e),.6],{fill:mix(P.paper,c,.8)});
        lab([x,.08+h(v)*e,0],f(v),{dy:-12,b:1,c,a:e});lab([x,0,.55],n,{dy:14,fs:12,c,a:e,grp:'bars'})});
      lab([BX,HS*1.4+.25,0],'FLOPs per byte, I = F / β',{dy:-14,fs:12,c:P.mute,a:e,wide:1})}
    else{const hc=HS,hm=HS*s.r,mm=Math.max(.015,hm),c=P[s.c];
      R.box([BX-.45,.08,0],[.6,hc,.6],{fill:mix(P.paper,P.c1,.7)});R.box([BX+.45,.08,0],[.6,mm*(pk===k?1:e),.6],{fill:mix(P.paper,c,.85)});
      lab([BX-.75,.08+hc,0],'compute',{al:'right',dy:-12,fs:12,c:P.c1});lab([BX+.75,.08+mm,0],pct(s.r),{al:'left',dy:-12,b:1,c,a:e});
      lab([BX,0,.6],s.lab,{dy:16,fs:12,c,a:e,wide:1})}
    if(k===0){lab([G.XG(0),.5,z0],'NVLink · I = '+f(PR.nvl.I),{al:'right',dx:-10,b:1,c:P.c3,a:e,wide:1});lab([G.XG(0),G.YL,0],'NIC · I = '+f(PR.ib.I),{al:'right',dx:-14,b:1,c:P.c2,a:e,wide:1})}
  }
  const full={cam:[.5,.34],bounds:[[-7.2,0,-3.6],[10.2,5.6,3.6]]};
  const st=S3.stage({id:'stg-par',list:'sx-par',fig:'Fig. 5 · where each parallelism sends its traffic',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:5200,draw,view:k=>S3P(k,'stg-par',()=>null,full.cam),
   
    margin:w=>w<520?[18,10,14,10]:[24,20,20,20]});
  (window.ICSTG=window.ICSTG||{})['stg-par']=st;
})();
