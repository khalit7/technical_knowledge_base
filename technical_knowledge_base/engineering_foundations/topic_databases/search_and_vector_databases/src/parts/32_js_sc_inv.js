// ---- Scene, section 3: an inverted index built for six real questions, the running query answered from it, then the same query without an index (renderer v2) ----
// Data: SV.tiny (lexemes and positions from Postgres to_tsvector('english'), measured, src/inputs/m3_tiny.json); BM25 with the page's SV.bm25 (k1 1.2, b 0.75).
// Rows are lexemes (the dictionary, sorted), columns are the six questions; a block is one postings entry, its height the term frequency.
(function(){
  if(!document.getElementById('stg-inv')||!window.SV||!SV.tiny)return;const {at,off,lerp,mix}=S3;
  const D=SV.tiny,docs=D.docs,n=docs.length,ql=D.query_lexemes.map(x=>x[0]),F=SV.facts;
  const lexs=[...new Set(docs.flatMap(d=>d.lexemes.map(l=>l[0])))].sort();
  const tf=docs.map(d=>Object.fromEntries(d.lexemes.map(([l,p])=>[l,p])));
  const B=SV.bm25(docs.map(d=>d.lexemes),ql,1.2,.75),hits=docs.map((d,i)=>ql.some(w=>tf[i][w])?i:-1).filter(i=>i>=0);
  window.CHK=Object.assign(window.CHK||{},{inv:{lexemes:lexs.length,bm25:B.scores.map(v=>+v.toFixed(2)),hits:hits.map(i=>i+1),entries:docs.reduce((a,d)=>a+d.lexemes.length,0)}});
  // the same index as text, in the closed block under the step list
  {const el=document.getElementById('invTab');if(el)el.innerHTML='<table class="mini"><tr><th>Lexeme</th><th>Postings (question:positions)</th></tr>'+lexs.map(l=>'<tr'+(ql.includes(l)?' class="hl"':'')+'><td class="key">'+RD.esc(l)+'</td><td>'+docs.map((d,i)=>tf[i][l]?(i+1)+':'+tf[i][l].join(','):'').filter(Boolean).join(' ')+'</td></tr>').join('')+'</table>'}
  const XL=-3.3,cx=i=>-2.15+i*.8,zr=j=>2.05-j*.31,ZD=-2.55,ZQ=3.05,HT=.24;
  function draw(R,k,e){const P=R.P,wide=R.W>=520;R.grid(-5,3,-3.3,3.6,.5);
    // composition: the index while it is built and used; at step 7 it recedes and the texts are scanned
    const idxA=k===6?.18*(1-e)+.12:1,look=k>=4&&k<=5;
    // the six questions, standing at the back
    docs.forEach((d,i)=>{const hit=hits.includes(i),a=k===4||k===5?(hit?1:.25):k===6?1:k===1?(i===0?1:.45):1;
      const lit=k===6&&e*n>i,fill=lit?mix(P.paper,P.bad,.25):k===1&&i===0?mix(P.paper,P.c1,.25):P.paper;
      R.box([cx(i),0,ZD],[.6,.8,.12],{fill,a});R.label([cx(i),.8,ZD],'Q'+(i+1),{fs:12.5,b:1,mono:true,a,dy:-9})});
    // the dictionary: one tile per lexeme; the guide line of each postings list
    const added=k===0?0:k===1?1:k===2?1+e*(n-1):n;
    lexs.forEach((l,j)=>{const z=zr(j),inQ=ql.includes(l),present=docs.some((d,i)=>i<Math.ceil(added-1e-9)&&tf[i][l]);
      let a=present?1:.14;if(look)a=inQ?1:.16;if(k===3)a=inQ?1:.5;a*=idxA;
      const fill=(look||k===3)&&inQ?mix(P.paper,P.c1,.45):mix(P.paper,P.c1,.15);
      R.box([XL,0,z],[1.15,.1,.24],{fill,a,shadow:false});
      R.line([[XL+.6,.01,z],[cx(n-1)+.3,.01,z]],{c:P.line,w:1,a:a*.8});
      const showLab=wide||(k===1&&tf[0][l])||((look||k===3)&&inQ);
      if(showLab&&a>.1)R.label([XL-.6,.05,z],l,{mono:true,fs:12,al:'right',dx:-4,b:inQ&&(look||k===3),c:inQ&&(look||k===3)?P.c1:P.ink,a:Math.max(.3,a),grp:wide?'lex':undefined,dy:wide?0:(l==='share'?-7:l==='start'?7:0)})});
    // postings entries: a block per (lexeme, question), height = term frequency
    docs.forEach((d,i)=>{const g=k===1&&i===0?e:k===2&&i>0?Math.max(0,Math.min(1,added-i)):i<added?1:0;if(g<=0)return;
      d.lexemes.forEach(([l,pos])=>{const j=lexs.indexOf(l),inQ=ql.includes(l);let a=idxA;if(look)a=inQ?1:.16;
        const h=HT*pos.length*g;R.box([cx(i),0,zr(j)],[.5,Math.max(.01,h),.2],{fill:look&&inQ?mix(P.paper,P.c1,.55):k===1&&i===0||(k===2&&g<1)?mix(P.paper,P.c1,.35):P.paper,a,shadow:false,lw:.7});
        if(look&&inQ&&k===4)R.label([cx(i),h,zr(j)],(i+1)+':'+pos.join(','),{mono:true,fs:12,c:P.c1,a:e,dy:-8,wide:1})});
      // the question's words travel down into the index as it is added
      if((k===1&&i===0)||(k===2&&i>0&&g>0&&g<1))d.lexemes.forEach(([l])=>R.flow([[cx(i),.75,ZD+.1],[cx(i),.25,zr(lexs.indexOf(l))]],{c:P.c1,a:k===1?Math.min(1,e*2):.9,r:.05,n:3,speed:1.4}))});
    if(k===1)R.label([cx(0)+.4,.4,zr(lexs.indexOf('step'))],'"step" × 2',{mono:true,fs:12,b:1,c:P.c1,al:'left',dx:8,a:e});
    // the query, analysed the same way, at the front
    if(k>=3&&k<=5){const qa=k===3?at(k,e,3):1;R.box([XL+.2,0,ZQ],[2.5,.2,.4],{fill:mix(P.paper,P.acc,.15),a:qa});
      R.label([XL+.2,.2,ZQ],'invest · share · start',{mono:true,fs:12.5,b:1,a:qa,dy:-9});
      ql.forEach(l=>{const j=lexs.indexOf(l);if(k===3)R.flowArc([XL+.2,.2,ZQ-.2],[XL,.1,zr(j)],.3,{c:P.acc,a:e,r:.06,n:5})})}
    // look up three postings lists: the reading moves along each list to the questions it names
    if(k===4)ql.forEach(l=>{const j=lexs.indexOf(l),ds=docs.map((d,i)=>tf[i][l]?i:-1).filter(i=>i>=0);
      R.flow([[XL+.6,.12,zr(j)],[cx(ds[ds.length-1]),.12,zr(j)]],{c:P.c1,a:e,r:.06,n:6,speed:1.2});
      ds.forEach(i=>R.flowArc([cx(i),.25,zr(j)],[cx(i),.3,ZD+.1],.25,{c:P.c1,a:e*.8,r:.045,n:4}))});
    if(k===4)R.label([cx(5),.8,ZD],'never read',{fs:12,c:P.mute,a:e,dy:-26});
    // rank: BM25 bars in front of the questions
    if(k===5){const mx=Math.max(...B.scores);docs.forEach((_,i)=>{const v=B.scores[i],h=Math.max(.02,v/mx*1.25*e);
      R.box([cx(i),0,ZD+.5],[.42,h,.42],{fill:v>0?mix(P.paper,P.c1,.7):P.paper,a:1});R.label([cx(i),h,ZD+.5],v.toFixed(2),{mono:true,fs:12.5,b:1,c:P.c1,a:e,dy:-9})});
      R.label([cx(0)-.5,0,ZD+.5],'BM25',{mono:true,fs:12,b:1,c:P.c1,al:'right',dx:-6,a:e,wide:1})}
    // no index: a scan reads every text in turn
    if(k===6){const pts=[];docs.forEach((_,i)=>{pts.push([cx(i)-.3,.45,ZD+.12]);pts.push([cx(i)+.3,.45,ZD+.12])});R.flow(pts,{c:P.bad,a:Math.min(1,e*2),r:.06,n:24,speed:2});
      R.label([cx(2.5),1.15,ZD],'LIKE reads every text: '+F.rows+' on the full table, '+F.like_ms+' ms against '+F.fts_ms+' ms',{fs:12.5,b:1,c:P.bad,a:e,dy:-6})}
  }
  const full={cam:[.28,.72],bounds:[[-4.6,0,-2.8],[2.3,1,3.3]]};
  S3.stage({id:'stg-inv',list:'sx-inv',fig:'An inverted index for six real questions',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1400,hold:5000,draw,
    margin:w=>w<520?[18,8,14,8]:[24,18,18,24],
    view:k=>k===5?{cam:[.2,.5],bounds:[[-3,0,-3],[2.3,1.6,.6]]}:k===6?{cam:[.12,.42],bounds:[[-3,0,-3],[2.3,1.4,-1.4]]}:full});
})();
