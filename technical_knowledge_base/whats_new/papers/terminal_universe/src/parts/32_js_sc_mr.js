// ---- Scene (Step 2): a multi-round session on one workspace, round by round (renderer v2: the rounds as a staircase of blocks rising on the same
// workspace, each coloured by its request's style; the requirements being tracked as small blocks on each step; the round's private verifier as a glass
// plate at the edge of its step, green for a pass, red for a failure, clear where the example prints no verdict; the request flowing from the user agent
// to the coding agent and the private verdict flowing back to the user agent only; the camera follows the current round) ----
// Data: the sensor-ingestion example of Table 18 and Appendix E.3 as the page quotes it (the step list). Verdicts: the initial request and round 2 pass,
// round 1 fails (printed); rounds 4 and 5 pass because an extension follows only a pass (the paper's stated rule); rounds 3 and 6 are not printed.
// The requirement counts are our reading of the requests (one per new capability; a revision fixes one in place, a conflict replaces one), labelled.
// Replaces the round chips of 2026-10-03; the full abridged quotes sit in a closed block under the step list. window.TUMR exposes the data.
(function(){
  if(!document.getElementById('stg-mr')||typeof S3==='undefined')return;const {at,off,lerp,mix}=S3;
  // style, verdict (1 pass, 0 fail, 2 pass implied by the next request's style, null not printed), requirements tracked, the one touched this round
  const RD=[['start',1,1,0,'initial request'],['extension',0,2,1,'R1 extension'],['revision',1,2,1,'R2 revision'],['extension',null,3,2,'R3 extension'],
    ['conflict',2,3,2,'R4 conflict'],['extension',2,4,3,'R5 extension'],['extension',null,5,4,'R6 extension']];
  window.TUMR=RD.map(r=>({style:r[0],verdict:r[1],reqs:r[2]}));
  const n=RD.length,X=k=>-3.3+k*1.1,H=k=>.16+k*.18,D=1.7;
  const SC=(P,s)=>s==='extension'?P.c3:s==='revision'?P.c2:s==='conflict'?P.c4:P.mute;
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.6,2.6,.5);
    R.box([0,0,0],[8.3,.06,D+.5],{a:.9,dz:4});R.label([X(0)-.55,.06,D/2+.25],'/app · one workspace, the whole session',{al:'left',fs:12,c:P.mute,dy:34,a:k===0?1:0,wide:1});
    for(let i=0;i<n;i++){const r=RD[i],c=SC(P,r[0]),cur=i===k,top=.06+H(i);
      // the round's step: future rounds stay as faint outlines so the whole session is in view from the start
      R.box([X(i),.06,0],[1.0,H(i),D],{fill:mix(P.paper,c,i<=k?.4:.1),a:i>k?.3:cur?1:.75,fa:i>k?.25:1,dz:1});
      if(cur)R.label([X(i),.06,D/2],r[4],{fs:13,b:1,c,dy:16});else if(i<k)R.label([X(i),.06,D/2],r[4].replace(/ .*/,''),{fs:12,c:P.mute,dy:16,a:.8,grp:'st'});
      // requirements tracked: small blocks; the one this request adds, revises or replaces is coloured
      if(i<=k)for(let j=0;j<r[2];j++){const touched=j===r[3]&&i>0,p=[X(i)-.3+(j%3)*.3,top,.05+Math.floor(j/3)*.32];
        R.box(p,[.2,.2,.2],{fill:touched?c:P.paper,a:i<k?.55:Math.min(1,e*1.6),shadow:false})}
      // the verifier's private verdict: a glass plate standing at the back of the step
      if(i<k||(cur&&e>.5)){const v=r[1],ga=cur?Math.min(1,(e-.5)/.4):.4,gc=v===0?P.bad:v==null?P.mute:P.good;
        R.glass([X(i)-.45,top,-D/2+.15],[.9,0,0],[0,.75,0],{c:gc,a:ga*(v==null?.45:1),nu:3,nv:2});
        if(cur)R.label([X(i),top+.75,-D/2+.15],v===0?'verifier: fail':v===1?'verifier: pass':v===2?'pass (implied)':'verdict not printed',{fs:12.5,b:1,dy:-10,c:gc,a:ga})}}
    // the user agent sends the request to the coding agent; the verdict comes back to the user agent only
    const r=RD[k],c=SC(P,r[0]),top=.06+H(k),U=[X(k)-.15,top+1.15,D/2+.5],A=[X(k)+.25,top+.15,.45];
    R.ball(U,.17,{c:P.c1});R.label(U,'user agent',{fs:12,dy:-17,c:P.c1,b:1});
    R.ball(A,.13,{c:P.ink});if(k===0)R.label(A,'coding agent',{fs:12,al:'left',dx:10,c:P.mute,wide:1});
    R.flowArc(U,A,.2,{c,a:Math.min(1,e*2),n:7});
    if(k>0&&e<.5){const v=RD[k-1][1];if(v!=null)R.flowArc([X(k-1),.06+H(k-1)+.6,-D/2+.15],U,.5,{c:v===0?P.bad:P.good,a:.8*(1-e*2),r:.05,n:6})}
    if(e>.6&&r[1]!=null)R.flowArc([X(k),top+.6,-D/2+.15],U,.4,{c:r[1]===0?P.bad:P.good,a:Math.min(1,(e-.6)/.3)*.8,r:.05,n:6})
  }
  const v=k=>({cam:[.22,.42],bounds:[[X(Math.max(0,k-2))-.6,0,-1.2],[X(Math.min(n-1,k+1))+.6,.06+H(k)+1.4,1.9]]});
  S3.stage({id:'stg-mr',list:'sx-mr',fig:'Fig. 2 · one session, seven requests (Table 18)',cam:[.22,.42],bounds:[[-4,0,-1.2],[4,2.9,1.9]],aspect:.62,dur:1500,hold:5200,draw,view:v});
})();
