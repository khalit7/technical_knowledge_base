// ---- Scene, section 2 (Fig. 2): NVIDIA Dynamo's KV-aware router choosing among three workers. The cost is Dynamo's formula (routing concepts doc):
// prefill weight x max(0, prompt blocks - cached blocks) + decode blocks carried + the request's own blocks, weight 1, no prefill in progress.
// One request with a 2,000-token prompt = 125 blocks of 16 tokens (one glass cell per block); worker A caches 112 of them. Loads are illustrative. ----
(function(){
  if(!document.getElementById('stg-rt')||!window.DDS)return;const {mix,lerp}=S3,{vis,gpu,lab}=DDS;
  const PB=125,OV=[112,0,0],L0=[150,100,200],LA2=230,X=[-3.4,0,3.4],NM=['A','B','C'];
  const cost=(w,la)=>Math.max(0,PB-OV[w])+(w===0?la:L0[w])+PB;
  window.DD_RT={PB,OV,L0,LA2,cost,cross:L0[1]+PB+PB-(PB-OV[0])-PB}; // A wins while its load is under this (212); checked by check_stages.mjs
  const PW=1.9,PD=.95,cw=PW/25,ch=PD/5,BH=.0036; // cost bars: BH world units per block
  function cells(R,x,n,c,a){ // n cached blocks fill the plate's 25 x 5 cells row by row
    const full=Math.floor(n/25),rest=n%25,z0=-PD/2;
    if(full)R.box([x,.24,z0+full*ch/2],[PW,.05,full*ch],{fill:c,a,shadow:false,lw:.6});
    if(rest)R.box([x-PW/2+rest*cw/2,.24,z0+full*ch+ch/2],[rest*cw,.05,ch],{fill:c,a,shadow:false,lw:.6})}
  function draw(R,k,e,st){const P=R.P,v=f=>vis(k,e,st,f);R.grid(-5.5,5.5,-2,4,.5);
    const la=k===4?lerp(L0[0],LA2,e):L0[0],win=k===4&&e>.5?1:0;
    const pick=k===3?0:k===4?(win?1:0):-1;
    // the request, in front
    const rq=k<=1?1:.6;R.glass([-PW/2,.02,3.1],[PW,0,0],[0,0,.38],{c:P.c2,a:rq,nu:25,nv:1});
    lab(R,[0,0,3.5],'new request · 125 blocks',{dy:16,b:1,c:P.c2,a:rq});
    // the workers: boards, their prefix caches (one glass cell per block), their decode loads (a column behind)
    const wa=v(q=>q>=1);
    X.forEach((x,w)=>{const chosen=w===pick;
      gpu(R,[x,0,0],[2.5,.22,1.5],{hl:chosen?P.acc:null,a:k===0?.45:1,die:false});
      lab(R,[x-1.25,0,.75],'worker '+NM[w],{al:'left',dy:16,b:1,c:chosen?P.acc:P.ink,a:k===0?.45:1});
      if(wa>0){R.glass([x-PW/2,.23,-PD/2],[PW,0,0],[0,0,PD],{c:P.mute,a:wa*.6,nu:25,nv:5,th:.02});
        if(OV[w])cells(R,x,OV[w],mix(P.paper,P.c5,.8),wa);
        lab(R,[x,.25,-PD/2],OV[w]?OV[w]+' cached':'none cached',{dy:-10,fs:12,b:OV[w]>0,c:OV[w]?P.c5:P.mute,a:wa*(k<=2?1:.6),wide:1});
        const l=w===0?la:L0[w],h=l*BH;R.box([x+.95,0,-1.25],[.4,h,.4],{fill:mix(P.paper,P.c1,.7),a:wa,lw:.7});
        lab(R,[x+.95,h,-1.25],Math.round(l)+' decode',{dy:-11,fs:12,c:P.c1,a:wa,wide:1})}});
    // the cost of each worker, a stacked bar in front of it: blocks still to compute, decode blocks carried, the request's own blocks
    const ca=v(q=>q>=2);
    if(ca>0)X.forEach((x,w)=>{const grow=k===2?e:1,segs=[[Math.max(0,PB-OV[w]),P.c2],[w===0?la:L0[w],P.c1],[PB,P.mute]];let y=0;const bx=x+.9,bz=1.3;
      segs.forEach(([n,c])=>{const h=n*BH*grow;if(h>.002)R.box([bx,y,bz],[.45,h,.45],{fill:mix(P.paper,c,.6),a:ca,lw:.6,shadow:y===0});y+=h});
      lab(R,[bx,y,bz],'cost '+Math.round(cost(w,la)*grow),{dy:-12,b:1,fs:13,c:w===pick?P.acc:P.ink,a:ca})});
    // the request goes to the cheapest worker
    const flowTo=(w,a)=>R.flowArc([0,.1,3.0],[X[w],.3,.7],.9,{c:P.c2,r:.08,n:9,speed:1.6,a});
    if(k===3)flowTo(0,e);
    if(k===4){flowTo(0,1-win*Math.min(1,(e-.5)*4));if(win)flowTo(1,Math.min(1,(e-.5)*3))}
  }
  const st=S3.stage({id:'stg-rt',list:'sx-rt',fig:'Fig. 2 · a KV-aware router weighs cache against load',cam:[.1,.82],bounds:[[-4.7,0,-1.5],[4.9,1.2,3.6]],aspect:.52,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.1,.7],bounds:[[-3,0,1.6],[3,.6,3.7]]}:null,margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  (window.DDSTG=window.DDSTG||{})['stg-rt']=st;
})();
