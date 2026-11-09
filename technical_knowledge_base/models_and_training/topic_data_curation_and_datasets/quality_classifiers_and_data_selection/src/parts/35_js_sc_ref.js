// ---- Scene (Reading 2, Fig. 2): six reference sets, one recipe, the same 2,617 run0 documents (renderer v2) ----
// One lane per fastText classifier (a glass plate); rows from front to back: overlap of its top 10% with DCLM's, hand-label precision,
// AUC against Llama 3's educational grades, and DCLM's published 7B-1x Core for the reference sets DCLM trained on (Table 5).
// Every measured number is window.QC.reftab (src/scripts/qc_model_all.py and qc_make_data.py); Core is window.QC.t5.
(function(){
  if(!document.getElementById('stg-ref')||!window.S3||!window.QC||!QC.reftab||!QC.t5)return;const {at,mix}=S3;
  const KS=['dclm','oh_eli5_200k','oh_eli5_50k','wiki_50k','owt2_50k','gpt3_50k'],T=KS.map(k=>QC.reftab.find(r=>r.key===k));
  const NM=['DCLM (published)','OH + ELI5 200k','OH + ELI5 50k','Wikipedia 50k','OpenWebText 50k','GPT-3 approx 50k'],SH=['DCLM','OH 200k','OH 50k','Wiki','OWT','GPT-3'];
  const CORE=[QC.t5[0].core,null,null,QC.t5[1].core,QC.t5[2].core,QC.t5[3].core]; // Table 5 rows: OH-2.5 + ELI5, Wikipedia, OpenWebText2, GPT-3 Approx (top 10%)
  const COL=['c1','c1','c1','c2','c4','c5'];
  const n=KS.length,X=i=>(i-(n-1)/2)*1.3,ZP=2.6,Z=[ZP,1.3,0,-1.3,-2.6],W=.62,HJ=1.6,HP=1.6,HA=1.4,HC=1.8;
  const pc=x=>Math.round(x*100)+'%';
  const ROWS=[null,{v:t=>t.j_dclm,h:v=>v*HJ,l:(v,t,i)=>i===0?'itself':pc(v)},{v:t=>t.hand_prec,h:v=>v*HP,l:(v,t)=>pc(v)+' ('+t.hand_kept+')'},
    {v:t=>t.annot_auc,h:v=>Math.max(.02,(v-.5)/.3*HA),l:v=>v.toFixed(3)},{v:(t,i)=>CORE[i],h:v=>v/45*HC,l:v=>v.toFixed(1)}];
  const RN=['classifier','overlap with DCLM','hand precision','Llama AUC','Core, 7B-1x'];
  window.QCRS={T,CORE}; // for src/check_stages.mjs
  function draw(R,k,e){const P=R.P,nw=R.W<520;R.grid(-4.8,4.8,-3.3,3.6,.5);
    const ra=r=>r===k?1:r<k?.22:0;
    // rows still to come, as empty footprints
    KS.forEach((_,i)=>[1,2,3,4].forEach(r=>{if(r>k)R.box([X(i),0,Z[r]],[W,.015,.5],{fill:P.paper,a:.3,shadow:false})}));
    KS.forEach((key,i)=>{const t=T[i],x=X(i),c=P[COL[i]];
      // the classifier: positives in, one glass plate per reference set
      const pa=k===0?1:.4;R.glass([x-W/2-.05,0,ZP],[W+.1,0,0],[0,.75,0],{c,a:pa,nu:4,nv:4});
      R.label([x,0,Z[k]+.3],nw?SH[i]:NM[i],{fs:12,b:1,dy:i%2?(nw?27:30):14,c}); // lane names under the row the step is about, so they stay in view
      if(k===0)R.flowArc([x,.2,ZP+1.0],[x,.45,ZP+.05],.3,{c,a:.8,r:.05,n:5,speed:1.1});
      for(let r=1;r<=4;r++){const a=ra(r);if(a<=0)continue;const v=ROWS[r].v(t,i);
        if(v==null){if(r===k)R.box([x,0,Z[r]],[W,.015,.5],{fill:P.paper,a:.5,shadow:false});continue}
        const g=r===k?e:1,h=Math.max(.02,ROWS[r].h(v)*g),fill=r===4?mix(P.paper,c,.85):mix(P.paper,c,.4+.12*r);
        R.box([x,0,Z[r]],[W,h,.5],{fill,a});
        if(r===k){R.flow([[x,.35,Z[r-1]-(r===1?0:.1)],[x,.3,Z[r]+.32]],{c,a:.8,r:.05,n:4});R.label([x,ROWS[r].h(v),Z[r]],ROWS[r].l(v,t,i),{mono:true,fs:12.5,b:1,dy:-11,c:P.ink,a:e})}}});
    if(k===3)R.label([X(n-1)+.45,(.5-.5)/.3*HA,Z[3]],'0.5 = chance',{al:'left',dx:6,fs:12,c:P.mute,wide:1});
    if(k===4)R.label([(X(1)+X(2))/2,.15,Z[4]-.2],'same set as DCLM, no run',{fs:12,c:P.mute,dy:-8,wide:1});
    RN.forEach((t,r)=>{if(r!==k&&r!==k-1)return;R.label([X(0)-.5,0,Z[r]],t,{al:'right',dx:-6,fs:12,mono:true,c:r===k?P.ink:P.mute,grp:'row'})});}
  const zoom=r=>({cam:[.18,.5],bounds:[[-4.4,0,Z[r]-.6],[4.2,1.9,Z[r-1]+.6]]});
  S3.stage({id:'stg-ref',list:'sx-ref',fig:'Fig. 2 · six reference sets, the same pages',cam:[.18,.6],bounds:[[-4.4,0,-3.0],[4.2,1.9,3.8]],aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[18,10,18,10]:[22,16,28,16],
    view:k=>k===0?{cam:[.18,.42],bounds:[[-4.4,0,1.9],[4.2,1.2,3.8]]}:zoom(k)});
})();
