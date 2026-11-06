// ---- Scene: Fig. 3, reciprocal rank fusion on one query's real lists (renderer v2). The query is the one chosen in the fusion widget below
// (RPD.fu: BM25 and Qwen3-Embedding-0.6B top 20, annotators' relevance); fused with the page's own RP.fuse (k 60). The last step's towers are
// the test-split nDCG@10 over all queries (RPD.fu.agg: BM25, Qwen3 alone, RRF at k 60, z-score with the weight chosen on the tuning split). ----
(function(){
  if(!document.getElementById('stg-rrf')||!window.RP||!RPD.fu)return;const {at,off,lerp,mix}=S3;
  const F=RPD.fu,KK=60,HS=.7*(KK+1),ZB=-2.1,ZD=2.1,ZF=0,x=i=>-4.5+i;
  let cur=null;
  function state(){const b=document.querySelector('#rp-fu-ds button.on'),ds=b?b.dataset.m:'scifact',sel=document.getElementById('rp-fu-q'),qi=sel?+sel.value||0:0;
    const key=ds+':'+qi;if(cur&&cur.key===key)return cur;
    const Q=F[ds].queries[qi],rel=Q.rel,rb={},rd={};Q.bm.forEach((v,i)=>rb[v[0]]=i+1);Q.de.forEach((v,i)=>rd[v[0]]=i+1);
    const fu=RP.fuse(Q.bm,Q.de,'rrf',KK),A=F.agg[ds],M=A.models['qwen3-emb-0.6b'];
    const rk=l=>{const j=l.findIndex(v=>(rel[v[0]]||0)>0);return j<0?null:j+1};
    return cur={key,ds,Q,rel,rb,rd,fu:fu.slice(0,10),
      n:{bm:RP.ndcg10(Q.bm.map(v=>v[0]),rel),de:RP.ndcg10(Q.de.map(v=>v[0]),rel),rrf:RP.ndcg10(fu.map(v=>v[0]),rel)},
      r:{bm:rk(Q.bm),de:rk(Q.de),rrf:rk(fu)},
      agg:[['BM25',A.bm25,'c5'],['Qwen3 alone',M.single,'c1'],['RRF, k 60',M.methods.rrf.curve['60'],'c4'],['z-score, tuned',M.methods.zscore.test,'acc']]}}
  function draw(R,k,e){const P=R.P,S=state(),rel=S.rel;R.grid(-5.6,5.6,-2.4,2.4,.5);
    const mb=S.Q.bm[0][1],md=S.Q.de[0][1],relC=d=>(rel[d]||0)>0;
    const la=k<=1?1:k===2?.55:k===3?.25:lerp(.25,0,e);
    // two ranked lists, scores first (step 1), then each rank's 1/(60 + rank) (step 2)
    [[S.Q.bm,ZB,P.c5,'BM25 · score',mb,2],[S.Q.de,ZD,P.c1,'Qwen3-Embedding · cosine',md,3]].forEach(([L,z,col,lab,mx,dg])=>{
      L.slice(0,10).forEach(([d,s],i)=>{const h0=s/mx*1.25,h1=HS/(KK+i+1),t=k===0?0:k===1?e:1,h=lerp(h0,h1,t);
        R.box([x(i),0,z],[.62,h,.5],{fill:relC(d)?P.good:mix(P.paper,col,.35),a:la});
        if(k<=1)R.label([x(i),h,z],k===0||e<.5?s.toFixed(dg):'1/'+(KK+i+1),{mono:true,fs:12,dy:-11,c:relC(d)?P.good:P.ink,a:la,grp:'v'+z})});
      if(la>.02)R.label([x(0)-.5,.1,z],lab,{al:'right',dx:-10,mono:true,fs:12,c:col,a:Math.max(.4,la),grp:'row'})});
    if(k<=1)R.label([x(0),0,ZD+.25],'rank 1',{mono:true,fs:12,dy:14,c:P.mute,wide:1});
    // the fused list: each document's two contributions stacked; dots stream from where it ranked in each list
    if(k>=2){const fa=k===2?e:k===4?lerp(1,0,e):1;
      S.fu.forEach(([d,s],i)=>{const hb=S.rb[d]?HS/(KK+S.rb[d]):0,hd=S.rd[d]?HS/(KK+S.rd[d]):0;
        if(hb)R.box([x(i),0,ZF],[.62,hb,.5],{fill:mix(P.paper,P.c5,.6),a:fa,shadow:false});
        if(hd)R.box([x(i),hb,ZF],[.62,hd,.5],{fill:mix(P.paper,P.c1,.6),a:fa,shadow:false});
        if(relC(d))R.box([x(i),hb+hd,ZF],[.62,.06,.5],{fill:P.good,a:fa,shadow:false});
        if(k===2){if(S.rb[d]&&S.rb[d]<=10)R.flowArc([x(S.rb[d]-1),HS/(KK+S.rb[d]),ZB],[x(i),hb,ZF],.45,{c:P.c5,a:e*.85,n:4,speed:1.2,r:.055});
          if(S.rd[d]&&S.rd[d]<=10)R.flowArc([x(S.rd[d]-1),HS/(KK+S.rd[d]),ZD],[x(i),hb+hd,ZF],.45,{c:P.c1,a:e*.85,n:4,speed:1.2,r:.055})}
        if(k<=3)R.label([x(i),hb+hd+(relC(d)?.06:0),ZF],'b'+(S.rb[d]||'–')+' d'+(S.rd[d]||'–'),{mono:true,fs:12,dy:-11,c:relC(d)?P.good:P.ink,b:relC(d),a:fa,grp:'f'})});
      if(fa>.02)R.label([x(0)-.5,.1,ZF],'RRF, k 60',{al:'right',dx:-10,mono:true,fs:12,b:1,c:P.c4,a:fa,grp:'row'})}
    if(k===3){R.label([x(0)-.4,1.9,ZB],'nDCG@10 · BM25 '+S.n.bm.toFixed(2)+' · dense '+S.n.de.toFixed(2)+' · RRF '+S.n.rrf.toFixed(2),{al:'left',mono:true,fs:12.5,b:1,c:P.c4,a:e,wide:1})}
    // over every test query of the set
    if(k===4){const vs=S.agg.map(a=>a[1]),b0=Math.floor(Math.min(...vs)*10)/10-.1,sc=1.6/(Math.max(...vs)-b0);S.agg.forEach(([lab,v,c],j)=>{const xx=-3+j*2,h=(v-b0)*sc*e;R.box([xx,0,-.2],[.9,Math.max(.012,h),.8],{fill:P[c],a:.95});
        R.label([xx,h,-.2],v.toFixed(3),{mono:true,fs:13,b:1,dy:-12,c:P[c],a:e});R.label([xx,0,.2],lab,{fs:12.5,b:1,dy:16,c:P.ink,a:e,grp:'ag'})});
      R.label([-4.6,2.0,-.2],'nDCG@10, all '+(S.ds==='scifact'?'300 SciFact':'323 NFCorpus')+' test queries (bars from '+b0.toFixed(1)+')',{al:'left',fs:12.5,c:P.mute,a:e,wide:1})}
  }
  function readout(){const S=state(),el=document.getElementById('rp-rrf-out');if(!el)return;const r=v=>v?'rank '+v:'not in the top 20';
    el.innerHTML='<b>This query, the first relevant document:</b> BM25 '+r(S.r.bm)+', dense '+r(S.r.de)+', after RRF '+r(S.r.rrf)+'; nDCG@10 '+S.n.bm.toFixed(3)+', '+S.n.de.toFixed(3)+' and '+S.n.rrf.toFixed(3)+'. Pick another query in the widget below.'}
  const full={cam:[.25,.78],bounds:[[-5.2,0,-2.5],[5.2,1.4,2.5]]};
  const st=S3.stage({id:'stg-rrf',list:'sx-rrf',fig:'Fig. 3 · two lists, one fused list',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,16,18,190],
    view:k=>k===4?{cam:[.2,.45],bounds:[[-4.4,0,-.8],[4.4,1.8,.6]]}:full,onStep:()=>{try{readout()}catch(err){}}});
  // the widget's selects are filled by a later script: read the chosen query once they exist
  setTimeout(()=>{try{readout()}catch(err){}},0);RP.onTab('t-read',()=>{try{readout()}catch(err){}});
  const upd=()=>setTimeout(()=>{cur=null;readout();st.draw()},0);
  const q=document.getElementById('rp-fu-q'),ds=document.getElementById('rp-fu-ds');if(q)q.addEventListener('change',upd);if(ds)ds.addEventListener('click',upd);
})();
