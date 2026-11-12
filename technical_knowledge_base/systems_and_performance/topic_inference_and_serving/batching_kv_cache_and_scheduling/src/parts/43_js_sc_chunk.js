// ---- Scene, section 5: chunked prefill. Eight users decode on Llama 3.1 8B BF16 on the H100 preset when a 12,000-token prompt arrives at
// 0.2 s; three token budgets side by side in depth (no chunking at the back, 2,048, then 512 in front). Data: BKD.scn.chunk, every engine step
// between 0.15 s and 0.75 s from this page's simulator (src/sched/gen_scenes.py, the chunk_h100 case of out/sched.json, whose TTFT and longest
// gap it reproduces exactly). A step is a slab as long as it lasted; its height is the prompt tokens it computed; the dots in front of each
// lane are the eight users' tokens, one per step, so a long step is a gap in every stream. ----
(function(){
  if(!document.getElementById('stg-ck')||!window.BKD||!BKD.scn)return;const {at,off,lerp,mix}=S3;
  const C=BKD.scn.chunk,T0=.15,XS=14,X0=-4.2,x=t=>X0+(t-T0)*XS,f=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const ROW=[C.rows[0],C.rows[1],C.rows[2]],ZR=[-2.2,-.2,1.8],NAME=['no chunking','budget 2,048','budget 512'],HMAX=.9;
  const last=r=>r.steps.filter(s=>s[0]<=r.first+1e-9).length; // steps up to the long prompt's first token
  window.BK_CK=ROW.map(r=>({budget:r.budget,ttft:r.ttft,gap:r.max_gap,chunks:r.chunks})); // checked by src/check_stages.mjs
  const XP=X0-1.1; // the long prompt waits at the left of its lane and drains as its chunks are computed
  function lane(R,i,a,upto,hl,arrive,sum){const P=R.P,r=ROW[i],z=ZR[i];
    R.quad([[x(T0),.004,z-.55],[x(.75),.004,z-.55],[x(.75),.004,z+.75],[x(T0),.004,z+.75]],{fill:mix(P.card,P.ink,.04),edge:false,a:a*.9,dz:300});
    R.label([x(.75)+.15,0,z],NAME[i],{al:'left',fs:12.5,b:1,mono:true,c:P.ink,a:Math.max(.4,a),grp:'rows'});
    let done=0;
    r.steps.forEach(s=>{if(s[0]>upto)return;done+=s[2];const len=Math.max(.02,s[1]*XS-.03),cx=x(s[0])+len/2+.015,ch=s[2],big=ch>1,h=big?.06+HMAX*ch/12000:.06;
      R.box([cx,0,z],[len,big?h:.06,.9],{fill:big?mix(P.paper,P.c4,.75):mix(P.paper,P.c6,.45),a,lw:.5,shadow:false});
      if(big&&a>.5&&upto>s[0]&&upto<s[0]+.06)R.flowArc([XP,HMAX*(12000-done+ch)/12000*.5+.05,z],[cx,h,z],.4,{c:P.c4,r:.045,n:4,speed:1.6,a:.75*a});
      // the users' tokens: every step that decodes ends with one token for each user, a dot on the stream in front of the lane
      if(s[3]>0&&s[0]+s[1]<=upto+1e-9)R.ball([x(s[0]+s[1]),.05,z+.62],.05,{c:P.c6,a})});
    if(arrive>0){const left=Math.max(0,12000-done),hp=HMAX*left/12000;
      if(hp>.01)R.box([XP,0,z],[.5,hp*arrive,.6],{fill:mix(P.paper,P.c4,.85),a:a*arrive,lw:.6});
      R.label([XP,hp*arrive,z],f(left,0)+' left',{dy:-11,fs:12,mono:true,c:P.c4,a:a*arrive})}
    if(hl){const g=r.steps.reduce((m,s)=>s[1]>m[1]?s:m,r.steps[0]),zf=z+.62;
      R.line([[x(g[0]),.12,zf],[x(g[0]+g[1]),.12,zf]],{c:P.bad,w:2.6,a:a*hl});
      R.label([(x(g[0])+x(g[0]+g[1]))/2,.12,zf],'longest gap '+f(g[1]*1e3,0)+' ms',{dy:16,fs:12.5,b:1,c:P.bad,a:a*hl});
      // time to the long prompt's first token, drawn on the floor behind the lane so nothing tall hides it
      if(sum)return;const zb=z-.5;R.line([[x(.2),.01,zb],[x(r.first),.01,zb]],{c:P.c4,w:2,a:a*hl,head:7});
      R.label([x(.2),.01,zb],'first token after '+f(r.ttft*1e3,0)+' ms',{al:'left',dy:-11,fs:12.5,b:1,c:P.c4,a:a*hl})}}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-3.4,3.4,.5);
    for(let t=.2;t<=.71;t+=R.W<520?.2:.1)R.label([x(t),0,ZR[2]+1.25],f(t,1)+' s',{dy:10,fs:12,mono:true,c:P.mute});
    const arrive=k>=1?at(k,e,1):0,focus=k===2?0:k===3?1:k===4?2:-1;
    const upto=i=>k<=1?.2:k>=5?.75:i===focus?lerp(.2,.75,e):i<focus?.75:.2;
    ROW.forEach((r,i)=>lane(R,i,k>=5||focus<0||i===focus?1:.3,upto(i),k>=5?e:i===focus?Math.max(0,e*2-1):0,arrive,k>=5));
  }
  const full={cam:[.16,.82],bounds:[[XP-.5,0,-2.9],[x(.75)+1.6,1.1,3.2]]};
  const st=S3.stage({id:'stg-ck',list:'sx-ck',fig:'Fig. 4 · one long prompt, eight decoding users, three budgets',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2200,hold:5200,draw,
    view:k=>k>=2&&k<=4?{cam:[.2,.72],bounds:[[XP-.5,0,ZR[k-2]-1.2],[x(.75)+1.6,1.1,ZR[k-2]+1.1]]}:full,
    margin:w=>w<520?[14,10,22,10]:[20,18,26,18]});
  (window.BKSTG=window.BKSTG||{})['stg-ck']=st;
})();
