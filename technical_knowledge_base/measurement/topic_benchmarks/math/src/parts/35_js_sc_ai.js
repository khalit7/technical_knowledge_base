// ---- Scene: Fig. 2, the same samples scored three ways (stg-ai, renderer v2) ----
// AIME 2025 I problem 15 (MathArena problem 15), the four released answers of nine models from window.MA, graded against the key and scored by
// window.MC (pass@1 the mean, maj@4 exact over the four with ties split, pass@4 the unbiased estimator); the last step scores all 30 problems.
// Rows are models (front: oldest), columns runs 1 to 4; three result columns fill one per rule.
(function(){
  if(!document.getElementById('stg-ai')||!window.S3||!window.MA||!window.MC)return;const {mix,cl,lerp}=S3;
  const comp=MA.comps.find(c=>c.k==='aime_2025'),PI=14,prob=comp.probs[PI];
  const SHOW=['gpt-4o','o1 (medium)','DeepSeek-R1','Claude-3.7-Sonnet (Think)','o3 (high)','o4-mini (high)','Grok 4','GPT-5 (high)','GPT-5.2 (high)'];
  const LBL={'gpt-4o':'GPT-4o','o1 (medium)':'o1 (medium)','DeepSeek-R1':'DeepSeek-R1','Claude-3.7-Sonnet (Think)':'Claude 3.7 Sonnet (thinking)','o3 (high)':'o3 (high)','o4-mini (high)':'o4-mini (high)','Grok 4':'Grok 4','GPT-5 (high)':'GPT-5 (high)','GPT-5.2 (high)':'GPT-5.2 (high)'};
  const S=SHOW.map(n=>comp.models.find(m=>m.n===n)).filter(Boolean).map(m=>({m,st:MC.stats(m,comp.n)}));
  const rows=S.map(x=>x.st.D[PI]);
  const sc=row=>{const v=row.filter(x=>x!==null),c=v.filter(x=>x===0).length;return [c/row.length,MC.majk(row,4),MC.passk(v.length,c,4)]};
  const PS=rows.map(sc),EX=S.map(x=>[x.st.p1/100,x.st.maj[3]/100,x.st.pk[3]/100]);
  const cntAll={};let tot=0;comp.models.forEach(m=>MC.decode(m,comp.n)[PI].forEach(x=>{if(x!==null){cntAll[x]=(cntAll[x]||0)+1;tot++}}));
  const topWrong=+Object.keys(cntAll).filter(k=>k!=='0').sort((a,b)=>cntAll[b]-cntAll[a])[0];
  const wHere=rows.reduce((a,r)=>a+r.filter(x=>x===topWrong).length,0);
  const ans=x=>x===null?'none':prob.d[x];
  const gap=EX.map(v=>Math.max(...v)-Math.min(...v)),gi=gap.indexOf(Math.max(...gap));
  window.MAS=window.MAS||{};MAS.ai={key:prob.d[0],wrong:prob.d[topWrong],wHere,wAll:cntAll[topWrong],tot,ps:PS.map(v=>v.map(x=>Math.round(100*x))),ex:EX.map(v=>v.map(x=>+(100*x).toFixed(1))),names:S.map(x=>LBL[x.m.n]),maxGap:+(100*gap[gi]).toFixed(1),maxGapModel:LBL[S[gi].m.n]};
  const pe=document.getElementById('ai-prob');if(pe)pe.innerHTML='<span class="plab">AIME 2025 I, problem 15 (MathArena problem '+prob.i+')</span>'+prob.q+' <span class="gold">'+prob.d[0]+'</span>';
  const NR=rows.length,RX=k=>-3.3+k*.95,ZR=j=>(j-(NR-1)/2)*.86,BX=[.6,2.8,5.0],BL=1.3,CS=.6;
  const RULE=['pass@1','maj@4','pass@4'],none=v=>v===null||prob.d[v]==='(no answer)';
  function draw(R,k,e){const P=R.P;R.grid(-4.4,7.2,-4.4,4.6,.5);
    const COL=[P.c1,P.c4,P.c3];
    const rowA=j=>k===3?(j>=1&&j<=3||j===7?1:.22):1;
    rows.forEach((row,j)=>{const z=ZR(j),win=MC.winners(row),a=rowA(j);
      R.label([RX(0)-.5,0,z],LBL[S[j].m.n],{al:'right',dx:-6,fs:12.5,c:P.ink,grp:'mod',a:Math.max(.4,a)});
      row.forEach((v,r)=>{const x=RX(r),g=k===0?cl(e*1.6-r*.15,0,1):1,graded=k>=1,col=!graded?null:v===0?P.good:none(v)?P.mute:P.bad;
        const vote=k===3&&v!==null&&win.indexOf(v)>=0,lift=vote?.28*e:0;
        const fill=col?mix(P.paper,col,k===1?.6*e:.6):P.paper,ca=(k===5?.22:1)*a*g;
        R.box([x,lift,z],[CS,CS*.5,CS*.8],{fill,a:ca,lw:vote?1.8:.9,ec:vote?P.c4:null});
        if(k<5&&a>.5)R.label([x,CS*.5+lift,z],none(v)?'none':ans(v),{mono:true,fs:12,dy:-8,c:v===0&&k>=1?P.good:v===topWrong&&k>=1?P.bad:P.ink,a:ca,wide:1,b:v===0&&k>=1})});
      // result bars, flat on the floor along x: one column per rule, filling at steps 3, 4 and 5; at step 6 they become the whole exam's scores
      [0,1,2].forEach(q=>{if(k<q+2)return;const t=k===q+2?e:1,v=k===5?lerp(PS[j][q],EX[j][q],e):PS[j][q],L=Math.max(.02,v*BL*t),aa=k===3?(q===1?a:.25):1;
        R.box([BX[q]+L/2,0,z],[L,.14,.5],{fill:mix(P.paper,COL[q],.6),a:aa,shadow:false});R.box([BX[q]+BL/2,0,z],[BL,.02,.5],{fill:mix(P.paper,COL[q],.12),a:aa*.8,shadow:false,edge:false});
        if(k===q+2&&v>0&&a>.5)R.flow([[RX(3)+.35,.15,z],[BX[q],.12,z]],{c:COL[q],a:.75*a,r:.05,n:5});
        const lab=(k===5?(Math.round(1000*v)/10).toFixed(1):Math.round(100*v))+'%';
        if((k===q+2||k===5)&&aa>.5)R.label([BX[q]+L,.14,z],lab,{mono:true,fs:12,al:'left',dx:5,c:COL[q],wide:1,b:k===5})});
    });
    const zf=ZR(NR-1)+.6;
    [0,1,2].forEach(q=>{if(k>=q+2)R.label([BX[q]+BL/2,0,zf],RULE[q],{mono:true,fs:12.5,b:1,dy:14,c:COL[q]})});
    if(k===5)R.label([BX[1]+BL/2,.14,ZR(0)-.55],'all 30 problems',{fs:13,b:1,dy:-8,c:P.ink,a:e});
    for(let r=0;r<4;r++)if(k<5)R.label([RX(r),0,zf],'run '+(r+1),{fs:12,dy:14,c:P.mute,wide:1});
  }
  const full={cam:[.1,.95],bounds:[[-3.8,0,-4.3],[6.9,.6,4.3]]};
  S3.stage({id:'stg-ai',list:'sx-ai',fig:'Fig. 2 · 36 real answers, three scores',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[16,14,16,170],
    view:k=>k===3?{cam:[.2,.8],bounds:[[-3.8,0,ZR(1)-.5],[4.2,.6,ZR(7)+.6]]}:full});
})();
