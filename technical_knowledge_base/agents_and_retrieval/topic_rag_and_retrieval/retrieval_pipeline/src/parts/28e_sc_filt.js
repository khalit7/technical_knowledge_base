// ---- Scene: Fig. 5, a filter after the search against inside it (renderer v2). The counts are the root's measured means
// (RPD.root_filter: Qwen3-Embedding on SciFact, a user who may see 10% of the 5,183 abstracts, 300 claims, post-filter over the exact top K).
// The floor is constructed: 200 tiles stand for the corpus, 20 of them (10%) visible to this user, placed so that the visible tiles among the
// nearest 10, 30 and 100 match the measured means rounded (2, 4, 9); distance on the floor stands for similarity to the query. ----
(function(){
  if(!document.getElementById('stg-filt')||!window.RPD||!RPD.root_filter)return;const {at,off,lerp,mix}=S3;
  const G=RPD.root_filter.groups['10'],post=G.post,NX=20,NZ=10,SP=.42,QC=[6.2,4.3];
  const tiles=[];for(let i=0;i<NX;i++)for(let j=0;j<NZ;j++){const jit=((i*73+j*151)%17)/40;tiles.push({i,j,d:Math.hypot(i-QC[0],(j-QC[1])*1.15)+jit})}
  tiles.sort((a,b)=>a.d-b.d);tiles.forEach((t,r)=>{t.r=r;t.x=-4.4+t.i*SP;t.z=-1.9+t.j*SP});
  const OK=new Set([3,8,14,23,37,48,61,77,92,104,113,121,133,140,152,161,170,181,189,196]);tiles.forEach(t=>t.ok=OK.has(t.r));
  const allowed=tiles.filter(t=>t.ok),QP=[-4.4+QC[0]*SP,1.9,-1.9+QC[1]*SP],TX=5.2;
  const surv=K=>tiles.slice(0,K).filter(t=>t.ok).length;
  function tray(R,n,a,lab){const P=R.P;for(let s=0;s<10;s++)R.box([TX,0,-1.9+s*.42],[.5,s<n?.3:.04,.34],{fill:s<n?P.acc:P.paper,a});
    R.label([TX,.3,-2.1],'10 asked · '+lab,{fs:12.5,b:1,mono:true,dy:-12,al:'right',dx:20,c:P.acc,a,wide:1})}
  function draw(R,k,e){const P=R.P;R.grid(-5,6,-2.6,2.6,.5);
    const K=k===1?10:k===2?100:0,pre=k===3;
    tiles.forEach(t=>{let h=.05,a=1,fill=t.ok?mix(P.paper,P.acc,.55):P.paper;
      if(K&&t.r<K){const h1=t.r<10?1.1-.06*t.r:t.r<30?.5:.25;h=lerp(.05,h1,k===1||k===2?e:1)}
      if(pre){if(!t.ok)a=lerp(1,.18,e);else{const ri=allowed.indexOf(t);if(ri<10)h=lerp(.05,1.1-.06*ri,e)}}
      if(k===1&&e>.6&&t.r<10&&!t.ok)fill=mix(P.paper,P.bad,.35);
      R.box([t.x,0,t.z],[SP*.8,h,SP*.8],{fill,a,shadow:h>.1,lw:.6})});
    R.ball(QP,.14,{c:P.q,a:k===0?e:1});R.label(QP,'query',{fs:12.5,b:1,dy:-14,c:P.q});
    if(k===0){R.label([-4.4,0,2.4],'200 tiles stand for 5,183 abstracts · '+allowed.length+' (10%) visible to this user',{al:'left',fs:12.5,dy:16,c:P.mute,a:e,wide:1})}
    // post-filter: search everything, then drop what the user may not see
    if(k===1||k===2){const top=tiles.slice(0,K===10?10:30);top.forEach(t=>R.flowArc(QP,[t.x,.4,t.z],.2,{c:P.q,a:e*.7,n:2,speed:1.3,r:.05}));
      R.glass([-4.6,1.35,-2.05],[8.6,0,0],[0,0,4.1],{c:P.bad,a:e*.2,nu:10,nv:5});R.label([-4.6,1.35,-2.05],'filter after the search',{al:'left',fs:12.5,b:1,dy:-8,c:P.bad,a:e,wide:1});
      const n=surv(K);tiles.slice(0,K).filter(t=>t.ok).slice(0,10).forEach(t=>R.flowArc([t.x,.6,t.z],[TX,.3,-1.9],.6,{c:P.acc,a:e,n:3,speed:1.2}));
      tray(R,n,1,K===10?'K 10 · measured '+post['10'].returned_mean+' of 10':'K 100 · measured '+post['100'].returned_mean+' of 10')}
    // pre-filter: only visible tiles compete
    if(pre){R.glass([-4.6,.02,-2.05],[8.6,0,0],[0,0,4.1],{c:P.acc,a:e*.4,nu:10,nv:5});
      allowed.slice(0,10).forEach(t=>{R.flowArc(QP,[t.x,.4,t.z],.25,{c:P.q,a:e*.7,n:2,speed:1.3,r:.05});R.flowArc([t.x,.8,t.z],[TX,.3,-1.9],.6,{c:P.acc,a:e,n:3,speed:1.2})});
      tray(R,10,1,'filter inside · measured '+G.pre.returned_mean+' of 10')}
  }
  const full={cam:[.3,.68],bounds:[[-4.8,0,-2.4],[5.7,1.8,2.2]]};
  S3.stage({id:'stg-filt',list:'sx-filt',fig:'Fig. 5 · filter after, or inside',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[24,16,20,16]});
})();
