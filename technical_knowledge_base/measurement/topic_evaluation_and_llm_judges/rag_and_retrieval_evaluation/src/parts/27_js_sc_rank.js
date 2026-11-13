// ---- Scene: Fig. 2 (stg-rank, renderer v2): one NFCorpus query's real ranked lists, read at the prompt's depth and at the reranker's.
// Data: window.RDATA.beir.nfcorpus.Q (src/beir_run.py via mk_data.py): for the query "grapes" (PLAIN-1288), the number of labelled passages,
// the ideal DCG@10, and the rank and grade of every labelled passage in each system's top 100. Each top 100 is folded into ten rows of ten
// (rank 1 front left); labelled passages stand up by grade. Metrics are computed here with the page's own RM.one (22_js_calc.js) and published
// in window.RRES.rank, which check_stages.mjs compares with the step list. ----
(function(){
  if(!document.getElementById('stg-rank')||!window.S3||!window.RDATA||!window.RM)return;
  const {at,off,lerp,mix,cl}=S3,D=RDATA.beir.nfcorpus,SY=RDATA.sys,qi=D.sample.find(s=>s.t==='grapes');if(!qi)return;
  const Q=D.Q[qi.i],nl=Q[0],idcg=Q[1];
  // grades in rank order for one system's top 100, and the metrics at a cutoff
  const list=s=>{const per=Q[3][SY.indexOf(s)],g=new Array(100).fill(0);for(let j=0;j<per.length;j+=2)g[per[j]-1]=per[j+1];return g};
  const all=new Array(nl).fill(1); // the cutoff metrics below need only the count of labelled passages and IDCG (checked against Q[1] below)
  const LB=list('bm25_lucene'),LD=list('dense_minilm'),LH=list('hybrid_rrf');
  const cnt=(g,k)=>g.slice(0,k).filter(x=>x>0).length,f3=x=>x.toFixed(3).replace(/0+$/,'').replace(/\.$/,''),f3k=x=>x.toFixed(3);
  const mB=RM.one(LB,all,10,false),dcgB=RM.dcg(LB.slice(0,10)),dcgD=RM.dcg(LD.slice(0,10));
  if(Math.abs(mB.idcg-idcg)>1e-4)console.error('stg-rank: IDCG mismatch',mB.idcg,idcg);
  if(Q[3][SY.indexOf('bm25_lucene')].some((v,j)=>j%2&&v!==1))console.error('stg-rank: the scene assumes grade-1 labels for this query');
  const N={nlab:nl,b10:cnt(LB,10),b100:cnt(LB,100),bp10:f3(cnt(LB,10)/10),br10:f3k(cnt(LB,10)/nl),rmax:f3k(10/nl),bdcg:f3k(dcgB),idcg:f3k(idcg),bndcg:f3k(dcgB/idcg),
    br100:f3k(cnt(LB,100)/nl),bdeep:cnt(LB,100)-cnt(LB,10),d10:cnt(LD,10),d100:cnt(LD,100),dr100:f3k(cnt(LD,100)/nl),dndcg:f3k(dcgD/idcg),h10:cnt(LH,10),h100:cnt(LH,100)};
  (window.RRES=window.RRES||{}).rank=N;
  const PI=.46,TS=.38,HB=.55,XB=-2.75,XD=2.75,Z0=2.07,ZP=2.85;
  const pos=(cx,r)=>[cx+(((r-1)%10)-4.5)*PI,0,Z0-Math.floor((r-1)/10)*PI];
  function field(R,cx,g,a,cut,mode,cRel){const P=R.P;
    for(let r=1;r<=100;r++){const p=pos(cx,r),rel=g[r-1]>0,inC=r<=cut;
      const disc=mode==='disc'&&r<=10?1/Math.log2(r+1):1,h=rel?HB*g[r-1]*disc:.035;
      const aa=a*(inC?1:.22);
      R.box(p,[TS,h,TS],{fill:rel?(inC?mix(P.paper,cRel,.8):mix(P.paper,cRel,.35)):P.paper,a:aa,shadow:false,lw:.6})}}
  function draw(R,k,e){const P=R.P,cB=P.c1,cD=P.c6,ph=R.W<520;R.grid(-6,6,-2.6,3.4,.5);
    const aB=k===4?.3:1,aD=k>=4?(k===4?cl(e*2-1,0,1):1):0;   // the dense field appears once the camera has pulled back
    // the cut: grows from row one (step 2) to all ten rows (step 4)
    const cutB=k===0?100:k<=2?10:k===3?Math.round(lerp(10,100,e)):k===4?100:10;
    // BM25's field
    field(R,XB,LB,aB,cutB,k===2?'disc':'',cB);
    if(k===0||k>=3)R.label([XB,0,Z0-9.6*PI],ph?'BM25':'BM25 · top 100 of "grapes"',{fs:12.5,b:1,c:cB,dy:-12,a:aB});
    // the prompt: a glass plate in front of each field; hits stream into it
    const pa=k>=1?1:0;
    R.glass([XB-2.3,.04,ZP],[4.6,0,0],[0,.5,0],{c:P.acc,a:pa*(k===4?.35:1),nu:10,nv:2,th:.03});
    if(k===1||k===5){for(let r=1;r<=10;r++)if(LB[r-1]>0){const p=pos(XB,r);R.flowArc([p[0],HB,p[2]],[p[0],.45,ZP],.25,{c:cB,a:k===1?Math.min(1,e*1.5):.8,r:.05,n:4,speed:1})}}
    // step 3: the discounts written over the first row
    if(k===2)for(let r=1;r<=10;r++)if(LB[r-1]>0){const p=pos(XB,r);R.label([p[0],HB/Math.log2(r+1),p[2]],(1/Math.log2(r+1)).toFixed(2).replace(/^0/,''),{mono:true,fs:12,dy:-10,c:P.ink,a:e})}
    // step 4: the hits below rank 10 flow forward, what a reranker could still lift into the prompt
    if(k===3){for(let r=11;r<=100;r++)if(LB[r-1]>0){const p=pos(XB,r);R.flowArc([p[0],HB,p[2]],[p[0],.45,ZP],.45,{c:cB,a:.85*Math.min(1,e*1.6),r:.05,n:6,speed:1.1})}}
    // the dense field
    if(aD>0){field(R,XD,LD,aD,k===4?100:10,'',cD);R.label([XD,0,Z0-9.6*PI],ph?'dense':'dense MiniLM · top 100',{fs:12.5,b:1,c:cD,dy:-12,a:aD});
      R.glass([XD-2.3,.04,ZP],[4.6,0,0],[0,.5,0],{c:P.acc,a:aD*(k===4?.35:1),nu:10,nv:2,th:.03});
      if(k===4){for(let r=1;r<=100;r++)if(LD[r-1]>0){const p=pos(XD,r);R.flowArc([p[0],HB,p[2]],[p[0],.45,ZP],.4,{c:cD,a:.75*e,r:.045,n:4,speed:1.1})}}
      if(k===5){for(let r=1;r<=10;r++)if(LD[r-1]>0){const p=pos(XD,r);R.flowArc([p[0],HB,p[2]],[p[0],.45,ZP],.25,{c:cD,a:.8,r:.05,n:4,speed:1})}}}
    // the counts at each depth, in front of each field
    const big=(p,t,c,a)=>R.label(p,t,{fs:13,b:1,c,a,dy:16});
    if(k===1)big([XB,0,ZP],ph?'P@10 '+N.bp10+' · R@10 '+N.br10:'prompt, top 10: hit@10 1 · precision@10 '+N.bp10+' · recall@10 '+N.br10,P.ink,e);
    if(k===2)big([XB,0,ZP],ph?'nDCG@10 '+N.bndcg:'nDCG@10 = '+N.bdcg+' / '+N.idcg+' = '+N.bndcg,P.ink,e);
    if(k===3)big([XB,0,ZP],ph?'R@100 '+N.br100:'reranker depth: recall@100 '+N.b100+' / '+nl+' = '+N.br100,P.ink,e);
    if(k===4)big([XD,0,ZP],ph?N.d10+' · '+N.d100:N.d10+' in the top 10 · '+N.d100+' in the top 100',cD,aD);
    if(k===5){big([XB,0,ZP],(ph?'':'k = 10: ')+N.b10+(ph?' · ':' · k = 100: ')+N.b100,cB,1);big([XD,0,ZP],(ph?'':'k = 10: ')+N.d10+(ph?' · ':' · k = 100: ')+N.d100,cD,1)}
  }
  const full={cam:[.18,.68],bounds:[[-5.8,0,-2.4],[5.8,.6,3.3]]},left={cam:[.2,.58],bounds:[[-5.3,0,-2.3],[-.2,.6,3.2]]};
  const phoneFull={cam:[.85,.8],bounds:full.bounds}; // on a phone the two side-by-side fields turn into depth, so they are larger
  S3.stage({id:'stg-rank',list:'sx-rank',fig:'Fig. 2 · one NFCorpus query, read at two depths',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    margin:w=>w<520?[26,10,30,10]:[34,30,34,30],
    view:k=>k===0||k===3?left:k===1||k===2?{cam:[.12,.62],bounds:[[-5.2,0,1.1],[-.3,.6,3.3]]}:innerWidth<520?phoneFull:full});
})();
