// ---- Scene (Reading 7, Fig. 3): run0's 6,971 English documents through the four rule families (renderer v2) ----
// Documents travel left to right through one glass gate per family; behind each gate one pile per rule, its height the documents that
// rule removed first (window.EF.wb.reasons, datatrove 0.10.1); columns between the gates are the survivors (window.EF.pipe.run0).
// The last step tops each pile with the share of its hand-labelled sample that was worth keeping (window.EF.labels.summary).
(function(){
  if(!document.getElementById('stg-gate')||!window.S3||!window.EF||!EF.wb||!EF.pipe)return;const {lerp,mix,cl}=S3;
  const H=EFH,RS=EF.wb.reasons||{},R0=EF.pipe.run0,LS=(EF.labels&&EF.labels.summary)||{};
  const FAM=[['Gopher repetition',['dup_line_frac','dup_line_char_frac','top_2_gram','top_3_gram','top_4_gram','duplicated_5_n_grams','duplicated_6_n_grams','duplicated_7_n_grams','duplicated_8_n_grams','duplicated_9_n_grams','duplicated_10_n_grams']],
    ['Gopher quality',['gopher_short_doc','gopher_above_avg_threshold','gopher_too_many_ellipsis','gopher_too_many_bullets','gopher_too_many_end_ellipsis','gopher_below_alpha_threshold','gopher_enough_stop_words']],
    ['C4',['too_few_sentences','curly_bracket','lorem_ipsum']],['FineWeb',['line_punct_ratio','short_line_ratio','char_dup_ratio']]];
  const SHORT={dup_line_frac:'duplicate lines',gopher_below_alpha_threshold:'words with a letter',gopher_short_doc:'under 50 words',too_few_sentences:'under 5 sentences',line_punct_ratio:'line punctuation',char_dup_ratio:'duplicated-line characters',gopher_too_many_bullets:'bullet lines',curly_bracket:'curly bracket',top_4_gram:'top 4-gram'};
  const SURV=[R0.english,R0.gopher_rep,R0.gopher_qual,R0.c4,R0.fineweb];
  const GX=[-3.55,-1.25,1.05,3.25],CX=[-5.1,-2.45,-.15,2.15,4.45],ZT=-.75,ZP=1.0,PW=.13,PI=.17;
  const CS=2.2/SURV[0],PS=1.45/Math.max(...FAM.flatMap(f=>f[1].map(k=>RS[k]||0)));
  const px=(g,j)=>GX[g]+(j-(FAM[g][1].length-1)/2)*PI;
  // what the step list quotes, for src/check_stages.mjs
  window.EFS=window.EFS||{};EFS.gate={surv:SURV,drops:FAM.map(f=>f[1].reduce((s,k)=>s+(RS[k]||0),0)),rs:RS,ls:LS};
  const wrong=k=>{const s=LS['drop:'+k];return s&&s.n?s.W/s.n:null};
  function draw(R,k,e){const P=R.P,nw=R.W<520;R.grid(-6,5.4,-2,2,.5);
    const ga=g=>k===0?.35:k>=5?.8:g+1===k?1:g+1<k?.2:.18; // the current gate at full strength
    // survivor columns: the input, then the column after each gate
    SURV.forEach((v,c)=>{const on=c===0||c<=k,cur=(c===0&&k===0)||(c===k&&k>=1&&k<=4)||(c===4&&k>=4),g=c===k&&k>=1&&k<=4?e:1;
      if(!on){R.box([CX[c],0,ZT],[.7,.02,.7],{fill:P.paper,a:.3,shadow:false});return}
      const h=v*CS*g,a=cur||k>=5?1:k>=1&&c<k-1?.2:.45;R.box([CX[c],0,ZT],[.7,Math.max(.02,h),.7],{fill:c===4&&k>=4?mix(P.paper,P.good,.6):mix(P.paper,P.c1,.35),a});
      if(cur||k===0||(k>=5&&(c===0||c===4)))R.label([CX[c],h,ZT],H.n(v),{mono:true,fs:12.5,b:cur,dy:-12,c:c===4&&k>=4?P.good:P.ink})});
    if(k===0)R.label([CX[0],0,ZT+.4],'English documents',{fs:12,dy:16,c:P.mute,wide:1});
    if(k>=4)R.label([CX[4],0,ZT+.4],'kept',{fs:12.5,b:1,dy:16,c:P.good});
    FAM.forEach(([nm,ks],g)=>{const a=ga(g),cur=g+1===k,done=g+1<=k;
      // the gate
      R.glass([GX[g],0,ZT-.55],[0,0,1.1],[0,1.25,0],{c:P.c2,a:a*.95,nu:3,nv:4});
      if(k===0||cur)R.label([GX[g],1.25,ZT],nm,{fs:13,b:cur,dy:-10,c:cur?P.ink:P.mute}); // only the gate the step is about is named once the camera moves in
      // the piles: empty slots until the gate's step
      ks.forEach((key,j)=>{const x=px(g,j),v=RS[key]||0;
        if(!done){R.box([x,0,ZP],[PW,.015,.5],{fill:P.paper,a:.35,shadow:false});return}
        const gr=cur?e:1,h=Math.max(k>=5?.06:.015,v*PS*gr),pa=cur||k>=5?1:.2;
        const w=k>=5?wrong(key):null; // a red cap too thin to see as a slab is left out (its top face would read as an all-red pile)
        if(w!=null&&h*w>=.03){const hw=h*w;R.box([x,0,ZP],[PW,h-hw,.5],{fill:mix(P.paper,P.mute,.3),a:pa,shadow:false,lw:.5});R.box([x,h-hw,ZP],[PW,hw,.5],{fill:P.bad,a:pa,shadow:false,lw:.5})}
        else R.box([x,0,ZP],[PW,h,.5],{fill:k>=5?mix(P.paper,P.mute,.3):mix(P.paper,P.c2,.55),a:pa,shadow:false,lw:.5})});
      // documents flow through the current gate into the next column, the dropped ones into the piles
      if(cur){const sv=SURV[g+1]/SURV[0],dr=(SURV[g]-SURV[g+1])/SURV[0];
        R.flow([[CX[g]+.36,.45,ZT],[GX[g],.5,ZT],[CX[g+1]-.36,.4,ZT]],{c:P.c1,a:.85,r:.06,n:Math.max(3,Math.round(12*sv))});
        ks.forEach((key,j)=>{const v=RS[key]||0;if(v<10)return;R.flowArc([GX[g],.45,ZT+.2],[px(g,j),v*PS*e+.05,ZP],.35,{c:P.c2,a:.8,r:.035+.03*Math.sqrt(v/1025),n:Math.max(2,Math.round(2+6*v/1025)),speed:1.1})});
        R.label([GX[g],0,ZP+.25],'-'+H.n(SURV[g]-SURV[g+1]),{mono:true,fs:13,b:1,dy:16,c:P.bad,a:e});
        // the largest piles, named
        ks.map((key,j)=>[RS[key]||0,key,j]).sort((a,b)=>b[0]-a[0]).slice(0,g===2?3:2).forEach(([v,key,j])=>R.label([px(g,j),v*PS,ZP],(SHORT[key]||key)+' · '+H.n(v),{fs:12,dy:-12,c:P.ink,a:e,grp:'pile'+g}))}});
    // the last step: the labelled share on the safe and misfiring piles
    if(k>=5){[['gopher_short_doc',1],['gopher_too_many_bullets',1],['curly_bracket',2],['char_dup_ratio',3]].forEach(([key,g])=>{const j=FAM[g][1].indexOf(key),s=LS['drop:'+key];if(!s)return;
      R.label([px(g,j),(RS[key]||0)*PS,ZP],(SHORT[key]||key)+': '+s.W+' of '+s.n,{fs:12,b:s.W>3,dy:-12,c:s.W>3?P.bad:P.ink,a:e,grp:'lab'})})}
  }
  const full={cam:[.42,.55],bounds:[[-5.6,0,-1.3],[5,2.3,1.5]]};
  const zoom=g=>({cam:[.45,.5],bounds:[[CX[g]-.6,0,-1.3],[CX[g+1]+.6,2.3,1.5]]});
  S3.stage({id:'stg-gate',list:'sx-gate',fig:'Fig. 3 · 6,971 documents through the rule gates',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[24,16,26,16],
    view:k=>k>=1&&k<=4?zoom(k-1):k>=5?{cam:[.42,.5],bounds:[[-5.6,0,-1.3],[5,1.9,1.5]]}:full});
})();
