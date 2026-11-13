// ---- Scene (Reading 3, Fig. 2): the same 20,280 pages through six extractors, then the same filters (renderer v2) ----
// One lane per extractor; rows from front to back: the extraction step (a glass plate), characters extracted (own scale), English documents
// and kept documents (one scale, so the drop from English to kept reads as heights); the last step colours the part of each kept column
// that FineWeb also kept. Every number is window.EF.chain (src/scripts/ef_chain.py on the recorded extractions).
(function(){
  if(!document.getElementById('stg-x6')||!window.S3||!window.EF||!EF.chain)return;const {lerp,mix,cl}=S3;
  const H=EFH,C=EF.chain,KS=['traf111','traf231','res','justext','readability','wet'].filter(k=>C[k]);
  const NM={traf111:'trafilatura 1.11',traf231:'trafilatura 2.3.1',res:'resiliparse',justext:'jusText',readability:'readability',wet:'WET'};
  const SH={traf111:'T 1.11',traf231:'T 2.3',res:'Res',justext:'jusT',readability:'Read',wet:'WET'}; // lane names on a phone
  const COL={traf111:'c1',traf231:'c6',res:'c3',justext:'c5',readability:'c4',wet:'c2'};
  const n=KS.length,X=i=>(i-(n-1)/2)*1.3,ZP=2.35,ZC=1.15,ZE=0,ZK=-1.15,W=.62;
  const MC=Math.max(...KS.map(k=>C[k].chars)),MD=Math.max(...KS.map(k=>C[k].english)),HC=2.0/MC,HD=1.7/MD;
  const mc=v=>(v/1e6).toFixed(1)+' M';
  function draw(R,k,e){const P=R.P,nw=R.W<520;R.grid(-4.6,4.6,-1.9,3.3,.5);
    const ra=row=>row===k?1:k===4?0:row<k?(k===3&&row===2?.45:.22):0; // the last step is about the kept row alone // the current row at full strength, earlier ones recede
    // the pages and the six extraction plates
    const pa=k===0?1:.3;R.box([0,0,4.15],[2.6,.16,.36],{fill:mix(P.paper,P.ink,.06),a:pa});
    R.label([0,0,4.15],H.n(C[KS[0]].pages)+' pages, the same for every lane',{fs:12.5,b:k===0,dy:16,c:P.ink,a:Math.max(.5,pa)});
    // the rows still to come, as empty footprints, so the layout shows from the first step
    KS.forEach((key,i)=>[[1,ZC],[2,ZE],[3,ZK]].forEach(([row,z])=>{if(row>k)R.box([X(i),0,z],[W,.015,.5],{fill:P.paper,a:.3,shadow:false})}));
    KS.forEach((key,i)=>{const x=X(i),c=P[COL[key]];
      R.glass([x-W/2-.06,0,ZP],[W+.12,0,0],[0,.55,0],{c,a:k===0?1:.5,nu:4,nv:3});
      if(nw)R.label([x,0,ZP+.05],SH[key],{fs:12,b:1,dy:14,c});else R.label([x,0,ZP+.05],NM[key],{fs:12,b:1,dy:i%2?30:14,c});
      if(k===0){R.flowArc([x*.3,.16,4.0],[x,.3,ZP+.05],.35,{c,a:.8,r:.05,n:6,speed:1.2});R.label([x,.55,ZP],H.n(C[key].with_text),{mono:true,fs:12,dy:-10,c:P.ink,a:e,wide:1})}
      // characters extracted
      const a1=ra(1);if(a1>0){const g=k===1?e:1,h=Math.max(.02,C[key].chars*HC*g);R.box([x,0,ZC],[W,h,.5],{fill:mix(P.paper,c,.55),a:a1});
        if(k===1){R.flow([[x,.3,ZP],[x,.2,ZC+.3]],{c,a:.8,r:.05,n:4});R.label([x,h,ZC],mc(C[key].chars),{mono:true,fs:12,dy:-11,c:P.ink,a:e,wide:1})}}
      // English documents
      const a2=ra(2);if(a2>0){const g=k===2?e:1,h=Math.max(.02,C[key].english*HD*g);R.box([x,0,ZE],[W,h,.5],{fill:mix(P.paper,c,.75),a:a2});
        if(k===2){R.flow([[x,.25,ZC],[x,.2,ZE+.3]],{c,a:.8,r:.05,n:4});R.label([x,h,ZE],H.n(C[key].english),{mono:true,fs:12,dy:-11,c:P.ink,a:e,wide:1})}
}
      // kept after the same rules, and the part FineWeb also kept
      if(k>=3){const g=k===3?e:1,h=Math.max(.02,C[key].kept*HD*g),hf=C[key].kept_in_fineweb*HD;
        if(k===4){R.box([x,0,ZK],[W,hf,.5],{fill:mix(P.paper,P.good,.7),a:1,lw:.6});R.box([x,hf,ZK],[W,Math.max(.01,h-hf),.5],{fill:mix(P.paper,c,.8),a:1,shadow:false,lw:.6})}
        else R.box([x,0,ZK],[W,h,.5],{fill:mix(P.paper,c,.8),a:1});
        if(k===3){R.flow([[x,.2,ZE],[x,.15,ZK+.3]],{c,a:.8,r:.05,n:Math.max(2,Math.round(8*C[key].kept/3231))});R.label([x,h,ZK],H.n(C[key].kept),{mono:true,fs:12.5,b:1,dy:nw&&i%2?-26:-11,c:P.ink,a:e})}
        if(k===4){R.label([x,h,ZK],'of '+H.n(C[key].kept),{mono:true,fs:12,dy:-11,c:P.ink,wide:1});R.label([x,h,ZK],H.n(C[key].kept_in_fineweb),{mono:true,fs:12.5,b:1,dy:-26,c:P.good,wide:1})}}});
    // the row names, at the left of each row
    const RN=[[ZP,'extract'],[ZC,'characters'],[ZE,'English > 0.65'],[ZK,k===4?'kept · in FineWeb':'kept']];
    RN.forEach(([z,t],r)=>{if(r>k||(k===4&&(r===1||r===2)))return;R.label([X(0)-.45,0,z],t,{al:'right',dx:-6,fs:12,mono:true,c:r===k?P.ink:P.mute,grp:'row'})});
    if(nw)R.label([0,0,4.15],['','characters extracted','English documents','kept documents','kept · FineWeb also kept (green)'][k]||null,{fs:12,b:1,dy:34,c:P.ink})}
  const full={cam:[.12,.62],bounds:[[-4.3,0,-1.5],[4.3,2.1,4.3]]};
  S3.stage({id:'stg-x6',list:'sx-x6',fig:'Fig. 2 · six extractors, the same filters',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,22,10]:[18,14,26,16],
    view:k=>k===4?{cam:[.15,.42],bounds:[[-4.3,0,-1.5],[4.3,1.0,2.9]]}:k===0?{cam:[.12,.85],bounds:[[-4.1,0,1.8],[4.1,.9,4.5]]}:full});
})();
