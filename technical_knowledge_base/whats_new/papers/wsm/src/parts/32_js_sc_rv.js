// ---- Scene (Why averaging stands in for decay, Fig. 2): the paper's river-valley picture (§4.4) as a canyon in 3D, with the same noise
// through a WSD branch and a WSM branch (renderer v2). Illustrative toy, the old 2D animation's exactly: plain SGD on L(x, y) = ½(y² + 0.02(x − 4)²),
// gradient noise of standard deviation 2 across the valley and 0.1 along it, LR 0.3, 60 shared steps then an 80-step branch, a checkpoint every
// 10 steps, the mean of the last 8; noise draw 170 shown, averages over draws 1 to 200. Height is √L, so the floor and the walls both read.
// The 140 steps play as five explained stretches (the long-replay rule); a live counter under the stage follows the step.
(function(){
  if(!document.getElementById('stg-rv')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const A=1,B=.02,XS=4,ETA=.3,SX=.1,SY=2,N1=60,N2=80,CK=10,NM=8;
  const L=(x,y)=>.5*(A*y*y+B*(x-XS)*(x-XS));
  let noise;
  function draws(seed){const r=mulberry32(seed),gs=()=>{let u=0;while(!u)u=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*r())};
    noise=[];for(let i=0;i<N1+N2;i++)noise.push([gs()*SX,gs()*SY])}
  function sim(mode){let x=-4,y=1.5;const path=[[x,y]],lr=[];
    for(let s=0;s<N1+N2;s++){const e=s<N1?ETA:mode==='wsd'?ETA*(1-Math.sqrt((s-N1+1)/N2)):ETA;lr.push(e);
      x-=e*(B*(x-XS)+noise[s][0]);y-=e*(A*y+noise[s][1]);path.push([x,y])}
    const ck=[];for(let b=CK;b<=N2;b+=CK)ck.push(path[N1+b]);return {path,lr,ck}}
  const avgPt=cs=>[cs.reduce((a,p)=>a+p[0],0)/cs.length,cs.reduce((a,p)=>a+p[1],0)/cs.length];
  // 200 noise draws for the averages in the last step, then the draw shown (170, a typical one)
  const avg=[0,0,0];let mWins=0;
  for(let sd=1;sd<=200;sd++){draws(sd);const a=sim('wsd'),b=sim('wsm'),m=avgPt(b.ck.slice(-NM)),v=[L(...a.path[N1+N2]),L(...m),L(...b.path[N1+N2])];v.forEach((x,i)=>avg[i]+=x/200);if(v[1]<v[0])mWins++}
  draws(170);
  const S={wsd:sim('wsd'),wsm:sim('wsm')},mg=avgPt(S.wsm.ck.slice(-NM)),fin={wsd:S.wsd.path[N1+N2],wsm:mg,live:S.wsm.path[N1+N2]};
  const D=window.WSM_RV={draw:{wsd:L(...fin.wsd),merged:L(...mg),live:L(...fin.live)},avg:{wsd:avg[0],merged:avg[1],live:avg[2]},mWins};
  // the step list's numbers are written from these runs
  const set=(k,v)=>document.querySelectorAll('[data-rv="'+k+'"]').forEach(e=>e.textContent=v);
  set('dw',D.draw.wsd.toFixed(3));set('dm',D.draw.merged.toFixed(3));set('dl',D.draw.live.toFixed(3));set('aw',avg[0].toFixed(3));set('am',avg[1].toFixed(3));set('al',avg[2].toFixed(3));set('n',mWins);
  // the canyon: a mesh over the toy's box, height √L
  const bx=[-4.4,1.2],by=[-2.6,2.6],XC=-1.6,WX=1.32,WZ=.62,HT=1.3,LM=L(bx[0],by[0]);
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),hh=(x,y)=>HT*Math.sqrt(L(x,y)/LM);
  const pt=(x,y,lift)=>{x=cl(x,bx[0],bx[1]);y=cl(y,by[0],by[1]);return [(x-XC)*WX,hh(x,y)+(lift||0),-y*WZ]};
  const cells=[],nx=36,ny=18;for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const x0=bx[0]+(bx[1]-bx[0])*i/nx,x1=bx[0]+(bx[1]-bx[0])*(i+1)/nx,y0=by[0]+(by[1]-by[0])*j/ny,y1=by[0]+(by[1]-by[0])*(j+1)/ny;
    const q=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>pt(x,y));cells.push({q,t:Math.min(1,(q[0][1]+q[2][1])/2/HT)})}
  function trail(R,path,from,to,c,o){o=o||{};const a=o.a==null?1:o.a;if(a<=.01||to<=from)return null;const n=Math.floor(to),u=to-n,pts=[];
    for(let s=from;s<=n;s++)pts.push(pt(path[s][0],path[s][1],.03));
    if(u>0&&n<path.length-1){const p=pt(path[n][0],path[n][1],.03),q=pt(path[n+1][0],path[n+1][1],.03);pts.push([lerp(p[0],q[0],u),lerp(p[1],q[1],u),lerp(p[2],q[2],u)])}
    if(pts.length>1)R.line(pts,{c,w:o.w||1.8,a,top:1});const end=pts[pts.length-1];
    if(o.flow&&pts.length>3)R.flow(pts.slice(-Math.min(pts.length,8)),{c,a:a*.9,r:.045,speed:1.3,n:5,top:1});
    if(o.ball!==false){R.glow(end,.2,{c,a:a*.7,top:1});R.ball(end,.07,{c,a,top:1})}return end}
  let cnt=null;
  function counters(k,e){const t=k===0?N1*e:k===1||k===2?N1+N2*e:N1+N2,ti=Math.floor(t),m=k===1?'wsd':'wsm';
    const key=k+'|'+ti;if(key===cnt)return;cnt=key;const el=document.getElementById('rvCnt');if(!el)return;
    const lr=ti===0?ETA:S[m].lr[Math.max(0,Math.min(N1+N2-1,ti-1))],P=S[m].path[ti];
    const nm=Math.min(NM,Math.floor(Math.max(0,ti-N1)/CK)),mm=nm?avgPt(S.wsm.ck.slice(0,Math.floor((ti-N1)/CK)).slice(-NM)):null;
    el.innerHTML=stat('step',ti+' of '+(N1+N2))+stat(k===1?'WSD rate':'rate',lr.toFixed(2))+stat(k>=3?'loss, decayed':'loss, live weights',(k>=3?D.draw.wsd:L(...P)).toFixed(3))+
      stat('loss, merged',k>=2&&mm?L(...mm).toFixed(3):'-',k>=2?(mm?nm+' checkpoints merged':'no checkpoint yet'):'')}
  function draw(R,k,e){const P=R.P;R.grid(-4.2,4.2,-2.2,2.2,.5);
    cells.forEach(c=>R.quad(c.q,{fill:mix(P.paper,mix(P.c6,P.c1,Math.pow(c.t,.7)),.12+.4*c.t),fa:.92,ea:.14,lw:.5,a:k>=3?.75:.9}));
    // the river: the valley's floor, y = 0, and the minimum
    R.line([pt(bx[0],0,.01),pt(bx[1],0,.01)],{c:P.c3,w:1.6,dash:[6,5],a:.85,top:1,head:7});
    if(k<=1)R.label(pt(.4,0,.02),'river: the valley floor',{fs:12.5,b:1,c:P.c3,dy:20,a:.95,grp:'rv'});
    if(k===0)R.label(pt(bx[1],0,.02),'minimum further on, at x = 4',{al:'right',fs:12,c:P.mute,dy:-14,wide:1});
    // 1. the shared stable phase
    const sh=trail(R,S.wsd.path,0,k===0?N1*e:N1,P.mute,{w:1.6,a:k===0?1:.45,flow:k===0,ball:k===0});
    if(k===0&&sh)R.label(sh,'rate 0.3, flat',{fs:12.5,b:1,c:P.ink,dy:-18});
    if(k>=1){const bp=pt(...S.wsd.path[N1],.03);R.ball(bp,.08,{c:P.ink,top:1});if(k<=2)R.label(bp,'branch point',{fs:12,c:P.ink,dy:-16,grp:'rv'})}
    // 2. WSD: the rate decays to zero over the branch
    if(k>=1){const end=trail(R,S.wsd.path,N1,k===1?N1+N2*e:N1+N2,P.c2,{w:k===1?2.2:1.6,a:k===1?1:k===2?.35:.6,flow:k===1,ball:k===1||k>=3});
      if(k===1&&end)R.label(end,'WSD: rate to 0',{fs:12.5,b:1,c:P.c2,dy:-18,grp:'rv'})}
    // 3. WSM: the same noise, the rate kept, a checkpoint every 10 steps
    if(k>=2){const t=k===2?N1+N2*e:N1+N2,end=trail(R,S.wsm.path,N1,t,P.c1,{w:k===2?2.2:1.4,a:k===2?1:.4,flow:k===2,ball:k===2});
      S.wsm.ck.forEach((p,i)=>{if((i+1)*CK<=t-N1){R.ball(pt(p[0],p[1],.05),.075,{c:P.paper,a:1,top:1});R.ball(pt(p[0],p[1],.05),.045,{c:P.c1,top:1})}});
      if(k===2&&end)R.label(end,'WSM: rate kept',{fs:12.5,b:1,c:P.c1,dy:-18,grp:'rv'})}
    // 4. merge: the 8 checkpoints flow into their mean
    if(k>=3){const m=pt(mg[0],mg[1],.06);
      if(k===3)S.wsm.ck.forEach(p=>R.flowArc(pt(p[0],p[1],.06),m,.25,{c:P.c1,a:.85*Math.min(1,e*2),r:.045,n:5,speed:1.2}));
      const a=k===3?e:1;R.glow(m,.32,{c:P.c1,a,top:1});R.ball(m,.1,{c:P.c1,a,top:1});R.label(m,'merged',{fs:12.5,b:1,c:P.c1,dy:22,a,grp:'rv'})}
    // 5. compare: the decayed point and the merged point
    if(k===4){const w=pt(...fin.wsd,.06);R.glow(w,.3,{c:P.c2,top:1});R.ball(w,.1,{c:P.c2,top:1});R.label(w,'decayed',{fs:12.5,b:1,c:P.c2,dy:-18,grp:'rv'});
      const l=pt(...fin.live,.04);R.label(l,'live WSM weights',{fs:12,c:P.c1,dy:-14,a:.8,grp:'rv',wide:1})}
    counters(k,e)}
  const full={cam:[-.45,.72],bounds:[[-3.8,0,-1.7],[3.8,1.3,1.7]]},near={cam:[-.4,.85],bounds:[[-.6,0,-1.2],[3.4,.8,1.1]]};
  S3.stage({id:'stg-rv',list:'sx-rv',fig:'Fig. 2 · the same noise, decayed or merged (illustrative toy)',cam:full.cam,bounds:full.bounds,aspect:.6,dur:3200,hold:4600,draw,
    margin:w=>w<520?[16,10,16,10]:[24,20,22,20],view:k=>k>=3?near:full});
})();
