// ---- Scene: Fig. 3, global search as a map-reduce over community reports (renderer v2). Data: window.GR.global_4b (s_global.py, Qwen3-4B,
// graphrag 3.3.0's report, map and reduce prompts on the subset's fast-mode index): the 18 level-0 communities (block height: members), each
// question's map scores and kept points per report, the reduce call's totals, and the paragraphs behind the kept points against the dense top 10.
// The paragraph tiles are the subset's 394 paragraphs; where a tile sits is layout only. ----
(function(){
  if(!document.getElementById('stg-glob')||!window.GR||!GR.global_4b)return;const {mix}=S3;
  const g=GR.global_4b,H0=(GR.build.hierarchy['0']||[]),E=GRL.esc,F=GRL.fmt,$=id=>document.getElementById(id);
  const NP=g.n_paragraphs||394,NR=g.reports.length;let gi=0;
  const top=cid=>{const h=H0.find(c=>c.id===cid);return h?h.top[0]:''};
  const CX=i=>-5+(i%6)*2,CZ=i=>-2.6+Math.floor(i/6)*1.1,BH=i=>.15+g.reports[i].n_members/46*.55;
  const QB=[0,1.75,-1.5],RB=[0,0,1.0];
  const TC=30,TS=.16,TX=i=>-2.4+(i%TC+.5)*TS,TZ=i=>1.75+(Math.floor(i/TC)+.5)*TS;
  const DENSE=[...Array(10)].map((_,j)=>(j*41+17)%NP); // ten tiles for the dense top 10 (layout only)
  function tiles(R,lit,a){const P=R.P;for(let i=0;i<NP;i++){const x=TX(i),z=TZ(i),h=TS*.42,on=i<lit;
      R.quad([[x-h,0.01,z-h],[x+h,0.01,z-h],[x+h,0.01,z+h],[x-h,0.01,z+h]],{fill:on?mix(P.paper,P.c3,.75):P.paper,fa:on?.9:.7,ec:P.edge,ea:.25,a})}}
  function draw(R,k,e){const P=R.P,A=g.answers[gi],M={};A.map.forEach(m=>M[m[0]]=m);R.grid(-6,6,-3.2,4.4,.5);
    const back=k===4?.3:1;
    // 1. communities and their reports (glass), written at index time from the paragraphs
    if(k===0)tiles(R,0,.6);
    g.reports.forEach((r,i)=>{const x=CX(i),z=CZ(i),h=BH(i),a=back*(k===0?Math.min(1,e*1.6):1),ga=k===0?Math.max(0,e*2-1):back;
      R.box([x,0,z],[.8,h,.55],{fill:mix(P.paper,P.c3,.25),a});
      R.glass([x-.36,h+.1,z],[.72,0,0],[0,.46,0],{c:P.c3,a:ga*.9,nu:4,nv:3});
      if(k===0){R.label([x,0,z+.28],top(r.cid).toLowerCase().slice(0,11),{fs:12,dy:13,c:P.mute,a:e,wide:1});
        if(i%3===0)R.flowArc([TX((i*23)%NP),.02,TZ((i*23)%NP)],[x,h+.3,z],.8,{c:P.c3,a:e*.7,r:.045,n:4,speed:1})}});
    // the question
    if(k>=1&&k<=3){const a=k===1?Math.min(1,e*2):1;R.glow(QB,.4,{c:P.c2,a});R.ball(QB,.13,{c:P.c2,a});R.label(QB,'question',{mono:true,fs:12,dy:-18,c:P.c2,a})}
    // 2. map: one call per report
    if(k===1)g.reports.forEach((r,i)=>R.flowArc(QB,[CX(i),BH(i)+.35,CZ(i)],.5,{c:P.c2,a:Math.min(1,e*1.5)*.8,r:.045,n:5,speed:1.4}));
    // 3. each report's best point score (0 to 100)
    if(k>=2&&k<=3)g.reports.forEach((r,i)=>{const m=M[i]||[i,0,0],x=CX(i),z=CZ(i),y=BH(i)+.6,hh=Math.max(.012,m[1]/100*.55)*(k===2?e:1);
      R.box([x,y,z],[.32,hh,.22],{fill:m[1]?P.acc:P.bad,a:1,shadow:false});R.label([x,y+hh,z],String(m[1]),{mono:true,fs:12,dy:-9,c:m[1]?P.ink:P.bad,a:k===2?e:1,wide:1})});
    // 4. reduce: the kept points stream into one call
    if(k>=3){const u=k===3?e:1;g.reports.forEach((r,i)=>{const m=M[i];if(!m||!m[2])return;R.flowArc([CX(i),BH(i)+.6,CZ(i)],[RB[0],.75*u+.1,RB[2]],.6,{c:P.acc,a:(k===3?Math.min(1,e*1.5):.35)*back,r:.04+.015*m[2],n:2+2*m[2],speed:1.1})});
      R.box(RB,[.9,.15+.75*u,.6],{fill:mix(P.paper,P.acc,.4),a:back});R.label([RB[0],.15+.75*u,RB[2]],'reduce · '+A.points+' points',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc,a:back})}
    // 5. breadth: the paragraphs behind the kept points against the dense top 10
    if(k===4){const lit=Math.round(A.paragraphs_behind_points*e);tiles(R,lit,1);
      DENSE.forEach(i=>R.box([TX(i),0,TZ(i)],[TS*.8,.18*e,TS*.8],{fill:P.c2,a:e,shadow:false}));
      R.label([TX(TC-1)+.2,0,TZ(0)],F(A.paragraphs_behind_points)+' of '+NP+' behind the points',{al:'left',dx:8,fs:12.5,b:1,c:P.c3,a:e});
      R.label([TX(TC-1)+.2,0,TZ(NP-1)],'dense top 10 · 1 call',{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a:e})}
  }
  function readout(){const A=g.answers[gi],cg=A.cost_global,cn=A.cost_naive;
    $('gg-read').innerHTML='<b>'+E(A.q)+'</b><div class="gr-ctr"><span>map-reduce <b>'+cg.calls+'</b> calls, <b>'+F(cg.in)+'</b> prompt tokens, '+Math.round(cg.s)+' s</span><span>dense top 10 <b>1</b> call, <b>'+F(cn.in)+'</b> tokens, '+cn.s.toFixed(1)+' s</span><span>points kept <b>'+A.points+'</b></span><span>paragraphs behind them <b>'+A.paragraphs_behind_points+'</b> of '+NP+'</span></div>';
    $('gg-ans').innerHTML='<div><b>Global map-reduce</b> ('+cg.calls+' calls, '+F(cg.in)+' prompt tokens)\n\n'+E(A.global)+'</div><div><b>Dense top 10</b> (1 call, '+F(cn.in)+' prompt tokens)\n\n'+E(A.naive)+'</div>'}
  const qs=$('gg-qs');qs.innerHTML=g.answers.map((a,i)=>'<button data-q="'+i+'"'+(i?'':' class="on"')+' title="'+E(a.q)+'">'+E(a.q.split(' ').slice(0,5).join(' '))+'&hellip;</button>').join('');
  const back={cam:[0,1.0],bounds:[[-5.7,0,-3],[5.7,1.2,4]]},mid={cam:[0,.95],bounds:[[-5.7,0,-3],[5.7,1.9,.2]]},red={cam:[0,.95],bounds:[[-5.7,0,-3],[5.7,1.9,1.5]]};
  const st=S3.stage({id:'stg-glob',list:'sx-glob',fig:'Fig. 3 · global search, '+NR+' reports (recorded, Qwen3-4B)',cam:mid.cam,bounds:mid.bounds,aspect:.6,dur:1500,hold:5000,draw,
    margin:w=>w<520?[12,8,14,8]:[16,14,18,14],
    view:k=>k===0?back:k===3?red:k===4?{cam:[0,1.0],bounds:[[-5.7,0,-3],[5.7,1.2,4.1]]}:mid});
  qs.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;gi=+b.dataset.q;qs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));readout();st.list('sx-glob')});
  readout();
})();
