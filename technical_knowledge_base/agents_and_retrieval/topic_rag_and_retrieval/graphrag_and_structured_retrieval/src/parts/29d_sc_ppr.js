// ---- Scene: Fig. 4, personalised PageRank on an illustrative toy phrase graph (renderer v2). Exact power iteration in the page, d = 0.5,
// reset on the question's two entities weighted by specificity (1 / passages containing the node). Column height: the node's probability;
// plinths at the front: the four passages' scores (sum of their phrases' probability). The graph is hand-made in the running example's shape. ----
(function(){
  if(!document.getElementById('stg-ppr'))return;const {mix,lerp}=S3;
  const NODES={'Kiss and Tell':[.24,.30],'Corliss Archer':[.52,.10],'Shirley Temple':[.52,.55],'Chief of Protocol':[.80,.80],'diplomat':[.84,.45],'1945':[.06,.10],'Broadway':[.05,.55],'F. Hugh Herbert':[.20,.88],'radio':[.86,.10]};
  const Ed=[['Kiss and Tell','Shirley Temple'],['Shirley Temple','Corliss Archer'],['Kiss and Tell','1945'],['Shirley Temple','Chief of Protocol'],['Shirley Temple','diplomat'],['Kiss and Tell','F. Hugh Herbert'],['Kiss and Tell','Broadway'],['Corliss Archer','radio'],['Kiss and Tell','Corliss Archer']];
  const PAS=[['A','the 1945 film',['Kiss and Tell','Corliss Archer','Shirley Temple','1945']],['B','Shirley Temple',['Shirley Temple','Chief of Protocol','diplomat']],['C','the play',['Kiss and Tell','Broadway','F. Hugh Herbert']],['D','the radio show',['Corliss Archer','radio']]];
  const Q=['Kiss and Tell','Corliss Archer'],d=0.5,names=Object.keys(NODES),adj={};names.forEach(n=>adj[n]=[]);Ed.forEach(([a,b])=>{adj[a].push(b);adj[b].push(a)});
  const npas=n=>PAS.filter(p=>p[2].includes(n)).length,spec=n=>1/npas(n);
  const r={};names.forEach(n=>r[n]=0);Q.forEach(n=>r[n]=spec(n));const rs=Q.reduce((s,n)=>s+r[n],0);names.forEach(n=>r[n]/=rs);
  const IT=[0,1,2,3,30],hist=[];let p=Object.assign({},r);
  for(let it=0;it<=30;it++){if(it){const nw={};names.forEach(n=>nw[n]=(1-d)*r[n]);names.forEach(n=>adj[n].forEach(m=>{nw[m]+=d*p[n]/adj[n].length}));p=nw}if(IT.includes(it))hist.push(Object.assign({},p))}
  const score=(pp,P)=>P[2].reduce((s,n)=>s+pp[n],0),SC=hist.map(h=>PAS.map(P=>score(h,P)));
  const PM=Math.max(...hist.map(h=>Math.max(...names.map(n=>h[n])))),SM=Math.max(...SC.flat());
  // the numbers the step list quotes, written from the same computation
  const V={nK:npas('Kiss and Tell'),nC:npas('Corliss Archer'),rK:r['Kiss and Tell'].toFixed(2),rC:r['Corliss Archer'].toFixed(2),
    b0:SC[0][1].toFixed(3),b1:SC[1][1].toFixed(3),b2:SC[2][1].toFixed(3),b3:SC[3][1].toFixed(3),b4:SC[4][1].toFixed(3),c4:SC[4][2].toFixed(3),d4:SC[4][3].toFixed(3)};
  document.querySelectorAll('#sx-ppr [data-pv]').forEach(s=>s.textContent=V[s.dataset.pv]);
  const W=(n)=>[(NODES[n][0]-.5)*7,0,(NODES[n][1]-.5)*3.6-.6],PX=j=>-2.7+j*1.8,PZ=2.3;
  function draw(R,k,e){const P=R.P,prev=hist[Math.max(0,k-1)],cur=hist[k],t=k===0?1:e;R.grid(-4.6,4.6,-3,3.2,.5);
    const pv=n=>lerp(prev[n],cur[n],t);
    // edges on the floor; while mass moves, dots flow along each edge in proportion to the mass it carries
    Ed.forEach(([a,b])=>{R.line([W(a),W(b)],{c:P.mute,w:1.2,a:.55});
      if(k>=1&&k<=3)[[a,b],[b,a]].forEach(([u,v])=>{const m=d*hist[k-1][u]/adj[u].length;if(m<.004)return;
        R.flow([[W(u)[0],.08,W(u)[2]],[W(v)[0],.08,W(v)[2]]],{c:P.acc,a:Math.min(1,e*2)*Math.min(1,.35+m*8),r:.04+m*.25,n:Math.max(1,Math.round(m*60)),speed:.9})})});
    // nodes: a column whose height is the probability; question entities in the highlight colour
    names.forEach(n=>{const q=Q.includes(n),h=Math.max(.02,pv(n)/PM*1.9),c=q?P.acc:PAS[1][2].includes(n)?P.c2:P.c3,w=W(n);
      R.box(w,[.42,h,.42],{fill:mix(P.paper,c,.75)});R.label([w[0],h,w[2]],pv(n).toFixed(2),{mono:true,fs:12,dy:-9,a:pv(n)>.004?1:.4,wide:1});
      R.label(w,n,{fs:12,dy:14,c:q?P.acc:P.ink,b:q,grp:'nm'})});
    // passages: score bars on plinths; B, the bridge passage, in orange
    PAS.forEach((ps,j)=>{const s=lerp(SC[Math.max(0,k-1)][j],SC[k][j],t),h=Math.max(.015,s/SM*1.1),x=PX(j),c=j===1?P.c2:P.mute;
      R.box([x,0,PZ],[1.1,.07,.5],{fill:P.paper,shadow:false});R.box([x,.07,PZ],[.5,h,.3],{fill:mix(P.paper,c,.8),shadow:false});
      R.label([x,.07+h,PZ],s.toFixed(3),{mono:true,fs:12.5,b:j===1,dy:-10,c:j===1?P.c2:P.ink});
      R.label([x,0,PZ+.25],R.W<520?ps[0]:ps[0]+' · '+ps[1],{fs:12,dy:14,b:j===1,c:j===1?P.c2:P.ink});
      if(k>=1&&j===1)ps[2].forEach(n=>{if(cur[n]>.01)R.flowArc([W(n)[0],.1,W(n)[2]],[x,.07+h,PZ],.5,{c:P.c2,a:.6*Math.min(1,e*2),r:.04,n:3,speed:1})})});
  }
  S3.stage({id:'stg-ppr',list:'sx-ppr',fig:'Fig. 4 · personalised PageRank (illustrative toy)',cam:[.25,.7],bounds:[[-4,0,-2.8],[4,1.9,2.9]],aspect:.66,dur:1500,hold:4600,draw,
    margin:w=>w<520?[12,8,22,8]:[16,14,26,14]});
})();
