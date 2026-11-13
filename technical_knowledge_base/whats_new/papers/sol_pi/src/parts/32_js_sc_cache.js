// ---- Scene: what each mechanism does to the prompt and the prompt cache, request by request (renderer v2: flowing dots, camera per step, signed bars on plinths) ----
// Driven by the page's own simulator (15_js_sim.js, the released constants and the ported compaction gate) on illustrative session B (seed 21) with a
// 1M-token window: every row is one model request of that session, laid out to scale, its cached prefix (re-read) and its new or changed tail (written).
// The last step sets the session's change in cache reads, cache writes and cost beside the paper's (Table 2, GPT-5.6 Sol).
(function(){
  if(!document.getElementById('stg-cache'))return;const {at,lerp,mix}=S3;const K=SIM_K;
  const SEED=21,w0=K.WINDOW;K.WINDOW=1e6;const S=simSession(SEED,12),RUN={};['pi','op','af','epr','occ','all'].forEach(m=>RUN[m]=simRun(S,m,{trace:true}));K.WINDOW=w0;
  const div=m=>{const a=RUN.pi.series,b=RUN[m].series;let i=0;while(i<a.length&&a[i].read===b[i].read&&a[i].write===b[i].write)i++;return i};
  const row=(m,i)=>{const q=RUN[m].series[i];return {i,read:q.read,write:q.write,tot:q.read+q.write,seg:q.seg,pre:q.pre,ev:q.ev}};
  const dOp=div('op'),dAf=div('af'),dEp=div('epr'),dOc=div('occ');
  // windows: [lane, request index, position in depth]; the mechanism lane is aligned with Pi's on the same actions
  const W=[
    {m:null,pi:[dOp-2,dOp-1,dOp,dOp+1].map((i,j)=>[i,j])},
    {m:'op',pi:[dOp-2,dOp-1,dOp,dOp+1].map((i,j)=>[i,j]),mk:[dOp-2,dOp-1,dOp,dOp+1].map((i,j)=>[i,j])},
    {m:'af',pi:[dAf-1,dAf,dAf+1,dAf+2].map((i,j)=>[i,j]),mk:[[dAf-1,0],[dAf,2],[dAf+1,3]],ghost:1},
    {m:'epr',pi:[dEp-1,dEp,dEp+1,dEp+2].map((i,j)=>[i,j]),mk:[dEp-1,dEp,dEp+1,dEp+2].map((i,j)=>[i,j])},
    {m:'occ',pi:[dOc-2,dOc-1,dOc,dOc+1].map((i,j)=>[i,j]),mk:[dOc-2,dOc-1,dOc,dOc+1].map((i,j)=>[i,j])},
    {bill:1}];
  const pct=(a,b)=>100*(b/a-1),T0=RUN.pi,T1=RUN.all,ab=PAPER.tables.abl['GPT-5.6 Sol'],p0=ab.find(r=>r.kind==='pi'),p1=ab.find(r=>r.name==='SoL-Pi [Efficiency]');
  const D=window.CACHEDATA={seed:SEED,dOp,dAf,dEp,dOc,
    op:{before:row('pi',dOp),after:row('op',dOp),stubbed:RUN.op.series[dOp-1].seg.find(x=>x[2]&&x[1]!=='recall')},
    af:{saved:row('pi',dAf),req:[RUN.pi.T.req,RUN.af.T.req]},epr:{pi:row('pi',dEp),ep:row('epr',dEp)},
    occ:{call:row('occ',dOc-1),after:row('occ',dOc),next:row('occ',dOc+1),pi:row('pi',dOc),gate:RUN.occ.events.find(e=>e.k==='gate'&&e.dec.compact)},
    pi:{share:100*T0.T.read/T0.total,req:T0.T.req},
    sim:[['reads',pct(T0.T.read,T1.T.read)],['writes',pct(T0.T.write,T1.T.write)],['cost',pct(T0.cost,T1.cost+T1.side)]],
    paper:[['reads',pct(p0.cache_read,p1.cache_read)],['writes',pct(p0.cache_write,p1.cache_write)],['cost',pct(p0.cost,p1.cost)]]};
  const LN=4.7,LX=[-5.0,.3],DZ=.85,Z0=-1.3,RH=.16,RD=.5;
  const NAME={op:'+ ObservationPack',af:'+ Action Fusion',epr:'+ Evidence-Preserving Reducer',occ:'+ Online Context Compact'};
  function lane(R,m,rows,x0,sc,a,ghost,nolab){const P=R.P;if(a<=.01)return;
    rows.forEach(([i,j],n)=>{const q=row(m,i),z=Z0+j*DZ,rl=q.read*sc,wl=q.write*sc;
      R.box([x0+rl/2,0,z],[Math.max(.01,rl),RH,RD],{fill:mix(P.paper,P.c1,.38),a,shadow:false,lw:.6});
      R.box([x0+rl+wl/2,0,z],[Math.max(.04,wl),RH*2,RD],{fill:P.c2,a,shadow:false,lw:.6});
      // segments worth marking: a large result (purple), a 1 KB stub, a receipt, the compaction summary
      let x=x0;q.seg.forEach(([sz,kind,big])=>{const L=sz*sc,tag=t=>{if(nolab&&!lane.tg[t]){lane.tg[t]=1;R.label([x+Math.max(.06,L),RH,z],t,{al:'left',dx:12,fs:12,b:1,c:P.ink,a})}};
        if(big&&sz>K.OP_STUB&&kind!=='recall')R.box([x+L/2,RH,z],[Math.max(.02,L),.14,RD*.8],{fill:P.c4,a,shadow:false,lw:.6});
        if(big&&sz===K.OP_STUB){R.box([x+Math.max(.04,L)/2,RH*1.25,z],[Math.max(.06,L),.3,RD*.8],{fill:P.c4,a,shadow:false,lw:.6});tag('1 KB stub')}
        if(kind==='sum'){R.box([x+L/2,RH*1.25,z],[Math.max(.04,L),.3,RD*.8],{fill:P.c3,a,shadow:false,lw:.6});tag('summary')}
        if(kind==='run'&&!big&&sz===K.RECEIPT){R.box([x+Math.max(.05,L)/2,RH*1.25,z],[Math.max(.06,L),.3,RD*.8],{fill:P.c3,a,shadow:false,lw:.6});tag('receipt')}
        x+=L});
      if(!nolab)R.label([x0-.1,.1,z],'request '+(i+1),{al:'right',dx:-4,mono:true,fs:12,c:P.mute,a,wide:1})});
    // the re-sent prefix: dots stream from each request into the next one along the part it shares
    for(let n=1;n<rows.length;n++){const qa=row(m,rows[n-1][0]),qb=row(m,rows[n][0]),za=Z0+rows[n-1][1]*DZ,zb=Z0+rows[n][1]*DZ,xr=x0+Math.min(qb.read,qa.tot)*sc*.5;
      if(qb.read>K.SYS)R.flow([[xr,RH+.02,za],[xr,RH+.02,zb]],{c:P.c1,a:a*.85,r:.05,n:3,speed:.9})}
    if(ghost){const z=Z0+ghost*DZ,q=row('pi',rows[0][0]+1);R.quad([[x0,.01,z-RD/2],[x0+q.tot*sc,.01,z-RD/2],[x0+q.tot*sc,.01,z+RD/2],[x0,.01,z+RD/2]],{fill:false,ec:P.mute,dash:[4,3],a,lw:1.2})}}
  function plinth(R,c,vals,col,a,lab){if(a<=.01)return;const P=R.P,Wd=2.5,bw=Wd/3,Y=c[1],h=v=>Math.abs(v)/130*1.3;
    R.box([c[0],Y-.05,c[2]],[Wd+.2,.05,.5],{a,shadow:false});[-1,1].forEach(sx=>R.box([c[0]+sx*(Wd/2),0,c[2]],[.03,Y-.05,.03],{a:a*.9}));
    vals.forEach(([n,v],i)=>{const x=c[0]-Wd/2+bw*(i+.5),hh=Math.max(.02,h(v)),f=i===0?mix(P.paper,P.c1,.55):i===1?P.c2:col;
      R.box([x,v>=0?Y:Y-.05-hh,c[2]],[bw*.62,hh,.3],{fill:f,a,shadow:false});
      R.label([x,v>=0?Y+hh:Y-.05-hh,c[2]],(v>0?'+':'')+v.toFixed(0)+'%',{mono:true,fs:12.5,dy:v>=0?-11:11,b:1,a});R.label([x,Y,c[2]+.3],n,{fs:12,dy:v>=0?12:-12,a,c:P.mute})});
    R.label([c[0],Y+1.55,c[2]],lab,{fs:13,b:1,a})}
  function scene(R,k,a,am){lane.tg={};const P=R.P,w=W[k];if(a<=.01)return;am=am==null?a:am;
    if(w.bill){plinth(R,[-1.55,1.35,.2],D.sim,P.acc,a,'this session, all four');plinth(R,[1.55,1.35,.2],D.paper,P.acc,a,'paper, GPT-5.6 Sol');return}
    const all=w.pi.map(([i])=>row('pi',i).tot).concat(w.mk?w.mk.map(([i])=>row(w.m,i).tot):[]),sc=LN/Math.max(...all);
    lane(R,'pi',w.pi,LX[0],sc,a);R.label([LX[0]+LN/2,.3,Z0-.5],'Pi',{fs:13,b:1,a,dy:-6});
    if(w.mk){lane(R,w.m,w.mk,LX[1],sc,am,w.ghost?1:0,1);R.label([LX[1]+LN/2,.3,Z0-.5],NAME[w.m],{fs:13,b:1,a:am,c:P.acc,dy:-6})}}
  function draw(R,k,e){R.grid(-6,6,-2.2,2.8,.5);
    // a step that changes the whole picture fades the old one out before the new one appears; step 2 keeps Pi's lane and adds the mechanism's
    if(k===1){scene(R,1,1,e);return}
    if(k>0){scene(R,k-1,Math.max(0,1-2*e));scene(R,k,Math.max(0,2*e-1))}else scene(R,0,e)}
  S3.stage({id:'stg-cache',list:'sx-cache',fig:'Fig. 2 · one session, request by request (illustrative)',cam:[0,.95],bounds:[[-6.2,0,-2.0],[5.2,.4,1.8]],aspect:.45,dur:1500,hold:5600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,14],
    view:k=>k===5?{cam:[.1,.32],bounds:[[-3.1,0,-.3],[3.1,3,.7]]}:k===0?{cam:[0,.95],bounds:[[-6.4,0,-2.0],[-.2,.4,1.8]]}:null});
})();
