// ---- Scene: Fig. 2, six matcher ladders (section 3, renderer v2). Structure read from source at the pinned versions (links in the step list):
// each edit tool is a column of glass plates, one per matcher, tried back to front; in front, what the model is told when none matches.
// The dot is a search text copied slightly wrong. Recorded outcomes (OpenHands' five refusals, mini-SWE-agent's six silent sed runs) from the runs. ----
(function(){
  if(!document.getElementById('stg-edit'))return;const {mix}=S3;
  // name, tool, number of matchers, what the model is told when none matches, colour key of that answer
  const L=[['Codex','apply_patch',4,'error: hunk not found','mute'],['Gemini CLI','replace',4,'error','mute'],['opencode','edit',9,'error (on success: LSP diagnostics)','mute'],
    ['Aider','SEARCH/REPLACE',4,'"Did you mean" + closest lines','c3'],['OpenHands','str_replace',2,'"No replacement was performed"','bad'],['mini-SWE','sed',0,'exit 0, nothing printed','c5']];
  const x=l=>-3.75+l*1.5,ZS=-3.0,ZR=i=>-2.35+i*.46,ZO=2.45,Y=.38;
  function draw(R,k,e){const P=R.P,act=k-1,nar=R.W<520;R.grid(-4.6,4.6,-3.6,3.2,.5);
    L.forEach(([nm,tool,n,res,ck],l)=>{const on=k===0||act===l,lit=act===l,a=on?1:.13,xx=x(l),col=P[ck];
      // the model's edit request (back) and the harness's answer (front)
      R.box([xx,0,ZS],[.6,.42,.45],{fill:mix(P.paper,P.c2,.25),a});
      R.label([xx,.42,ZS],nm,{fs:12.5,b:1,c:lit?P.ink:P.mute,dy:lit?-22:-8,a:Math.max(.35,a)});if(lit)R.label([xx,.42,ZS],tool,{fs:12,mono:true,c:P.c2,dy:-8});
      const pz=lit?ZS+.3+(ZO-.3-(ZS+.3))*Math.min(1,e*1.1):null;
      for(let i=0;i<n;i++){const passed=lit&&pz>ZR(i);R.glass([xx-.45,.02,ZR(i)],[.9,0,0],[0,.75,0],{c:passed?P.acc:P.c1,a:a*(passed?.95:.6),nu:3,nv:3,th:.03})}
      if(!n)R.box([xx,0,-.4],[.75,.3,.6],{fill:mix(P.paper,P.c5,.18),a});
      if(k===0)R.label([xx,0,ZO],n?n+' matcher'+(n>1?'s':''):'none',{fs:12,b:1,c:P.ink,dy:18});
      const ra=lit?Math.max(0,Math.min(1,(e-.75)*4)):0;
      R.box([xx,0,ZO],[.5,.3,.4],{fill:mix(P.paper,col,.35),a:k===0?.8:lit?Math.max(.3,ra):.13});
      if(lit){R.label([xx,0,ZO],res,{fs:12.5,b:1,c:col,dy:18,a:ra});
        const p=[xx,Y,pz];R.flow([[xx,Y,ZS+.3],p],{c:P.c2,r:.06,n:8,speed:1.2});R.ball(p,.1,{c:P.c2});
        if(e>.9&&(ck==='bad'||ck==='c5'))R.glow([xx,.3,ZO],.45,{c:col});
        if(!n)R.label([xx,.3,-.4],'[1], [:n]: character classes',{fs:12,c:P.c5,dy:-10,a:e,wide:1});
        // what comes back to the model: Aider's closest lines, opencode's diagnostics
        if(ck==='c3'||l===2)R.flowArc([xx+.3,.3,ZO],[xx+.3,.42,ZS],.6,{c:ck==='c3'?P.c3:P.c4,r:.05,n:10,a:ra,speed:1.1})}
    });
  }
  const full={cam:[.32,.5],bounds:[[-4.4,0,-3.2],[4.4,.9,2.7]]};
  S3.stage({id:'stg-edit',list:'sx-edit',fig:'Fig. 2 · what each edit tool tries before it gives up',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5600,draw,
    view:k=>k===0?full:{cam:[.55,.42],bounds:[[x(k-1)-1.3,0,-3.2],[x(k-1)+1.3,.9,2.7]]},
    margin:w=>w<520?[34,10,34,10]:[36,20,36,20]});
})();
