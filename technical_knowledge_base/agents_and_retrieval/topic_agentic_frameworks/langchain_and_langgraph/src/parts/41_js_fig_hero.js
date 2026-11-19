// ---- Fig. 1, the idea in one picture (2D step animation, 2026-11-19; was a 3D stage). The running example's graph (section 2) top to bottom inside the
// process that runs it; the model, the shared state and the SqliteSaver's checkpoints beside it (below it on a phone). It plays run A of section 5
// (durability "sync", real Claude Haiku 4.5 calls through claude -p): killed while one diagnosis was in flight, resumed by a second process,
// paused at interrupt(), approved by a third. Times, calls and cost come from FLG.e6.runs.A; the stored totals (checkpoints, writes) from its database. ----
(function(){
  const host=document.getElementById('flg-h-svg');if(!host)return;
  const F=window.FLGF,{t,arrow,node,edge,chip,ph}=F,D=window.FLG,A=D.e6.runs.A,MK='flgH';
  const call=(n,p)=>A.calls.find(c=>c.node===n&&c.process===p)||{};
  const ret=A.calls.filter(c=>c.t1!==null),cost=ret.reduce((s,c)=>s+c.cost,0);
  const s1=x=>Number(x).toFixed(1)+' s';
  const tw=call('diagnose_top_words','start'),wc=call('diagnose_word_count','resume'),pf=call('propose_fix','resume');
  const pause=(A.events.find(e=>e.what==='process_end'&&e.process==='resume')||{}).t;
  const EDGES=window.FLG_REAL_EDGES;
  // the shared state: one row per key; diagnoses is a list with an operator.add reducer, so it holds one block per diagnosis
  const KEYS=['core','test_output','diagnoses','patch','decision','passed'];
  // per step: node states, filled state keys (diagnoses: number of items), checkpoints stacked, process, model status
  const S=[
    {proc:1,ns:{},keys:{},ck:2,m:'idle: no model call yet'},
    {proc:1,ns:{read_and_test:'run'},keys:{core:1,test_output:1},ck:3,wr:['read_and_test',['core','test_output']],m:'idle: read_and_test calls no model'},
    {proc:1,ns:{read_and_test:'done',diagnose_word_count:'run',diagnose_top_words:'run'},keys:{core:1,test_output:1},ck:3,pend:1,m:'2 calls in flight; top_words returns at '+s1(tw.t1),calls:['diagnose_word_count','diagnose_top_words']},
    {proc:0,ns:{read_and_test:'done',diagnose_word_count:'lost',diagnose_top_words:'done'},keys:{core:1,test_output:1},ck:3,pend:1,kill:1,m:'SIGKILL at '+s1(A.kill)+': word_count’s call is lost',calls:['diagnose_word_count']},
    {proc:2,ns:{read_and_test:'done',diagnose_word_count:'run',diagnose_top_words:'done'},keys:{core:1,test_output:1,diagnoses:2},ck:4,load:1,wr:['diagnose_word_count',['diagnoses']],m:'only this call reruns: word_count, '+s1(wc.t1-wc.t0),calls:['diagnose_word_count']},
    {proc:2,ns:{read_and_test:'done',diagnose_word_count:'done',diagnose_top_words:'done',propose_fix:'run',human_review:'next'},keys:{core:1,test_output:1,diagnoses:2,patch:1},ck:5,intr:1,wr:['propose_fix',['patch']],m:'propose_fix: model call '+s1(pf.t1-pf.t0),calls:['propose_fix']},
    {proc:3,ns:{read_and_test:'done',diagnose_word_count:'done',diagnose_top_words:'done',propose_fix:'done',human_review:'done',apply_and_test:'done',__end__:'done'},keys:{core:1,test_output:1,diagnoses:2,patch:1,decision:1,passed:1},ck:A.db.checkpoints,load:1,wr:['apply_and_test',['decision','passed']],
      m:A.calls.length+' model calls started, '+ret.length+' returned · $'+cost.toFixed(4)}];
  const PC=['var(--bad)','var(--acc)','var(--c6)','var(--c3)'];
  function render(k,e){const W=Math.round(RD.width(host)),wide=W>=560,s=S[k],pv=S[Math.max(0,k-1)];
    // geometry: the graph on the left (full width on a phone), the model, state and checkpointer on the right (below on a phone)
    const gw=wide?Math.min(Math.round(W*.5),380):W,rh=46,by=22,pos=F.layout(FLGG.LAYOUT.real,8,gw-16,by+12,rh),bh=FLGG.LAYOUT.real.length*rh+6;
    const rx=wide?gw+22:0,rw=wide?W-rx:W,my=wide?6:by+bh+12;
    const sx=rx,sy=my+84,sw=wide?rw:W/2-8,dx=wide?rx:W/2+8,dw=wide?rw:W/2-8;
    const ckY=wide?sy+KEYS.length*20+112:sy+KEYS.length*20-8,dTitle=wide?[dx+116,ckY-22]:[dx,sy-12];
    const H=wide?Math.max(by+bh+8,ckY+34):sy+KEYS.length*20+30;
    let b=F.defs(MK);
    // the process running the graph: a tinted band; red when killed; dashed when it exits at the interrupt
    const gone=k===5&&e>.6,pc=PC[s.proc];
    b+='<rect x="1" y="'+by+'" width="'+(gw-2)+'" height="'+bh+'" rx="10" fill="'+pc+'" fill-opacity="'+(s.kill?.13:gone?.02:.07)+'" stroke="'+pc+'" stroke-width="1.2"'+(gone?' stroke-dasharray="5 4"':'')+'/>';
    const pl=s.kill?'process 1 · killed':k===4?'process 2 · loads the checkpoint':gone?'process 2 · returns the diff at '+s1(pause)+', exits':k===6?'process 3 · Command(resume="approve")':'process '+s.proc;
    b+=t(6,15,pl,{b:1,c:pc,fs:12.5});
    // edges (trigger edges into this step's running nodes in amber), then the nodes
    EDGES.forEach(ed=>{const st=s.ns[ed.t];b+=edge(pos[ed.s],pos[ed.t],{mk:MK,s:ed.s,t:ed.t,hi:st==='run'||(k===0&&ed.s==='__start__')})});
    Object.keys(pos).forEach(n=>{const st=s.ns[n]||'idle';b+=node(pos[n],n,{st,text:n==='human_review'&&k===5?'human_review · interrupt()':n})});
    // the model: a purple box; this step's calls are dashed lines from the calling nodes (wide screens)
    const mOn=k>=2&&k<=5||k===6;
    b+='<rect x="'+rx+'" y="'+my+'" width="'+(rw-2)+'" height="46" rx="8" fill="var(--c4)" fill-opacity="'+(mOn?.1:.03)+'" stroke="var(--c4)" stroke-width="1.2" opacity="'+(mOn?1:.6)+'"/>';
    b+=t(rx+9,my+18,'Claude Haiku 4.5',{b:1,c:'var(--c4)',fs:12.5,a:mOn?1:.7})+t(rx+9,my+36,s.m,{c:s.kill?'var(--bad)':'var(--ink)',b:s.kill,a:mOn?1:.7});
    if(s.calls)s.calls.forEach(n=>{b+=F.ring(pos[n],n,s.ns[n]==='lost')});
    b+='<rect x="'+(rx+rw-30)+'" y="'+(my+8)+'" width="10" height="10" rx="3" fill="none" stroke="var(--c4)" stroke-width="2"/>'+t(rx+rw-36,my+17,'calling',{al:'right',c:'var(--c4)',fs:12});
    // the shared state (in the process's memory): a row per key, a green block per value; memory is gone at the kill and refilled from the checkpoint on load
    const mem=s.kill?.18:s.load?(e<.35?.18+e*2.3:1):1;
    b+=t(sx,sy-12,'state',{b:1,c:'var(--c3)',fs:12.5})+t(sx+44,sy-12,s.kill?'memory lost':wide?'in the process’s memory':'',{c:s.kill?'var(--bad)':'var(--mute)',b:s.kill});
    KEYS.forEach((key,i)=>{const y=sy+i*20,n=s.keys[key]||0,n0=pv.keys[key]||0;
      b+=t(sx,y+13,key,{mono:1,c:n?'var(--c3)':'var(--mute)',b:n>n0&&k>0});
      b+='<rect x="'+(sx+92)+'" y="'+(y+2)+'" width="'+(wide?Math.min(sw-96,120):sw-96)+'" height="15" rx="3" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>';
      for(let j=0;j<n;j++){const ap=j>=n0&&k>0?ph(e,.45,.85):1;if(ap<=0)continue;
        b+='<rect x="'+(sx+95+j*18)+'" y="'+(y+4)+'" width="15" height="11" rx="2" fill="'+(key==='passed'?'var(--good)':'var(--c3)')+'" fill-opacity=".6" stroke="var(--c3)" stroke-width=".8" opacity="'+(mem*ap).toFixed(2)+'"/>'}});
    // writes: from the node that ran into the state keys it returned (wide screens)
    if(wide&&s.wr){const p=pos[s.wr[0]];const left=p.x<gw/2-10;s.wr[1].forEach(key=>{b+=arrow(left?[p.x+F.half(p,s.wr[0])-12,p.y-1]:[p.x+F.half(p,s.wr[0]),p.y+NH2],[sx-4,sy+KEYS.indexOf(key)*20+10],{c:'var(--c3)',mk:MK+'g',d:ph(e,.15,.6),bend:12,up:left?22:0})})}
    // the checkpointer: a stack of saved checkpoints; the pending write and the interrupt wait beside it
    const newSlab=s.ck>pv.ck&&k>0,dr=newSlab?ph(e,.6,1):k===0?ph(e,.3,1):1,top=ckY-s.ck*11;
    b+=F.stack(dx,ckY,s.ck,dr,{hiLast:newSlab||k===0});
    const ckTxt=s.ck+' checkpoints'+(k===6&&wide?' · '+A.db.writes+' writes':'');
    b+=t(dTitle[0],dTitle[1],'SqliteSaver',{b:1,c:'var(--acc)',fs:12.5})+t(dTitle[0],dTitle[1]+16,ckTxt,{c:'var(--acc)',b:1});
    if(k===6&&!wide)b+=t(dx,ckY+16,A.db.writes+' writes saved',{c:'var(--acc)',b:1});
    const chY=ckY+6,chX=dx;
    if(s.pend){const a=k===2?ph(e,.3,.7):1;b+=chip(chX,chY,wide?'pending write · top_words':'pending write','var(--c3)',{a,w:wide?null:dw-4});
      if(wide&&k===2){const p=pos.diagnose_top_words;b+=arrow([p.x,p.y+NH2*2],[chX-2,chY+10],{c:'var(--c3)',mk:MK+'g',d:ph(e,.3,.7),bend:-30})}}
    if(s.intr){const a=ph(e,.55,1);b+=chip(chX,chY,wide?'interrupt · waiting for a person':'interrupt','var(--c5)',{a,w:wide?null:dw-4})}
    // saving a checkpoint (state to the stack) and loading one (the stack back into a new process's memory)
    const save=wide?[[sx+60,sy+KEYS.length*20+2],[dx+52,top-4]]:[[sx+sw-6,sy+30],[dx-4,top+4]];
    if(newSlab)b+=arrow(save[0],save[1],{c:'var(--acc)',mk:MK+'k',d:ph(e,s.load?.55:.4,s.load?.85:.75),bend:wide?0:8});
    if(k===0&&wide){const p=pos.__start__;b+=arrow([p.x+28,p.y+13],[dx-4,top+4],{c:'var(--acc)',mk:MK+'k',d:ph(e,0,.5),bend:-20})}
    if(s.load){const p=wide?[[dx-6,top+10],[sx-6,sy+50]]:[[dx-4,top+20],[sx+sw-6,sy+60]];b+=arrow(p[0],p[1],{c:'var(--acc)',mk:MK+'k',d:ph(e,0,.35),bend:wide?-34:-8,w:2.2});
      if(wide)b+=t(dx-34,(top+sy+60)/2,'load',{al:'right',c:'var(--acc)',b:1,a:ph(e,.1,.35)})}
    host.innerHTML=RD.svg(W,H,b,'Fig. 1: the running example killed and resumed, step '+(k+1)+' of '+S.length);
  }
  const NH2=F.NH/2;
  const draw=F.tween('flg-h-card',1700,render);
  const an=RD.anim({card:'flg-h-card',ctl:'flg-h-ctl',n:S.length,draw,ms:5600,label:'Step through Fig. 1',list:'sx-hero'});
  RD.onResize(()=>an.redraw());
})();
