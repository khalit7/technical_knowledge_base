// ---- Scene: Fig. 2, from votes to a rating (stg-vote, renderer v2) on the page's 6,000 real votes among ten models (window.HPD.lab, the 2024 public log).
// One battle (the sample's first decisive vote), the win matrix filling (600 votes, then all 6,000: wins of the row model over the column model),
// win shares as signed bars on a 50% glass plane, one Bradley-Terry height per model, then the heights' predicted shares against the observed ones.
// Every number comes from window.HPD.st (src/recompute.py) and window.HPD.lab; the scene publishes what it shows in window.HPN.vote for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-vote')||!window.S3||!window.HPD||!HPD.st)return;
  const {mix,lerp,cl}=S3,T=HPD.st,L=HPD.lab,m=L.models.length;
  // the sample's own Bradley-Terry ratings (centred like the Fit the votes tab), as recompute.py writes them: rebuilt here from the page's maths
  const D=HP.decode(L),full={};HPD.fits.boards.overall.rows.forEach(r=>full[r.m]=r);
  const meanBT=L.models.reduce((s,x)=>s+full[x].bt,0)/m;
  const bt=HP.points(HP.fit(HP.rowsFor(D,[...Array(D.n).keys()],[],'half'),m,0,0).r,meanBT);
  const ord=[...Array(m).keys()].sort((a,b)=>bt[b]-bt[a]),row=[];ord.forEach((i,r)=>row[i]=r);
  const NM={'chatgpt-4o-latest':'ChatGPT-4o latest','gpt-4o-2024-05-13':'GPT-4o (May)','claude-3-5-sonnet-20240620':'Claude 3.5 Sonnet','gemini-1.5-pro-api-0514':'Gemini 1.5 Pro',
    'llama-3.1-405b-instruct':'Llama 3.1 405B','gpt-4o-mini-2024-07-18':'GPT-4o mini','llama-3.1-70b-instruct':'Llama 3.1 70B','gemma-2-27b-it':'Gemma 2 27B','claude-3-opus-20240229':'Claude 3 Opus','claude-3-haiku-20240307':'Claude 3 Haiku'};
  const nm=i=>NM[L.models[i]]||L.models[i];
  const zr=r=>-2.25+.5*r,xc=c=>-2.25+.5*c,PL=.95,HS=3.6,K0=1150,KH=2.0/180;
  const maxC=Math.max(...T.sc6.flat()),kC=1.5/maxC;
  // the first decisive vote: model a is answer A, model b answer B
  const F=T.first,win=F.o===0?F.a:F.b,lose=F.o===0?F.b:F.a;
  // the pairs with the most and fewest battles; the largest miss between the fit and the observed share
  let pMax=[0,1],pMin=[0,1],miss=[0,1,0];
  for(let a=0;a<m;a++)for(let b=a+1;b<m;b++){const n=T.nb6[a][b];if(n>T.nb6[pMax[0]][pMax[1]])pMax=[a,b];if(n<T.nb6[pMin[0]][pMin[1]])pMin=[a,b];
    const g=Math.abs(T.sc6[a][b]/n-T.pred[a][b]);if(g>miss[2])miss=[a,b,g]}
  // the miss shown from the side of the model that did better than predicted
  if(T.sc6[miss[0]][miss[1]]/T.nb6[miss[0]][miss[1]]<T.pred[miss[0]][miss[1]])miss=[miss[1],miss[0],miss[2]];
  const top=[];for(let a=0;a<m;a++)for(let b=0;b<m;b++)if(a!==b)top.push([T.nb6[a][b],a,b]);top.sort((x,y)=>y[0]-x[0]);
  window.HPN=window.HPN||{};HPN.vote={bt,ord:ord.map(i=>L.models[i]),first:[L.models[F.a],L.models[F.b],F.o],pMax:[L.models[pMax[0]],L.models[pMax[1]],T.nb6[pMax[0]][pMax[1]]],
    pMin:[L.models[pMin[0]],L.models[pMin[1]],T.nb6[pMin[0]][pMin[1]]],miss:[L.models[miss[0]],L.models[miss[1]],T.nb6[miss[0]][miss[1]],T.sc6[miss[0]][miss[1]]/T.nb6[miss[0]][miss[1]],T.pred[miss[0]][miss[1]]],
    gap:T.gap_mean_w,pairs:T.n_pairs};
  function lab(R,p,t,o){if(o.a!=null&&o.a<.12)return;const q=R.p(p);if(q[2]<=0||q[0]<-2||q[0]>R.W+2||q[1]<-2||q[1]>R.H+2)return;R.label(p,t,o)} // labels of objects off the canvas are dropped, not clamped to its edge
  // per step: how the bars stand (0 none, 1 the first vote, 2 counts at 600, 3 counts at 6,000, 4 shares on the plane), and what leads
  const ST=[{b:1,cards:1,plane:0,pil:0,gh:0,rows:.35},{b:2,cards:0,plane:0,pil:0,gh:0,rows:1},{b:3,cards:0,plane:0,pil:0,gh:0,rows:1},{b:4,cards:0,plane:1,pil:0,gh:0,rows:1},
    {b:4,cards:0,plane:.35,pil:1,gh:0,rows:1},{b:4,cards:0,plane:.6,pil:.55,gh:1,rows:1}];
  function span(mode,a,b){ // bottom and top of the bar for row model a against column model b
    if(mode===0)return [0,0];if(mode===1)return a===win&&b===lose?[0,kC*8]:[0,0];
    if(mode===2)return [0,T.sc600[a][b]*kC];if(mode===3)return [0,T.sc6[a][b]*kC];
    const d=(T.sc6[a][b]/T.nb6[a][b]-.5)*HS;return d>=0?[PL,PL+d]:[PL+d,PL]}
  function draw(R,k,e,st){const P=R.P,pk=st&&st.pk!=null?st.pk:k,A=ST[pk],B=ST[k],V=f=>lerp(A[f],B[f],e);R.grid(-4,4.4,-3,4.4,.5);
    // the plate the matrix stands on, and its 50% plane
    R.glass([xc(0)-.25,.005,zr(0)-.25],[5,0,0],[0,0,5],{c:P.c1,a:.35,nu:10,nv:10});
    const aP=V('plane');if(aP>.02){R.glass([xc(0)-.25,PL,zr(0)-.25],[5,0,0],[0,0,5],{c:P.c5,a:aP*.55,nu:10,nv:10});
      lab(R,[xc(9)+.25,PL,zr(9)+.25],'50%: an even split',{al:'left',dx:6,fs:12,c:P.c5,a:k===3?aP:0,wide:1})}
    // the bars: wins of the row model over the column model
    const aR=V('rows'),zoom=k===5?e:pk===5?1-e:0;
    for(let a=0;a<m;a++)for(let b=0;b<m;b++){if(a===b)continue;const s0=span(A.b,a,b),s1=span(B.b,a,b),y0=lerp(s0[0],s1[0],e),y1=lerp(s0[1],s1[1],e),h=y1-y0;
      if(h<.004)continue;const sh=B.b===4||A.b===4,pos=T.sc6[a][b]/T.nb6[a][b]>=.5,isMiss=a===miss[0]&&b===miss[1];
      const f=sh?(pos?mix(P.paper,P.c1,.55):mix(P.paper,P.c2,.55)):mix(P.paper,P.c1,.3);
      const al=(B.b===1||A.b===1)&&a===win&&b===lose?1:aR*(zoom>0&&a!==miss[0]?1-.72*zoom:1);
      R.box([xc(row[b]),y0,zr(row[a])],[.34,h,.34],{fill:f,a:al,shadow:false,lw:.6})}
    // predicted shares (step 6): glass ghosts at the height the fitted gap predicts
    const aG=V('gh');if(aG>.02)for(let a=miss[0],b=0;b<m;b++){if(a===b)continue;const d=(T.pred[a][b]-.5)*HS;
      R.box([xc(row[b]),d>=0?PL:PL+d,zr(row[a])],[.42,Math.max(.01,Math.abs(d)),.42],{fill:P.c4,fa:.14,ec:P.c4,ea:.8,a:aG,shadow:false,lw:.9})}
    // row labels (the same ten models label the columns, in the same order, left to right)
    const lo=j=>j===3||j===4?1.3:1.0,lx=lerp(lo(pk),lo(k),e);   // steps 4 and 5 (bars standing on the 50% plane) set the names further from the first column
    for(let a=0;a<m;a++){const r=row[a],hi=(k===0||(pk===0&&e<1))&&(a===win||a===lose),z5=k===5&&(a===miss[0]||a===miss[1]);
      lab(R,[xc(0)-lx,0,zr(r)],(r+1)+'  '+nm(a),{al:'right',dx:-4,fs:12,b:hi||z5,c:hi||z5?P.acc:P.ink,grp:'row',a:Math.max(.45,hi?1:aR)})}
    if((k>=1&&k<=3)||(pk>=1&&pk<=3))lab(R,[xc(4.5),0,zr(9)+.3],'columns: the same ten models, as opponents',{fs:12,c:P.mute,dy:14,a:k>=1&&k<=3?(pk===0?e:1):1-e,wide:1});
    // step 1: one battle, two anonymous answers, the vote, then the names
    const aC=V('cards');if(aC>.02){const ca=[-1.0,0,3.6],cb=[1.0,0,3.6],v=k===0?e:1,bw=pk===0&&k!==0;
      R.box(ca,[1.3,.85,.1],{fill:P.paper,a:aC});R.box(cb,[1.3,.85,.1],{fill:mix(P.paper,P.acc,.25+.35*cl(v*2-.6,0,1)),a:aC});
      lab(R,[ca[0],.62,ca[2]],'answer A',{b:1,fs:13,a:aC});lab(R,[cb[0],.62,cb[2]],'answer B',{b:1,fs:13,a:aC});
      lab(R,[ca[0],0,ca[2]+.1],cl(v*2-1,0,1)>.3?nm(F.a):'name hidden',{fs:12,dy:14,c:P.mute,a:aC});
      lab(R,[cb[0],0,cb[2]+.1],cl(v*2-1,0,1)>.3?nm(F.b):'name hidden',{fs:12,dy:14,c:P.mute,a:aC});
      lab(R,[(win===F.a?ca:cb)[0],.85,ca[2]],F.o===0?'A is better':'B is better',{fs:12.5,b:1,dy:-16,c:P.acc,a:aC*cl(v*2-.4,0,1)});
      if(v>.3)R.flowArc([(win===F.a?ca:cb)[0],.6,ca[2]],[xc(row[lose]),.2,zr(row[win])],1.0,{c:P.acc,a:aC*cl(v*2-.6,0,1),n:9,r:.07})}
    // steps 2 and 3: votes stream into the cells that are filling fastest
    const aF=(k===1||k===2)?Math.min(1,e*1.5):(pk===1||pk===2)&&k>2?1-Math.min(1,e*2):0;
    if(aF>.02)top.slice(0,14).filter((x,i)=>i%2===0).forEach(([n,a,b])=>R.flowArc([0,.5,3.6],[xc(row[b]),.15,zr(row[a])],.9,{c:P.c1,a:aF*.75,n:Math.round(4+n/60),r:.05}));
    if(k===2||k===3&&e<1){const al=k===2?cl(e*2-.6,0,1):1-e;[[pMax,T.nb6[pMax[0]][pMax[1]]],[pMin,T.nb6[pMin[0]][pMin[1]]]].forEach(([p,n])=>{const a=p[0],b=p[1];
      lab(R,[xc(row[b]),T.sc6[a][b]*kC,zr(row[a])],n+' battles',{fs:12,b:1,dy:-12,c:P.acc,a:al})})}
    // steps 5 and 6: one Bradley-Terry height per model, fed by every vote in its row at once
    const aL=V('pil');if(aL>.02){const g=k===4?cl(e*1.4,0,1):1;
      for(let a=0;a<m;a++){const r=row[a],h=Math.max(.02,(bt[a]-K0)*KH*g);R.box([3.25,0,zr(r)],[.42,h,.42],{fill:mix(P.paper,P.acc,.5),a:aL});
        lab(R,[3.25+.26,h,zr(r)],Math.round(bt[a])+'',{al:'left',dx:6,mono:true,fs:12,b:1,c:P.acc,a:aL*cl(g*2-1,0,1)*(k===5?1-e:pk===5?e:1),grp:'bt'})}
      if(k===4)for(let a=0;a<m;a++)R.flow([[xc(0),.25,zr(row[a])],[xc(9)+.2,.25,zr(row[a])],[3.0,.25,zr(row[a])]],{c:P.acc,a:Math.min(1,e*1.5)*.7,n:5,r:.045,speed:1.6});
      lab(R,[3.25,0,zr(9)+.35],'Bradley-Terry score',{fs:12,b:1,dy:14,c:P.acc,a:aL,wide:1})}
    if(k===5||pk===5){const a=miss[0],b=miss[1],o=T.sc6[a][b]/T.nb6[a][b],p=T.pred[a][b],al=k===5?cl(e*2-.8,0,1):1-e;
      lab(R,[xc(row[b]),PL+Math.max(0,(Math.max(o,p)-.5)*HS),zr(row[a])],'seen '+Math.round(o*100)+'% in '+T.nb6[a][b]+' battles · fit '+Math.round(p*100)+'%',{fs:12,b:1,dy:-14,c:P.c4,a:al})}
  }
  const FV={cam:[.32,.66],bounds:[[-4.4,0,-2.6],[3.9,1.6,4.2]]};
  S3.stage({id:'stg-vote',list:'sx-vote',fig:'Fig. 2 · 6,000 real votes become ten scores',cam:FV.cam,bounds:FV.bounds,aspect:.72,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[18,16,16,16],
    // steps 4 and 5 leave room for the row names (set further from the first column there) and the 50% plane's label
    view:k=>k===0?{cam:[.2,.5],bounds:[[-3.2,0,-2.6],[3.0,1.2,4.3]]}:k===1||k===2?{cam:[.3,.62],bounds:[[-4.4,0,-2.6],[2.9,1.6,4.0]]}:k===3?{cam:[.22,.46],bounds:[[-4.8,0,-2.6],[3.6,1.9,2.6]]}
      :k===4?{cam:[.3,.5],bounds:[[-4.8,0,-2.6],[3.9,2.0,2.6]]}:{cam:[.3,.4],bounds:[[-3.6,0,zr(row[miss[0]])-1.2],[3.7,1.9,zr(row[miss[0]])+.6]]}});
})();
