// ---- ML: the page's exact implementations (checked against scikit-learn by src/check_ml.mjs) ----
// Trees follow sklearn's CART: inputs rounded to float32 (sklearn's DTYPE), thresholds at midpoints of
// consecutive distinct values, x <= threshold goes left, the first best split wins (strict >).
(function(root){
'use strict';
const f32=Math.fround;
// seeded generator (mulberry32); the same code is ported to Python in recompute.py
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^((t+(Math.imul(t^(t>>>7),t|61)>>>0))>>>0))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
const sig=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));

// ---------- CART tree (classification: gini or entropy on 2 classes; regression: squared error) ----------
// X: array of rows, y: labels (0/1) or targets, w: sample weights (bootstrap counts) or null.
// o: {task:'clf'|'reg', maxDepth, crit:'gini'|'entropy', maxFeatures (int or null = all), seed (uint32), minLeaf}
// Features are drawn in sklearn's order: its xorshift generator (our_rand_r) seeded like DecisionTree*(random_state),
// with its constant-feature bookkeeping, so ties between features break as in scikit-learn.
const EPS=2.220446049250313e-16;
function randR(st){let s=st.s>>>0;if(s===0)s=1;s=(s^(s<<13))>>>0;s=(s^(s>>>17))>>>0;s=(s^(s<<5))>>>0;st.s=s;return s%2147483648}
function tree(X,y,w,o){
  const n=X.length,p=X[0].length,task=o.task||'clf',md=o.maxDepth==null?1e9:o.maxDepth,ml=o.minLeaf||1,mf=o.maxFeatures||p;
  const Xf=X.map(r=>r.map(f32)),W=w||new Array(n).fill(1),rs={s:(o.seed==null?209652396:o.seed)>>>0};
  const features=[...Array(p).keys()],constF=[...Array(p).keys()];
  const nodes=[];
  function imp(s){
    if(task==='clf'){if(s.w<=0)return 0;const q=s.c1/s.w,r=1-q;
      return o.crit==='entropy'?-(q>0?q*Math.log2(q):0)-(r>0?r*Math.log2(r):0):1-q*q-r*r}
    return s.w>0?s.ss/s.w-(s.s/s.w)*(s.s/s.w):0}
  function stats(idx){let sw=0,c1=0,s=0,ss=0;for(const i of idx){const wi=W[i];sw+=wi;if(task==='clf')c1+=wi*y[i];else{s+=wi*y[i];ss+=wi*y[i]*y[i]}}return {w:sw,c1,s,ss}}
  function build(idx,depth,nConst,impIn){
    const st=stats(idx),id=nodes.length,im=impIn==null?imp(st):impIn;
    const node={id,depth,n:st.w,ns:idx.length,imp:im,value:task==='clf'?st.c1/st.w:st.s/st.w,leaf:true};
    nodes.push(node);
    if(depth>=md||idx.length<2||idx.length<2*ml||im<=EPS)return id;
    let best=null,fi=p,nVis=0,nFound=0,nDrawn=0;const nKnown=nConst;let nTot=nKnown;
    while(fi>nTot&&(nVis<mf||nVis<=nFound+nDrawn)){
      nVis++;
      let fj=nDrawn+randR(rs)%(fi-nFound-nDrawn);
      if(fj<nKnown){[features[nDrawn],features[fj]]=[features[fj],features[nDrawn]];nDrawn++;continue}
      fj+=nFound;const f=features[fj];
      const srt=idx.slice().sort((a,b)=>Xf[a][f]-Xf[b][f]);
      if(Xf[srt[srt.length-1]][f]<=Xf[srt[0]][f]+1e-7){[features[fj],features[nTot]]=[features[nTot],features[fj]];nFound++;nTot++;continue}
      fi--;[features[fi],features[fj]]=[features[fj],features[fi]];
      const T=stats(srt);let L={w:0,c1:0,s:0,ss:0};
      for(let k=0;k<srt.length-1;k++){
        const i=srt[k],wi=W[i];L.w+=wi;if(task==='clf')L.c1+=wi*y[i];else{L.s+=wi*y[i];L.ss+=wi*y[i]*y[i]}
        const a=Xf[i][f],b=Xf[srt[k+1]][f];if(b<=a+1e-7)continue;
        if(k+1<ml||srt.length-k-1<ml)continue;
        const R={w:T.w-L.w,c1:T.c1-L.c1,s:T.s-L.s,ss:T.ss-L.ss};
        const pr=task==='clf'?-(R.w*imp(R)+L.w*imp(L)):(L.s*L.s/L.w+R.s*R.s/R.w);
        if(!best||pr>best.pr){let th=a/2+b/2;if(th===b||!isFinite(th))th=a;best={pr,f,th,L:{...L},R,k}}
      }
    }
    for(let k=0;k<nKnown;k++)features[k]=constF[k];
    for(let k=0;k<nFound;k++)constF[nKnown+k]=features[nKnown+k];
    if(!best)return id;
    const iL=imp(best.L),iR=imp(best.R);
    node.leaf=false;node.f=best.f;node.th=best.th;node.gain=im-(best.L.w*iL+best.R.w*iR)/node.n;node.cut=[best.L.w,best.R.w];
    const li=idx.filter(i=>Xf[i][best.f]<=best.th),ri=idx.filter(i=>Xf[i][best.f]>best.th);
    node.l=build(li,depth+1,nTot,iL);node.r=build(ri,depth+1,nTot,iR);
    return id;
  }
  build([...Array(n).keys()].filter(i=>W[i]>0),0,0,null);
  const walk=x=>{let k=0;const xf=x.map(f32);while(!nodes[k].leaf)k=xf[nodes[k].f]<=nodes[k].th?nodes[k].l:nodes[k].r;return k};
  return {nodes,predict(x){return nodes[walk(x)].value},leafOf:walk,
    leaves(){return nodes.filter(n=>n.leaf).length},depth(){return Math.max(...nodes.map(n=>n.depth))}};
}
// sklearn: np.random.RandomState(0).randint(0, 2**31 - 1) drawn in turn, the seeds of successive trees built from one RandomState(0)
const SK_SEEDS=[209652396,398764591,924231285,1478610112,441365315,1537364731,192771779,1491434855,1819583497,530702035,626610453,1650906866,1879422756,1277901399,1682652230,243580376,1991416408,1171049868,1646868794,2051556033,1252949478,1340754471,124102743,2061486254,292249176,1686997841,1827923621,1443447321,305097549,1449105480,374217481,636393364,86837363,1581585360,1428591347,1963466437,1194674174,602801999,1589190063,1589512640,2055650130,2034131043,1284876248,1292401841,1982038771,87950109,1204863635,768281747,507984782,947610023,600956192,352272321,615697673,160516793,1909838463,1110745632,93837855,454869706,1780959476,2034098327,1136257699,800291326,1177824715,1017555826,1959150775,930076700,293921570,580757632,80701568,1392175012,505240629,642848645,481447462,954863080,502227700,1659957521,1905883471,1729147268,780912233,1932520490,1544074682,485603871,1877037944,1728073985,848819521,426405863,258666409,2017814585,716257571,657731430,732884087,734051083,903586222,1538251858,553734235,1076688768,1354754446,463129187,1562125877,1396067212,301492857,165035946,1883779156,576702667,2097549636,1971172102,438279108,656229423,897118847,580073460,692819075,2127295436,657595236,351544500,1087879144,1779699534,2002789519,2038810260,1049799907,530471866,682769175,1451731663,474057613,750555509,671430485,1362371120,593491249,1195484741,844314793,1930892963,1583662528,698047583,1378655429,58289758,417046784,527619953,1451462322,745862436,412739490,2026988336,2046377821,1624328579,2012841570,41336362,2047673293,239292784,450308071,1937714069,1027629257,85846399,168310272,1897133962,1214646642,2059809323,516240314,1543802239,1271912471,2065422011,509931650,810293625,1365727330,1634131518,1779245987,1796307678,275511419,931243971,826661458,279984046,286051043,1568103572,1139839185,38521394,99849627,1789811470,403471401,1808858170,326187713,356965412,1843813130,1192792150,1368243243,40186728,719022091,1470348034,566067507,632108112,929118240,1466242230,1242989696,1137007398,786800915,1708627118,371570218,226866547,86361272,708413884,1412786664,1588313677,20166942,628962584,763716221,299008770,1159675395,875044958,1010150626,1238996843,1985084685,1860958064,1068386600,1099969864,327093267,1701229151,395317064,1700971930,310319554,596661496,958128308,1681713475,1944542188,773332797,1920388878,1929289568,1487813892,2055446467,856756973,499083403,1277481980,1146858070,1347751373,1768754041,1702979181,753505099,1636825784,1072866832,349064344,1345262493,1639540885,1998947438,826916889,379954640,967459772,685770617,5688182,142619765,1958864317,990131795,618433185,1695950696,1820443552,510278884,456955387,2039540475,82434169,2019202374,1295253973,928033055,687940109,1236911943,1245873848,1646957720,506872399,1070176297,1841547538,1625439784,581856694,441794767,1281112843,396742822,300497007,1520618845,390295545,222549121,319224543,144418678,657992492,2014175448,653278589,1378672664,1852928067,950315986,1703154671,606723843,1578666218,417728204,1872025574,2078945571,1683298006,1118155774,1315093181,159010501,875694807,1923828267,430471200,427645963,1801664104,1513167060,920159370,2015409846,2142531563,1465185701];
// ---------- bootstrap counts (with replacement) ----------
function bootstrap(n,r){const c=new Array(n).fill(0);for(let k=0;k<n;k++)c[Math.floor(r()*n)]++;return c}

// ---------- random forest: average of trees on bootstrap samples, maxFeatures per split ----------
function forest(X,y,o){const r=rng(o.seed||1),trees=[];
  for(let b=0;b<o.nTrees;b++){const w=o.bootstrap===false?null:bootstrap(X.length,r);const sd=o.treeSeed!=null?o.treeSeed:Math.floor(r()*2147483647);trees.push({t:tree(X,y,w,{task:o.task,maxDepth:o.maxDepth,crit:o.crit,maxFeatures:o.maxFeatures,seed:sd}),w})}
  return {trees,predict(x,m){const k=m==null?trees.length:m;let s=0;for(let i=0;i<k;i++)s+=trees[i].t.predict(x);return s/k},
    // out-of-bag prediction for training row j using the first m trees (null when no tree left it out)
    oob(j,x,m){let s=0,c=0;for(let i=0;i<(m||trees.length);i++){if(trees[i].w&&trees[i].w[j]===0){s+=trees[i].t.predict(x);c++}}return c?s/c:null}};
}

// ---------- gradient boosting (sklearn GradientBoostingClassifier log-loss / GradientBoostingRegressor squared error) ----------
function gboost(X,y,o){
  const n=X.length,task=o.task||'clf',nu=o.lr,stages=[];
  let F0;if(task==='clf'){const p=y.reduce((a,b)=>a+b,0)/n;F0=Math.log(p/(1-p))}else F0=y.reduce((a,b)=>a+b,0)/n;
  const F=new Array(n).fill(F0);
  for(let m=0;m<o.nStages;m++){
    const res=y.map((yi,i)=>task==='clf'?yi-sig(F[i]):yi-F[i]);
    const t=tree(X,res,null,{task:'reg',maxDepth:o.maxDepth,seed:o.seeds?o.seeds[m]:undefined});
    if(task==='clf'){ // Newton step per leaf: sum(residual) / sum(p(1-p))
      const num={},den={};
      for(let i=0;i<n;i++){const l=t.leafOf(X[i]),p=y[i]-res[i];num[l]=(num[l]||0)+res[i];den[l]=(den[l]||0)+p*(1-p)}
      t.nodes.forEach(nd=>{if(nd.leaf){const d=den[nd.id]||0;nd.value=Math.abs(d)<1e-150?0:num[nd.id]/d}});
    }
    for(let i=0;i<n;i++)F[i]+=nu*t.predict(X[i]);
    stages.push({t,res});
  }
  return {F0,stages,raw(x,m){let f=F0;const k=m==null?stages.length:m;for(let i=0;i<k;i++)f+=nu*stages[i].t.predict(x);return f},
    predict(x,m){const f=this.raw(x,m);return task==='clf'?sig(f):f}};
}

// ---------- logistic regression, sklearn objective 0.5||w||^2 + C * sum log-loss, intercept unpenalised (Newton) ----------
function logreg(X,y,C){
  const p=X[0].length,d=p+1;let b=new Array(d).fill(0);
  for(let it=0;it<100;it++){
    const g=new Array(d).fill(0),H=[...Array(d)].map(()=>new Array(d).fill(0));
    for(let j=0;j<p;j++){g[j]=b[j];H[j][j]=1}
    X.forEach((x,i)=>{const z=x.reduce((a,v,j)=>a+v*b[j],b[p]),q=sig(z),r=C*(q-y[i]),s=C*q*(1-q);const xe=[...x,1];
      for(let j=0;j<d;j++){g[j]+=r*xe[j];for(let k=0;k<d;k++)H[j][k]+=s*xe[j]*xe[k]}});
    const st=solve(H,g);b=b.map((v,j)=>v-st[j]);if(Math.max(...st.map(Math.abs))<1e-12)break;
  }
  return {coef:b.slice(0,p),b0:b[p],predict(x){return sig(x.reduce((a,v,j)=>a+v*b[j],b[p]))}};
}
function solve(A,v){const n=v.length,M=A.map((r,i)=>[...r,v[i]]);
  for(let c=0;c<n;c++){let mx=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[mx][c]))mx=r;[M[c],M[mx]]=[M[mx],M[c]];
    for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/M[c][c];for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}
  return M.map((r,i)=>r[n]/r[i])}

// ---------- k nearest neighbours (uniform vote, Euclidean): probability of class 1 ----------
function knn(X,y,k){return {predict(x){const d=X.map((xi,i)=>[(xi[0]-x[0])**2+(xi[1]-x[1])**2,i]);d.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let s=0;for(let j=0;j<k;j++)s+=y[d[j][1]];return s/k}}}

// ---------- SVM (C-SVC) by SMO with libsvm's second-order working-set selection, eps 1e-3 ----------
function svm(X,yy,o){
  const n=X.length,y=yy.map(v=>v?1:-1),C=o.C,TAU=1e-12,eps=o.eps||1e-3;
  const K=o.kernel==='linear'?(a,b)=>a[0]*b[0]+a[1]*b[1]:(a,b)=>Math.exp(-o.gamma*((a[0]-b[0])**2+(a[1]-b[1])**2));
  const Q=[...Array(n)].map((_,i)=>{const r=new Float64Array(n);for(let j=0;j<n;j++)r[j]=y[i]*y[j]*K(X[i],X[j]);return r});
  const a=new Float64Array(n),G=new Float64Array(n).fill(-1);let it=0;
  const up=t=>(y[t]===1&&a[t]<C)||(y[t]===-1&&a[t]>0),low=t=>(y[t]===1&&a[t]>0)||(y[t]===-1&&a[t]<C);
  for(const mi=o.maxIter||1e6;it<mi;it++){
    let Gmax=-Infinity,i=-1;for(let t=0;t<n;t++)if(up(t)&&-y[t]*G[t]>=Gmax){Gmax=-y[t]*G[t];i=t}
    let Gmax2=-Infinity,j=-1,obj=Infinity;
    for(let t=0;t<n;t++){if(!low(t))continue;const yg=y[t]*G[t];if(yg>=Gmax2)Gmax2=yg;
      const bb=Gmax+yg;if(bb>0&&i>=0){let aa=Q[i][i]+Q[t][t]-2*y[i]*y[t]*Q[i][t];if(aa<=0)aa=TAU;const v=-(bb*bb)/aa;if(v<=obj){obj=v;j=t}}}
    if(Gmax+Gmax2<eps||j<0)break;
    const ai=a[i],aj=a[j];
    if(y[i]!==y[j]){let qc=Q[i][i]+Q[j][j]+2*Q[i][j];if(qc<=0)qc=TAU;const dl=(-G[i]-G[j])/qc,diff=a[i]-a[j];a[i]+=dl;a[j]+=dl;
      if(diff>0){if(a[j]<0){a[j]=0;a[i]=diff}}else{if(a[i]<0){a[i]=0;a[j]=-diff}}
      if(diff>0){if(a[i]>C){a[i]=C;a[j]=C-diff}}else{if(a[j]>C){a[j]=C;a[i]=C+diff}}}
    else{let qc=Q[i][i]+Q[j][j]-2*Q[i][j];if(qc<=0)qc=TAU;const dl=(G[i]-G[j])/qc,sum=a[i]+a[j];a[i]-=dl;a[j]+=dl;
      if(sum>C){if(a[i]>C){a[i]=C;a[j]=sum-C}}else{if(a[j]<0){a[j]=0;a[i]=sum}}
      if(sum>C){if(a[j]>C){a[j]=C;a[i]=sum-C}}else{if(a[i]<0){a[i]=0;a[j]=sum}}}
    const di=a[i]-ai,dj=a[j]-aj;for(let t=0;t<n;t++)G[t]+=Q[i][t]*di+Q[j][t]*dj;
  }
  let ub=Infinity,lb=-Infinity,nf=0,sf=0;
  for(let t=0;t<n;t++){const yg=y[t]*G[t];if(a[t]>=C){if(y[t]===-1)ub=Math.min(ub,yg);else lb=Math.max(lb,yg)}
    else if(a[t]<=0){if(y[t]===1)ub=Math.min(ub,yg);else lb=Math.max(lb,yg)}else{nf++;sf+=yg}}
  const rho=nf>0?sf/nf:(ub+lb)/2,sv=[];for(let t=0;t<n;t++)if(a[t]>0)sv.push(t);
  let w=null;if(o.kernel==='linear'){w=[0,0];sv.forEach(t=>{w[0]+=a[t]*y[t]*X[t][0];w[1]+=a[t]*y[t]*X[t][1]})}
  return {alpha:a,rho,sv,iters:it,w,bounded:sv.filter(t=>a[t]>=C).length,
    decision(x){let s=-rho;for(const t of sv)s+=a[t]*y[t]*K(X[t],x);return s}};
}

// ---------- k-means (Lloyd), k-means++ seeding, Gaussian mixture by EM, DBSCAN ----------
function d2(a,b){return (a[0]-b[0])**2+(a[1]-b[1])**2}
function assign(P,C){return P.map(p=>{let b=0,bd=Infinity;C.forEach((c,k)=>{const d=d2(p,c);if(d<bd){bd=d;b=k}});return b})}
function inertia(P,C,lab){return P.reduce((s,p,i)=>s+d2(p,C[lab[i]]),0)}
function lloydStep(P,C){const lab=assign(P,C),k=C.length,S=[...Array(k)].map(()=>[0,0,0]);
  P.forEach((p,i)=>{S[lab[i]][0]+=p[0];S[lab[i]][1]+=p[1];S[lab[i]][2]++});
  return {lab,C:S.map((s,j)=>s[2]?[s[0]/s[2],s[1]/s[2]]:C[j].slice())}}
function initRandom(P,k,r){const idx=[];while(idx.length<k){const i=Math.floor(r()*P.length);if(!idx.includes(i))idx.push(i)}return idx.map(i=>P[i].slice())}
function initPP(P,k,r){const C=[P[Math.floor(r()*P.length)].slice()];
  while(C.length<k){const D=P.map(p=>Math.min(...C.map(c=>d2(p,c))));const tot=D.reduce((a,b)=>a+b,0);let u=r()*tot,i=0;for(;i<P.length-1;i++){u-=D[i];if(u<0)break}C.push(P[i].slice())}return C}
function kmeans(P,C0,maxIt){let C=C0.map(c=>c.slice());const hist=[{C:C.map(c=>c.slice()),lab:assign(P,C)}];
  for(let it=0;it<(maxIt||300);it++){const s=lloydStep(P,C);const moved=s.C.some((c,j)=>d2(c,C[j])>0);C=s.C;hist.push({C:C.map(c=>c.slice()),lab:assign(P,C)});if(!moved)break}
  return {C,hist,lab:assign(P,C),inertia:inertia(P,C,assign(P,C))}}
// full-covariance GMM in 2-D; reg 1e-6 on the diagonal as sklearn
function gmmInit(P,C0){const k=C0.length,n=P.length;const m=[0,1].map(d=>P.reduce((a,p)=>a+p[d],0)/n);
  const v=[0,1].map(d=>P.reduce((a,p)=>a+(p[d]-m[d])**2,0)/n);return {w:new Array(k).fill(1/k),mu:C0.map(c=>c.slice()),S:C0.map(()=>[[v[0],0],[0,v[1]]])}}
function gmmLogp(p,mu,S){const a=S[0][0],b=S[0][1],d=S[1][1],det=a*d-b*b,x=p[0]-mu[0],y=p[1]-mu[1];
  return -Math.log(2*Math.PI)-0.5*Math.log(det)-0.5*(d*x*x-2*b*x*y+a*y*y)/det}
function gmmE(P,g){let ll=0;const R=P.map(p=>{const l=g.mu.map((mu,k)=>Math.log(g.w[k])+gmmLogp(p,mu,g.S[k]));const mx=Math.max(...l);const s=l.reduce((a,v)=>a+Math.exp(v-mx),0);const lz=mx+Math.log(s);ll+=lz;return l.map(v=>Math.exp(v-lz))});return {R,ll:ll/P.length}}
function gmmM(P,R,k){const n=P.length,g={w:[],mu:[],S:[]};
  for(let j=0;j<k;j++){const nk=R.reduce((a,r)=>a+r[j],0)+10*2.220446049250313e-16;const mu=[0,1].map(d=>P.reduce((a,p,i)=>a+R[i][j]*p[d],0)/nk);
    let sxx=0,sxy=0,syy=0;P.forEach((p,i)=>{const x=p[0]-mu[0],y=p[1]-mu[1];sxx+=R[i][j]*x*x;sxy+=R[i][j]*x*y;syy+=R[i][j]*y*y});
    g.w.push(nk/n);g.mu.push(mu);g.S.push([[sxx/nk+1e-6,sxy/nk],[sxy/nk,syy/nk+1e-6]])}
  const sw=g.w.reduce((a,b)=>a+b,0);g.w=g.w.map(v=>v/sw);return g}
function gmm(P,g0,iters){let g=g0;const hist=[];for(let it=0;it<iters;it++){const e=gmmE(P,g);hist.push({g,R:e.R,ll:e.ll});g=gmmM(P,e.R,g.mu.length)}const e=gmmE(P,g);hist.push({g,R:e.R,ll:e.ll});return {g,hist}}
function dbscan(P,eps,minPts){const n=P.length,e2=eps*eps,nb=P.map(p=>{const r=[];for(let j=0;j<n;j++)if(d2(p,P[j])<=e2)r.push(j);return r});
  const core=nb.map(r=>r.length>=minPts),lab=new Array(n).fill(-1),order=[];let c=0;
  for(let i=0;i<n;i++){if(lab[i]!==-1||!core[i])continue;const st=[i];
    while(st.length){const v=st.pop();if(lab[v]===-1){lab[v]=c;order.push(v);if(core[v])for(const u of nb[v])if(lab[u]===-1)st.push(u)}}c++}
  return {lab,core,nClusters:c,order}}

// ---------- PCA by Jacobi eigen-decomposition of the covariance matrix ----------
function pca(X,standardise){const n=X.length,p=X[0].length;const m=[...Array(p)].map((_,j)=>X.reduce((a,r)=>a+r[j],0)/n);
  const sd=[...Array(p)].map((_,j)=>Math.sqrt(X.reduce((a,r)=>a+(r[j]-m[j])**2,0)/n));
  const Z=X.map(r=>r.map((v,j)=>standardise?(v-m[j])/sd[j]:v-m[j]));
  const A=[...Array(p)].map((_,i)=>[...Array(p)].map((_,j)=>Z.reduce((a,r)=>a+r[i]*r[j],0)/(n-1)));
  const V=[...Array(p)].map((_,i)=>[...Array(p)].map((_,j)=>i===j?1:0));
  for(let sw=0;sw<100;sw++){let off=0;for(let i=0;i<p;i++)for(let j=i+1;j<p;j++)off+=A[i][j]*A[i][j];if(off<1e-22)break;
    for(let i=0;i<p;i++)for(let j=i+1;j<p;j++){if(Math.abs(A[i][j])<1e-300)continue;const th=(A[j][j]-A[i][i])/(2*A[i][j]);const t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1)),c=1/Math.sqrt(t*t+1),s=t*c;
      for(let k=0;k<p;k++){const aki=A[k][i],akj=A[k][j];A[k][i]=c*aki-s*akj;A[k][j]=s*aki+c*akj}
      for(let k=0;k<p;k++){const aik=A[i][k],ajk=A[j][k];A[i][k]=c*aik-s*ajk;A[j][k]=s*aik+c*ajk}
      for(let k=0;k<p;k++){const vki=V[k][i],vkj=V[k][j];V[k][i]=c*vki-s*vkj;V[k][j]=s*vki+c*vkj}}}
  const ev=[...Array(p)].map((_,i)=>A[i][i]),ord=[...Array(p).keys()].sort((a,b)=>ev[b]-ev[a]),tot=ev.reduce((a,b)=>a+b,0);
  const comps=ord.map(i=>{const v=V.map(r=>r[i]);let mx=0;v.forEach((x,k)=>{if(Math.abs(x)>Math.abs(v[mx]))mx=k});const sg=v[mx]<0?-1:1;return v.map(x=>x*sg)});
  return {vals:ord.map(i=>ev[i]),ratio:ord.map(i=>ev[i]/tot),comps,proj:Z.map(r=>comps.slice(0,2).map(c=>c.reduce((a,v,k)=>a+v*r[k],0))),sd,m}}

// ---------- Gaussian process with expected improvement over a finite set of candidate points ----------
// pts: candidate coordinates in [0,1]^2; obs: indices evaluated; f: their values. Kernel exp(-d^2/(2 l^2)), noise 1e-6, y standardised.
function gpEI(pts,obs,f,ell,xi){const n=obs.length,mu=f.reduce((a,b)=>a+b,0)/n;let sd=Math.sqrt(f.reduce((a,b)=>a+(b-mu)**2,0)/n);if(!(sd>1e-12))sd=1;
  const yz=f.map(v=>(v-mu)/sd),k=(a,b)=>Math.exp(-d2(a,b)/(2*ell*ell));
  const Km=obs.map((i,a)=>obs.map((j,b)=>k(pts[i],pts[j])+(a===b?1e-6:0)));
  // Cholesky
  const L=[...Array(n)].map(()=>new Float64Array(n));
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let s=Km[i][j];for(let q=0;q<j;q++)s-=L[i][q]*L[j][q];L[i][j]=i===j?Math.sqrt(Math.max(s,1e-300)):s/L[j][j]}
  const fw=b=>{const z=new Float64Array(n);for(let i=0;i<n;i++){let s=b[i];for(let q=0;q<i;q++)s-=L[i][q]*z[q];z[i]=s/L[i][i]}return z};
  const bw=b=>{const z=new Float64Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let q=i+1;q<n;q++)s-=L[q][i]*z[q];z[i]=s/L[i][i]}return z};
  const alpha=bw(fw(yz)),best=Math.max(...yz),seen=new Set(obs);
  const out=pts.map((p,c)=>{const ks=obs.map(i=>k(p,pts[i]));const m=ks.reduce((a,v,i)=>a+v*alpha[i],0);const v=fw(ks);const s2=Math.max(1-v.reduce((a,x)=>a+x*x,0),1e-12),s=Math.sqrt(s2);
    const z=(m-best-xi)/s,ei=seen.has(c)?0:(m-best-xi)*Phi(z)+s*Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);return {m:m*sd+mu,s:s*sd,ei}});
  let nx=-1,bv=-1;out.forEach((o,c)=>{if(!seen.has(c)&&o.ei>bv){bv=o.ei;nx=c}});return {out,next:nx}}
function Phi(z){// standard normal CDF (Abramowitz-Stegun 7.1.26 via erf), error < 1.5e-7
  const t=1/(1+0.3275911*Math.abs(z)/Math.SQRT2),e=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-z*z/2);return z>=0?(1+e)/2:(1-e)/2}

root.ML={SK_SEEDS,rng,sig,tree,bootstrap,forest,gboost,logreg,knn,svm,d2,assign,inertia,lloydStep,initRandom,initPP,kmeans,gmmInit,gmmE,gmmM,gmm,dbscan,pca,gpEI,Phi};
})(typeof window!=='undefined'?window:globalThis);
