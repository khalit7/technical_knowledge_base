// ---- Scene (stg-qk): QK-Clip on one attention layer's eight heads (renderer v2). Each head's max logit S is a column; the threshold tau = 100
// (K2's) is a grey glass plane; each head's weights are glass plates in front of it: content query, content key, rotary query (head-specific)
// and the rotary key behind them, shared by every head. The per-head maxima are illustrative (the same eight as the page's earlier widget);
// gamma = min(1, tau / S), its square root and the naive whole-layer factor are computed here and exposed as window.KM_QK for the checks. ----
(function(){
  if(!document.getElementById('stg-qk'))return;const {lerp,mix}=S3;
  const S=[42,88,150,64,230,97,120,31],TAU=100,N=S.length,GROW=8; // GROW: illustrative growth of the offending heads without a clip
  const g=S.map(v=>Math.min(1,TAU/v)),gAll=Math.min(1,TAU/Math.max(...S)),hot=S.map(v=>v>TAU);
  const healthy=S.filter(v=>v<=TAU),lossAll=1-gAll;
  window.KM_QK={S,TAU,g,gAll,lossAll,sel:2};
  const X=i=>(i-(N-1)/2)*1.1,ZP=1.05,ZR=2.0,CW=.62,PH=.62;
  // what each step shows (helpers from the DeepSeek scenes): a value interpolates from the previous step's to this step's;
  // a label belonging to one step fades out in the first half of a transition and the new one fades in during the second
  const vis=(k,e,st,f)=>{const a=f(st.pk),b=f(k);return e>=1||a===b?b:lerp(a,b,e)};
  const lab=(k,e,st,f)=>{const a=f(st.pk),b=f(k);if(e>=1||a===b)return b;return a>b?Math.max(b,a*(1-2*e)):b*Math.max(0,2*e-1)};
  const val=(s,i)=>s===1&&hot[i]?S[i]*GROW:s===4?S[i]*g[i]:s===5?S[i]*gAll:S[i];
  const SC=s=>s===1?1/650:1/100;            // world units per unit of logit: step 2 pulls back to fit the growth
  const fq=(s,i)=>s===4?Math.sqrt(g[i]):s===5?Math.sqrt(gAll):1, fr=(s,i)=>s===4?g[i]:s===5?gAll:1; // plate scale factors
  function draw(R,k,e,st){const P=R.P;R.grid(-5,5,-1.4,2.6,.5);
    const sc=vis(k,e,st,SC),HOT=P.c5,OK=P.acc;
    // the threshold plane
    const ty=TAU*sc;R.glass([-4.7,ty,-.55],[9.4,0,0],[0,0,1.1],{c:P.mute,a:.55,nu:12,nv:2,th:.02});R.line([[-4.7,ty,.56],[4.7,ty,.56]],{c:P.ink,w:1.6,dash:[6,4],a:.8,top:1});
    R.label([-4.7,ty,-.55],'τ = '+TAU,{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.ink,grp:'L'});
    // the ruler on the left, relabelled when step 2 pulls back
    const tk=lab(k,e,st,s=>s===1||s===3?0:1),tk2=lab(k,e,st,s=>s===1?1:0);
    if(tk>.01)[200].forEach(v=>{R.line([[-4.7,v*sc,-.55],[4.7,v*sc,-.55]],{c:P.line,w:1,a:tk});R.label([-4.7,v*sc,-.55],String(v),{al:'right',dx:-8,mono:true,fs:12,c:P.mute,a:tk})});
    if(tk2>.01)[1000,1500].forEach(v=>{R.line([[-4.7,v*sc,-.55],[4.7,v*sc,-.55]],{c:P.line,w:1,a:tk2});R.label([-4.7,v*sc,-.55],v.toLocaleString('en-GB'),{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:tk2})});
    for(let i=0;i<N;i++){const h=Math.max(.02,vis(k,e,st,s=>val(s,i)*SC(s))),x=X(i); // the drawn height eases directly, so a column never overshoots while the scale changes
      const isHot=k===5?true:k>=4?false:hot[i]||(k===1&&hot[i]);
      const fill=k===5&&!hot[i]?mix(P.paper,OK,.55):isHot&&k<4?mix(P.paper,HOT,.8):mix(P.paper,OK,.7);
      const a=k===3?(i===2?1:.06):1;
      R.box([x,0,0],[CW,h,CW],{fill,a});
      // the height it had before the clip, as a dashed ghost
      if(k>=4&&(hot[i]||k===5)){const h0=S[i]*sc,ga=vis(k,e,st,s=>s>=4?1:0);R.box([x,0,0],[CW+.04,h0,CW+.04],{fa:0,a:ga*.7,shadow:false,lw:.8})}
      R.label([x,0,ZP+.35],'h'+(i+1),{mono:true,fs:12,dy:8,c:P.mute,a:k===3?(i===2?1:0):1});
      // the number above each column, for the steps that name it
      const nv=lab(k,e,st,s=>s===0||s===4||s===5?1:0);
      if(nv>.01&&k!==1){const vv=val(k===st.pk||e>=1?k:(e<.5?st.pk:k),i);R.label([x,h,0],(Math.round(vv*10)/10).toString(),{mono:true,fs:12.5,dy:-12,b:hot[i]||k===5,c:P.ink,a:nv})}
      const gv=lab(k,e,st,s=>s===2?1:0);if(gv>.01&&hot[i])R.label([x,S[i]*sc,0],'γ '+g[i].toFixed(3),{mono:true,fs:12.5,dy:-12,b:1,c:mix(HOT,P.ink,.35),a:gv});
      // the head's own weights in front: content query and key (scaled by the square root of gamma), rotary query (by gamma)
      const pa=vis(k,e,st,s=>s===0?.9:s===1?.25:s===3?(i===2?1:.05):s===2?(hot[i]?1:.3):.85);
      const qf=vis(k,e,st,s=>fq(s,i)),rf=vis(k,e,st,s=>fr(s,i));
      [[-.25,P.q,qf],[0,P.k,qf],[.25,mix(P.q,P.paper,.35),rf]].forEach(([dx,c,f])=>R.glass([x+dx-.09,.04,ZP],[.18,0,0],[0,PH*f,0],{c,a:pa,nu:1,nv:3,th:.03}));
      // forward pass: query and key meet in the logit (step 1); the measured maximum goes back to the weights (step 3)
      if(k===0)R.flowArc([x,.4,ZP],[x,Math.max(.1,S[i]*sc*.8),CW/2],.25,{c:P.q,a:.75,r:.05,n:4,speed:1.1});
      if(k===2&&hot[i])R.flowArc([x,S[i]*sc,0],[x,PH+.06,ZP],.35,{c:mix(HOT,P.ink,.45),a:.9,r:.06,n:6,speed:1.2})}
    // the rotary key: one plate behind the row of heads' plates, shared by all eight, never scaled
    const ra=vis(k,e,st,s=>s===3?1:s===1?.2:.55);
    R.glass([X(0)-.4,.04,ZR],[X(N-1)-X(0)+.8,0,0],[0,.3,0],{c:mix(P.k,P.paper,.3),a:ra,nu:N,nv:1,th:.03});
    // labels on the left for the plates, and the zoomed head's factors
    const pl=lab(k,e,st,s=>s===3?0:s===1?0:1);
    if(pl>.01){R.label([X(0)-.4,.35,ZP],'Wq, Wk, rotary Wq per head',{al:'right',dx:-8,fs:12,c:P.mute,a:pl,grp:'L'});
      R.label([X(0)-.4,.18,ZR],'rotary key · shared',{al:'right',dx:-8,fs:12,c:P.mute,a:pl,grp:'L'})}
    const zl=lab(k,e,st,s=>s===3?1:0);
    if(zl>.01){const x=X(2),xr=x+1.0,c1=mix(P.k,P.ink,.25),c2=mix(P.q,P.ink,.25),c3=mix(P.k,P.ink,.35);
      // labels to the right of h3, each with a thin leader back to its plate
      [[[x-.25,PH,ZP],[xr,1.75,ZP],'content q ×'+Math.sqrt(g[2]).toFixed(3),P.q],[[x,PH,ZP],[xr,1.45,ZP],'content k ×'+Math.sqrt(g[2]).toFixed(3),c1],
       [[x+.25,PH,ZP],[xr,1.15,ZP],'rotary q ×'+g[2].toFixed(3),c2],[[x+.5,.3,ZR],[xr,.55,ZR],'shared rotary key ×1',c3]].forEach(([a,b,t,c])=>{
        if(R.W>=520)R.line([a,b],{c,w:1,a:zl*.7,top:1});R.label(b,t,{al:'left',dx:6,fs:12.5,b:1,c,a:zl,wide:1})});
      R.label([x-.31,S[2]*sc,0],'S = '+S[2]+' · γ = '+g[2].toFixed(3),{al:'right',dx:-10,fs:12.5,b:1,c:mix(HOT,P.ink,.35),a:zl,wide:1})}
    const nl=lab(k,e,st,s=>s===5?1:0);
    if(nl>.01)R.label([X(N-1)+.4,TAU*sc*.5,0],'every head ×'+gAll.toFixed(3),{al:'left',dx:10,fs:12.5,b:1,c:P.ink,a:nl,grp:'R'});
  }
  const full={cam:[.26,.44],bounds:[[-5.1,0,-.6],[5.1,2.35,2.2]]};
  S3.stage({id:'stg-qk',list:'sx-qk',fig:'QK-Clip · eight heads of one layer, illustrative maxima',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,8,14,8]:[18,20,14,130],
    view:k=>k===1?{cam:[.26,.38],bounds:[[-5.1,0,-.6],[5.1,3.1,2.2]]}:k===3?{cam:[.42,.4],bounds:[[X(2)-2.2,0,-.6],[X(2)+2.6,1.9,2.3]]}:full});
})();
