// ---- Scene (Reading 2, Fig. 2): total tokens against unique tokens, as nested blocks (renderer v2) ----
// The numbers are Nemotron-CC's Table 4 (arXiv 2412.02595: total tokens, and unique tokens after a global fuzzy deduplication), the
// same three rows the section quotes. Column height is tokens to scale (one footprint each); the solid core is the unique part, the glass
// shell the near-copies. Steps 3 and 4 add two training budgets on the same scale: 100B tokens, and 15T as 15 copies of DCLM-Baseline's
// unique core (15 / 1.0, arithmetic on the table). src/check_stages.mjs checks the step list against window.PCS.uq.
(function(){
  if(!document.getElementById('stg-uq')||!window.S3)return;const {at,off,mix}=S3;
  const U=[['DCLM-Baseline',3.8,1.0],['FineWeb-Edu-2',5.4,1.1],['FineWeb-Edu',1.3,0.2]],RUN=100/1000,BIG=15;
  const K=.42,XS=[-2.5,0,2.5],W=1.25,XT=4.9,NC=Math.round(BIG/U[0][2]);
  window.PCS=window.PCS||{};PCS.uq={rows:U,pct:U.map(r=>Math.round(100*r[2]/r[1])),dup:U.map(r=>100-Math.round(100*r[2]/r[1])),run:RUN,big:BIG,copies:NC,bigOverTotal:Math.round(BIG/U[0][1])};
  const T=v=>v.toFixed(1)+'T';
  function draw(R,k,e){const P=R.P,nw=R.W<520;R.grid(-4.4,6.2,-2.6,2,.5);
    const rec=k===2?0:k>=3?.3:1; // step 3 is about DCLM-Baseline alone: the other columns leave the close-up // steps 3 and 4 are about a budget; the other columns recede
    U.forEach(([nm,tot,uq],i)=>{const x=XS[i],ht=tot*K*(k===0?e:1),hu=uq*K*at(k,e,1),foc=k<2||i===0,a=foc?1:rec;
      // the column: solid while it is a total (step 1), then a glass shell around its unique core
      const sh=k===0?1:1-.75*at(k,e,1);
      R.box([x,0,0],[W,Math.max(.02,ht),W],{fill:k===0?mix(P.paper,P.c1,.25):mix(P.paper,P.c1,.15),fa:sh,a,shadow:sh>.5});
      if(hu>.005)R.box([x,0,0],[W*.82,hu,W*.82],{fill:mix(P.paper,P.c1,.75),a,shadow:false});
      // labels: the total on top, the name and the unique share under the column's front edge; a receded column keeps only its name
      if(foc)R.label([x,ht,0],T(tot)+(k>=1?' total':''),{mono:true,fs:12.5,b:k===0,dy:-12,c:P.ink});
      if(foc||k!==2)R.label([x,0,W/2+.1],nm,{fs:12.5,b:foc,dy:16,c:foc?P.ink:P.mute,a:Math.max(.55,a)});
      if(k>=1&&foc){if(nw)R.label([x,hu,W*.41],T(uq),{mono:true,fs:12,b:1,dy:-10,c:P.c1,a:at(k,e,1)}); // a phone: the core's size on the core
        else R.label([x,0,W/2+.1],T(uq)+' unique · '+Math.round(100*uq/tot)+'%',{mono:true,fs:12.5,b:1,dy:33,c:P.c1,a:at(k,e,1)})}
      // step 2: the near-copies leave the shell for a heap behind its own column
      if(k===1){const y0=hu+.15,y1=ht-.1;for(let j=0;j<3;j++){const y=y0+(y1-y0)*(j+.5)/3;R.flowArc([x+(j-1)*.3,y,-W*.3],[x+(j-1)*.3,.02,-1.75],.12,{c:P.mute,a:.75*e,r:.05,n:5,speed:.9})}
        R.box([x,0,-1.8],[W*.8,.06*e,.35],{fill:mix(P.paper,P.mute,.35),a:e,shadow:false})}});
    if(k===1)R.label([XS[2]+W*.4,.06,-1.8],'near-copies',{fs:12,c:P.mute,al:'left',dx:8,a:e,wide:1});
    // step 3: a 100B-token run beside DCLM-Baseline's unique core
    if(k===2||k===3){const a=k===2?e:.35,x=XS[0]-W/2-.55;R.box([x,0,0],[.7,RUN*K,.7],{fill:P.acc,a,shadow:false});
      R.label([x-.35,RUN*K,0],'100B run',{fs:12.5,b:k===2,al:'right',dx:-8,c:P.acc,a});
      if(k===2)R.flowArc([XS[0]-W*.41,U[0][2]*K*.6,0],[x,RUN*K+.02,0],.18,{c:P.acc,a:e,r:.035,n:4,speed:.8})}
    // step 4: a 15T-token run, drawn as 15 copies of DCLM-Baseline's unique core stacked to the same scale
    if(k===3){const hu=U[0][2]*K,g=Math.max(0,(e-.4)/.6),la=Math.max(0,(e-.65)/.35),n=Math.min(NC,Math.ceil(NC*g-.001));
      for(let j=0;j<n;j++)R.box([XT,j*hu,0],[W*.82,hu*.94,W*.82],{fill:mix(P.paper,P.acc,j===n-1?.7:.45),a:1,shadow:j===0,lw:.6});
      if(n)R.label([XT,n*hu,0],'15T run',{fs:13,b:1,dy:-12,c:P.acc,a:la});
      R.label([XT+W*.41,NC*hu*.5,W*.41],NC+' × the 1.0T core',{mono:true,fs:12.5,al:'left',dx:8,c:P.acc,a:la,wide:1});
      R.flowArc([XS[0]+W*.41,hu,0],[XT-W*.41,hu*Math.max(1,n-.5),0],1.1,{c:P.acc,a:.8*g,r:.05,n:10,speed:1.3})}
  }
  const full={cam:[.5,.42],bounds:[[-4,0,-2.1],[4.4,2.5,1.2]]};
  S3.stage({id:'stg-uq',list:'sx-uq',fig:'Fig. 2 · total and unique tokens, Nemotron-CC Table 4',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,12,14,12]:[22,26,18,26],
    // step 3 moves in close on DCLM-Baseline's base; step 4 pulls back to fit the 15T tower
    view:k=>k===2?{cam:[.55,.3],bounds:[[-4.1,0,-1.1],[-1.1,1.7,1.2]]}:k===3?{cam:[.5,.3],bounds:[[-4.2,0,-2.1],[6.6,6.4,1.4]]}:full});
})();
