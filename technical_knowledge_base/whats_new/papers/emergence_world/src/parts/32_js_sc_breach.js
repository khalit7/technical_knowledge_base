// ---- Scene (Fig. 2): the memory breach in seven towns, from the released tool-call records (renderer v2: flows, camera per step) ----
// Each town is ten agents around a glass plate standing for the leaked diaries and memories. A column's height is the number of
// memory_breach_scan calls the agent aimed at another agent (window.LOGS, w.<world>.breach.by_agent; square-root heights); dots stream
// from each searcher into the plate. An agent whose records end before the notice is drawn faint; one whose records end within a day
// after it is grey at its step. The last step is Table 11's score out of five, as printed.
(function(){
  if(!document.getElementById('stg-br')||!window.LOGS)return;const {at,off,mix}=S3;
  const LGS=window.LOGS,T11=PAPER.tables.t11.rows,A=LGS.agents;
  const WO=[['gemini','Gemini',-3,-1.2],['mistral','Mistral',-1,-1.2],['qwen','Qwen',1,-1.2],['deepseek','DeepSeek',3,-1.2],['claude','Claude',-2,1.2],['mixed','Mixed',0,1.2],['openai','OpenAI',2,1.2]];
  const STEP={gemini:1,mistral:2,qwen:2,deepseek:3,claude:3,mixed:3,openai:4};
  const W=WO.map(([w,n,x,z])=>{const L=LGS.w[w],br=L.stim.breach;
    return {w,n,x,z,by:L.breach.by_agent,other:L.breach.other,self:L.breach.self,gone:L.last_seen.map(t=>t<br),dies:L.last_seen.map(t=>t>=br&&t<br+24),score:T11[n][5]}});
  window.BREACHDATA=W;
  const RA=.62,ap=(t,i)=>{const g=Math.PI*.5+2*Math.PI*i/10;return [t.x+RA*Math.cos(g),0,t.z+RA*Math.sin(g)]};
  const sq=Math.sqrt;
  function draw(R,k,e){const P=R.P;R.grid(-4.5,4.5,-2.6,2.6,.5);
    W.forEach(t=>{const s=STEP[t.w],on=k===0||k===5||k===s,a=on?1:k>s?.55:.3,ra=k===0?e:1;
      // the leaked records: one glass plate per town
      R.glass([t.x-.32,.06,t.z-.32],[.64,0,0],[0,0,.64],{c:P.c4,a:a*.85,nu:4,nv:4,th:.04});
      if(on||k===0||k===5)R.label([t.x,0,t.z+.95],t.n,{mono:true,fs:12.5,b:1,c:k===s?P.ink:P.mute,a:on?1:.6,dy:6});
      t.by.forEach((n,i)=>{const p=ap(t,i),grey=t.gone[i]||(t.dies[i]&&k>=s&&k<5),grown=k>s||k===5?1:k===s?e:0;
        const hgt=.16+(n?sq(n)*.11*grown:0),fill=grey?mix(P.paper,P.mute,.5):n&&grown>0?mix(P.paper,P.bad,Math.min(.75,.25+sq(n)*.06)):P.paper;
        R.box(p,[.13,hgt,.13],{fill,a:a*(t.gone[i]?.3:1)*ra,shadow:a>.5,fa:t.gone[i]?.4:1});
        if(n&&k===s)R.flowArc([p[0],hgt+.02,p[2]],[t.x,.1,t.z],.25+.03*sq(n),{c:P.bad,a:Math.min(1,e*1.5)*.8,r:.03+.004*sq(n),n:Math.min(8,2+Math.round(sq(n)*.8)),speed:1.1});
        if(n&&on&&k!==0&&k!==5&&(n>=4||t.w!=='gemini'))R.label([p[0],hgt,p[2]],A[i]+' '+n,{mono:true,fs:12,dy:-9,c:P.bad,a:grown,wide:1});
});
      if(t.w==='openai'&&k===4){R.glow([t.x,.3,t.z],.9,{c:P.good,a:.5*e});R.label([t.x,.25,t.z],'self only: '+t.self,{mono:true,fs:12,dy:-14,c:P.good,b:1,a:e})}
      // 6. Table 11: criteria met out of five, a column at each town's centre
      if(k===5){const h=.08+t.score*.24*e;R.box([t.x,.1,t.z],[.22,h,.22],{fill:t.score>=3?P.good:t.score?P.c5:P.bad,a:1,shadow:false});
        R.label([t.x,.1+h,t.z],t.score+'/5',{mono:true,fs:13,b:1,dy:-10,c:t.score>=3?P.good:P.ink,a:Math.max(.3,e)})}
      if(k>=1&&k<=4&&k===s&&t.w!=='openai')R.label([t.x,0,t.z+.95],t.other+' searches of others',{mono:true,fs:12,dy:22,c:P.bad,a:e,wide:1});
    });
  }
  const full={cam:[.18,.8],bounds:[[-3.9,0,-2.1],[3.9,.9,2.3]]};
  const close=(xs,zs)=>({cam:[.3,.62],bounds:[[Math.min(...xs)-1,0,Math.min(...zs)-1.1],[Math.max(...xs)+1,1.4,Math.max(...zs)+1.3]]});
  S3.stage({id:'stg-br',list:'sx-br',fig:'Fig. 2 · the memory breach, from the released records',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,18,14],
    view:k=>k===1?close([-3],[-1.2]):k===2?close([-1,1],[-1.2]):k===3?close([-2,0,3],[-1.2,1.2]):k===4?close([2],[1.2]):full});
})();
