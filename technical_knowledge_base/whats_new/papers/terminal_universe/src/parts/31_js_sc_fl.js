// ---- Scene (Idea): one real trajectory, imitated or rebuilt and re-solved (renderer v2: the trace as command tiles on a plinth, the workspace as a slab
// with one box per file, the agent's own files held back on a tray, the judge as a glass plate, the teacher's re-solve flowing into a new record,
// Table 4 as bars on white plinths; the camera moves in on the workspace while it is rebuilt and on the bars at the end) ----
// Data: the first shipped LFM2-Terminal trace (window.TRACES[0]) run through the page's own replay (RP.run, the port of src/replay.py), and Table 4
// (PAPER.tables.t4). The completion step draws the paper's terminal-pool median (13 files, Table 13), illustrative for this trace, since no completed
// workspace is published. Replaces the 2D before/after animation (makeAnim fl, 12_js_flip.js) of 2026-10-03; its captions became the two step lists.
// window.TUFL exposes the numbers for src/check_stages.mjs.
(function(){
  if(!document.getElementById('stg-fl')||typeof S3==='undefined'||!window.TRACES||typeof RP==='undefined')return;const {at,off,lerp,mix,add}=S3;
  const C=TRACES[0],R=RP.run(C),EV=R.events,N=EV.length;
  const e0=Object.keys(R.E0),known=R.known_only,agent=Object.keys(R.created).concat(R.held.filter(p=>!(p in R.created)));
  const T4=PAPER.tables.t4.rows,base=+T4[0][4],imit=+T4[1][4],res=+T4[2][4],MED_REP=2,MED_COMP=13;
  window.TUFL={n:N,e0:e0.length,e0l:R.e0_lines,known:known.length,held:agent.length,base,imit,res,e0names:e0.map(p=>p.slice(p.lastIndexOf('/')+1))};
  const KIND=(P,k)=>k==='read-pre'?P.c3:k==='read-part'?P.c6:k==='list'?P.c5:k==='run'?P.mute:k==='look'?P.paper:P.c2;
  const short=p=>p.slice(p.lastIndexOf('/')+1);
  // layout: the trace in front, the workspace slab behind it, the tray of held-back files to its right (the training record later takes its place),
  // the bars at the back right; each step shows its own objects at full strength and lets the rest recede
  const ZT=2.6,TX=i=>(i-(N-1)/2)*.56,WX=-1.7,SZ=0,SW=4.0,SD=2.2,TRX=2.1,BZ=-2.3,BX=[1.2,2.25,3.3];
  const slot=i=>[WX-SW/2+.5+(i%5)*.75,.12,SZ-SD/2+.42+Math.floor(i/5)*.68];
  let mode='resolve';
  function strip(R0,P,a){R0.box([0,0,ZT],[N*.56+.3,.06,.82],{a,dz:4});
    EV.forEach((x,i)=>R0.box([TX(i),.06,ZT],[.44,.12,.5],{fill:KIND(P,x.kind),a,shadow:false}))}
  function fileBox(R0,p,o){R0.box(p,[.46,.4,.46],Object.assign({shadow:false},o))}
  function bars(R0,P,rows,a){rows.forEach(([lab,v,c],i)=>{const h=v/res*1.9*a,x=BX[i];
      R0.box([x,0,BZ],[.84,.07,.84],{a:Math.max(.3,a),dz:1});R0.box([x,.07,BZ],[.56,Math.max(.01,h),.56],{fill:c,a:Math.max(.2,a)});
      R0.label([x,.07+h,BZ],v.toFixed(1),{mono:true,fs:13,b:1,dy:-11,a});R0.label([x,0,BZ+.45],lab,{fs:12,dy:12,a,c:P.mute})});
    R0.label([BX[1],2.3,BZ],'TB2.1, mean of two scaffolds (%)',{fs:12,c:P.mute,a,dy:-14})}
  function draw(R0,k,e){const P=R0.P;R0.grid(-6,6,-3.6,3.6,.5);
    const ta=k===0?1:mode==='imit'?(k===1?1:.3):(k===1?.6:.22);
    strip(R0,P,ta);
    if(k===0)R0.label([TX(0)-.2,.2,ZT-.5],R0.W<520?'source trajectory · '+N+' commands':'source trajectory · '+N+' commands by DeepSeek-V3.2 in Terminus-2, one tile each',{al:'left',fs:12.5,c:P.ink,dy:-36,a:e});
    if(mode==='imit'){
      // the workspace is never rebuilt: an empty outline
      R0.quad([[WX-SW/2,0,SZ-SD/2],[WX+SW/2,0,SZ-SD/2],[WX+SW/2,0,SZ+SD/2],[WX-SW/2,0,SZ+SD/2]],{fill:null,ec:P.mute,dash:[5,4],a:.8});
      R0.label([WX,0,SZ+SD/2],'no environment rebuilt',{fs:12.5,c:P.mute,dy:14});
      const rec=[WX,0,SZ];
      if(k>=1){const a=k===1?e:1;R0.box(rec,[1.5,.45,1],{fill:mix(P.paper,P.c2,.3),a});if(k<2)R0.label([rec[0],.45,rec[2]],'1 SFT record, as recorded',{fs:12.5,b:1,dy:-14,a});
        if(k===1)R0.flow([[0,.3,ZT],[-.8,.6,1.6],[rec[0],.6,rec[2]+.2]],{c:P.c2,a:a*.9,n:9})}
      if(k>=2){const a=k===2?e:.5;R0.glass([rec[0]-.75,0,rec[2]+.6],[1.5,0,0],[0,1.3,0],{c:P.bad,a,nu:4,nv:3});
        R0.label([rec[0],1.3,rec[2]+.6],'not re-runnable · not verified',{fs:12.5,b:k===2,c:P.bad,dy:-10,a:Math.max(.6,a)})}
      if(k>=3){const a=k===3?e:1;bars(R0,P,[['base',base,P.mute],['imitate',imit,P.c2]],a);
        R0.flowArc([rec[0],.5,rec[2]-.4],[BX[1],.4,BZ+.3],.9,{c:P.c2,a:a*.8,n:7})}
      return}
    // ---- rebuild and re-solve ----
    const wa=k>=1?(k===1?e:1):0,dim=k>=5?.35:k>=3?.7:1;
    R0.box([WX,0,SZ],[SW,.12,SD],{a:Math.max(.15,wa),dz:4});
    if(wa>0)R0.label([WX-SW/2,.12,SZ+SD/2],k===2?'completed workspace Ê · '+MED_REP+' → '+MED_COMP+' files (pool median)':k>=2?'completed workspace Ê':'replayed workspace Ê₀',{al:'left',dx:2,dy:16,fs:12.5,b:1,a:wa*(k>=5?.6:1)});
    // replay: this trace's own files; the read that revealed each flows from its command tile into the slab
    const ra=k===1?e:k>=1?1:0;
    e0.forEach((p,i)=>{fileBox(R0,slot(i),{fill:P.c3,a:ra*dim});if(k<=2)R0.label(add(slot(i),[0,.4,0]),short(p),{mono:true,fs:12,dy:-10,b:1,c:P.c3,a:ra})});
    known.forEach((p,i)=>{const s=slot(e0.length+i),filled=k>=2?at(k,e,2):0;
      if(filled<1)fileBox(R0,s,{fill:mix(P.paper,P.c5,.5),fa:.3,a:ra*(1-filled)});if(filled>0)fileBox(R0,s,{fill:P.c1,a:filled*dim});
      if(k===1&&i===3)R0.label(add(s,[0,.4,0]),'+'+known.length+' known by name',{fs:12,dy:-10,c:P.c5,b:1,a:ra})});
    if(k===1)EV.forEach((x,i)=>{if(x.kind==='read-pre'||x.kind==='read-part')R0.flowArc([TX(i),.15,ZT],add(slot(e0.indexOf(x.path)),[0,.42,0]),.9,{c:P.c3,a:e,n:9});
      if(x.kind==='list'&&x.n>1)R0.flowArc([TX(i),.15,ZT],add(slot(e0.length+2),[0,.42,0]),.8,{c:P.c5,a:e*.8,n:6,r:.05})});
    // the tray: what replay sets aside (the agent's own files)
    const ya=k===1?e:k===2?1:k===3?1-e:0;
    if(ya>0){R0.box([TRX,0,SZ],[1.4,.08,1.9],{a:ya,dz:2});agent.forEach((p,i)=>{const s=[TRX,.08,SZ-.6+i*.6];fileBox(R0,s,{fill:P.c2,a:ya});R0.label(add(s,[.25,.2,0]),short(p),{mono:true,fs:12,al:'left',dx:8,a:ya,grp:'tray'})});
      R0.label([TRX,.1,SZ+.95],'held back · '+agent.length+' files',{fs:12,c:P.c2,dy:16,a:ya,b:1})}
    if(k===1)EV.forEach((x,i)=>{const j=agent.indexOf(x.path);if(j>=0&&x.kind!=='list')R0.flowArc([TX(i),.15,ZT],[TRX,.5,SZ-.6+j*.6],.7,{c:P.c2,a:e*.8,n:6})});
    // completion: the pool median, 13 files (blue: written by the completion agent); illustrative for this trace
    if(k>=2){const ca=k===2?e:1,extra=MED_COMP-e0.length-known.length;for(let i=0;i<extra;i++)fileBox(R0,slot(e0.length+known.length+i),{fill:P.c1,a:dim*(k>2?1:Math.min(1,Math.max(0,e*3-i*.3)))});
      }
    // the judge reads the workspace through a glass plate held over it; nothing is built or run
    if(k>=3){const ja=k===3?e:.25,y=1.05;R0.glass([WX-SW/2,y,SZ-SD/2],[SW,0,0],[0,0,SD],{c:P.good,a:ja,nu:8,nv:4,th:.03});
      if(k<=4)R0.label([WX+SW/2,y,SZ],k===3?'judge: sufficient? 93.5% pass':'judged sufficient',{fs:12.5,al:'left',dx:10,c:P.good,b:k===3,a:Math.max(.55,ja)});
      if(k===3)[0,3,6,9,12].forEach(i=>R0.flow([add(slot(i),[0,.42,0]),add(slot(i),[0,1.0,0])],{c:P.good,a:e*.9,n:3,r:.06}))}
    // re-query: four ways to pose a task, Intent Recovery used in Table 4
    if(k>=4){const qa=k===4?e:.3,Q=['Intent Recovery','Single-WS','Cross-WS','Multi-Round'];
      Q.forEach((q,i)=>{const p=[WX-1.5+i*1.0,0,SZ-SD/2-.55],on=i===0;R0.box(p,[.84,.55,.12],{fill:on?mix(P.paper,P.acc,.4):P.paper,a:on?Math.max(.45,qa):qa*.8});
        if(k===4||on)R0.label([p[0],.55,p[2]],q,{fs:12,dy:-10,b:on,c:on?P.acc:P.mute,a:on?Math.max(.5,qa):qa,grp:'q'})});
      if(k===4)R0.flowArc([WX-1.5,.6,SZ-SD/2-.55],[WX,.5,SZ-.3],.5,{c:P.acc,a:e,n:7})}
    // the teacher re-solves inside the rebuilt workspace; its run, not the original trace, becomes the training record
    const TP=[WX-SW/2-.5,1.3,SZ+SD/2],rec=[TRX,0,.2];
    if(k>=5){const t5=k===5?e:.45;R0.ball(TP,.2,{c:P.c1,a:Math.max(.45,t5)});R0.label(TP,'teacher · Qwen3.7-Max',{fs:12.5,b:k===5,dy:-18,c:P.c1,a:Math.max(.5,t5)});
      if(k===5)R0.flowArc(TP,[WX,.55,SZ],.4,{c:P.c1,a:e,n:9});
      const ra2=k===5?e:1;R0.box(rec,[1.5,.45,1],{fill:mix(P.paper,P.c1,.35),a:ra2});if(k===5)R0.label([rec[0],.45,rec[2]],"the teacher's run: 1 SFT record",{fs:12.5,b:k===5,dy:-14,a:ra2,c:P.c1});
      if(k===5)R0.flowArc([WX+1.2,.5,SZ],[rec[0],.5,rec[2]],.5,{c:P.c1,a:e,n:7})}
    if(k>=6){bars(R0,P,[['base',base,P.mute],['imitate',imit,P.c2],['re-solve',res,P.c1]],e);R0.flowArc([rec[0],.5,rec[2]-.4],[BX[2],.4,BZ+.3],.8,{c:P.c1,a:e,n:9})}
  }
  const full={cam:[.3,.62],bounds:[[-4.9,0,-2.0],[4.9,1.4,3.1]]},end={cam:[.3,.6],bounds:[[-4.9,0,-2.9],[4.9,2.2,3.1]]};
  const st=S3.stage({id:'stg-fl',list:'sx-fl-res',fig:'Fig. 1 · one real trace, imitated or rebuilt',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    // step 1 is the trace alone: the camera comes in on it, turned a little so the long strip fills more of the card
    view:k=>k===0?{cam:[.55,.62],bounds:[[-4.7,0,ZT-1.1],[4.7,.5,ZT+.5]]}:mode==='resolve'&&(k===1||k===2)?{cam:[.3,.74],bounds:[[-4.8,0,-1.3],[4.8,.9,3.1]]}:k===(mode==='imit'?3:6)?end:full});
  const seg=document.getElementById('flM');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    document.getElementById('sx-fl-res').hidden=mode!=='resolve';document.getElementById('sx-fl-imit').hidden=mode!=='imit';
    st.list(mode==='resolve'?'sx-fl-res':'sx-fl-imit')}));
})();
