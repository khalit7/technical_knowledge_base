// ---- Scene: capability against observability (renderer v2), from Table 12 as printed (PAPER.tables.T12) and Table 13's paired intervals ----
// One bar field per multiday corpus: three monitors (GPT-4.1-mini, GPT-4.1, GPT-5.5) along x, the three cumulative observability levels
// (audit events, + tool results, + agent reasoning) in depth, height R@10/day. Each level's trace is a glass plate at the left of its row,
// and its contents stream into the monitors that read it. Steps: the empty grid, the audit row, + tool results, + reasoning,
// the comparison GPT-4.1 with reasoning against audit-only GPT-5.5, then all four corpora.
(function(){
  if(!document.getElementById('stg-obs')||!window.PAPER)return;const {at,lerp,mix}=S3;
  const G=['GPT-5.3','Kimi','Qwen','DeepSeek'],GN={'GPT-5.3':'GPT-5.3 Chat','Kimi':'Kimi-K2.6','Qwen':'Qwen3.6-27B','DeepSeek':'DeepSeek-V4-Flash'},
    MO=['GPT-4.1-mini','GPT-4.1','GPT-5.5'],LV=['audit events','+ tool results','+ agent reasoning'];
  const V={};PAPER.tables.T12.forEach(r=>{(V[r[0]]=V[r[0]]||{})[r[1]]=r.slice(2,5).map(c=>+c.split('/')[1])});
  window.MOLE_OBS=()=>({V,npos:PAPER.rc.t12_npos});
  const MX=.95,LZ=[1.05,0,-1.05],BW=4.2,HS=2.4,F=3;               // F: the DeepSeek block, which the first steps are about
  const bx=(g,m)=>(g-1.5)*BW+(m-1)*MX;
  function draw(R,k,e){const P=R.P,narrow=R.W<520,LC=[P.c6,P.c2,P.c4];
    R.grid(-8,8,-2.6,2.6,.5);
    // which corpora are drawn, and how strongly: DeepSeek alone until the last step
    const ga=g=>g===F?1:k===5?e:0;
    // which cells are up: the audit row from step 2, + tool results from step 3, + reasoning from step 4
    const up=(l)=>l===0?at(k,e,1):l===1?at(k,e,2):at(k,e,3);
    G.forEach((gn,g)=>{const a=ga(g);if(a<=.01)return;const v=V[gn];
      // plinths and the level plates
      LV.forEach((ln,l)=>{const z=LZ[l],xl=bx(g,0)-.85;
        R.glass([xl-.05,.02,z-.38],[0,.9,0],[0,0,.76],{c:LC[l],a:a*(k>=4?.3:.85),nu:3,nv:3});
        if(g===F&&k<=4)R.label([xl,.95,z],LV[l],{al:'right',dx:-8,fs:12,mono:true,c:LC[l],a:a*Math.max(.35,up(l)),grp:'lv'});
        MO.forEach((mn,m)=>{const x=bx(g,m);R.box([x,0,z],[.62,.06,.62],{a:a,shadow:a>.5});
          const t=g===F?up(l):k===5?e:0,val=v[mn][l],h=Math.max(.02,val*HS*t);
          // composition: the comparison step lights only its two cells
          const pick=(m===1&&l===2)||(m===2&&l===0)||(k===5&&g===0&&m===2),hot=pick&&(k===4&&g===F||k===5);let ca=a;if((k===4&&g===F||k===5)&&!pick)ca=a*.25;
          const fill=hot?LC[l]:mix(P.paper,LC[l],.55);
          if(t>0)R.box([x,.06,z],[.46,h,.46],{fill,a:ca,shadow:false});
          // values on top while the camera is close
          if(t>.6&&(g===F&&k<=4&&(k!==4||pick)||k===5&&((m===1&&l===2&&g>0)||(m===2&&l===(g===0?2:0)))))R.label([x,.06+h,z],val.toFixed(2),{mono:true,fs:12,dy:-10,b:k>=4,c:hot?LC[l]:P.ink,a:ca*Math.min(1,(t-.6)*2.5)});
          // the trace at this level streams into the monitor reading it, while its row is the subject
          const fl=g===F&&((k===1&&l===0)||(k===2&&l===1)||(k===3&&l===2));
          if(fl)R.flowArc([xl+.05,.6,z],[x,.3+h*.6,z],.25+.1*m,{c:LC[l],a:.85,r:.05,n:4+2*l,speed:1.2})})});
      // monitor names at the front of the block, the corpus name behind it
      if(g===F&&k<=4)MO.forEach((mn,m)=>R.label([bx(g,m),0,LZ[0]+.5],narrow?mn.replace('GPT-',''):mn,{fs:12,dy:10,c:P.ink,a,mono:true}));
      if(k<5)R.label([bx(g,1),HS*.95,LZ[2]-.4],GN[gn]+' multiday · '+PAPER.rc.t12_npos[gn]+' completed harms',{fs:12.5,b:1,c:P.mute,a,wide:1});
      else R.label([bx(g,1),0,LZ[0]+.5],gn+' · '+PAPER.rc.t12_npos[gn],{fs:12.5,b:1,dy:12,c:P.ink,a});
    });
  }
  const CLOSE={cam:[.42,.5],bounds:[[bx(F,0)-2.6,0,-1.7],[bx(F,2)+.6,1.9,1.9]]},ALLV={cam:[.1,.56],bounds:[[-8.9,0,-1.7],[8.3,2.1,2]]};
  // in the two-column layout the card is narrow and tall: the four corpora are turned into depth there so they fill it
  const allV=()=>innerWidth>=1100?{cam:[.5,.62],bounds:ALLV.bounds}:ALLV;
  S3.stage({id:'stg-obs',list:'sx-obs',fig:'Fig. 3 · Table 12, R@10/day by monitor and observability level',cam:CLOSE.cam,bounds:CLOSE.bounds,aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,16,16],
    view:k=>k===4?{cam:[.55,.42],bounds:[[bx(F,0)-1.2,0,-1.6],[bx(F,2)+.6,1.9,1.6]]}:k===5?allV():CLOSE});
})();
