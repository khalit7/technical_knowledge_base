// ---- Scene (section 2): eight real conversations of the Tulu 3 SFT sample, padded, packed, masked, then weighted (renderer v2) ----
// Lengths and graded tokens: window.AL_DATA.sft.batch (recompute.py from inputs/tulu3_lengths.json); the packing, the leak share and the
// per-token weights: window.AL_DATA.stage (recompute.py). Width is tokens to scale against a 4,096-token row; in steps 6 and 7 height is
// the gradient weight of one graded token, so each answer's volume is its share of the gradient.
(function(){
  if(!document.getElementById('stg-pack')||!window.S3||!window.AL_DATA)return;const {at,off,lerp,mix,ease,rgb}=S3;
  const D=AL_DATA,B=D.sft.batch,M=D.maxlen,ST=D.stage,n=B.length,mx=Math.max(...B.map(b=>b.t));
  const TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'].map(rgb);
  const XL=-4.5,XW=9,sx=t=>XW*t/M,LZ=i=>-2.1+i*.6,RZ=r=>-.55+r*1.1,H0=.22;
  // packed position of each conversation: its row and its offset in tokens
  const PK=[];ST.b_bins.forEach((bin,r)=>{let o=0;bin.forEach(i=>{PK[i]={r,o};o+=B[i].t})});
  const fill=ST.b_bins.map(bin=>bin.reduce((s,i)=>s+B[i].t,0));
  const HM=1.8,wmax=Math.max(...ST.b_w_mean),hMean=i=>HM*ST.b_w_mean[i]/wmax,hSum=HM*ST.b_w_sum/wmax;
  const pct=x=>(100*x).toFixed(1)+'%',fmt=x=>Math.round(x).toLocaleString('en-US');
  function draw(R,k,e){const P=R.P;R.grid(-5.2,5.2,-2.8,2.8,.5);
    const pk=k<2?0:k===2?ease(e):1;                    // 0 padded lanes, 1 packed rows
    const wt=k<5?0:k===5?e:1, sm=k===6?e:k>6?1:0;      // height becomes weight (step 6), then the sum (step 7)
    // the 4,096-token slots: one per lane before packing, two rows after
    for(let i=0;i<n;i++){const z=LZ(i),a=(1-pk)*.55;if(a>.02)R.quad([[XL,0.002,z-.19],[XL+XW,0.002,z-.19],[XL+XW,0.002,z+.19],[XL,0.002,z+.19]],{a,ec:P.mute,dash:[4,4],lw:1})}
    ST.b_bins.forEach((bin,r)=>{const z=RZ(r),a=pk*.7;if(a>.02){R.quad([[XL,0.002,z-.3],[XL+XW,0.002,z-.3],[XL+XW,0.002,z+.3],[XL,0.002,z+.3]],{a,ec:P.mute,dash:[4,4],lw:1});
      R.label([XL-.1,0,z],'row '+(r+1),{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a,grp:'lane'});
      if(k===2)R.label([XL+sx(fill[r])+(XW-sx(fill[r]))/2,0,z+.3],fmt(M-fill[r])+' empty',{mono:true,fs:12,dy:14,c:P.mute,a:a*(k===2?e:1),wide:1})}});
    B.forEach((b,i)=>{const col=TAB[i],x0=lerp(XL,XL+sx(PK[i].o),pk),z=lerp(LZ(i),RZ(PK[i].r),pk),dep=lerp(.36,.56,pk),wp=sx(b.t-b.l),wa=sx(b.l);
      const ha=wt>0?lerp(lerp(H0,hMean(i),wt),hSum,sm):H0,hp=lerp(H0,.04,wt);
      const fade=(k===5||k===6)&&!(i===ST.b_short||i===ST.b_long)?.55:1;
      R.box([x0+wp/2,0,z],[Math.max(.01,wp),hp,dep],{fill:mix(P.paper,col,.22),a:fade,lw:.6,shadow:false});
      R.box([x0+wp+wa/2,0,z],[Math.max(.012,wa),ha,dep],{fill:mix(P.paper,col,.78),a:fade,lw:.6,shadow:wt>0});
      if(pk<1)R.label([XL-.1,0,LZ(i)],'#'+(i+1),{al:'right',dx:-6,mono:true,fs:12,c:P.ink,a:1-pk,grp:'lane'});
      // padding to the longest (step 2), leaving as the rows pack
      const pa=k===1?e:k===2?1-e:k<1?0:0;
      if(pa>.02&&b.t<mx)R.box([XL+sx(b.t)+sx(mx-b.t)/2,0,LZ(i)],[sx(mx-b.t),.12,.3],{fill:mix(P.paper,P.mute,.45),a:pa*.8,fa:.55,lw:.5,shadow:false});
      if(k>=2&&k<5&&pk>.6)R.label([x0+sx(b.t)/2,H0,z],'#'+(i+1),{mono:true,fs:12,dy:-9,c:P.ink,a:pk,wide:1})});
    if(k===1)R.label([XL+sx(mx),.12,LZ(n-1)+.2],'every row padded to '+fmt(mx),{mono:true,fs:12.5,b:1,dy:16,c:P.ink,a:e});
    // step 4: a plain causal mask lets each conversation attend to the ones packed before it (red); step 5: only to itself
    if(k===3)ST.b_bins.forEach((bin,r)=>{const z=RZ(r);bin.forEach((i,ii)=>bin.slice(0,ii).forEach(j=>{const a0=[XL+sx(PK[j].o+B[j].t/2),H0,z],a1=[XL+sx(PK[i].o+B[i].t/2),H0,z];
      R.flowArc(a1,a0,.3+.1*Math.abs(a1[0]-a0[0]),{c:P.bad,a:Math.min(1,e*1.6),r:.075,n:6,speed:1.3})}))});
    if(k===4)B.forEach((b,i)=>{const z=RZ(PK[i].r),xa=XL+sx(PK[i].o),xb=xa+sx(b.t);if(xb-xa>.25)R.flowArc([xb-.05,H0,z],[xa+.05,H0,z],.15+.1*(xb-xa),{c:TAB[i],a:Math.min(1,e*1.6),r:.065,n:4,speed:1})});
    // the counter for the step, written above the scene
    const top=k===6?[-1,hSum+.5,-.8]:k>=5?[-1,1.95,-.8]:k>=2?[1.2,0,.85]:[0,.25,-2.6],tc={fs:12.5,b:1,mono:true,c:P.ink,dy:k===2?40:k>=3&&k<5?18:0,wide:k>=5?1:0};
    if(k===0)R.label(top,fmt(ST.b_sum_l)+' of '+fmt(ST.b_sum_t)+' tokens graded',{...tc,a:e});
    if(k===1)R.label(top,fmt(ST.b_pad_pos)+' positions · '+pct(ST.b_pad_real)+' real',{...tc,a:e});
    if(k===2)R.label(top,fmt(ST.b_pack_pos)+' positions · '+pct(ST.b_pack_real)+' real',{...tc,a:e});
    if(k===3)R.label(top,pct(ST.b_cross)+' of attention pairs cross a boundary',{...tc,c:P.bad,a:e});
    if(k===4)R.label(top,'each conversation attends only to itself',{...tc,a:e});
    if(k>=5){const s=ST.b_short,l=ST.b_long,ps=PK[s],pl=PK[l],hs=lerp(hMean(s),hSum,sm),hl=lerp(hMean(l),hSum,sm);
      const xs=XL+sx(ps.o+B[s].t-B[s].l/2),xl=XL+sx(pl.o+B[l].t-B[l].l/2);
      const shS=k===5?pct(1/8):pct(ST.b_share_short_sum),shL=k===5?pct(1/8):pct(ST.b_share_long_sum);
      R.label([xs,hs,RZ(ps.r)],'#'+(s+1)+' · '+B[s].l+' graded · '+shS,{fs:12.5,b:1,dy:-12,c:mix(P.ink,TAB[s],.5),a:wt});
      R.label([xl,hl,RZ(pl.r)],'#'+(l+1)+' · '+fmt(B[l].l)+' graded · '+shL,{fs:12.5,b:1,dy:-12,c:mix(P.ink,TAB[l],.5),a:wt});
      R.label(top,k===5?'height = weight of one graded token: mean per conversation':'height = weight of one graded token: sum over tokens',{...tc,a:k===5?e:1})}
  }
  const full={cam:[0,.95],bounds:[[-5.1,0,-2.5],[4.7,.25,2.4]]};
  S3.stage({id:'stg-pack',list:'sx-pack',fig:'Fig. 2 · eight real Tulu 3 SFT rows in one batch',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1500,hold:4800,draw,
    margin:w=>w<520?[18,8,12,8]:[20,14,12,56],
    view:k=>k===2?{cam:[0,.85],bounds:[[-5.1,0,-1.0],[4.7,.22,1.0]]}:k===3||k===4?{cam:[0,.6],bounds:[[-5.1,0,-.9],[4.7,1.1,.9]]}:k===5?{cam:[0,.32],bounds:[[-5.1,0,-.8],[4.7,1.9,.8]]}:k===6?{cam:[0,.42],bounds:[[-5.1,0,-.8],[4.7,hSum+.5,.8]]}:full}); // step 7: the bars are short again, so the camera drops the room the tall bar needed
})();
