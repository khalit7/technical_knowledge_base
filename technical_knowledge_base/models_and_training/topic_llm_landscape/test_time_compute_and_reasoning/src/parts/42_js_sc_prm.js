// ---- Scene: Fig. 4, an outcome verifier against a process reward model, then beam search against the PRM (stg-prm, renderer v2) ----
// Snell et al.'s Section 5.2 procedure with N = 4 beams and beam width M = 2, on illustrative scores and answers (the page says so):
// steps are slabs laid out by depth (x) and beam (z), the PRM's score a bar standing on each; kept prefixes stay lit, pruned ones recede;
// the last step sums scores per final answer (best-of-N weighted). The first three steps follow one of the finished solutions (0 > 4 > 9).
(function(){
  if(!document.getElementById('stg-prm')||!window.S3)return;const {at,off,lerp,mix,cl,ease}=S3;
  // nodes: [depth, row, PRM score, parent (-1: the problem), final answer]
  const N=[[1,0,.82,-1],[1,1,.35,-1],[1,2,.67,-1],[1,3,.21,-1],
    [2,0,.88,0],[2,1,.54,0],[2,2,.71,2],[2,3,.30,2],
    [3,0,.91,4,'42'],[3,1,.62,4,'17'],[3,2,.74,6,'42'],[3,3,.40,6,'42']];
  const KEEP={1:[0,2],2:[4,6]},CHAIN=[0,4,9],sum=a=>+N.filter(n=>n[4]===a).reduce((s,n)=>s+n[2],0).toFixed(2);
  window.TTCS=window.TTCS||{};TTCS.prm={s42:sum('42'),s17:sum('17'),d1:N.slice(0,4).map(n=>n[2]),d2:N.slice(4,8).map(n=>n[2]),d3:N.slice(8).map(n=>n[2]),chain:CHAIN.map(i=>N[i][2])};
  const XD=d=>-4.3+d*2.55,ZR=r=>-1.95+r*1.3,BH=1.25,XA=XD(3)+2.9,ZA={'42':-.95,'17':.95};
  const pos=i=>i<0?[XD(0),0,0]:[XD(N[i][0]),0,ZR(N[i][1])];
  function draw(R,k,e){const P=R.P;R.grid(-5.6,7.4,-2.9,2.9,.5);
    // when each node appears, whether it is pruned, and how strongly it is drawn at this step
    const tree=k>=3,app=i=>{const d=N[i][0];if(!tree)return CHAIN.includes(i)?(k===0?ease(cl(e*2.2-CHAIN.indexOf(i)*.5,0,1)):1):0;
        const s=d===1?3:d===2?5:6;return k>s?1:k===s?ease(cl(e*1.6,0,1)):0};
    const dead=i=>{const d=N[i][0],when=d===1?4:d===2?5:99;if(!tree||!KEEP[d]||KEEP[d].includes(i))return 0;return k>when?1:k===when?(when===5?cl((e-.55)/.4,0,1):ease(e)):0};
    const alpha=i=>{const a=app(i)*(1-.78*dead(i));return k===3&&!tree?a:a};
    const scored=i=>tree?app(i)>0:k>=2;
    // the problem
    R.box([XD(0),0,0],[.7,.55,.7],{fill:mix(P.paper,P.ink,.12)});R.label([XD(0),.55,0],'problem',{fs:12.5,dy:-12,c:P.ink,b:1});
    N.forEach((n,i)=>{const a=alpha(i);if(a<=.01)return;const [d,r,sc,par,ans]=n,p=pos(i),pp=pos(par);
      const onChain=!tree&&CHAIN.includes(i);
      R.line([[pp[0]+(par<0?.35:.48),.06,pp[2]],[p[0]-.48,.06,p[2]]],{c:dead(i)>.5?P.line:P.mute,w:1.4,a});
      R.box(p,[.96,.14,.66],{fill:P.paper,a,lw:.9});
      if(!tree)R.label([p[0],0,p[2]+.33],'step '+d,{fs:12,dy:13,c:P.mute,a});
      if(ans){const show=tree?app(i):1;R.label([p[0]+.5,.1,p[2]],'→ '+ans,{mono:true,fs:12.5,al:'left',dx:6,b:1,c:ans==='42'?P.good:P.bad,a:show*(dead(i)>.5?.4:1),wide:k===7?1:0})}
      // the PRM's score: a bar standing on the step
      if(scored(i)){const g=tree?app(i):(k===2?ease(cl(e*1.8-CHAIN.indexOf(i)*.35,0,1)):1),h=Math.max(.02,sc*BH*g),low=!tree&&i===9;
        R.box([p[0],.14,p[2]],[.3,h,.3],{fill:mix(P.paper,low?P.bad:P.c1,.65),a:a,shadow:false});
        if(dead(i)<.5)R.label([p[0],.14+h,p[2]],sc.toFixed(2),{mono:true,fs:12.5,dy:-10,b:1,c:low?P.bad:P.c1,a:a*(g>.6?1:0)})}
      // data moving: the beam grows along the kept edges while a depth is being expanded
      if(tree&&app(i)>0&&app(i)<1)R.flow([[pp[0],.2,pp[2]],[p[0],.2,p[2]]],{c:P.c1,a:.8,r:.05,n:4,speed:1.6})});
    // the outcome reward model: one score, read from the finished answer only
    if(k===1||k===2){const a=k===1?ease(cl(e*1.6,0,1)):1-ease(e),o=pos(9),gx=XA-.4;
      R.glass([gx,0,o[2]-.6],[0,0,1.2],[0,1.1,0],{c:P.c4,a,nu:3,nv:3});R.flow([[o[0]+.5,.3,o[2]],[gx,.5,o[2]]],{c:P.c4,a,r:.065,n:5,speed:1.3});
      R.label([gx,1.1,o[2]],'ORM: one score for the whole answer',{fs:12.5,b:1,al:'right',dx:4,dy:-10,c:P.c4,a,wide:1})}
    if(k===2)R.label([XD(2),BH*.9,ZR(0)-.5],'PRM: a score after every step',{fs:12.5,b:1,dy:-14,c:P.c1,a:e,wide:1});
    // best-of-N weighted: each finished solution's score stacks on its answer
    if(k===7){['42','17'].forEach(ans=>{let y=0;N.forEach((n,i)=>{if(n[4]!==ans)return;const h=n[2]*BH*.7*ease(e),p=pos(i);
          R.flow([[p[0]+.15,.14+n[2]*BH,p[2]],[XA,y+h,ZA[ans]]],{c:ans==='42'?P.good:P.bad,a:.75,r:.05,n:5,speed:1.3});
          R.box([XA,y,ZA[ans]],[.6,Math.max(.02,h),.6],{fill:mix(P.paper,ans==='42'?P.good:P.bad,.35+.15*(y>0)),a:1,lw:1});y+=h});
        R.label([XA,y,ZA[ans]-.3],ans+': '+sum(ans).toFixed(2)+(ans==='42'?' ✓':''),{mono:true,fs:13,b:1,dy:-12,c:ans==='42'?P.good:P.bad,a:e})})}
  }
  const full={cam:[.14,1.02],bounds:[[-4.8,0,-2.6],[XA+.7,1.3,2.6]]};
  (TTCS.stage=TTCS.stage||{}).prm=S3.stage({id:'stg-prm',list:'sx-prm',fig:'Fig. 4 · scoring the end against scoring every step',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1600,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,16,14],
    view:k=>k<=2?{cam:[.3,.75],bounds:[[-4.8,0,-2.6],[XA+.6,1.2,-.1]]}:k<=4?{cam:[.14,.88],bounds:[[-4.8,0,-2.6],[XD(1)+1.5,1.3,2.6]]}:k===5?{cam:[.14,.88],bounds:[[-4.8,0,-2.6],[XD(2)+1.5,1.3,2.6]]}:k===6?{cam:[.14,.88],bounds:[[-4.8,0,-2.6],[XD(3)+1.6,1.3,2.6]]}:full});
})();
