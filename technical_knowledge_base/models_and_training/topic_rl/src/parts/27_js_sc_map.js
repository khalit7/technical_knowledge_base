// ---- Scene: the hero, the map of the eight pages (renderer v2) ----
// Columns across the floor are where a method's target comes from (a known model; interaction, learning values; interaction, learning the policy; a fixed dataset).
// The one-state floor holds Bandits; three glass layers stack above it: tables, networks, language models. Each page is a block in its cell;
// dashed outlines are the empty corners the step list says where to find. Streams rise from the table or network each page grew out of. No numbers: a map.
(function(){
  if(!document.getElementById('stg-map'))return;const {at,off,lerp,mix}=S3;
  const CX=[-3.3,-1.1,1.1,3.3],CW=2.2,LY=[0,1.5,3,4.5],ZD=1.9;
  // [layer, first column, columns spanned, long name, short name (phone)]
  const PG=[[0,1,2,'Bandits','Bandits'],[1,0,1,'Dynamic programming','DP'],[1,1,1,'Model-free','Model-free'],
    [2,0,1,'Model-based','Search'],[2,1,1,'Value-based deep RL','DQN'],[2,2,1,'Policy gradients','PG'],[2,3,1,'Offline + imitation','Offline'],[3,1,2,'RL for LLMs','RL for LLMs']];
  const GH=[[1,2,'gradient bandit'],[1,3,'importance sampling'],[3,0,'test-time search'],[3,3,'SFT, DPO']];
  // streams up the columns at step 4 (tables to networks) and 5 (networks to language models): [from page, to page]
  const UP4=[[1,3],[2,4],[2,5]],UP5=[[5,7],[4,7]];
  const cx=(c,n)=>CX[c]+(n-1)*CW/2;
  const COLS=['known model','learn values','learn the policy','fixed dataset'],ROWS=['one state','tables','networks','language models'];
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-5.5,5.5,-2.2,2.6,.5);
    // which layers are on: step 2 the floor's page, step 3 tables, 4 networks, 5 language models, 6 all
    const layerA=l=>{const s=l+1;if(k===5)return 1;if(k<s)return 0;if(k===s)return e;return .3};
    // the four columns on the floor
    const colA=k===0?1:k===5?.8:.35;
    CX.forEach((x,c)=>{R.quad([[x-CW/2+.06,.002,-ZD/2-.15],[x+CW/2-.06,.002,-ZD/2-.15],[x+CW/2-.06,.002,ZD/2+.15],[x-CW/2+.06,.002,ZD/2+.15]],{fill:mix(P.paper,[P.c1,P.c3,P.c2,P.c4][c],.18),a:colA*(k===0?Math.max(.3,e):1),ea:.4});
      if(!narrow||k===0)R.label([x,0,ZD/2+.3],COLS[c],{fs:narrow?12:12.5,b:k===0,dy:narrow&&c%2?28:12,c:[P.c1,P.c3,P.c2,P.c4][c],a:k===0?1:.75})});
    // the three glass layers
    [1,2,3].forEach(l=>{const a=layerA(l);if(a<=0)return;R.glass([-4.4,LY[l]-.02,-ZD/2],[8.8,0,0],[0,0,ZD],{c:P.c1,a:a*.55,nu:4,nv:1,th:.03,dz:2})});
    ROWS.forEach((r,l)=>{const a=l===0?(k>=1?(k===1?Math.max(.3,e):k===5?1:.45):0):layerA(l);if(a>0)R.label([-4.4,LY[l]+.1,0],r,{al:'right',dx:-8,mono:true,fs:12,b:a>.9,c:a>.9?P.acc:P.mute,a:Math.max(.5,a),grp:'row'})});
    // the pages
    PG.forEach(([l,c,n,nm,sh],i)=>{const a=layerA(l);if(a<=0)return;const lit=a>.9,x=cx(c,n),y=LY[l]+(l?.03:0);
      const cc=[P.c1,P.c3,P.c2,P.c4][c];R.box([x,y,0],[CW*n-.4,.38,1.1],{fill:mix(P.paper,cc,lit?.4:.12),a:Math.max(a,.35),shadow:l===0});
      R.label([x,y+.38,0],narrow?sh:nm,{fs:narrow?12:13,b:lit,dy:-12,c:lit?P.ink:P.mute,a:Math.max(a,.55)})});
    // the empty corners, dashed
    GH.forEach(([l,c,nm])=>{const a=layerA(l);if(a<=0)return;const x=CX[c],y=LY[l]+.03,lit=a>.9;
      R.quad([[x-CW/2+.25,y,-.55],[x+CW/2-.25,y,-.55],[x+CW/2-.25,y,.55],[x-CW/2+.25,y,.55]],{fill:false,ec:P.mute,dash:[5,4],lw:1.2,ea:.9,a:Math.max(a,.35)});
      if(lit&&!narrow)R.label([x,y,0],nm,{fs:12,c:P.mute,a})});
    // streams: each new layer grows out of the one below
    const up=(i,j,a)=>{const A=PG[i],B=PG[j],p=[cx(A[1],A[2])+(B[1]>A[1]?.35:0),LY[A[0]]+.45,0],q=[cx(B[1],B[2])-(B[1]>A[1]?0:0),LY[B[0]]+.02,0];R.flowArc(p,q,.35,{c:P.acc,a,r:.06,n:8,speed:1.1})};
    if(k===3)UP4.forEach(([i,j])=>up(i,j,e));if(k===4)UP5.forEach(([i,j])=>up(i,j,e));
    if(k===5){UP4.forEach(([i,j])=>up(i,j,.45));UP5.forEach(([i,j])=>up(i,j,.45))}
  }
  const full={cam:[.2,.36],bounds:[[-4.6,0,-1.2],[4.6,5,1.4]]};
  const lay=l=>({cam:[.2,.42],bounds:[[-4.6,Math.max(0,LY[l]-1.6),-1.2],[4.6,LY[l]+.7,1.4]]});
  S3.stage({id:'stg-map',list:'sx-map',fig:'Fig. 1 · the map of the eight pages',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1400,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,16,14,130],
    view:k=>k===0?{cam:[.2,.6],bounds:[[-4.6,0,-1.4],[4.6,.8,1.8]]}:k<=4?lay(k-1):full});
})();
