// ---- Scene: Fig. 3, one question and four second searches: the query's neighbourhood (renderer v2). Data: AR.hops.examples (bge-small exact search
// over the 9,760 paragraphs; recorded ranks and top-3 results for each query). Distance from the query is the paragraph's rank in that search on a
// log scale (rank 1 nearest, 1,000 at the edge); the angle is layout only. The shaded disc is what the tool returns: the top 3.
// Steps: the question and its two gold paragraphs; the first search; the same words again (first 3 skipped); the agent's own second query
// (recorded); the sentence hop 1 states (oracle). ----
(function(){
  if(!document.getElementById('stg-hop')||!window.ARL)return;const {lerp,mix}=S3;
  const A=ARL.A,EX=A.hops.examples,TT=A.hops.titles,esc=ARL.esc;let cur=0;
  const rad=r=>.95+1.05*Math.log10(Math.min(1000,Math.max(1,r))),HZ=rad(3.5);
  const SLOT=[-2.25,-1.57,-.89],H2A=.75; // angles: the top 3 in the back half, hop 2 front right (layout only)
  const P2=(r,a)=>[Math.cos(a)*r,0,Math.sin(a)*r];
  // per step: [query, top-3 ids, hop-2 rank] (step 0 shows the question with nothing retrieved yet)
  const S=e=>[[e.question,[],null],[e.question,e.first,e.r2_q],[e.question,e.same,e.rank_same],[e.q_agent,e.q_agent?e.agent:[],e.q_agent?e.rank_agent:null],[e.q_sent,e.sent,e.rank_sent]];
  const h2pos=(e,k)=>{const s=S(e)[k];return s[2]==null?4.1:rad(s[2])};
  function draw(R,k,e){const P=R.P,E=EX[cur],st=S(E)[k],nar=R.W<520,h2a=H2A;R.grid(-4.6,4.6,-4.6,4.6,.5);
    // rings: ranks 1, 10, 100, 1,000; the tool's horizon (top 3) as a shaded disc
    const circ=(r,n)=>{const pts=[];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;pts.push([Math.cos(a)*r,.005,Math.sin(a)*r])}return pts};
    R.quad(circ(HZ,48),{fill:P.c1,fa:.14,ec:P.c1,ea:.8,a:1});
    [[10,'rank 10'],[100,'rank 100'],[1000,'rank 1,000']].forEach(([r,t])=>{R.line(circ(rad(r),72),{c:P.line,w:1.2,dash:[4,4]});R.label([rad(r)*.71,0,rad(r)*.71],t,{fs:12,mono:true,c:P.mute,dy:12,grp:'ring'})});
    R.label([-HZ,0,0],'top 3 · what the tool returns',{fs:12.5,b:1,c:P.c1,al:'right',dx:-8,grp:'ring'});
    // the query at the centre
    R.ball([0,.45,0],.2,{c:k===3?P.c2:k===4?P.c3:P.acc});R.line([[0,0,0],[0,.3,0]],{c:P.mute,w:1.2});
    // hop 2 glides from its rank in the previous search to this one
    const r0=h2pos(E,Math.max(0,k-1)),r1=h2pos(E,k),rr=k===0?4.1:lerp(r0,r1,e),pH2=P2(rr,h2a),inH=st[2]!=null&&st[2]<=3;
    // the top 3 of this search (hop 2 included when it is among them)
    st[1].forEach((id,i)=>{if(id===E.h2)return;const p=P2(rad(i+1),SLOT[i]),a=Math.min(1,e*1.6),g1=id===E.h1;
      R.box(p,[.7,.14,.42],{fill:g1?P.c3:P.paper,a});R.flowArc([p[0],.12,p[2]],[0,.45,0],.5,{c:g1?P.c3:P.acc,a:a*.85,r:.05,n:4,speed:1.2});
      R.label([p[0],.14,p[2]],TT[id]||id,{fs:12.5,c:g1?P.c3:P.ink,b:g1,dy:-12,grp:'res',a})});
    R.box(pH2,[.7,.14,.42],{fill:P.c2,a:1});R.glow([pH2[0],.15,pH2[2]],.4,{c:P.c2,a:inH?e:.35});
    if(inH)R.flowArc([pH2[0],.12,pH2[2]],[0,.45,0],.5,{c:P.c2,a:e,r:.07,n:6,speed:1.3});
    R.label([pH2[0],.12,pH2[2]],(TT[E.h2]||'hop 2')+(st[2]!=null&&k>0?' · rank '+st[2]:''),{fs:12.5,b:1,c:P.c2,dy:22});
    if(k===0){const p=P2(rad(1),SLOT[0]);R.box(p,[.7,.14,.42],{fill:P.c3,a:e});R.label([p[0],.12,p[2]],TT[E.h1]+' · hop 1',{fs:12.5,b:1,c:P.c3,dy:-10,a:e,wide:1})}
    if(k===3&&!E.q_agent)R.label([0,.7,0],'no second search',{fs:13,b:1,c:P.bad,dy:-14,a:e});
  }
  const qq=document.getElementById('ar-hopq'),rd=document.getElementById('ar-hopread');
  const WHO=['The question','First search: the question','Second search: the same words, first 3 skipped',"Second search: the 1.7B agent's own query (recorded)",'Second search: the sentence hop 1 states (oracle)'];
  function readout(k){const E=EX[cur],s=S(E)[k];if(!rd)return;
    rd.innerHTML='<div class="small mute">Question '+(cur+1)+' of '+EX.length+'. Answer: <b>'+esc(E.answer)+'</b>. Gold: <span class="g1">'+esc(TT[E.h1])+'</span> (hop 1), <span class="g2">'+esc(TT[E.h2])+'</span> (hop 2).</div>'+
      '<div><b>'+WHO[k]+'</b> <span class="qq">'+esc(s[0]||'(the agent answered after one search)')+'</span></div>'+
      (s[1].length?'<div class="ar-res">'+s[1].map(p=>'<span class="'+(p===E.h2?'g2':p===E.h1?'g1':'')+'" title="'+esc(TT[p]||p)+'">'+esc(TT[p]||p)+'</span>').join('')+'</div>':'')+
      (s[2]!=null&&k>0?'<div class="small">Hop 2 rank: <b>'+s[2]+'</b>'+(s[2]<=3?' (found)':' (missed: the tool shows the top 3)')+'</div>':'')}
  const st=S3.stage({id:'stg-hop',list:'sx-hop',fig:'Fig. 3 · distance = rank in that search (log scale)',cam:[0,1],bounds:[[-4.1,0,-4.1],[4.1,.5,4.1]],aspect:.7,dur:1500,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[16,16,16,16],onStep:k=>{try{readout(k)}catch(x){}}});
  if(qq){qq.innerHTML=EX.map((e,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+(i+1)+'</button>').join('');
    RD.seg(qq,v=>{cur=+v;st.list('sx-hop')})}
})();
