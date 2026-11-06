// ---- Scene: Fig. 2, graphrag's fast path on one question's ten paragraphs (renderer v2). Data: window.GR.build (s_nlp_extract.py and
// s_communities.py over the 394-paragraph subset; the LLM mode is the root agent runs' Qwen3-1.7B extraction): every name, survivor, edge and
// level-0 community is the recorded output; node positions are networkx's spring layout (seed 0); a bead is one extracted name. ----
(function(){
  if(!document.getElementById('stg-build')||!window.GR)return;const {mix,at}=S3;
  const B=GR.build,E=GRL.esc,$=id=>document.getElementById(id);
  let src='nlp',qi=0;
  const QS=()=>src==='llm'&&B.llm?B.llm.questions:B.questions,Q=()=>QS()[qi];
  const PX=j=>-4+(j%5)*2,PZJ=j=>j<5?1.45:2.75,NX=v=>v*4.3,NZ=v=>-.65+v*1.6;
  let C=null; // per-question layout, rebuilt when the question or the extraction changes
  function prep(){const q=Q(),nk=q.nodes.filter(n=>n.s),byT={};nk.forEach((n,i)=>byT[n.t]=i);
    const deg=nk.map(()=>0);q.edges.forEach(([a,b])=>{deg[a]++;deg[b]++});
    const multi=new Set(q.nodes.filter(n=>n.in.length>1).map(n=>n.t)),kept=new Set(nk.map(n=>n.t)),gold=new Set(q.shared);
    const lab=new Set(nk.map((n,i)=>i).filter(i=>nk[i].xy).sort((a,b)=>deg[b]-deg[a]).slice(0,7));
    const pos=nk.map(n=>n.xy?[NX(n.xy[0]),.1+.035*Math.min(6,n.in.length),NZ(n.xy[1])]:null);
    const beads=[];q.paras.forEach((p,j)=>p.phr.forEach((t,m)=>beads.push({j,t,p:[PX(j)+((m%5)-2)*.25,.19+Math.floor(m/5)*.16,PZJ(j)]})));
    C={q,nk,byT,deg,multi,kept,gold,lab,pos,beads}}
  function draw(R,k,e){const P=R.P;if(!C)prep();const {q,nk,byT,deg,multi,kept,gold,lab,pos,beads}=C;R.grid(-5.5,5.5,-2.8,3.6,.5);
    const COL=[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6],cc=n=>n.c0==null?P.mute:COL[n.c0%6],G=q.gold;
    // 1. the ten text units; gold ones orange
    q.paras.forEach((p,j)=>{const g=G.includes(j),a=k>=4&&k<=5?.45:1;R.box([PX(j),0,PZJ(j)],[1.45,.1,.8],{fill:g?mix(P.paper,P.c2,.45):P.paper,a});
      if(g)R.label([PX(j),0,PZJ(j)+.4],p.title.length>24?p.title.slice(0,23)+'.':p.title,{fs:12,b:1,c:P.c2,dy:14,a:Math.max(.5,a)});
      if(k===6&&g)R.glow([PX(j),.12,PZJ(j)],.8,{c:P.c2,a:e})});
    if(k<=1)R.label([PX(4)+.8,.05,PZJ(9)],'10 text units',{al:'left',dx:8,mono:true,fs:12,c:P.mute,wide:1});
    // 2. one bead per extracted name; 3. names in two or more paragraphs highlighted; 4. names that do not survive pruning fade
    if(k>=1){const ap=k===1?e:1,recede=k>=4?.35:1;beads.forEach((b,i)=>{const sh=multi.has(b.t),kp=kept.has(b.t);
        let c=P.paper,a=ap*recede;if(k>=2&&sh)c=mix(P.paper,P.acc,k===2?.75*e+.1:.85);if(k>=3&&!kp)a*=k===3?1-.8*e:.2;
        const y=k===1?.12+(b.p[1]-.12)*e:b.p[1];R.ball([b.p[0],y,b.p[2]],.07,{c,a})})}
    // the graph to come, faint from the first step so the frame is full: where the surviving names will sit
    if(k<3)nk.forEach((n,i)=>{if(pos[i])R.ball(pos[i],.05,{c:P.mute,a:.18})});
    // the graph: surviving names rise into nodes at their spring-layout positions
    if(k>=3){const ga=k===3?Math.max(0,e*2-1):1;
      if(k===3)nk.forEach((n,i)=>{if(!pos[i]||n.in.length<2)return;n.in.slice(0,3).forEach(j=>R.flowArc([PX(j),.4,PZJ(j)],pos[i],.6,{c:P.acc,a:Math.min(1,e*1.5)*.8,r:.045,n:4,speed:1.3}))});
      // 5. edges among this question's surviving names (PMI-weighted in graphrag; drawn alike here)
      if(k>=4){const ea=k===4?e:1;q.edges.forEach(([a,b])=>{const u=pos[a],v=pos[b];if(!u||!v)return;const same=k>=5&&nk[a].c0===nk[b].c0&&nk[a].c0!=null;
          R.line([u,v],{c:same?cc(nk[a]):P.mute,w:same?1.8:1,a:ea*(same?.8:k>=5?.3:.5)})})}
      nk.forEach((n,i)=>{if(!pos[i])return;const r=.07+.025*Math.min(6,n.in.length),g7=k===6&&gold.has(n.t);
        const c=k>=5?(k===5?mix(P.c1,cc(n),e):cc(n)):P.c1;R.ball(pos[i],r,{c:g7?P.acc:c,a:ga*(k===6&&!g7?.4:1)});
        if(g7){R.glow(pos[i],.45,{c:P.acc,a:e});R.label(pos[i],n.t,{fs:12.5,b:1,c:P.acc,dy:-16})}
        else if(lab.has(i)&&k>=4)R.label(pos[i],n.t.length>18?n.t.slice(0,17)+'.':n.t,{fs:12,c:P.ink,dy:-14,grp:'nd',a:ga*(k===6?.5:1)})})}
    // 7. connect: the gold pair through a shared surviving node, or not at all
    if(k===6){const sh=q.shared.map(t=>byT[t]).filter(i=>i!=null&&pos[i]);
      sh.slice(0,4).forEach(i=>{R.flow([[PX(G[0]),.15,PZJ(G[0])],pos[i],[PX(G[1]),.15,PZJ(G[1])]],{c:P.acc,a:e,r:.07,n:10,speed:1.2})});
      if(!sh.length)R.label([0,.3,.3],'no shared surviving node: the graph cannot help',{fs:13,b:1,c:P.bad,a:e})}
  }
  function readout(k){const q=Q(),nk=q.nodes.filter(n=>n.s),com=new Set(nk.map(n=>n.c0).filter(c=>c!=null)),multi=new Set(q.nodes.filter(n=>n.in.length>1).map(n=>n.t));
    const v=(s,x)=>k>=s?x:'&ndash;';
    $('gb-ctr').innerHTML='<span>names extracted <b>'+GRL.fmt(k>=1?q.n_phr_total:0)+'</b></span><span>distinct <b>'+v(2,GRL.fmt(q.n_distinct))+'</b></span><span>in 2+ paragraphs here <b>'+v(2,multi.size)+'</b></span><span>surviving pruning <b>'+v(3,q.n_keep)+'</b></span><span>edges <b>'+v(4,q.edges.length)+'</b></span><span>communities <b>'+v(5,com.size)+'</b></span>';
    $('gb-verdict').innerHTML='<span class="small">'+E(q.q)+' <span class="mute">(answer: '+E(q.answer)+')</span>'+(k>=6?' <b>'+(q.shared.length?'Gold pair linked through '+E(q.shared.slice(0,4).join(', '))+'.':'Gold pair not linked: no shared surviving node.')+'</b>':'')+'</span>';
    const kept=new Set(nk.map(n=>n.t)),gold=new Set(q.shared);
    $('gb-paras').innerHTML=q.paras.map((p,j)=>'<div class="gb-p'+(q.gold.includes(j)?' gold':'')+'"><div class="tt">'+E(p.title)+'</div><div class="n">'+p.words+' words'+(k>=1?', '+p.phr.length+' names':'')+'</div>'+
      (k>=1?'<div class="ch">'+p.phr.map(x=>{const c=(k>=2&&multi.has(x)?' hot':'')+(k>=3&&!kept.has(x)?' dim':'');return '<span class="gr-chip'+c+'"'+(k>=6&&gold.has(x)?' style="outline:2px solid var(--c2)"':'')+'>'+E(x)+'</span>'}).join('')+'</div>':'')+'</div>').join('')}
  // question and extraction chips (a mode change resets the stage and replays it)
  const qs=$('gb-qs');qs.innerHTML=B.questions.map((q,i)=>'<button data-q="'+i+'"'+(i?'':' class="on"')+' title="'+E(q.q)+'">'+(i+1)+'. '+E(q.q.split(' ').slice(0,4).join(' '))+'&hellip;</button>').join('');
  const llm=$('gb-src').querySelector('[data-m="llm"]');if(!B.llm){llm.disabled=true;llm.textContent='LLM (pending)'}else llm.textContent='LLM (Qwen3-1.7B, root agent runs)';
  const full={cam:[0,.85],bounds:[[-5.2,0,-2.5],[5.2,1.3,3.3]]},near={cam:[0,.72],bounds:[[-5.2,0,.9],[5.2,1.5,3.3]]};
  const st=S3.stage({id:'stg-build',list:'sx-build',fig:'Fig. 2 · graphrag fast path, one question (recorded)',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[12,8,26,8]:[16,14,30,14],
    view:k=>k<=2?near:k===4||k===5?{cam:[0,1.0],bounds:[[-5.2,0,-2.5],[5.2,.6,1.5]]}:full,
    onStep:k=>{try{readout(k)}catch(err){}}});
  qs.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;qi=+b.dataset.q;qs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));C=null;st.list('sx-build')});
  $('gb-src').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.disabled)return;src=b.dataset.m;$('gb-src').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));C=null;st.list('sx-build')});
  readout(0);
})();
