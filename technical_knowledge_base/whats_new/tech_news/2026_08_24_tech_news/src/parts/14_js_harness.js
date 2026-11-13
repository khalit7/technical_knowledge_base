// ---- The harness, two ways: one illustrative long task run as model alone, inside StateM, inside AVO ----
(function(){
  const card=$('v-harness');if(!card)return;
  const T=(k,node)=>({k,node});
  // Turn kinds. Counted: waste = lost + repeat; checks = chk + chkf (run by the host, not the model); caught = chkf
  const KIND={plan:['var(--c1)','plan written'],work:['var(--c3)','work (edit, run, read)'],lost:['var(--bad)','redone after losing track'],repeat:['var(--c7)','a known dead end, repeated'],
    hook:['var(--c6)','state or memory loaded from outside the model'],chk:['var(--c5)','check run by the host, passed'],chkf:['var(--c5)','check run by the host, failed'],
    repair:['var(--c4)','repair'],sup:['var(--c2)','supervisor redirects'],stop:['var(--bad)','declares "done" with no check'],done:['var(--ink)','handoff or result recorded']};
  const M={
   alone:{name:'Model alone',nodes:null,steps:[
    {turns:[T('plan'),T('plan')]},
    {turns:[T('work'),T('work'),T('work'),T('work')]},
    {turns:[T('work'),T('work')]},
    {turns:[T('lost'),T('lost'),T('lost')],compact:true},
    {turns:[T('repeat'),T('repeat'),T('repeat')]},
    {turns:[T('stop')]},
    {turns:[]}]},
   statem:{name:'StateM runbook',nodes:['Plan','Execute','Verify','Handoff','Repair'],steps:[
    {turns:[T('hook','Plan'),T('plan','Plan'),T('plan','Plan'),T('chk','Plan')],store:['record: state Plan, entry 1','receipt: plan.md saved','logged: Plan to Execute']},
    {turns:[T('hook','Execute'),T('work','Execute'),T('work','Execute'),T('work','Execute'),T('work','Execute')],store:['record: state Execute, entry 2']},
    {turns:[T('work','Execute'),T('work','Execute')],store:['receipt: files changed']},
    {turns:[T('hook','Execute')],compact:true,store:['query: Execute, 3 files done']},
    {turns:[T('hook','Execute'),T('work','Execute')],store:['practice v3: skip approach B']},
    {turns:[T('chkf','Verify'),T('repair','Repair'),T('repair','Repair'),T('chk','Verify')],store:['check: tests failed (logged)','transition Verify to Repair','check: tests passed']},
    {turns:[T('chk','Handoff'),T('done','Handoff')],store:['terminal: Handoff, complete']}]},
   avo:{name:'AVO: memory + supervisor',nodes:['Inspect','Plan','Implement','Evaluate','Supervisor'],steps:[
    {turns:[T('plan','Plan'),T('hook','Inspect')],store:['memory: (empty)']},
    {turns:[T('work','Implement'),T('work','Implement'),T('work','Implement'),T('chk','Evaluate')],store:['memory: try 1 + test output']},
    {turns:[T('work','Implement'),T('work','Implement'),T('chk','Evaluate')],store:['memory: try 2 + profiler']},
    {turns:[T('hook','Inspect')],compact:true,store:['read: tries 1 to 2, results']},
    {turns:[T('repeat','Implement'),T('repeat','Implement'),T('sup','Supervisor'),T('work','Implement'),T('work','Implement')],store:['supervisor: loop, redirect']},
    {turns:[T('chkf','Evaluate'),T('work','Implement')],store:['memory: try 3 failed tests']},
    {turns:[T('chk','Evaluate'),T('done','Evaluate')],store:['result recorded']}]}
  };
  const st={m:'alone',k:0,t:1,raf:0};
  const DURT=650; // ms per turn at 1x: the turns of a step appear one by one while it plays
  const cl=v=>v<0?0:v>1?1:v;
  const nT=s=>Math.max(2,s.turns.length);
  function shown(){ // turns visible so far, and store lines so far
    const S=M[st.m].steps,out=[],store=[];let compactAt=-1;
    for(let i=0;i<=st.k;i++){const s=S[i],n=i<st.k?s.turns.length:Math.floor(s.turns.length*st.t+1e-9);
      if(s.compact&&(i<st.k||st.t>0))compactAt=out.length;
      for(let j=0;j<n;j++)out.push(s.turns[j]);
      if(s.store&&(i<st.k||st.t>=.5))store.push(...s.store)}
    return {out,store,compactAt}}
  function draw(){
    const mode=M[st.m],S=mode.steps,narrow=card.clientWidth<560,{out,store,compactAt}=shown();
    const MAXT=22,tx=narrow?6:24,W=narrow?Math.max(300,Math.round($('hsSvg').clientWidth||340)):780,pitch=narrow?Math.floor((W-2*tx)/MAXT):30,sq=pitch-3;
    let s='',y=16;
    s+='<text x="'+tx+'" y="'+y+'" font-size="11" fill="var(--mute)">'+(narrow?'Turns (1 square = 1 turn)':'Agent turns, one square per turn, the same scale in all three runs')+'</text>';
    y+=8;
    for(let i=0;i<MAXT;i++){const x=tx+i*pitch;s+='<rect x="'+(x+.5)+'" y="'+(y+.5)+'" width="'+(sq-1)+'" height="'+(sq-1)+'" rx="3" fill="none" stroke="var(--line)"/>'}
    out.forEach((u,i)=>{const x=tx+i*pitch,c=KIND[u.k][0];
      s+='<rect x="'+x+'" y="'+y+'" width="'+sq+'" height="'+sq+'" rx="3" fill="'+c+'"'+(u.k==='chkf'||u.k==='stop'?' stroke="var(--bad)" stroke-width="2.5"':'')+'><title>Turn '+(i+1)+': '+KIND[u.k][1]+'</title></rect>';
      if(u.k==='chkf'||u.k==='stop')s+='<text x="'+(x+sq/2)+'" y="'+(y+sq/2+4)+'" font-size="'+(narrow?10:13)+'" text-anchor="middle" fill="var(--bg)" font-weight="700">'+(u.k==='stop'?'?':'x')+'</text>';
      if(u.k==='chk')s+='<text x="'+(x+sq/2)+'" y="'+(y+sq/2+4)+'" font-size="'+(narrow?10:13)+'" text-anchor="middle" fill="var(--bg)" font-weight="700">✓</text>'});
    if(compactAt>=0){const x=tx+compactAt*pitch-2;s+='<path d="M'+x+' '+(y-4)+'v'+(sq+8)+'" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 2"/><text x="'+(x+3)+'" y="'+(y+sq+14)+'" font-size="11" fill="var(--mute)">compaction</text>'}
    y+=sq+26;
    // three panels
    const pw=narrow?W-2*tx:(W-2*tx-24)/3,ph=narrow?142:150;
    const px=i=>narrow?tx:tx+i*(pw+12),py=i=>narrow?y+i*(ph+14):y;
    // panel 1: context window
    {const x0=px(0),y0=py(0);s+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" rx="8" class="box"/><text x="'+(x0+10)+'" y="'+(y0+18)+'" font-size="12" font-weight="600">Inside the model: its context</text>';
      // segments: before compaction each turn is one unit; at compaction everything earlier becomes a 3-unit summary
      let seg=[];out.forEach((u,i)=>{if(i===compactAt){const hadPlan=seg.some(q=>q==='plan');seg=['sum','sum','sum'];if(st.m!=='alone')seg.push('inj');if(st.m==='alone'&&hadPlan)seg[0]='sumplan'}
        seg.push(u.k==='plan'?'plan':u.k==='hook'?'inj':'other')});
      const U=Math.max(16,seg.length),uw=(pw-20)/U;
      seg.forEach((q,i)=>{const c=q==='plan'?'var(--c1)':q==='inj'?'var(--c6)':q==='sum'?'var(--dim)':q==='sumplan'?'var(--dim)':'var(--acc2)';
        s+='<rect x="'+(x0+10+i*uw)+'" y="'+(y0+30)+'" width="'+Math.max(1,uw-1)+'" height="22" fill="'+c+'"'+(q==='sumplan'?' stroke="var(--c1)" stroke-dasharray="2 2"':'')+'/>'});
      const planIdx=seg.lastIndexOf('plan'),injIdx=seg.lastIndexOf('inj'),n=seg.length;
      let sig,why;
      if(!n){sig='';why=''}
      else if(st.m==='alone'){if(compactAt>=0&&out.length>compactAt){sig='plan: only a summary';why='plan survived only in the summary'}else if(planIdx<0){sig='';why=''}else{const age=n-1-planIdx;sig=age>5?'plan: old and far back':'plan: recent';why=age+' turns since the plan was written'}}
      else{const last=Math.max(planIdx,injIdx),age=n-1-last;sig=age<=4?'phase and obligations: recent':'phase info: '+age+' turns back';why=st.m==='statem'?'re-injected on each state entry':'memory read back after compaction'}
      s+='<text x="'+(x0+10)+'" y="'+(y0+70)+'" font-size="11.5">'+sig+'</text><text x="'+(x0+10)+'" y="'+(y0+86)+'" font-size="11" fill="var(--mute)">'+why+'</text>';
      s+='<rect x="'+(x0+10)+'" y="'+(y0+ph-30)+'" width="10" height="10" fill="var(--c1)"/><text x="'+(x0+24)+'" y="'+(y0+ph-21)+'" font-size="11" fill="var(--mute)">plan</text><rect x="'+(x0+58)+'" y="'+(y0+ph-30)+'" width="10" height="10" fill="var(--c6)"/><text x="'+(x0+72)+'" y="'+(y0+ph-21)+'" font-size="11" fill="var(--mute)">loaded from outside</text><rect x="'+(x0+10)+'" y="'+(y0+ph-16)+'" width="10" height="10" fill="var(--dim)"/><text x="'+(x0+24)+'" y="'+(y0+ph-7)+'" font-size="11" fill="var(--mute)">summary after compaction</text>'}
    // panel 2: control layer
    {const x0=px(1),y0=py(1);s+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" rx="8" class="box"/><text x="'+(x0+10)+'" y="'+(y0+18)+'" font-size="12" font-weight="600">Control layer</text>';
      const cur=out.length?out[out.length-1].node:null;
      if(!mode.nodes){s+='<text x="'+(x0+10)+'" y="'+(y0+46)+'" font-size="11.5">None: the plan is only text</text><text x="'+(x0+10)+'" y="'+(y0+62)+'" font-size="11.5">in the context, and the model</text><text x="'+(x0+10)+'" y="'+(y0+78)+'" font-size="11.5">alone decides when it is done.</text>'}
      else if(st.m==='statem'){const nw=(pw-20-18)/4,ny=y0+36,nh=26;
        ['Plan','Execute','Verify','Handoff'].forEach((nm,i)=>{const nx=x0+10+i*(nw+6);s+='<rect x="'+nx+'" y="'+ny+'" width="'+nw+'" height="'+nh+'" rx="5" class="'+(cur===nm?'boxa':'boxo')+'"/><text x="'+(nx+nw/2)+'" y="'+(ny+17)+'" font-size="11" text-anchor="middle">'+nm+'</text>';if(i<3)s+=ar(nx+nw,ny+nh/2,nx+nw+6,ny+nh/2)});
        const rx=x0+10+2*(nw+6)-nw*.5,ry=ny+48;s+='<rect x="'+rx+'" y="'+ry+'" width="'+nw+'" height="'+nh+'" rx="5" class="'+(cur==='Repair'?'boxa':'boxo')+'"/><text x="'+(rx+nw/2)+'" y="'+(ry+17)+'" font-size="11" text-anchor="middle">Repair</text>';
        s+=ar(x0+10+2*(nw+6)+nw*.3,ny+nh,rx+nw*.8,ry,true)+ar(rx,ry+nh/2,x0+10+(nw+6)+nw*.5,ny+nh,true);
        const nTr=out.filter((u,i)=>i>0&&u.node!==out[i-1].node).length;
        s+='<text x="'+(x0+10)+'" y="'+(y0+ph-22)+'" font-size="11" fill="var(--mute)">each goto: edge? checks? persist,</text><text x="'+(x0+10)+'" y="'+(y0+ph-8)+'" font-size="11" fill="var(--mute)">commit and log ('+nTr+' so far)</text>'}
      else{const nm=['Inspect','Plan','Implement','Evaluate'],cx=x0+pw/2,cy=y0+ph/2+14,rr=Math.min(pw/2-44,38);
        nm.forEach((q,i)=>{const a=-Math.PI/2+i*Math.PI/2,nx=cx+Math.cos(a)*rr*1.55,ny=cy+Math.sin(a)*rr*.95,bw=72,bh=21;s+='<rect x="'+(nx-bw/2)+'" y="'+(ny-bh/2)+'" width="'+bw+'" height="'+bh+'" rx="5" class="'+(cur===q?'boxa':'boxo')+'"/><text x="'+nx+'" y="'+(ny+4)+'" font-size="11" text-anchor="middle">'+q+'</text>'});
        const supOn=cur==='Supervisor';s+='<rect x="'+(x0+pw-128)+'" y="'+(y0+6)+'" width="120" height="21" rx="5" class="'+(supOn?'boxa':'boxo')+'"/><text x="'+(x0+pw-68)+'" y="'+(y0+21)+'" font-size="11" text-anchor="middle">'+(supOn?'Supervisor: redirect':'Supervisor')+'</text>';
        s+=''}}
    // panel 3: outside the model
    {const x0=px(2),y0=py(2);s+='<rect x="'+x0+'" y="'+y0+'" width="'+pw+'" height="'+ph+'" rx="8" class="box"/><text x="'+(x0+10)+'" y="'+(y0+18)+'" font-size="12" font-weight="600">'+(st.m==='statem'?'Outside the model: durable record':st.m==='avo'?'Outside the model: persistent memory':'Outside the model')+'</text>';
      if(st.m==='alone')s+='<text x="'+(x0+10)+'" y="'+(y0+46)+'" font-size="11.5">Nothing. Progress, lessons and</text><text x="'+(x0+10)+'" y="'+(y0+62)+'" font-size="11.5">"done" all live in the context.</text>';
      else{const L=store.slice(-6);L.forEach((l,i)=>{s+='<text x="'+(x0+10)+'" y="'+(y0+38+i*17)+'" font-size="11" font-family="ui-monospace,Menlo,monospace" fill="'+(i===L.length-1?'var(--ink)':'var(--mute)')+'">'+l.replace(/&/g,'&amp;')+'</text>'})}}
    const H=narrow?py(2)+ph+6:y+ph+6;
    $('hsSvg').innerHTML=svgEl(W,H,s,'Agent run, '+mode.name);
    const waste=out.filter(u=>u.k==='lost'||u.k==='repeat').length,checks=out.filter(u=>u.k==='chk'||u.k==='chkf').length,caught=out.filter(u=>u.k==='chkf').length;
    const end=st.k===S.length-1&&st.t>=1;const outcome=end?(st.m==='alone'?'fails the hidden test':'passes'):(out.some(u=>u.k==='stop')?'declared done':'running');
    $('hsCnt').innerHTML=stat('Turns used',fmt(out.length),'illustrative')+stat('Redone or repeated',fmt(waste),'turns')+stat('Checks run outside the model',fmt(checks),st.m==='avo'?'evaluations by execution':st.m==='statem'?'host-evaluated':'none in this run')+stat('Problems caught before the end',fmt(caught),'')+stat('Outcome',outcome,'');
  }
  // the controller: RD.anim (template) with the step lists on the left (one list per wrapper); a step reached by moving forward
  // draws its turns one by one, any other jump draws it whole
  function tween(){cancelAnimationFrame(st.raf);st.raf=0;const S=M[st.m].steps,dur=DURT*nT(S[st.k]);let t0=0;
    const f=now=>{if(!t0)t0=now;st.t=cl((now-t0)/dur);card.dataset.frames=(+card.dataset.frames||0)+1;draw();st.raf=st.t<1?requestAnimationFrame(f):0};st.raf=requestAnimationFrame(f)}
  const anim=RD.anim({card:'v-harness',ctl:'hsCtl',n:M.alone.steps.length,list:'sx-hs-alone',ms:5600,label:'Step of the run',
    draw:i=>{st.k=i;if(card.classList.contains('rd-fwd')&&!RD.RM){st.t=0;draw();tween()}else{cancelAnimationFrame(st.raf);st.raf=0;st.t=1;draw()}}});
  const seg=$('hsM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;document.querySelectorAll('ol[id^="sx-hs-"]').forEach(o=>o.hidden=o.id!=='sx-hs-'+st.m);anim.reset(M[st.m].steps.length,'sx-hs-'+st.m)}));
  let rw=card.clientWidth;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>anim.redraw());
  window.TN_HS={anim,M,st}; // read by src/check_stages.mjs

  // ---- What the real runs measured: pairs per benchmark, never across benchmarks ----
  const P=[
    {h:'ARC-AGI-3, public set (25 games)',u:'%',max:100,rows:[{m:'Claude Opus 5',o:30,ol:'30% (ARC Prize, High effort)',n:100,nl:'100.00 RHAE in AVO'}],
     note:'Different setups (reasoning setting, harness, observation format); Nvidia says the pair is not a direct measurement of AVO\'s contribution. AVO solved all 183 levels in 6,624 actions against VISTA\'s 7,542 with the same model (12% fewer, derived).'},
    {h:'Terminal-Bench 2.1 (89 tasks, mean of 5 trials)',u:'%',max:100,lo:60,rows:[
      {m:'GPT-5.5 xhigh',o:83.1,n:92.1},{m:'GPT-5.6 Luna',o:76.7,n:85.4,nl:'85.4 (frozen runbook)'},{m:'GPT-5.6 Sol xhigh',o:84.9,n:95.28,nl:'95.3 raw',wh:[93.26,94.38]},{m:'DeepSeek-V4 Flash',o:82.7,n:88.1}],
     note:'Grey is each model\'s reference score as the paper reports it. Sol\'s whisker is the adjudicated range: 94.38% with four flagged trials scored zero, 93.26% with all nine. The runbook was developed on GPT-5.5 and transferred unchanged to GPT-5.6.'},
    {h:'API cost of runs near 88% on Terminal-Bench 2.1 ($, log scale)',u:'$',log:[5,2000],rows:[
      {m:'GPT-5.6 Sol max (reference)',o:574.68,ol:'$574.68 for 88.8%'},{m:'StateM + DeepSeek-V4 Flash',n:15,nl:'about $15 for 88.1%'},{m:'StateM + GPT-5.6 Sol xhigh',n:1062.95,nl:'$1,062.95 for 95.3% raw'}],
     note:'The issue paired $15 with the 95.3% Sol run; in the paper $15 is the DeepSeek run, 38.9 times cheaper than the Sol max reference at a similar score. Total DeepSeek spend including adaptation: $52.22 (11.0 times cheaper).'}];
  const pairsEl=$('hsPairs');
  function drawPairs(){pairsEl.innerHTML=P.map(p=>{
    const pos=v=>p.log?100*(Math.log10(v)-Math.log10(p.log[0]))/(Math.log10(p.log[1])-Math.log10(p.log[0])):100*(v-(p.lo||0))/(p.max-(p.lo||0));
    return '<div><h4>'+p.h+'</h4>'+p.rows.map(r=>'<div class="pr"><div>'+r.m+'</div><div class="tr">'+
      (r.o!=null?'<div class="b o'+(pos(r.o)>50?' in':'')+'" style="width:'+pos(r.o).toFixed(1)+'%"><span>'+(r.ol||r.o+'%')+'</span></div>':'')+
      (r.n!=null?'<div class="b n'+(pos(r.n)>50?' in':'')+'" style="width:'+pos(r.n).toFixed(1)+'%;'+(r.o==null?'top:0':'')+'"><span>'+(r.nl||r.n+'%')+'</span></div>':'')+
      (r.wh?'<div class="wh" style="left:'+pos(r.wh[0]).toFixed(1)+'%;width:'+(pos(r.wh[1])-pos(r.wh[0])).toFixed(1)+'%"></div>':'')+'</div></div>').join('')+
      (p.lo?'<div class="small mute">axis starts at '+p.lo+'%</div>':'')+'<p class="small mute" style="margin:4px 0 0">'+p.note+'</p></div>'}).join('')}
  drawPairs();
})();
