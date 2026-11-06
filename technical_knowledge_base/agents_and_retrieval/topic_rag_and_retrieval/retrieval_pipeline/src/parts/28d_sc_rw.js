// ---- Scene: Fig. 4, one claim rewritten four ways (renderer v2). The claim is the one chosen in the rewrite widget below (RPD.qr: real SciFact claims,
// rewrites written by Qwen3-1.7B, bge-small top 10 over all 5,183 abstracts, the annotators' relevant abstract). The last step's towers are
// nDCG@10 over all 300 test claims with bge-small (RPD.root_qtrans for the root's three rewrites, RPD.qrewrite.step_back for step-back). ----
(function(){
  if(!document.getElementById('stg-rw')||!window.RPD||!RPD.qr)return;const {at,off,lerp,mix}=S3;
  const QR=RPD.qr,RT=RPD.root_qtrans['bge-small'],SB=RPD.qrewrite.step_back['bge-small'];
  const ROWS=[['original','original claim'],['HyDE passage','HyDE passage'],['HyDE + claim','HyDE + claim, averaged'],['multi-query (RRF)','3 rewordings, RRF'],['step-back','step-back question']];
  const Z=[2.2,1.1,0,-1.1,-2.2],x=i=>-3.6+i*.9,XQ=-5.4,XG=-6.6;
  const AGG=[['original',RT.original.ndcg10],['HyDE',RT.hyde.ndcg10],['HyDE + claim',RT['hyde+claim'].ndcg10],['multi-query',RT['multi-query'].ndcg10],['step-back',SB['step-back'].ndcg10]];
  function claim(){const s=document.getElementById('rp-qr-q');return QR.claims[s?+s.value||0:0]}
  const rk=(L,rel)=>{const j=L.findIndex(v=>rel.includes(v[0]));return j<0?null:j+1};
  function row(R,C,j,a,k,e){const P=R.P,[key,lab]=ROWS[j],L=C.lists[key];if(!L||a<=.01)return;const z=Z[j],orig=new Set(C.lists.original.map(v=>v[0]));
    L.slice(0,10).forEach(([d],i)=>{const rel=C.rel.includes(d);R.box([x(i),0,z],[.6,rel?.75:.22,.6],{fill:rel?P.good:orig.has(d)||j===0?P.paper:mix(P.paper,P.c4,.35),a})});
    const r=rk(L,C.rel);if(a>=.4)R.label([x(9)+.45,.1,z],r?'relevant at rank '+r:'relevant not in top 10',{al:'left',dx:12,mono:true,fs:12.5,b:1,c:r?P.good:P.bad,a});
    // the query object: the claim, a long generated passage, three short rewordings, or one general question
    const len=j===0?C.q.length:(C.texts[key]||'').length,h=Math.min(.9,.12+len/1400);
    if(j===3)[0,1,2].forEach(m=>R.box([XQ,0,z-.25+m*.25],[.45,.18,.2],{fill:mix(P.paper,P.q,.5),a}));
    else if(j===2){R.box([XQ-.15,0,z],[.3,.2,.5],{fill:mix(P.paper,P.q,.25),a});R.box([XQ+.2,0,z],[.3,.75,.5],{fill:mix(P.paper,P.q,.6),a})}
    else R.box([XQ,0,z],[.55,h,.55],{fill:j===0?P.paper:mix(P.paper,P.q,.6),a});
    if(a>=.4)R.label([XQ-.4,.1,z],lab,{al:'right',dx:-6,mono:true,fs:12,c:j===0?P.ink:P.q,a});
    if(k===j&&e>0){R.flowArc([XQ+.35,.25,z],[x(r?r-1:0),.3,z],.5,{c:j===0?P.c1:P.q,a:e,n:7,speed:1.4})}}
  function draw(R,k,e){const P=R.P,C=claim();R.grid(-7.2,5.6,-2.8,2.8,.5);
    // the generator: one glass plate the claim goes through for every rewrite
    if(k>=1&&k<=4){R.glass([XG,0,-2.6],[0,0,5.2],[0,1.1,0],{c:P.q,a:.75,nu:8,nv:3});R.label([XG,1.15,-.2],'Qwen3-1.7B',{fs:12.5,b:1,dy:-8,c:P.q,wide:1});
      R.flowArc([XQ,.3,Z[0]],[XG,.6,Z[0]-.4],.3,{c:P.q,a:e,n:4,speed:1.3});R.flowArc([XG,.6,Z[k]+.2],[XQ-.3,.3,Z[k]],.3,{c:P.q,a:e,n:5,speed:1.3})}
    for(let j=0;j<5;j++){const a=k===5?lerp(j===0?.35:.15,0,e):j===k?(j===0?1:e):j===0&&k>0?.35:j<k?.15:0;row(R,C,j,a,k,e)}
    if(k===5){const vs=AGG.map(a=>a[1]),b0=Math.floor(Math.min(...vs)*10)/10-.1,sc=1.8/(Math.max(...vs)-b0);
      AGG.forEach(([lab,v],j)=>{const xx=-3.6+j*1.9,h=(v-b0)*sc*e,c=j===0?P.ink:v>AGG[0][1]?P.good:P.bad;R.box([xx,0,0],[.9,Math.max(.012,h),.8],{fill:j===0?P.paper:mix(P.paper,c,.55),a:.95});
        R.label([xx,h,0],v.toFixed(3),{mono:true,fs:13,b:1,dy:-12,c,a:e});R.label([xx,0,.45],lab,{fs:12.5,b:1,dy:16,c:P.ink,a:e,grp:'ag'})});
      R.label([-4.4,2.3,0],'nDCG@10, 300 SciFact claims, bge-small (bars from '+b0.toFixed(1)+')',{al:'left',fs:12.5,c:P.mute,a:e,wide:1})}
  }
  function readout(){const C=claim(),el=document.getElementById('rp-rw-out');if(!el)return;
    el.innerHTML='<b>This claim, the relevant abstract:</b> '+ROWS.map(([k,l])=>{const r=rk(C.lists[k]||[],C.rel);return l.split(',')[0]+' '+(r?'rank '+r:'not in the top 10')}).join(' · ')+'. Pick another claim in the widget below.'}
  const full={cam:[.3,.66],bounds:[[-7.4,0,-2.6],[6.4,1.0,2.6]]};
  const st=S3.stage({id:'stg-rw',list:'sx-rw',fig:'Fig. 4 · one claim, four rewrites',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,16,18,16],
    view:k=>k===0?{cam:[.3,.62],bounds:[[-6.6,0,1.0],[6.2,1.0,3.0]]}:k===5?{cam:[.2,.42],bounds:[[-4.6,0,-.6],[4.6,2.6,.8]]}:full,onStep:()=>{try{readout()}catch(err){}}});
  // the widget's selects are filled by a later script: read the chosen query once they exist
  setTimeout(()=>{try{readout()}catch(err){}},0);RP.onTab('t-read',()=>{try{readout()}catch(err){}});
  const s=document.getElementById('rp-qr-q');if(s)s.addEventListener('change',()=>setTimeout(()=>{readout();st.draw()},0));
})();
