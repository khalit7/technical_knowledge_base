// ---- Scene (Fig. 5, stg-hv): Heavy, parallel attempts instead of one longer chain. Time runs along the floor, agents are lanes in depth.
// One block = 1,000 tokens = one unit of time (decoding at one token per unit, as in the page's earlier 2D animation). The agent counts (4 for
// low and medium effort, 16 for high and xhigh) and the billing rule are xAI's multi-agent docs; the 8,000 tokens per attempt and 2,000 for the
// leader are illustrative (window.XHV), since xAI publishes no per-agent token counts. ----
window.XHVS=(function(){if(!window.XHV)return null;const {A,S,N}=XHV;
  return N.map(n=>({n,billed:(n*A+S)*1000,par:A+S,ser:n*A+S,ratio:(n*A+S)/(A+S)}))})();
(function(){
  if(!document.getElementById('stg-hv')||!window.S3||!window.XHV)return;const {lerp,mix,cl}=S3,{A,S}=XHV,H=XHVS;
  const X0=-5.1,WID=10.2,CH=.24;
  // step 5 changes the whole picture (16 lanes, a new time scale): the old picture fades out fully before the new one fades in
  function draw(R0,k,e,st){const pk=st.pk;R0.grid(-6.6,5.8,-2.3,3.2,.5);
    if(((k===4)!==(pk===4))&&e<1)return e<.5?scene(R0,pk,1,pk,1-2*e):scene(R0,k,1,k,2*e-1);
    scene(R0,k,e,pk,1)}
  function scene(R0,k,e,pk,G){const R=G>=1?R0:Object.create(R0),P=R0.P,t=pk===k?1:e;
    // the options argument of each drawing call, whose alpha the fade scales
    if(G<1)Object.entries({box:2,label:2,flow:1,flowArc:3,glow:2,ball:2,line:1}).forEach(([m,ix])=>{const f=R0[m].bind(R0);
      R[m]=(...a)=>{const o=Object.assign({},a[ix]||{});o.a=(o.a==null?1:o.a)*G;a[ix]=o;return f(...a)}});
    const at=f=>lerp(f(pk),f(k),t);
    // the scale: one unit of time is WID/34 wide while the 34-unit chain is on show, WID/130 for 16 agents
    const U=at(s=>s===4?WID/130:WID/34),n=k===4?16:4,pz=at(s=>s===4?.17:.5),dp=at(s=>s===4?.12:.3);
    const x=u=>X0+u*U,laneZ=j=>-1.6+j*pz,LZ=laneZ(n)+.05,CZ=at(s=>s===4?1.95:s===3?1.35:1.35),AZ=at(s=>s>=3?CZ+.5:LZ+.65);
    const blk=(u,z,c,a,on)=>R.box([x(u+.5),0,z],[Math.max(.02,U*.84),CH,dp],on?{fill:mix(P.paper,c,.75),a,shadow:false,lw:.5}:{fill:P.paper,fa:.15,ea:.4,a:a*.6,shadow:false,lw:.5});
    // progress within the run: agents' blocks written so far, the leader's, the chain's
    const fill=k===1?e*A:k>=2?A:0,lead=k===2?e*S:k>=3?S:0,pA=at(s=>s===3?.3:s===2?.55:1),lA=at(s=>s===3?.35:1);
    const nn=k===4?16:4;
    for(let j=0;j<nn;j++){const z=laneZ(j);for(let u=0;u<A;u++)blk(u,z,P.c1,pA,u<fill||k===4)}
    for(let u=0;u<S;u++)blk(A+u,LZ+.15,P.c2,lA,u<lead||k===4);
    // the query, fanned out to every agent; the attempts streaming along their lanes; the leader gathering them; the answer
    const Q=[X0-1.0,.25,(laneZ(0)+laneZ(nn-1))/2];R.glow(Q,.14,{c:P.ink,a:.6});R.ball(Q,.07,{c:P.ink});
    if(k===0||k===4)for(let j=0;j<nn;j++)R.flowArc(Q,[x(0),CH,laneZ(j)],.12,{c:P.ink,a:.75,r:.045,n:4,speed:.9});
    if(k===1)for(let j=0;j<nn;j++)R.flow([[x(0),CH+.03,laneZ(j)],[x(Math.max(.3,fill)),CH+.03,laneZ(j)]],{c:P.c1,a:.85,r:.05,speed:1});
    if(k===2||k===4)for(let j=0;j<nn;j++)R.flowArc([x(A),CH,laneZ(j)],[x(A+.5),CH,LZ+.15],.1,{c:P.c2,a:.8,r:.045,n:4,speed:.8});
    const ANS=[x(A+S)+.3,.2,LZ+.15];if(k>=2){R.glow(ANS,.14,{c:P.c2,a:.7*(k===2?e:1)});R.ball(ANS,.07,{c:P.c2,a:k===2?e:1})}
    // the same tokens as one chain, in front
    const cA=at(s=>s>=3?1:0);
    if(cA>.01){const tot=H[k===4?1:0].ser,done=k===3&&pk!==3?e*tot:tot;
      for(let u=0;u<tot;u++)blk(u,CZ,u<tot-S?P.c1:P.c2,cA,u<done);
      if(k===3)R.flow([[x(0),CH+.03,CZ],[x(Math.max(.5,done)),CH+.03,CZ]],{c:P.c1,a:.85,r:.05,speed:1.6})}
    // the time axis along the front, with the units that matter
    const ph=R0.W<520,ticks=k===4?(ph?[0,130]:[0,10,50,100,130]):k===3?(ph?[0,10,34]:[0,10,20,34]):(ph?[0,10]:[0,8,10]);
    R.line([[x(0),0,AZ],[x(ticks[ticks.length-1]),0,AZ]],{c:P.mute,w:1.2});
    ticks.forEach(v=>{R.line([[x(v),0,AZ-.07],[x(v),0,AZ+.07]],{c:P.mute,w:1.2});R.label([x(v),0,AZ+.08],v===ticks[ticks.length-1]?v+' units':String(v),{mono:true,fs:12,dy:13,c:P.mute})});
    // labels
    const h=H[k===4?1:0];
    if(k<4){for(let j=0;j<4;j++)R.label([x(0)-.08,CH/2,laneZ(j)],'agent '+(j+1),{al:'right',dx:-4,fs:12,c:P.c1,a:pA,grp:'ln'});
      R.label([x(0)-.08,CH/2,LZ+.15],'leader',{al:'right',dx:-4,fs:12,b:1,c:P.c2,a:lA,grp:'ln'})}
    else{R.label([x(A+S),CH,laneZ(8)],'16 agents · '+fmt(h.billed)+' tokens billed · done at '+h.par,{al:'left',dx:12,dy:-10,fs:12.5,b:1,mono:true,c:P.c1,wide:1})}
    if(k===1)R.label([x(A),CH,laneZ(1.5)],fmt(4*A*1000)+' tokens in '+A+' units',{al:'left',dx:14,fs:12.5,b:1,mono:true,c:P.c1,a:e,wide:1});
    if(k===2)R.label(ANS,'answer · '+fmt(H[0].billed)+' billed · '+H[0].par+' units',{al:'left',dx:16,fs:12.5,b:1,mono:true,c:P.c2,a:e,wide:1});
    if(k===3){R.label([x(0)-.08,CH/2,CZ],'one chain',{al:'right',dx:-4,fs:12,b:1,c:P.ink});R.label([x(H[0].ser),CH,CZ-dp/2],fmt(H[0].billed)+' tokens · '+H[0].ser+' units · '+H[0].ratio.toFixed(1)+'× the wait',{al:'right',dy:-14,fs:12.5,b:1,mono:true,c:P.ink,a:e,wide:1})}
    if(k===4){R.label([x(0)-.08,CH/2,CZ],'one chain',{al:'right',dx:-4,fs:12,b:1,c:P.ink});R.label([x(H[1].ser),CH,CZ-dp/2],'the same '+fmt(H[1].billed)+' as one chain · '+H[1].ser+' units · '+H[1].ratio+'×',{al:'right',dy:-14,fs:12.5,b:1,mono:true,c:P.ink,wide:1})}
  }
  S3.stage({id:'stg-hv',list:'sx-hv',fig:'Fig. 5 · Heavy: same tokens billed, a fraction of the wait',cam:[0,.85],bounds:[[-6.3,0,-1.9],[5.3,.4,2.6]],aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,24,18,60],
    view:k=>k<=2?{cam:[0,.8],bounds:[[-6.4,0,-1.9],[.6,.4,1.3]]}:null});
})();
