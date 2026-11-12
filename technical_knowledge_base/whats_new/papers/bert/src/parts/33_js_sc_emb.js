// ---- Scene: the input representation, the paper's Figure 2 in 3D (renderer v2), with the toy BERT's real learned vectors:
// each token's input is the sum of a row of the token table, a row of the segment table (2 rows) and a row of the position table.
// Tables are glass plates on the left; each vector is 24 signed bars on a white shelf (up positive, down negative), one scale for every row (set by the three parts; the sums rise higher);
// the rows are shelves stacked over the tokens, the sum on top. ----
(function(){
  if(!$('stg-emb'))return;const {at,lerp,mix}=S3;
  let D=null;
  function data(){if(D)return D;const B=BM.load('bert'),P=B.P,H=BM.cfg.H,pk=BM.pack('austin smiled'.split(' '),'i met austin'.split(' ')),n=pk.ids.length;
    const row=(r,t)=>{const id=pk.ids[t],o=[];for(let j=0;j<H;j++){const a=P.tok[id*H+j],b=P.seg[pk.seg[t]*H+j],c=P.pos[t*H+j];o.push(r===0?a:r===1?b:r===2?c:a+b+c)}return o};
    const V=[0,1,2,3].map(r=>pk.ids.map((_,t)=>row(r,t)));let mx=0;V.slice(0,3).forEach(R=>R.forEach(v=>v.forEach(x=>mx=Math.max(mx,Math.abs(x)))));   // the scale: the largest number in the three parts; the sums, about twice as large, rise higher on the top shelf
    return D={n,H,V,mx,words:pk.ids.map(i=>BM.vocab[i]),seg:pk.seg,V0:BM.vocab.length,maxpos:BM.cfg.maxpos}}
  const XS=1.42,WD=1.2,HM=.55,YR=[.8,1.75,2.7,4.15],ZS=0,ZT=1.05,XP=-6.75;
  // a vector as signed bars on a white shelf; bars are flat quads so several hundred stay cheap to draw
  function comb(R,x,y,vals,m,col,a){if(a<=.01)return;const nb=vals.length,bw=WD/nb;
    R.box([x,y-.035,ZS],[WD+.1,.035,.3],{a,shadow:false});
    vals.forEach((v,i)=>{const h=Math.max(.008,Math.abs(v)/m*HM),bx=x-WD/2+bw*(i+.5),y0=v>=0?y:y-.035-h;
      R.quad([[bx-bw*.38,y0,ZS+.16],[bx+bw*.38,y0,ZS+.16],[bx+bw*.38,y0+h,ZS+.16],[bx-bw*.38,y0+h,ZS+.16]],{fill:col,a,edge:false})})}
  function draw(R,k,e){const P=R.P,T=data(),X=i=>(i-(T.n-1)/2)*XS,COL=[P.c1,P.c6,P.c4,P.c2],nar=R.W<620;R.grid(-7.6,6.2,-1.6,2.4,.5);
    const focus=i=>k<5?1:(i===1||i===6)?1:lerp(1,.16,e);
    // the tokens on the floor in front: [CLS] austin smiled [SEP] | i met austin [SEP]
    T.words.forEach((w,i)=>{const s=T.seg[i];R.box([X(i),0,ZT],[.9,.26,.5],{fill:mix(P.paper,s?P.c3:P.c1,.22),a:focus(i)});
      R.label([X(i),0,ZT+.3],w,{mono:w[0]==='[',serif:w[0]!=='[',fs:12.5,dy:nar&&i%2?27:13,b:w==='austin',a:Math.max(.35,focus(i))})});
    // the three tables as glass plates on the left, one per shelf, and the sum
    const TAB=[['token table · '+T.V0+' × 24',0],['segment · 2 × 24',1],['position · '+T.maxpos+' × 24',2]];
    TAB.forEach(([t,r])=>{const lit=k===r+1,a=k<=r?.16:lit?1:k>=5?.25:.5,y=YR[r];
      R.glass([XP,y-.3,ZS],[.8,0,0],[0,.6,0],{c:COL[r],a,nu:6,nv:r===1?2:6});R.label([XP,y,ZS],t,{al:'right',dx:-8,mono:true,fs:12,c:COL[r],a:Math.max(.4,a),grp:'tabs'})});
    R.label([XP+.8,YR[3],ZS],'sum = input',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c2,a:at(k,e,4),grp:'tabs'});
    // the shelves: token, segment, position, then their sum
    // shelves still to come are drawn faintly, so the layout is there from the first step
    for(let r=0;r<4;r++){if(k<r+1){T.V[r].forEach((_,i)=>R.box([X(i),YR[r]-.035,ZS],[WD+.1,.035,.3],{a:.14,shadow:false}));continue}const a0=k===r+1?e:1;
      T.V[r].forEach((v,i)=>comb(R,X(i),YR[r],v,T.mx,COL[r],a0*focus(i)));
      if(k===r+1&&r<3)T.V[r].forEach((_,i)=>R.flowArc([XP+.8,YR[r],ZS+.1],[X(i)-WD/2,YR[r],ZS+.1],.12+.025*i,{c:COL[r],a:e*.8,r:.045,n:3,speed:1.8}))}
    // step 2: the two "austin" tokens read the same row of the token table
    if(k===1)[1,6].forEach(i=>R.label([X(i),YR[0]+HM,ZS],'same row',{mono:true,fs:12,dy:-8,b:1,c:P.c1,a:e}));
    // step 3: two segment vectors only
    if(k===2)[[1.5,'A'],[5.5,'B']].forEach(([i,t])=>R.label([X(i),YR[1]+HM,ZS],'every '+t+' token: one vector',{mono:true,fs:12,dy:-6,c:P.c6,a:e,wide:1}));
    // step 5: each column's three vectors flow up into its sum
    if(k===4)for(let i=0;i<T.n;i++)R.flow([[X(i)+WD/2+.04,YR[0],ZS+.1],[X(i)+WD/2+.04,YR[3],ZS+.1]],{c:P.c2,a:e,r:.05,n:5,speed:1});
    // step 6: the two austins, side by side
    if(k>=5)[1,6].forEach(i=>R.label([X(i),YR[3]+HM,ZS],'austin at '+i,{mono:true,fs:12.5,dy:-8,b:1,c:P.c2,a:e}));
  }
  S3.stage({id:'stg-emb',list:'sx-emb',fig:'Fig. 3 · token + segment + position, real toy vectors',cam:[.26,.36],bounds:[[-7.1,0,-.3],[5.8,5.15,1.4]],aspect:.56,dur:1300,hold:4600,draw,
    margin:w=>w<520?[14,8,14,8]:[16,14,14,150]});
})();
