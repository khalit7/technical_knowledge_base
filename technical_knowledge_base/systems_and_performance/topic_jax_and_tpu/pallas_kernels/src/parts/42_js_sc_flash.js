// ---- Scene, Fig. 3 (section 5): the causal flash forward's grid for one head, naive against clamped K and V index maps (renderer v2).
// The floor is the grid: query block i (rows, front to back) by key block j (columns); q's 4 blocks of 32 stand on the left, k's and v's at the back.
// A tile rises when the body runs (pl.when keeps the 10 on or below the diagonal); a small block on a tile marks a K and V copy at that step,
// dark grey when the body was skipped (a wasted copy). Every step, block index and copy is PK.G.kernels flash_fwd (naive or clamped), recorded by
// src/runs/pk_grid.py from the kernels' own index maps. Explained by #sx-fl; the chips #pk-fl-mode switch the map and replay. ----
(function(){
  if(!document.getElementById('stg-fl')||!window.PK)return;const {at,off,mix}=S3,G=window.PK.G;
  const K={naive:G.kernels.find(k=>k.name==='flash_fwd'&&k.variant==='naive'),clamped:G.kernels.find(k=>k.name==='flash_fwd'&&k.variant==='clamped')};
  const IX={naive:G.ix.flash_fwd_naive,clamped:G.ix.flash_fwd_clamped};let mode='naive';
  const NQ=K.naive.grid[1],NK=K.naive.grid[2];
  window.PK_SC=window.PK_SC||{};window.PK_SC.fl={nq:NQ,nk:NK,k_copies:{naive:IX.naive.copies[1],clamped:IX.clamped.copies[1]},runs:IX.clamped.runs,get mode(){return mode}};
  const TX=j=>-1.5+j,TZ=i=>-1.5+i,XQ=-2.85,ZK=-2.75,ZV=-3.45;
  function draw(R,k,e){const P=R.P,L=K[mode],lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-4,3.5,-4.2,3,.5);
    const cur=k>=1&&k<=NQ?k-1:-1,sweep=cur>=0?Math.min(NK-1,Math.floor(e*NK)):-1;
    const seen=si=>{const i=Math.floor(si/NK),j=si%NK;return k>NQ||i<cur||(i===cur&&j<=sweep)};
    // q, k and v blocks
    for(let i=0;i<NQ;i++)R.box([XQ,0,TZ(i)],[.5,.14,.84],{fill:mix(P.paper,P.q,i===cur?.85:.35),a:cur<0||i===cur?1:.35,lw:.6});
    let kc=Array(NK).fill(0),vc=Array(NK).fill(0),wasted=0,copies=0,runs=0;
    L.steps.forEach((s,si)=>{if(!seen(si))return;if(s[3][1]){copies++;if(!s[1])wasted++}if(s[1])runs++;
      if(Math.floor(si/NK)===cur&&s[3][1]){kc[s[2][2]]=1;vc[s[2][4]]=1}});
    for(let j=0;j<NK;j++){R.box([TX(j),0,ZK],[.84,.14,.5],{fill:mix(P.paper,P.k,kc[j]?.9:.35),a:cur<0||kc[j]?1:.35,lw:.6});R.box([TX(j),0,ZV],[.84,.14,.5],{fill:mix(P.paper,P.v,vc[j]?.9:.35),a:cur<0||vc[j]?1:.35,lw:.6})}
    // the grid on the floor: one tile per grid point
    L.steps.forEach((s,si)=>{const i=Math.floor(si/NK),j=si%NK,x=TX(j),z=TZ(i),vis=seen(si),row=i===cur||cur<0,a=row?1:.3;
      if(!s[1]){R.quad([[x-.42,.004,z-.42],[x+.42,.004,z-.42],[x+.42,.004,z+.42],[x-.42,.004,z+.42]],{fill:P.soft,a:a*.9,dash:[4,3],ec:P.mute,ea:.5});}
      else R.box([x,0,z],[.84,vis?.3:.03,.84],{fill:vis?mix(P.paper,P.c3,.6):P.paper,fa:vis?1:.35,a,lw:.6,shadow:vis});
      if(vis&&s[3][1])R.box([x,s[1]?.3:0,z-.28],[.5,.14,.22],{fill:s[1]?mix(P.paper,P.k,.85):mix(P.paper,P.ink,.55),a,lw:.5,shadow:false})});
    // the step's copies: K and V flow from their block to the tile that asked for them
    if(cur>=0)L.steps.forEach((s,si)=>{const i=Math.floor(si/NK),j=si%NK;if(i!==cur||j>sweep||!s[3][1])return;const c=s[1]?P.k:P.mute;
      R.flowArc([TX(s[2][2]),.15,ZK+.2],[TX(j),s[1]?.32:.05,TZ(i)-.3],.45,{c,r:.09,n:7,speed:1.3});R.flowArc([TX(s[2][4]),.15,ZV+.2],[TX(j)+.15,s[1]?.32:.05,TZ(i)-.3],.6,{c:s[1]?P.v:P.mute,r:.08,n:7,speed:1.3,a:.85})});
    lab([TX(3)+.45,.14,ZK],'k',{al:'left',dx:8,b:1,c:P.k});lab([TX(3)+.45,.14,ZV],'v',{al:'left',dx:8,b:1,c:P.v});lab([XQ,.14,TZ(0)-.45],'q',{dy:-12,b:1,c:P.q});
    if(k===0){lab([XQ,.14,TZ(1.5)],'4 blocks of 32 rows',{al:'right',dx:-20,c:P.q,a:e,wide:1});
      lab([TX(2.5),0,TZ(0.5)],'above the diagonal: fully masked',{dy:-4,c:P.mute,a:e,wide:1});lab([0,0,TZ(3)+.45],'grid: query block i × key block j',{dy:22,c:P.mute,a:e})}
    if(cur>=0){lab([TX(3)+.5,.3,TZ(cur)],'q block '+cur,{al:'left',dx:6,b:1,c:P.q});
      lab([TX(1.5),0,TZ(3)+.45],'K copies so far: '+copies+(wasted?' ('+wasted+' for skipped tiles)':''),{dy:22,b:1,c:wasted?P.ink:P.k})}
    if(k===NQ+1){lab([TX(1.5),0,TZ(3)+.45],'K copies: '+IX.naive.copies[1]+' naive, '+IX.clamped.copies[1]+' clamped',{dy:22,b:1,c:P.k,a:e});
      lab([TX(1.5),0,TZ(3)+.45],'tiles computed: '+IX[mode].runs+' of '+NQ*NK,{dy:40,c:P.c3,b:1,a:e})}
  }
  const full={cam:[.3,.92],bounds:[[-3.2,0,-3.8],[2.4,.4,2.1]]};
  const st=S3.stage({id:'stg-fl',list:'sx-fl',fig:'Fig. 3 · the causal flash forward, one head',cam:full.cam,bounds:full.bounds,aspect:.66,dur:2200,hold:4400,draw,
    margin:w=>w<520?[16,8,16,8]:[22,16,24,16],view:()=>S3PH(full)});
  const chips=document.getElementById('pk-fl-mode');
  if(chips)chips.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.list('sx-fl')});
  (window.PKSTG=window.PKSTG||{})['stg-fl']=st;
})();
