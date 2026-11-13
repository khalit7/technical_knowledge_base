// ---- Scene: Fig. 2, one real section cut by fixed windows, then by the recursive splitter (renderer v2). The section, its paragraphs,
// its evidence and both sets of cuts are computed live by the page's chunkers (RP.sec from 24_rp_rd1.js; the chunkers are checked equal to the
// root's Python by check_js.mjs); the last step's towers are the root's runs over all 892 QASPER questions (RPD.root_chunking, bge-small). ----
(function(){
  if(!document.getElementById('stg-chunk')||!window.RP||!RP.sec)return;const {at,off,lerp,mix}=S3;
  const S=RP.sec,doc=S.doc,T=c=>RP.bisectLeft(doc.starts,c),N=doc.starts.length,X=t=>-5+10*t/N,RC=RPD.root_chunking;
  const paras=doc.paras.map(p=>[T(p[0]),T(p[1])]),ev=S.evs.map(e=>[T(e[0]),T(e[1])]);
  const isEv=p=>ev.some(e=>e[0]<=p[0]+1&&p[1]<=e[1]+1);
  const cuts={fixed:S.cut.fixed.map(c=>[T(c[0]),T(c[1])]),recursive:S.cut.recursive.map(c=>[T(c[0]),T(c[1])])};
  const whole=(m,p)=>cuts[m].some(c=>c[0]<=p[0]&&p[1]<=c[1]);
  const inside=m=>cuts[m].filter(c=>c[1]<N-1&&!paras.some(p=>Math.abs(p[1]-c[1])<2)).map(c=>c[1]);
  const LH=.16,LD=.9;
  function plates(R,m,a,k,e){const P=R.P;if(a<=.01)return;cuts[m].forEach((c,j)=>{const x0=X(c[0])+.02,w=X(c[1])-X(c[0])-.04,y=.55+(j%2)*.28,col=j%2?P.c5:P.c1;
      R.glass([x0,y,-.42],[w,0,0],[0,0,.84],{c:col,a,nu:Math.max(2,Math.round(w*1.5)),nv:3});
      if(k===1||k===3)R.flowArc([X((c[0]+c[1])/2),LH,0],[x0+w/2,y,0],.2,{c:col,a:a*.8,n:3,speed:1.1,r:.06})});
    inside(m).forEach(t=>R.box([X(t),0,0],[.035,1.05,LD+.2],{fill:P.bad,a:a*.9,shadow:false}));
    // which splitter the plates are, named above their left end
    R.label([X(0),1.0,-.42],m==='fixed'?'fixed windows · 128 tokens, 16 overlap':'recursive splitter · 128 tokens',{fs:12.5,b:1,al:'left',dy:-8,c:P.ink,a})}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-2.2,2.2,.5);
    const la=k===5?lerp(1,.22,e):1;
    // the section: one slab per paragraph, length = tokens; a green strip on every paragraph an annotator used as evidence
    paras.forEach((p,i)=>{const x0=X(p[0]),w=X(p[1])-X(p[0]);
      R.box([x0+w/2,0,0],[w-.05,LH,LD],{fill:P.paper,a:la});
      if(isEv(p))R.box([x0+w/2,LH,0],[w-.12,.04,LD*.5],{fill:P.good,a:la*(k===0?e:1),shadow:false});
      if(k<5)R.label([x0+w/2,0,LD/2],(p[1]-p[0])+' tokens',{mono:true,fs:12,dy:14,c:P.mute,a:la,grp:'pt'});
      if(k===2||k===4){const m=k===2?'fixed':'recursive',ok=whole(m,p),t=e;
        R.ball([x0+w/2,LH+.12,.3],.09,{c:ok?P.good:P.bad,a:t});R.label([x0+w/2,LH+.2,.3],ok?'whole':'split',{fs:12.5,b:1,dy:-10,c:ok?P.good:P.bad,a:t,grp:'ok'})}});
    // fixed windows (steps 2 and 3), then the recursive splitter (steps 4 and 5)
    const fa=k===1?e:k===2?1:k===3?1-e:0,ra=k===3?e:k===4?1:0;
    plates(R,'fixed',fa*(k===2?.75:1),k,e);plates(R,'recursive',ra*(k===4?.75:1),k,e);
    // the root's runs over all 892 questions: share of questions with evidence intact, and found within 1,024 tokens (bge-small)
    if(k===5){const G=[['fixed-256-32','fixed 256 + 32',-3.1],['recursive-256','recursive 256',0],['structure-256','paragraphs in sections',3.1]];
      G.forEach(([key,lab,x])=>{const r=RC[key],si=r.intact/r.n_questions,sf=r['bge-small'].budget['1024'];
        R.box([x-.42,0,-1.2],[.6,Math.max(.012,si*2.2*e),.6],{fill:P.good,a:.95});R.box([x+.42,0,-1.2],[.6,Math.max(.012,sf*2.2*e),.6],{fill:P.acc,a:.95});
        R.label([x-.72,si*2.2*e,-1.2],r.intact+' intact',{mono:true,fs:12.5,b:1,dy:-6,al:'right',c:P.good,a:e,wide:1});R.label([x+.72,sf*2.2*e,-1.2],(100*sf).toFixed(1)+'% found',{mono:true,fs:12.5,b:1,dy:-6,al:'left',c:P.acc,a:e,wide:1});
        R.label([x,0,-.85],lab,{fs:12.5,b:1,dy:14,c:P.ink,a:e})})}
  }
  const full={cam:[.22,.62],bounds:[[-5.1,0,-.5],[5.1,.95,.5]]};
  const st=S3.stage({id:'stg-chunk',list:'sx-chunk',fig:'Fig. 2 · one section, two splitters',cam:full.cam,bounds:full.bounds,aspect:.4,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,8,12,8]:[18,14,18,14],
    view:k=>k===5?{cam:[.22,.42],bounds:[[-4.6,0,-1.6],[4.6,2.3,-.6]]}:full,
    // the text view on the left follows the stage: fixed windows during their steps, the recursive splitter during its own
    onStep:k=>{try{if(k>=1&&k<=2)RP.secShow('fixed');else if(k>=3&&k<=4)RP.secShow('recursive')}catch(err){}}});
})();
