// ---- Scene: Fig. 1, every pattern on one floor (renderer v2). The floor is the page's map: columns say who decides the next step
// (your code, a model, nobody), rows say what each loop sees (only its slice, or a shared history or store). Each pattern stands in its cell
// as its own small machine: model loops are blue blocks, code is a flat gold slab, a shared store is a green glass plate, and the glass beside
// a loop is the context it sees. The camera moves in on one pattern per step; dots flow where work goes out (orange) and results come back
// (purple). The last step colours each cell by what the pattern did on this page's task, computed from the recordings (FM, FMD), not typed. ----
(function(){
  if(!document.getElementById('stg-map'))return;const {at,mix}=S3;
  const U=FMU,D=window.FMD,H=FM.handoffs||[],W=FM.write||[];
  // results, as the old hero computed them
  const tp=d=>U.runs(d).map(r=>r.tp).join(', ');
  const xs=r=>Object.values(r.xk||{}).reduce((a,b)=>a+b,0);
  const bx=Math.max.apply(null,U.runs('board').map(xs).concat([0]));
  const ho=H.filter(r=>r.design!=='as_tool'),atl=H.filter(r=>r.design==='as_tool');
  const hoMiss=ho.filter(r=>!r.tool_calls.some(t=>t[0]==='check_status')).length;
  const atBoth=atl.filter(r=>r.tool_calls.some(t=>t[0]==='check_status')&&r.tool_calls.some(t=>t[0]==='lookup_invoice')).length;
  const op=W.filter(r=>r.spec==='open'&&r.design==='parallel'),oc=W.filter(r=>r.spec==='open'&&r.design==='contract');
  const by={};(D&&D.M||[]).forEach(m=>by[m.id]=m);
  const ms=U.mean(U.runs('multi').map(r=>r.tot.cost))/U.mean(U.runs('single').map(r=>r.tot.cost));
  const V={'map.one':tp('single')+' of 16 found','map.orch':'16 of 16 in every run, about '+U.nf(ms,1)+' times the cost',
    'map.tool':'both problems handled in '+atBoth+' of '+atl.length+' runs','map.ho':'the second problem dropped in '+hoMiss+' of '+ho.length+' runs',
    'map.fan':'16 of 16, the cheapest split','map.wri':'open spec: halves fitted in '+op.filter(r=>r.ok).length+' of '+op.length+' runs ('+oc.filter(r=>r.ok).length+' of '+oc.length+' with a contract first)',
    'map.vote':by.vote5?by.vote5.right+' of '+by.vote5.n+' puzzles (one sample: '+by.single.right+')':'','map.deb':by.debate&&by.vote5?by.debate.right+' of '+by.debate.n+', at '+U.nf(100*by.debate.tok/by.vote5.tok,0)+'% of the tokens of the vote of 5, and every solver ends up agreeing':'',
    'map.bb':'16 of 16, plus up to '+bx+' reports outside the brief'};
  document.querySelectorAll('.fm-v[data-v^="map."]').forEach(e=>{if(e.dataset.v in V){e.textContent=V[e.dataset.v];e.classList.remove('fm-miss')}});
  // the floor: three columns (who decides) by two rows (what each loop sees)
  const COL=[[-8.1,-.5],[-.5,4.6],[4.6,8.1]],ROW=[[.35,4.1],[-4.1,-.35]];
  const C={fan:[-6.7,2.25],wri:[-4.2,2.25],vote:[-1.75,2.25],orch:[.8,2.25],tool:[3.3,2.25],deb:[-1.75,-2.2],one:[.8,-2.2],ho:[3.3,-2.2],bb:[6.35,-2.2]};
  const NAME={fan:'fan-out workflow',wri:'parallel writers',vote:'voting',orch:'orchestrator-workers',tool:'agents as tools',deb:'debate',one:'one agent',ho:'handoff',bb:'blackboard'};
  const RES={one:'bad',orch:'mid',tool:'ok',ho:'bad',fan:'ok',wri:'bad',vote:'ok',deb:'mid',bb:'mid'};
  const STEP=[null,['one'],['orch'],['tool'],['ho'],['fan'],['wri'],['vote','deb'],['bb'],null];
  const p=(id,dx,dz,y)=>[C[id][0]+dx,y||0,C[id][1]+dz];
  // the pieces: a model loop, a code slab, a context glass beside a loop
  function loop(R,q,a,o){o=o||{};const P=R.P;R.box(q,[.5,.5,.5],{fill:o.fill||mix(P.paper,P.c1,o.dim?.12:.32),a});
    if(o.lab)R.label([q[0],.5,q[2]],o.lab,{fs:12,b:o.b,dy:-11,a,c:o.c||P.ink})}
  function code(R,q,a,lab,w){const P=R.P;R.box(q,[w||.6,.13,.44],{fill:mix(P.paper,P.c5,.5),a});if(lab)R.label([q[0],.13,q[2]],lab,{fs:12,dy:-10,a,c:P.mute})}
  function ctx(R,q,h,a,c){if(a<=.01)return;const P=R.P;R.glass([q[0]+.3,0,q[2]+.22],[0,0,-.44],[0,h,0],{c:c||P.c6,a:a*.85,nu:1,nv:Math.max(1,Math.round(h*6))})}
  function flow(R,a,b,c,A,h,n){R.flowArc([a[0],.5,a[2]],[b[0],.5,b[2]],h==null?.3:h,{c,a:A,r:.05,speed:1.1,n:n||5})}
  function cluster(R,id,a,hot,e){const P=R.P,O=P.c2,I=P.c4,L=hot?1:0;
    switch(id){
    case 'one':{const t=p(id,-.75,.35),g=p(id,.15,0);code(R,t,a,L&&'task',.4);loop(R,g,a,{lab:L&&'agent'});ctx(R,g,hot?.4+1.0*e:1.1,a);
      if(hot){flow(R,t,g,O,a);R.flowArc([g[0]+.1,.5,g[2]],[g[0]+.27,.9,g[2]],.25,{c:P.c6,a,r:.05,n:4});R.label([g[0]+.3,1.45,g[2]],'every read stays in one context',{fs:12,al:'left',dx:4,c:P.c6,a})}break}
    case 'orch':{const l=p(id,0,.6),w=[-.68,0,.68].map(x=>p(id,x,-.45));loop(R,l,a,{lab:L&&'lead'});ctx(R,l,.25,a);
      w.forEach((q,i)=>{loop(R,q,a,{lab:L&&i===1&&'workers'});ctx(R,q,.4,a)});
      if(hot){w.forEach(q=>{flow(R,l,q,O,a,.35,4);flow(R,q,l,I,a*e,.5,4)});R.label(p(id,-.75,.1,.7),'briefs',{fs:12,al:'right',c:O,a});R.label(p(id,.75,.1,.85),'reports',{fs:12,al:'left',c:I,a})}break}
    case 'tool':{const m=p(id,0,.6),s=[p(id,-.5,-.45),p(id,.5,-.45)];loop(R,m,a,{lab:L&&'manager'});ctx(R,m,.55,a);
      s.forEach((q,i)=>{loop(R,q,a,{lab:L&&(i?'tech':'billing')});ctx(R,q,.2,a)});
      if(hot){s.forEach(q=>{flow(R,m,q,O,a,.35,4);flow(R,q,m,I,a*e,.5,4)});R.label(p(id,-.75,-.1,.75),'a generated input',{fs:12,al:'right',c:O,a});R.label(p(id,.75,-.1,.75),'result back',{fs:12,al:'left',c:I,a})}break}
    case 'ho':{const u=p(id,-.85,0),t=p(id,-.15,0),b=p(id,.7,-.5),x=p(id,.7,.5);code(R,u,a,L&&'user',.34);
      loop(R,t,a,{lab:L&&'triage',dim:hot&&e>.5});loop(R,b,a,{lab:L&&'billing'});loop(R,x,a,{lab:L&&'tech',dim:hot,c:P.mute});
      if(hot){flow(R,u,t,O,a,.25,3);
        // the history moves with control: a stack of message slabs travels from triage to billing
        for(let j=0;j<5;j++){const f=Math.min(1,Math.max(0,e*1.4-j*.08)),q=[t[0]+(b[0]-t[0])*f,.46+j*.07+Math.sin(Math.PI*f)*.35,t[2]+(b[2]-t[2])*f];R.box(q,[.3,.05,.3],{fill:mix(P.paper,P.c6,.5),a,shadow:false,lw:.6})}
        flow(R,t,b,P.c6,a,.4,5);R.line([[t[0],.5,t[2]],[(t[0]+x[0])/2,.62,(t[2]+x[2])/2]],{c:P.bad,w:2,dash:[4,4],a});
        R.label([(t[0]+x[0])/2,.62,(t[2]+x[2])/2],'second transfer ignored',{fs:12,al:'left',dx:6,c:P.bad,a});R.label([b[0],.9,b[2]],'whole history',{fs:12,dy:-14,c:P.c6,a})}else ctx(R,b,.8,a);break}
    case 'fan':{const c0=p(id,-.8,0),m=p(id,.8,0),w=[-.55,0,.55].map(z=>p(id,0,z));code(R,c0,a,L&&'split (code)',.36);code(R,m,a,L&&'merge (code)',.36);
      w.forEach((q,i)=>{loop(R,q,a,{lab:L&&i===0&&'one call each'});ctx(R,q,.35,a)});
      if(hot){w.forEach(q=>{flow(R,c0,q,O,a,.25,4);flow(R,q,m,I,a*e,.25,4)});R.label(p(id,-.8,.55,.2),'slices',{fs:12,dy:12,c:O,a})}break}
    case 'wri':{const s=p(id,-.8,0),w=[p(id,0,-.45),p(id,0,.45)],h=[p(id,.75,-.22),p(id,.75,.22)];code(R,s,a,L&&'spec',.36);
      w.forEach((q,i)=>{loop(R,q,a,{lab:L&&(i?'writer B':'writer A')});ctx(R,q,.3,a)});
      h.forEach((q,i)=>R.box(q,[.4,.22,.38],{fill:mix(P.paper,i?P.c4:P.c2,.35),a}));
      if(hot){w.forEach((q,i)=>{flow(R,s,q,O,a,.25,4);flow(R,q,h[i],I,a,.2,3)});R.glow([h[0][0],.22,h[0][2]+.2],.35,{c:P.bad,a:a*e});R.label([h[0][0]+.25,.3,h[0][2]+.2],'names do not match',{fs:12,al:'left',dx:6,c:P.bad,a:a*e})}break}
    case 'vote':{const q0=p(id,-.8,0),v=p(id,.8,0),w=[-.55,0,.55].map(z=>p(id,0,z));code(R,q0,a,L&&'question',.36);code(R,v,a,L&&'majority (code)',.36);
      w.forEach((q,i)=>{loop(R,q,a,{lab:L&&i===0&&'independent samples'});ctx(R,q,.25,a)});
      if(hot){w.forEach(q=>{flow(R,q0,q,O,a,.25,3);flow(R,q,v,I,a,.25,3)})}break}
    case 'deb':{const q0=p(id,-.8,0),v=p(id,.8,0),w=[-.55,0,.55].map(z=>p(id,0,z));code(R,q0,a,0,.36);code(R,v,a,L&&'vote (code)',.36);
      w.forEach((q,i)=>{loop(R,q,a,{lab:L&&i===2&&'solvers'});ctx(R,q,.55,a)});
      if(hot){w.forEach((q,i)=>{flow(R,q0,q,O,a,.25,3);w.forEach((r,j)=>{if(i!==j)R.flowArc([q[0],.5,q[2]],[r[0],.5,r[2]],.35,{c:P.c6,a:a*.8,r:.045,n:3})});flow(R,q,v,I,a*e,.25,3)});
        R.label(p(id,0,-.55,1.0),'each reads the others',{fs:12,c:P.c6,a,dy:-6})}break}
    case 'bb':{const b=p(id,0,0,.32),w=[[-.6,-.55],[.6,-.55],[-.6,.55],[.6,.55]].map(([x,z])=>p(id,x,z));
      R.glass([b[0]-.4,.32,b[2]-.4],[.8,0,0],[0,0,.8],{c:P.c3,a:a*.9,nu:4,nv:4,th:.04});R.box([b[0],0,b[2]],[.06,.32,.06],{a});
      w.forEach((q,i)=>{loop(R,q,a,{lab:L&&i===0&&'agents'});ctx(R,q,.4,a)});if(L)R.label([b[0],.4,b[2]],'board',{fs:12,b:1,c:P.c3,dy:-12,a});
      if(hot){w.forEach((q,i)=>{R.flowArc([b[0],.36,b[2]],[q[0],.5,q[2]],.25,{c:O,a,r:.05,n:3});R.flowArc([q[0],.5,q[2]],[b[0],.36,b[2]],.45,{c:I,a:a*e,r:.05,n:3})});
        R.label(p(id,.95,0,.4),'claim, then post',{fs:12,al:'left',c:P.mute,a})}break}
    }}
  function draw(R,k,e){const P=R.P,hotIds=STEP[k]||[],res=k===STEP.length-1;R.grid(-8.6,8.6,-4.6,4.6,.5);
    // cells: soft plates; on the last step each pattern's own plate takes the colour of what it did here
    COL.forEach(([x0,x1])=>ROW.forEach(([z0,z1])=>R.quad([[x0+.08,0,z0],[x1-.08,0,z0],[x1-.08,0,z1],[x0+.08,0,z1]],{fill:mix(P.paper,P.soft,.6),a:.75,ea:.35,dz:60})));
    const colTxt=['your code decides','a model decides','nobody decides'],rowTxt=['sees only its slice','sees shared history'];
    const full=!hotIds.length;
    if(full){COL.forEach(([x0,x1],i)=>R.label([(x0+x1)/2,0,-4.1],colTxt[i],{fs:12.5,b:1,c:P.ink,dy:-10}));
    ROW.forEach(([z0,z1],i)=>R.label([-8.1,0,(z0+z1)/2],rowTxt[i],{fs:12,al:'right',dx:-6,c:P.mute,wide:1}))}
    if(full&&!res)R.label([6.35,0,2.25],'(no pattern here)',{fs:12,c:P.mute,a:.7,wide:1});
    Object.keys(C).forEach(id=>{const hot=hotIds.includes(id),a=full?.9:hot?1:.16;
      if(res){const c={ok:P.good,bad:P.bad,mid:P.c5}[RES[id]];R.quad([p(id,-1.1,-.95),p(id,1.1,-.95),p(id,1.1,.95),p(id,-1.1,.95)],{fill:mix(P.paper,c,.5*e),a:.95,ec:c,lw:1.6,ea:e,dz:50})}
      cluster(R,id,a,hot,hot?e:1);
      if(full)R.label(p(id,0,.95),NAME[id],{fs:12,b:1,dy:id==='tool'||id==='wri'?27:12,c:res?{ok:P.good,bad:P.bad,mid:P.c5}[RES[id]]:P.ink,wide:1})});
  }
  const fullV={cam:[0,.92],bounds:[[-8.2,0,-4.3],[8.2,.6,4.2]]};
  const VIEW=k=>{const ids=STEP[k];if(!ids)return fullV;const xs=ids.map(i=>C[i][0]),zs=ids.map(i=>C[i][1]);
    if(ids.length>1)return {cam:[1.05,.62],bounds:[[-2.9,0,-3.3],[-.6,1.1,3.3]]};
    return {cam:[.3,.78],bounds:[[Math.min(...xs)-1.55,0,Math.min(...zs)-1.3],[Math.max(...xs)+1.55,1.2,Math.max(...zs)+1.3]]}};
  S3.stage({id:'stg-map',list:'sx-map',fig:'Fig. 1 · every pattern on one floor',cam:fullV.cam,bounds:fullV.bounds,aspect:.5,dur:1400,hold:5200,draw,view:VIEW,
    margin:w=>w<520?[14,10,14,10]:[24,14,20,120]});
})();
