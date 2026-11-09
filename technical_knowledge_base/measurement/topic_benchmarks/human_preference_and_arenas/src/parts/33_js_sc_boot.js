// ---- Scene: Fig. 4, how sure a rating is (stg-boot, renderer v2): the same ten models and 6,000 real votes as Fig. 2, refitted on 200 bootstrap
// resamples (votes drawn with replacement; the same draws as the Fit the votes tab's bootstrap). One fit, a few resamples, 200 resamples piled into a
// histogram per model, the middle 95% as an interval plate, the share of resamples at each rank, then the earliest 1,000 votes. All values from
// window.HPD.st (src/recompute.py); what the step list quotes is published in window.HPN.boot for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-boot')||!window.S3||!window.HPD||!HPD.st)return;
  const {mix,lerp,cl}=S3,T=HPD.st,L=HPD.lab,m=L.models.length,B6=T.boot6,B1=T.boot1,NB=B6.R.length;
  const NM={'chatgpt-4o-latest':'ChatGPT-4o latest','gpt-4o-2024-05-13':'GPT-4o (May)','claude-3-5-sonnet-20240620':'Claude 3.5 Sonnet','gemini-1.5-pro-api-0514':'Gemini 1.5 Pro',
    'llama-3.1-405b-instruct':'Llama 3.1 405B','gpt-4o-mini-2024-07-18':'GPT-4o mini','llama-3.1-70b-instruct':'Llama 3.1 70B','gemma-2-27b-it':'Gemma 2 27B','claude-3-opus-20240229':'Claude 3 Opus','claude-3-haiku-20240307':'Claude 3 Haiku'};
  const nm=i=>NM[L.models[i]]||L.models[i];
  // the fitted ratings on all 6,000 votes, as in Fig. 2
  const D=HP.decode(L),full={};HPD.fits.boards.overall.rows.forEach(r=>full[r.m]=r);
  const meanBT=L.models.reduce((s,x)=>s+full[x].bt,0)/m;
  const bt=HP.points(HP.fit(HP.rowsFor(D,[...Array(D.n).keys()],[],'half'),m,0,0).r,meanBT);
  const ord=[...Array(m).keys()].sort((a,b)=>bt[b]-bt[a]),row=[];ord.forEach((i,r)=>row[i]=r);
  const V0=1110,V1=1350,X0=-3,XW=6.4,xv=v=>X0+(v-V0)/(V1-V0)*XW,zr=r=>-2.25+.5*r,xk=k=>-2.25+.5*k;
  // histograms: 4-point bins, one box per non-empty bin
  const BW=4,KH=.03;
  function hist(Bs){return [...Array(m).keys()].map(i=>{const h={};Bs.R.forEach(x=>{const b=Math.floor(x[i]/BW);h[b]=(h[b]||0)+1});return h})}
  const H6=hist(B6),H1=hist(B1);
  const w6=B6.ci.map(c=>c[1]-c[0]),w1=B1.ci.map(c=>c[1]-c[0]);
  const lead=B6.rank[ord[1]][1];
  window.HPN=window.HPN||{};HPN.boot={n:NB,ci6:B6.ci,ci1:B1.ci,sp6:B6.spread,sp1:B1.spread,rank6:B6.rank,ratio:T.width_ratio,ord:ord.map(i=>L.models[i]),w6,w1};
  function lab(R,p,t,o){if(o.a!=null&&o.a<.12)return;const q=R.p(p);if(q[2]<=0||q[0]<-2||q[0]>R.W+2||q[1]<-2||q[1]>R.H+2)return;R.label(p,t,o)} // labels of objects off the canvas are dropped, not clamped to its edge
  function axis(R,P,a,lo,hi){if(a<.02)return;const z=zr(9)+.45;for(let v=Math.ceil(lo/50)*50;v<=hi;v+=50){R.line([[xv(v),0,zr(0)-.3],[xv(v),0,z]],{c:P.line,w:1,a:a*.9});lab(R,[xv(v),0,z],String(v),{mono:true,fs:12,c:P.mute,dy:12,a})}}
  // what leads at each step
  const ST=[{fit:1,few:0,pile:0,set:6,ci:0,rk:0},{fit:.6,few:1,pile:0,set:6,ci:0,rk:0},{fit:.5,few:0,pile:1,set:6,ci:0,rk:0},{fit:.5,few:0,pile:.5,set:6,ci:1,rk:0},
    {fit:0,few:0,pile:0,set:6,ci:0,rk:1},{fit:.5,few:0,pile:1,set:1,ci:.6,rk:0}];
  function piles(R,P,Hs,a,g){if(a<.02)return;for(let i=0;i<m;i++){const z=zr(row[i]);Object.entries(Hs[i]).forEach(([b,c])=>{const v=(+b+.5)*BW,h=c*KH*g;if(h<.005)return;
      R.box([xv(v),0,z],[BW/(V1-V0)*XW*.92,h,.34],{fill:mix(P.paper,P.c1,.25+.5*Math.min(1,c/30)),a,shadow:false,lw:.5})})}}
  function draw(R,k,e,st){const P=R.P,pk=st&&st.pk!=null?st.pk:k,A=ST[pk],Bt=ST[k],V=f=>lerp(A[f],Bt[f],e);R.grid(-4.2,4.2,-3,3.4,.5);
    const rk=V('rk'),ax=1-rk;axis(R,P,ax,1150,1350);
    // row labels
    for(let i=0;i<m;i++){const r=row[i];lab(R,[xv(V0)-.1,0,zr(r)],(r+1)+'  '+nm(i),{al:'right',dx:-4,fs:12,grp:'row'})}
    // step 1: the one fit, a post at each model's rating
    const aF=V('fit')*ax;if(aF>.02)for(let i=0;i<m;i++){const z=zr(row[i]);R.box([xv(bt[i]),0,z],[.05,.62,.05],{fill:P.ink,a:aF,shadow:false});
      R.ball([xv(bt[i]),.66,z],.07,{c:P.acc,a:aF});if(k===0||pk===0)lab(R,[xv(bt[i]),.66,z],bt[i].toFixed(0),{al:'left',dx:8,mono:true,fs:12,c:P.acc,a:aF*(k===0?1:1-e),grp:'fit'})}
    // step 2: votes drawn with replacement from the pool, refitted, a few times: one ball per model per resample
    const aW=V('few');if(aW>.02){const pool=[-3.9,0,zr(9)+1.2];R.box(pool,[.7,.5,.9],{fill:mix(P.paper,P.c5,.35),a:aW});lab(R,[pool[0],.5,pool[2]],'6,000 votes',{fs:12,b:1,dy:-12,a:aW});
      lab(R,[pool[0]+.5,.25,pool[2]],'draw 6,000 with replacement, refit',{al:'left',dx:8,fs:12,c:P.mute,a:aW,wide:1});
      const nShow=k===1?Math.max(1,Math.ceil(e*8)):8;
      for(let b=0;b<nShow;b++)for(let i=0;i<m;i++)R.ball([xv(B6.R[b][i]),.09+.0*b,zr(row[i])],.075,{c:b===nShow-1&&k===1?P.c2:P.c1,a:aW*(b===nShow-1?1:.75)});
      if(k===1)for(let i=0;i<m;i+=1)R.flowArc([pool[0]+.3,.45,pool[2]],[xv(B6.R[nShow-1][i]),.12,zr(row[i])],.5,{c:P.c5,a:aW*.6,n:4,r:.045})}
    // steps 3 and 4: 200 resamples piled up; step 6: the earliest 1,000 votes
    const aPi=V('pile');if(aPi>.02){const g6=k===2?cl(e*1.3,0,1):1,set6=(Bt.set===6?1:0),from6=(A.set===6?1:0),t6=lerp(from6,set6,e);
      piles(R,P,H6,aPi*t6,g6);piles(R,P,H1,aPi*(1-t6),k===5?cl(e*1.3,0,1):1)}
    // step 4: the middle 95% of each pile is the interval (a plate under the pile); step 6 keeps the 6,000-vote plates faint for comparison
    const aC=V('ci');if(aC>.02)for(let i=0;i<m;i++){const z=zr(row[i]),c=B6.ci[i];R.glass([xv(c[0]),.01,z-.21],[xv(c[1])-xv(c[0]),0,0],[0,0,.42],{c:P.c4,a:aC,nu:2,nv:1});
      [c[0],c[1]].forEach(v=>R.box([xv(v),0,z],[.03,.3,.42],{fill:P.c4,a:aC*.9,shadow:false,lw:.4}));
      if(k===3)lab(R,[xv(c[1]),.3,z],'±'+((c[1]-c[0])/2).toFixed(0),{al:'left',dx:6,mono:true,fs:12,c:P.c4,a:aC*cl(e*2-1,0,1),grp:'ci'})}
    if(k===5){const al=cl(e*2-.8,0,1);for(let i=0;i<m;i++){const z=zr(row[i]),c=B1.ci[i];lab(R,[xv(c[1]),.12,z],'±'+((c[1]-c[0])/2).toFixed(0),{al:'left',dx:8,mono:true,fs:12,c:P.c1,a:al,grp:'ci1'})}}
    // step 5: the share of the 200 resamples in which each model holds each rank
    if(rk>.02){const g=k===4?cl(e*1.4-.2,0,1):1;for(let i=0;i<m;i++){const z=zr(row[i]);for(let p=0;p<m;p++){const c=B6.rank[i][p];if(!c)continue;const h=c/NB*1.7*g;
        R.box([xk(p),0,z],[.36,Math.max(.01,h),.36],{fill:mix(P.paper,c/NB>.5?P.acc:P.c1,.2+.6*c/NB),a:rk,shadow:false,lw:.6});
        if((c/NB>=.5||(i===ord[2]&&p===1))&&k===4)lab(R,[xk(p),h,z],(c===NB?'100':(c/NB*100).toFixed(1))+'%',{mono:true,fs:12,dy:-10,a:rk*cl(g*2-1,0,1)})}}
      for(let p=0;p<m;p++)lab(R,[xk(p),0,zr(9)+.45],String(p+1),{mono:true,fs:12,c:P.mute,dy:12,a:rk});lab(R,[xk(0)-.3,0,zr(9)+.45],'rank',{al:'right',mono:true,fs:12,c:P.mute,dy:12,a:rk})}
  }
  const FV={cam:[0,.72],bounds:[[-5.2,0,-2.6],[3.6,1.4,2.9]]};
  S3.stage({id:'stg-boot',list:'sx-boot',fig:'Fig. 4 · 200 refits on resampled votes',cam:FV.cam,bounds:FV.bounds,aspect:.66,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[18,16,16,16],
    view:k=>k===0?{cam:[0,.76],bounds:[[-5.2,0,-2.6],[3.6,.9,2.9]]}:k===1?{cam:[0,.66],bounds:[[-5.2,0,-2.6],[3.6,.9,4.0]]}:k===4?{cam:[0,.62],bounds:[[-5.0,0,-2.6],[2.6,1.8,2.9]]}:null});
})();
