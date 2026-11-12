// ---- Scene: research as a Git commit graph (Eq. 1), the derived index above it (§3.2, §4.7), and the evidence score (Eq. 2) ----
// The graph is the ILLUSTRATIVE 16-node graph of the frontier calculator (window.FRG); S and n are that calculator's Eq. 2 values at its defaults.
// Publication order runs left to right; each account has its own row, so an edge that crosses rows is one account building on another's work.
(function(){
  if(!document.getElementById('stg-git')||!window.FRG)return;const {at,off,mix}=S3;
  const N=FRG.nodes,by=Object.fromEntries(N.map(v=>[v.id,v]));
  const LANE={setup:-2,w1:-1.2,w2:-.4,w3:.4,w4:1.2,w5:2},X=i=>-4+8*i/(N.length-1),pos=v=>[X(N.indexOf(v)),0,LANE[v.acct]],YI=1.7; // one row (lane) per account, as Git graph viewers draw authors
  const isRes=v=>v.tag==='result'||v.tag==='setup';
  const wk={w1:0,w2:1,w3:2,w4:3,w5:4},acol=(P,a)=>a==='setup'?P.mute:[P.c1,P.c2,P.c3,P.c4,P.c6][wk[a]];
  const MISS=['k','n'],EDIT='m';
  // descendants of c by other accounts (the calculator's n), for the last step
  const desc=(()=>{const out=new Set(),q=N.filter(v=>v.par.includes('c'));while(q.length){const v=q.shift();if(out.has(v.id))continue;out.add(v.id);N.filter(x=>x.par.includes(v.id)).forEach(x=>q.push(x))}return [...out].map(i=>by[i])})();
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-3.5,3.5,.5);
    if(k>=1&&k!==4)Object.entries(LANE).forEach(([a,z])=>R.label([-4.45,0,z],a,{mono:true,fs:12,al:'right',dx:-4,c:acol(P,a),a:.8,wide:1}));
    const hiOf=v=>k===0?(v.id==='d'?1:.18):k===2?(['f','g','h'].includes(v.id)?1:.25):k===5?(['d','e','f'].includes(v.id)?1:.22):k===6?(v.id==='c'||desc.includes(v)?1:.22):1;
    const tall=v=>isRes(v)?(k===3?.24+.3*e:k>3?.54:.24):.06;
    // nodes: results and the setup carry code (blocks), insights, hypotheses, verifications and endorsements are metadata (flat tiles)
    N.forEach(v=>{const p=pos(v),a=hiOf(v),c=mix(P.paper,acol(P,v.acct),.55);R.box(p,isRes(v)?[.3,tall(v),.3]:[.32,.06,.32],{fill:c,a})});
    // edges: each parent edge means "builds on"; drawn as the reader reaches step 2
    N.forEach(v=>v.par.forEach(pid=>{const u=by[pid],p=pos(u),q=pos(v),a=Math.min(hiOf(u),hiOf(v));
      const t=k===0?0:k===1?e:1;if(t>0)R.arc([p[0],.12,p[2]],[q[0],.12,q[2]],.16,{c:P.mute,w:1.4,a:a*.85,t,head:t>=1?6:0})}));
    // 1. one commit, close up: the eight parts of Eq. 1
    if(k===0){const p=pos(by.d),a=e;
      [['h · commit hash',0],['a · account: worker2',1],['T · tags: result',2],['d · "24 prefixes"',3]].forEach(([t,i])=>R.label([p[0]-.25,.1+.16*i,p[2]],t,{mono:true,fs:12,al:'right',dx:-14,a,grp:'l',c:P.ink}));
      [['x · metadata',0],['m · metric: 1.932 bpb',1],['P · parents: {c}',2],['τ · server timestamp',3]].forEach(([t,i])=>R.label([p[0]+.25,.1+.16*i,p[2]],t,{mono:true,fs:12,al:'left',dx:14,a,grp:'r',c:P.ink}));
      R.glow([p[0],.15,p[2]],.5,{c:P.c2,a:.6*e})}
    // 2. a merge: i builds on both g and h
    if(k===1){const p=pos(by.i);R.glow([p[0],.06,p[2]],.45,{c:P.c4,a:e});R.label([p[0],.2,p[2]],'i · two parents',{mono:true,fs:12,dy:-12,a:e,c:P.c4,b:1})}
    // 3. duplicated work is visible as two branches from one parent
    if(k===2){const f=pos(by.f);['g','h'].forEach(id=>{const q=pos(by[id]);R.flowArc([f[0],.3,f[2]],[q[0],.3,q[2]],.3,{c:acol(P,by[id].acct),a:e,r:.06,n:6,speed:1.2})});
      R.label([pos(by.g)[0],.3,pos(by.g)[2]],'g · second donor (w4)',{mono:true,fs:12,dy:-12,a:e,grp:'b'});R.label([pos(by.h)[0],.3,pos(by.h)[2]],'h · second donor, rerun (w5)',{mono:true,fs:12,dy:14,a:e,grp:'b'})}
    // 4. two ways in: code-bearing work arrives as a Git bundle (orange), metadata-only work as JSON (teal)
    if(k===3){N.forEach(v=>{if(v.tag==='setup')return;const p=pos(v);R.flow([[p[0],1.3,p[2]],[p[0],isRes(v)?.6:.1,p[2]]],{c:isRes(v)?P.c2:P.c6,a:.85*e,r:isRes(v)?.075:.055,n:3,speed:.8})});
      R.label([-4.3,.6,2.6],'blocks: code, a Git bundle the server validates',{mono:true,fs:12,al:'left',c:P.c2,b:1,a:e,grp:'p'});R.label([-4.3,.2,2.6],'tiles: metadata, JSON the server commits',{mono:true,fs:12,al:'left',c:P.c6,b:1,a:e,grp:'p'})}
    // 5. the index the views read is a separate layer: rebuilt from Git, but records can be missing or edited
    if(k===4){R.glass([-4.6,YI,-2.4],[9.2,0,0],[0,0,4.8],{c:P.c1,a:.55*e,nu:12,nv:6});R.label([4.6,YI,-2.3],'SQLite index',{mono:true,fs:12.5,b:1,al:'left',dx:6,c:P.c1,a:e});
      N.forEach(v=>{const p=pos(v),top=[p[0],YI+.03,p[2]];if(MISS.includes(v.id)){R.label(top,'×',{fs:15,b:1,c:P.bad,a:e});return}
        R.line([[p[0],isRes(v)?.56:.08,p[2]],top],{c:P.c1,w:1,a:.35*e,dash:[3,3]});R.ball(top,.07,{c:v.id===EDIT?P.bad:P.c1,a:e})});
      R.flow([[pos(by.j)[0],.6,pos(by.j)[2]],[pos(by.j)[0],YI,pos(by.j)[2]]],{c:P.c1,a:e,r:.05,n:3});
      const m=pos(by[EDIT]);R.label([m[0],YI+.05,m[2]],'m · edited in the index only',{mono:true,fs:12,dy:-12,c:P.bad,a:e,grp:'i'});
      R.label([pos(by.k)[0],YI+.05,pos(by.k)[2]],'k, n · never reached it',{mono:true,fs:12,dy:-12,c:P.bad,a:e,grp:'i'})}
    // 6. evidence: work by other accounts counts, one's own follow-up does not
    if(k===5){const d=pos(by.d),ev=by.e,f=by.f,tp=.6;
      R.flowArc([pos(ev)[0],.2,pos(ev)[2]],[d[0],tp,d[2]],.25,{c:P.c5,a:e,r:.07,n:7,speed:1.2});
      R.box([d[0],tp,d[2]],[.18,.8*e,.18],{fill:P.c5,a:.95,shadow:false});
      R.label([d[0],tp+.8*e,d[2]],'S(d) = '+by.d.S,{mono:true,fs:13,b:1,dy:-12,c:P.c5,a:e});
      R.label([pos(ev)[0],.1,pos(ev)[2]],'e · w3 confirms · +20',{mono:true,fs:12,dy:16,c:P.c3,a:e,grp:'e'});
      R.label([pos(f)[0],.6,pos(f)[2]],'f · w2, own follow-up · 0',{mono:true,fs:12,dy:-12,c:P.mute,a:e,grp:'e'})}
    // 7. descendants: other accounts' work anywhere below c (feeds the exploration term of Eq. 3)
    if(k===6){const c=pos(by.c);desc.forEach(v=>{const p=pos(v);if(v.acct==='w1')return;R.flowArc([p[0],.3,p[2]],[c[0],.6,c[2]],.4+.04*Math.abs(N.indexOf(v)-3),{c:P.c4,a:.55*e,r:.05,n:4,speed:1})});
      R.glow([c[0],.6,c[2]],.5,{c:P.c4,a:e});R.label([c[0],.65,c[2]],'c · n = '+by.c.n+' descendants by other accounts',{mono:true,fs:12,b:1,dy:-12,c:P.c4,a:e})}
  }
  const full={cam:[.18,.8],bounds:[[-4.4,0,-2.3],[4.4,1,2.6]]};
  S3.stage({id:'stg-git',list:'sx-git',fig:'Fig. 2 · the commit graph and its index · graph illustrative',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[18,16,14,16],
    view:k=>k===0?{cam:[.35,.45],bounds:[[pos(by.d)[0]-1.6,0,pos(by.d)[2]-1],[pos(by.d)[0]+1.6,.8,pos(by.d)[2]+1]]}:k===4?{cam:[.18,.5],bounds:[[-4.6,0,-2.4],[4.6,YI+.2,2.4]]}:k===5?{cam:[.3,.55],bounds:[[pos(by.d)[0]-1.4,0,-1.6],[pos(by.d)[0]+1.6,1.4,.9]]}:full});
})();
