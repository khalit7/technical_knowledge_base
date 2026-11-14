// ---- Scene (hero, Fig. 1): RRSI's selection rules on the authors' released coding run (renderer v2: glass sheets, flows, camera per step) ----
// Every number is read here from window.RUNS (the released run records, coding with Claude Opus 4.8: 20 rounds, 2 candidates a round,
// δ = 0.03406 of 178 trials) and from Table 2 (PAPER.tables.t2). Space: rounds across (x), passes of 178 up (y, the floor of the scene is
// 122 passes), policy tokens per trial into the depth (z, cheaper in front). A ball is one recorded candidate, coloured by its recorded
// verdict; a white pillar is the incumbent after a kept edit. The floor sheet is S* − δ (purple glass), the band sheet the incumbent + δ
// (gold), the wall the incumbent's tokens (teal). window.LOOPDATA exposes the numbers the step list states, so src/check_stages.mjs can
// compare them.
(function(){
  if(!document.getElementById('stg-loop')||!window.RUNS)return;const {at,mix}=S3;
  const r=window.RUNS.runs.find(x=>x.id==='coding_opus'),D=r.delta*r.denom,T=r.traj,N=T.length-1;
  const RS=rounds(r);
  // per candidate column j (the candidates of round j−1, drawn at x(j)): the incumbent and the running best they were judged against
  const inc=[],best=[];{let b=T[0][1];for(let j=1;j<=N;j++){inc[j]=T[j-1];best[j]=b;b=Math.max(b,T[j][1])}}
  const C=[];RS.forEach((R,i)=>R.cs.forEach((c,q)=>C.push({c,j:i+1,q,n:R.cs.length,below:c.n!=null&&c.n<best[i+1]-D})));
  const meas=C.filter(x=>x.c.n!=null),kept=C.filter(x=>x.c.st==='accepted'),below=meas.filter(x=>x.below),cost=C.filter(x=>x.c.st==='rejected_cost');
  const dis=RS.filter(R=>{const gp=greedyPick(R),won=R.cs.find(c=>c.st==='accepted');return !((gp&&won&&gp.id===won.id)||(!gp&&!won))});
  const t2=PAPER.tables.t2.rows,row=s=>t2.find(x=>x[0].startsWith(s)).slice(1).map(Number),H0=row('H0'),UN=row('Unregularized'),RR=row('RRSI');
  const TR=[['evolve',UN[0]-H0[0],RR[0]-H0[0],' pts'],['OOD average',UN[2]-H0[2],RR[2]-H0[2],' pts'],['tokens',100*(UN[3]/H0[3]-1),100*(RR[3]/H0[3]-1),'%']];
  window.LOOPDATA={delta:+D.toFixed(1),evaluated:meas.length,below:below.length,belowRec:C.filter(x=>x.c.st==='rejected_floor').length,cost:cost.length,
    kept:kept.map(x=>x.c.id),traj:T.map(p=>[p[1],Math.round(p[2]/1e3)]),dis:dis.map(R=>R.t),offScale:meas.filter(x=>x.c.n<122).map(x=>x.c.id),
    trade:TR.map(t=>[+t[1].toFixed(1),+t[2].toFixed(1)])};
  const ZM=1.4,X=j=>(j-10)*.52,Y=n=>Math.max(.03,(n-122)*.15),Z=c=>Math.max(-ZM,Math.min(ZM,(560000-c)/1e5*.8));
  const cx=x=>X(x.j)+(x.n>1?(x.q?.11:-.11):0),pos=x=>[cx(x),Y(x.c.n),Z(x.c.C)];
  const colOf=(P,st)=>st==='accepted'?P.c1:st==='rejected_floor'?P.c4:st==='rejected_cost'?P.c2:P.mute;
  const k0=p=>Math.round(p/1e3)+'k';
  // horizontal glass over runs of equal value: f(j) gives the height for column j
  function sheets(R,f,o,j0,j1){let s=j0;for(let j=j0+1;j<=j1+1;j++){if(j>j1||Math.abs(f(j)-f(s))>1e-9){const x0=X(s)-.26,x1=X(j-1)+.26;
      if(o.wall)R.glass([x0,Y(o.wall[0](s)),f(s)],[x1-x0,0,0],[0,Y(o.wall[1](s))-Y(o.wall[0](s)),0],{c:o.c,a:o.a,nu:Math.max(1,j-s),nv:3,th:.02});
      else R.glass([x0,Y(f(s)),-ZM],[x1-x0,0,0],[0,0,2*ZM],{c:o.c,a:o.a,nu:Math.max(1,j-s),nv:4,th:.02});s=j}}}
  function pillar(R,j,a,lab){const p=T[j];R.box([X(j),0,Z(p[2])],[.26,Y(p[1]),.26],{a});
    if(lab)R.label([X(j),Y(p[1]),Z(p[2])],p[1]+' · '+k0(p[2]),{mono:true,fs:12,b:1,dy:-12,c:R.P.ink,a:Math.min(1,a*1.4)})}
  function path(R,a,upto,j0){const pts=[];for(let j=j0||0;j<=upto;j++){const p=T[j];pts.push([X(j),Y(p[1]),Z(p[2])]);if(j<upto){const q=T[j];pts.push([X(j+1),Y(q[1]),Z(q[2])])}}R.line(pts,{c:R.P.ink,w:2,a})}
  const changes=[0].concat(T.map((p,j)=>j).filter(j=>j>0&&(T[j][1]!==T[j-1][1]||T[j][2]!==T[j-1][2])));
  function axes(R,a,fullv){const P=R.P;[125,130,135,140,145].forEach(n=>{R.line([[X(0)-.5,Y(n),-ZM],[X(0)-.35,Y(n),-ZM]],{c:P.mute,w:1,a});R.label([X(0)-.5,Y(n),-ZM],String(n),{mono:true,fs:12,al:'right',dx:-4,c:P.mute,a,grp:'ax'})});
    R.line([[X(0)-.42,0,-ZM],[X(0)-.42,Y(146),-ZM]],{c:P.mute,w:1,a});
    R.label([X(0)-.42,Y(146),-ZM],'passes of 178',{mono:true,fs:12,dy:-12,c:P.mute,a,wide:1});
    if(fullv)[0,5,10,15,20].forEach(j=>R.label([X(j),0,ZM+.1],j?'round '+j:'start',{mono:true,fs:12,dy:14,c:P.mute,a,wide:1}));
    R.label([X(0)-1,0,.2],'tokens: cheaper in front',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,a,wide:1})}
  function balls(R,f){C.forEach(x=>{if(x.c.n==null)return;const o=f(x);if(!o||o.a<=.01)return;const p=pos(x),P=R.P,c=o.c||colOf(P,x.c.st);
    R.line([[p[0],0,p[2]],p],{c,w:1,a:o.a*.35});R.ball(p,o.r||.085,{c,a:o.a});if(o.glow)R.glow(p,.32,{c:o.glow,a:o.a});
    if(o.lab)R.label(p,o.lab,{mono:true,fs:12,b:1,dy:o.dy||-14,al:o.al||'center',c,a:o.a,wide:o.wide})})}
  function gates(R,a){C.forEach(x=>{if(x.c.n!=null)return;R.box([cx(x),0,ZM-.1],[.13,.13,.13],{fill:mix(R.P.paper,R.P.mute,.35),a})})}
  const byId=id=>C.find(x=>x.c.id===id);
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-1.6,1.6,.52);
    const fade=k===5?Math.max(0,1-2*e):1,show=k===5?Math.max(0,2*e-1):0;
    if(fade>0){axes(R,k===2||k===3?0:fade*.9,k===1||k===4);
      // 1. round 0: two candidates from the base harness
      if(k===0){pillar(R,0,1,true);R.label([X(0),0,Z(T[0][2])],'H₀',{serif:true,fs:14,b:1,dy:14,c:P.ink});sheets(R,j=>best[j]-D,{c:P.c4,a:.55},1,1);sheets(R,j=>inc[j][1]+D,{c:P.c5,a:.35},1,1);
        R.label([X(1)+.3,Y(best[1]-D),-ZM],'floor S* − δ',{mono:true,fs:12,al:'left',dx:6,c:P.c4,grp:'s'});R.label([X(1)+.3,Y(inc[1][1]+D),-ZM],'band: incumbent + δ',{mono:true,fs:12,al:'left',dx:6,c:P.c5,grp:'s'});
        const A=byId('r0A'),B=byId('r0B');[A,B].forEach(x=>R.flowArc([X(0),Y(T[0][1])+.05,Z(T[0][2])],pos(x),.35,{c:P.ink,a:Math.min(1,e*2)*.7,r:.05,n:6,speed:1.3}));
        balls(R,x=>x.j===1?{a:Math.min(1,e*1.5),r:.11,lab:x.c.id+' '+x.c.n+' · '+k0(x.c.C),dy:x.q?16:-16,al:x.q?'left':'right'}:null);
        if(e>.6){const a=(e-.6)/.4;pillar(R,1,a,false);R.flowArc(pos(A),[X(1),Y(T[1][1]),Z(T[1][2])],.15,{c:P.c1,a,r:.06,n:4})}}
      // 2. every measured candidate; the floor steps up with the running best
      if(k===1){changes.forEach(j=>pillar(R,j,.35));path(R,.5,N);sheets(R,j=>best[j]-D,{c:P.c4,a:.6},1,N);gates(R,.6);
        balls(R,x=>({a:Math.min(1,e*1.4+.1),r:x.below?.095:.08,c:x.below?P.c4:mix(P.paper,P.ink,.35)}));
        R.label([X(N)+.3,Y(best[N]-D),-ZM],'floor ' + (best[N]-D).toFixed(1),{mono:true,fs:12,al:'left',dx:6,c:P.c4,b:1});
        R.label([X(10),Y(146),-ZM],below.length+' of '+meas.length+' under the floor',{mono:true,fs:13,b:1,dy:-16,c:P.c4,a:e,wide:1})}
      // 3. inside the band: the token wall decides
      if(k===2){changes.forEach(j=>pillar(R,j,j>=2&&j<=12?1:.3,false));path(R,.7,N,6);
        const j0=8;sheets(R,j=>best[j]-D,{c:P.c4,a:.35},j0,N);sheets(R,j=>inc[j][1]+D,{c:P.c5,a:.2},j0,N);
        sheets(R,j=>Z(inc[j][2]),{c:P.c6,a:.32*Math.min(1,e*2),wall:[j=>best[j]-D,j=>inc[j][1]+D]},j0,N);
        balls(R,x=>x.j<j0?{a:.15}:x.c.st==='accepted'&&x.j<20?{a:1,r:.12,glow:P.c1,lab:R.W<520?x.c.id:x.c.id+' '+x.c.n+', tokens '+(x.c.dC>=0?'+':'−')+Math.abs(Math.round(x.c.dC*100))+'%',al:'right',dy:-16}:x.c.st==='rejected_cost'?{a:1,r:.1,lab:x.c.id==='r18A'?(R.W<520?'r18A':'r18A 140, tokens +'+Math.round(x.c.dC*100)+'%'):null,dy:-16}:{a:.25});
        ['r7A','r11B'].forEach(id=>{const x=byId(id);R.flowArc(pos(x),[X(x.j),Y(T[x.j][1]),Z(T[x.j][2])],.12,{c:P.c1,a:Math.min(1,e*2),r:.06,n:4})});
        R.label([X(N)+.3,Y(best[N]-D),-ZM],'floor stays 133.9',{mono:true,fs:12,al:'left',dx:6,c:P.c4,grp:'s3'});R.label([X(N)+.3,Y(inc[N][1]+D),-ZM],'band top',{mono:true,fs:12,al:'left',dx:6,c:P.c5,grp:'s3'})}
      // 4. above the band: the last round
      if(k===3){changes.forEach(j=>pillar(R,j,j>=12?1:.3,j===12));path(R,.7,N,12);sheets(R,j=>best[j]-D,{c:P.c4,a:.4},17,N);sheets(R,j=>inc[j][1]+D,{c:P.c5,a:.45},17,N);
        const A=byId('r19B');balls(R,x=>x.j<17?{a:.12}:x===A?{a:1,r:.13,glow:P.c1,lab:'r19B 144 · '+k0(A.c.C),al:'right',dy:-16}:{a:.45});
        R.flowArc([X(N-1)+.1,Y(T[N-1][1])+.05,Z(T[N-1][2])],pos(A),.3,{c:P.ink,a:.6,r:.05,n:5,speed:1.3});
        if(e>.4){const a=Math.min(1,(e-.4)/.4);pillar(R,N,a,false);R.flowArc(pos(A),[X(N),Y(T[N][1]),Z(T[N][2])],.15,{c:P.c1,a,r:.06,n:4})}}
      // 5. keep the best score on the same candidates
      if(k===4||k===5){changes.forEach(j=>pillar(R,j,.5*fade,false));path(R,.6*fade,N);sheets(R,j=>best[j]-D,{c:P.c4,a:.3*fade},1,N);
        const pick=new Set(dis.map(R0=>{const g=greedyPick(R0);return g&&g.id}).filter(Boolean)),refuse=new Set(dis.filter(R0=>!greedyPick(R0)).map(R0=>R0.cs.find(c=>c.st==='accepted').id));
        balls(R,x=>pick.has(x.c.id)?{a:fade,r:.12,glow:P.c2,wide:1,lab:k===4?x.c.id+' +'+(x.c.n-inc[x.j][1]):null}:refuse.has(x.c.id)?{a:fade,r:.12,glow:P.c1,wide:1,lab:k===4?x.c.id+' kept':null,dy:16}:{a:.18*fade});
        if(k===4)R.label([X(10),Y(146),-ZM],'keep the best score: '+dis.length+' of '+RS.length+' rounds differ',{mono:true,fs:13,b:1,dy:-14,c:P.c2,a:e,wide:1})}}
    // 6. the trade on Table 2 (agentic workspace): signed change from the unevolved harness, unregularised against RRSI
    if(show>0){const xs=[-3.3,0,3.3],ZP=.4,y=.35;
      TR.forEach((t,i)=>{const sc=t[3]==='%'?1.5/150:1.5/4;R.box([xs[i],y-.05,ZP],[2.1,.05,.8],{shadow:false,a:show});[-1,1].forEach(sx=>R.box([xs[i]+sx*.95,0,ZP],[.05,y-.05,.05],{a:show}));
        R.label([xs[i],0,ZP+.45],t[0],{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a:show});
        [[t[1],P.c2,'unreg.'],[t[2],P.c1,'RRSI']].forEach(([v,c,nm],q)=>{const bx=xs[i]+(q?.45:-.45),h=Math.max(.02,Math.abs(v)*sc*show);
          R.box([bx,v>=0?y:y-.05-h,ZP],[.55,h,.4],{fill:c,a:show,shadow:false});
          R.label([bx,v>=0?y+h:y,ZP],(v>=0?'+':'−')+Math.abs(v).toFixed(t[3]==='%'?0:1)+t[3],{mono:true,fs:12.5,b:1,dy:-12,c,a:show});
          R.label([bx,y-.05,ZP+.2],nm,{mono:true,fs:12,dy:13,c,a:show,wide:1})})});
      R.label([0,2.7,ZP],'change from the unevolved harness H₀ (Table 2)',{mono:true,fs:13,b:1,c:P.ink,a:show,wide:1})}
  }
  const full={cam:[.18,.4],bounds:[[-6,0,-1.5],[6,3.7,1.5]]};
  S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 1 · the released coding run (Opus), every candidate',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,22,8]:[20,16,30,50],
    view:k=>k===0?{cam:[.3,.35],bounds:[[X(0)-1,0,-1.4],[X(2)+1.2,3,1.4]]}:k===2?{cam:[.12,.45],bounds:[[X(7)-.3,0,-1.4],[X(20)+.6,3.6,1.4]]}:k===3?{cam:[.3,.35],bounds:[[X(16)-.3,0,-1.4],[X(20)+1,3.6,1.4]]}:k===5?{cam:[.15,.38],bounds:[[-4.6,0,-.2],[4.6,2.9,1.2]]}:full});
})();
