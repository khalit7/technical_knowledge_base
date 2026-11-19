// ---- Fig. 2, super-steps (section 3; 2D step animation, 2026-11-19; was a 3D stage, before that the 2D super-step player). Seven recorded graphs (FLG.e1,
// langgraph 1.2.14, InMemorySaver, no model). Step 0 is the input; each later step is one super-step, played in its three phases during the step's tween:
// plan (the triggered nodes are outlined, their trigger edges light up), execute (the nodes run; each task's writes land in the pending-writes tray),
// update (the writes go through the reducers into the state's channels, whose bars grow with their version, and a checkpoint drops onto the stack).
// The step lists on the left are generated from the same recorded checkpoints, one item per step. ----
(function(){
  const host=document.getElementById('flg-s-svg');if(!host)return;
  const F=window.FLGF,{t,arrow,node,edge,chip,ph}=F,MK='flgS';
  const D=window.FLG,esc=RD.esc,$=id=>document.getElementById(id);
  const NAMES={linear:'Linear',fan_reducer:'Fan-out, reducer',fan_no_reducer:'Fan-out, no reducer',uneven_edges:'Uneven, plain edges',uneven_join_all:'Uneven, join',loop:'Loop',send:'Send (map-reduce)'};
  const TEACH={
    linear:'One task per super-step; four steps, five checkpoints after the input. The hidden branch:to: channels carry control from node to node.',
    fan_reducer:'Two edges out of read_and_test put both checks in one super-step. findings has an operator.add reducer, so both writes are kept, in task-path order (check_top_words finished first, yet is listed second).',
    fan_no_reducer:'The same graph with a plain list key: the update phase raises InvalidUpdateError. Both pending writes are already saved, so get_state() on the thread fails the same way afterwards.',
    uneven_edges:'Branch a is two nodes, branch b one; two plain edges into join. join is triggered by b_lint in super-step 3 and by a_read_hits in super-step 4: it runs twice.',
    uneven_join_all:'The same branches with add_edge(["a_read_hits", "b_lint"], "join"): one join: channel that becomes available only when both have written. join runs once.',
    loop:'A conditional edge from test back to fix. The first patch fails, the second passes; each pass is one more super-step against recursion_limit.',
    send:'A conditional edge returns three Send("review", {"file": ...}) packets: three review tasks in one super-step, each with its own input; a reducer gathers the reviews.'};
  const hid=k=>/^(branch:|join:|__)/.test(k);
  const fmtv=v=>{const s=typeof v==='string'?v:JSON.stringify(v);return s===undefined?'':s};
  const cut=(s,n)=>{s=String(s);return s.length>n?s.slice(0,n-1)+'…':s};
  let cur='fan_reducer';
  const g=()=>D.e1.find(x=>x.name===cur);
  // derived per graph: its state keys (in order of first write), the most keys changed in one step
  function info(gr){if(gr._i)return gr._i;const keys=[];gr.steps.forEach(s=>Object.keys(s.versions).concat(Object.keys(s.values)).forEach(k=>{if(!hid(k)&&!keys.includes(k))keys.push(k)}));
    let mch=1;gr.steps.forEach((s,i)=>{const nx=gr.steps[i+1];if(nx)mch=Math.max(mch,chgd(s,nx).length)});return gr._i={keys,mch,err:!!gr.error,n:gr.steps.length}}
  const ver=(s,k)=>+((s&&s.versions[k])||0);
  const chgd=(a,b)=>Object.keys(b.versions).filter(k=>!hid(k)&&b.versions[k]!==(a.versions||{})[k]);
  // what the figure shows at step k: tasks run, writes pending, the checkpoint the update saves
  function at(gr,k){const S=gr.steps;if(k===0)return {kind:'input',ck:Math.min(2,S.length)};
    const s=S[k],nx=S[k+1];if(!s.tasks.length)return {kind:'end',ck:S.length};
    if(!nx)return {kind:'err',ck:S.length,s};return {kind:'step',ck:k+2,s,nx}}
  function render(k,e){const gr=g(),I=info(gr),S=gr.steps,a=at(gr,k),W=Math.round(RD.width(host)),wide=W>=560;
    const p1=ph(e,0,.3),p2=ph(e,.3,.65),p3=ph(e,.65,1);
    // geometry: the graph on the left (full width on a phone); the tray, the state channels and the checkpoints on the right (below on a phone)
    const rows=FLGG.LAYOUT[gr.name],gw=wide?Math.min(Math.round(W*.48),360):W,rh=44,gy=34,pos=F.layout(rows,0,gw,gy,rh),gb=gy+(rows.length-1)*rh+F.NH;
    const rx=wide?gw+24:0,rw=wide?W-rx:W,ty=wide?20:gb+30,cell=22,tray=ty+3*cell+8,sy=tray+30,nk=I.keys.length,vy=sy+nk*cell+6,ckT=vy+I.mch*16+22,ckB=ckT+I.n*11+8;
    const H=Math.max(gb+8,ckB+26);let b=F.defs(MK);
    // the phase of this super-step: plan, execute, update (the input and the end are labelled instead)
    if(a.kind==='step'||a.kind==='err'){const P=['plan','execute','update'],cur=p3>0?2:p2>0?1:0;let x=0;
      P.forEach((n,i)=>{const w=F.wSans(n)+18,on=i===cur,bad=a.kind==='err'&&i===2&&on;
        b+='<rect x="'+x+'" y="2" width="'+w+'" height="20" rx="10" fill="'+(bad?'var(--bad)':on?'var(--c5)':'none')+'" fill-opacity="'+(on?.25:0)+'" stroke="'+(bad?'var(--bad)':on?'var(--c5)':'var(--line)')+'" stroke-width="1.2"/>'+t(x+w/2,16,n,{al:'mid',b:on,c:on?'var(--ink)':'var(--mute)'});x+=w+6});
      b+=t(x+4,16,'super-step '+(a.s.step+1),{c:'var(--mute)'})}
    else b+=t(0,16,a.kind==='input'?'input: invoke({})':'run ends: nothing triggered',{b:1,c:'var(--mute)'});
    // node states: done for every task of an earlier step, next/run/err for this step's tasks
    const ns={},runs={},cp={};for(let j=1;j<k;j++)(S[j].tasks||[]).forEach(t=>{ns[t.name]='done';runs[t.name]=(runs[t.name]||0)+1});
    const tasks=a.s?a.s.tasks:[];tasks.forEach(t=>{cp[t.name]=(cp[t.name]||0)+1});
    Object.keys(cp).forEach(n=>{ns[n]=a.kind==='err'&&p3>0?'err':p2>0?'run':'next';runs[n]=(runs[n]||0)+(p2>0?1:0)});
    if(a.kind==='end')ns.__end__='done';
    gr.edges.forEach(ed=>{b+=edge(pos[ed.s],pos[ed.t],{mk:MK,cond:ed.cond,s:ed.s,t:ed.t,hi:(cp[ed.t]&&p3<1)||(k===0&&ed.s==='__start__')})});
    Object.keys(pos).forEach(n=>{const rn=runs[n]||0;b+=node(pos[n],n,{st:ns[n]||'idle',copies:cp[n]>1?cp[n]:1,text:n+(cp[n]>1?' ×'+cp[n]:'')+(rn>1?' · run '+rn:'')})});
    // the pending-writes tray: one chip per task write, saved before the update; red when the update rejects them
    const Wr=a.s?a.s.writes.filter(w=>!hid(w.channel)):[],bad=a.kind==='err'&&p3>0;
    b+=t(rx,ty-6,'pending writes',{b:1,c:'var(--c3)',fs:12.5})+(wide?'':t(rx+112,ty-6,'saved before the update',{c:'var(--mute)'}));
    b+='<rect x="'+rx+'" y="'+ty+'" width="'+(rw-2)+'" height="'+(tray-ty)+'" rx="8" fill="var(--c3)" fill-opacity=".04" stroke="var(--c3)" stroke-opacity=".5" stroke-dasharray="4 4"/>';
    const shown=a.kind==='err'?p2:p2*(1-.4*p3); // after the update the applied writes stay, faded
    Wr.forEach((w,i)=>{if(shown<=.01)return;const y=ty+5+i*cell,lab=w.task+' → '+w.channel,c=bad?'var(--bad)':'var(--c3)';b+=chip(rx+6,y,lab,c,{a:shown});
      const p=pos[w.task];if(wide&&p&&p3<1)b+=arrow([p.x+F.half(p,w.task),p.y+F.NH/2],[rx+3,y+10],{c:'var(--c3)',mk:MK+'g',d:ph(e,.3,.55),a:1-p3,bend:8,w:1.5});
      if(a.kind==='step'&&p3>0){const r=I.keys.indexOf(w.channel);if(r>=0)b+=arrow([rx+12,y+20],[rx-4+(wide?0:4),sy+r*cell+10],{c:'var(--c3)',mk:MK+'g',d:ph(e,.65,.85),bend:wide?-40:-20,w:1.5,a:1-ph(e,.92,1)})}});
    // the state's channels: a bar per key whose length is its version; this step's changed keys light up and show their new value
    const sv=a.kind==='step'?(p3>.5?a.nx:a.s):a.kind==='input'?S[Math.min(1,S.length-1)]:S[Math.min(k,S.length-1)];
    const changed=a.kind==='step'?chgd(a.s,a.nx):[],u=Math.min(14,(rw-96-40)/6);
    b+=t(rx,sy-8,'state channels',{b:1,c:'var(--c3)',fs:12.5})+t(rx+112,sy-8,'bar = version',{c:'var(--mute)'});
    I.keys.forEach((key,i)=>{const y=sy+i*cell,v=a.kind==='step'?ver(a.s,key)+(ver(a.nx,key)-ver(a.s,key))*p3:ver(sv,key),hi=changed.includes(key)&&p3>0;
      b+=t(rx,y+14,key,{mono:1,b:hi,c:hi?'var(--c3)':'var(--ink)'});
      b+='<rect x="'+(rx+96)+'" y="'+(y+3)+'" width="'+(6*u).toFixed(1)+'" height="14" rx="3" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>';
      if(v>0)b+='<rect x="'+(rx+96)+'" y="'+(y+3)+'" width="'+(v*u).toFixed(1)+'" height="14" rx="3" fill="var(--c3)" fill-opacity="'+(hi?.7:.3)+'" stroke="var(--c3)" stroke-width=".8"/>';
      if(v>0)b+=t(rx+96+6*u+6,y+14,'v'+Math.round(v),{mono:1,c:hi?'var(--c3)':'var(--mute)',b:hi})});
    if(a.kind==='step'&&p3>.6){const n=Math.floor((rw-4)/(12*.61));changed.forEach((key,i)=>{const val=(a.nx.values||{})[key];if(val!==undefined)b+=t(rx,vy+12+i*16,cut(key+' = '+fmtv(val),n),{mono:1,c:'var(--c3)',a:ph(e,.8,1)})})}
    if(bad)b+=t(rx,vy+12,'InvalidUpdateError: no checkpoint',{b:1,c:'var(--bad)',a:p3});
    // the checkpointer: one slab per saved checkpoint; the update drops the next one in
    const n=a.ck,dr=a.kind==='step'?ph(p3,.4,1):a.kind==='input'?ph(e,.2,1):1,shownN=a.kind==='step'&&dr<=0?n-1:n,top=ckB-shownN*11;
    b+=F.stack(rx,ckB,shownN,a.kind==='step'||a.kind==='input'?dr:1,{hiLast:a.kind==='step'||a.kind==='input'});
    b+=t(rx+116,ckB-20,shownN+' checkpoints',{b:1,c:'var(--acc)',fs:12.5});
    if(a.kind==='err'&&p3>0)b+=t(rx+116,ckB-4,'the failed step writes none',{c:'var(--bad)',a:p3});
    if(a.kind==='step'&&p3>.3)b+=arrow([rx+150,sy+nk*cell-2],[rx+60,top-3],{c:'var(--acc)',mk:MK+'k',d:ph(e,.7,.9),bend:20,a:1-ph(e,.95,1)});
    host.innerHTML=RD.svg(W,H,b,'Fig. 2: super-steps of the recorded graph '+NAMES[cur]+', step '+(k+1)+' of '+S.length);
  }
  // the step lists, one per graph, from the recorded checkpoints
  function items(gr){const S=gr.steps,out=[];const first=(S[0].writes[0]||{}).channel||'';
    out.push('<li><b>Input.</b> <code>invoke({})</code> writes the input into the hidden <code>__start__</code> channel. Checkpoint -1 (source "input") and checkpoint 0 are saved; checkpoint 0’s trigger channel <code>'+esc(first)+'</code> names the first node.</li>');
    const ran={};
    for(let k=1;k<S.length;k++){const s=S[k],nx=S[k+1];
      if(!s.tasks.length){out.push('<li><b>Nothing is triggered: the run ends.</b> No node listens to a channel newer than the version it last saw. Final state <code>'+esc(cut(fmtv(gr.final),150))+'</code>; '+S.length+' checkpoints in all.</li>');break}
      const names=s.tasks.map(t=>t.name),uniq=[...new Set(names)];
      const trig=uniq.map(n=>{const t=s.tasks.find(x=>x.name===n);const tr=t.triggers.map(c=>c==='__pregel_push'?'a Send packet':c);return '<code>'+esc(n)+'</code> ('+esc(tr.join(' and '))+')'}).join(', ');
      const again=uniq.filter(n=>ran[n]).map(n=>'<code>'+esc(n)+'</code> runs a second time. ').join('');uniq.forEach(n=>ran[n]=1);
      const ws=s.writes.filter(w=>!hid(w.channel));
      const wtxt=ws.length?ws.map(w=>'<code>'+esc(w.task)+' → '+esc(w.channel)+(w.channel==='__pregel_tasks'?'':' = '+esc(cut(fmtv(w.value),48)))+'</code>').join('; '):'only trigger channels';
      const par=names.length>1?(names.length+' tasks in parallel, each reading the state as of the step start. '):'';
      const title='Super-step '+(s.step+1)+': '+uniq.join(', ')+(names.length>uniq.length?' ×'+names.length:'');
      if(!nx){out.push('<li><b>'+esc(title)+', and the update fails.</b> Plan: '+trig+'. '+par+'Pending writes, saved against checkpoint '+s.step+': '+wtxt+'. Update: <code>'+esc((gr.error||'').split('\n')[0])+'</code> No checkpoint is written; the saved writes make every later <code>get_state()</code> on this thread fail the same way.</li>');break}
      const ch=chgd(s,nx),same=ws.filter(w=>ws.filter(v=>v.channel===w.channel).length>1).map(w=>w.channel);
      const red=same.length?' The reducer folds the '+same.length+' writes to <code>'+esc(same[0])+'</code> into one value, in task-path order.':'';
      out.push('<li><b>'+esc(title)+'.</b> Plan: '+trig+'. '+again+par+'Pending writes: '+wtxt+'. Update: '+(ch.length?ch.map(c=>'<code>'+esc(c)+'</code> to v'+nx.versions[c]).join(', '):'no state key changes')+'.'+red+' Checkpoint '+nx.step+' saved.</li>')}
    return out}
  const box=$('flg-s-lists');
  box.innerHTML=D.e1.map(gr=>'<ol class="sx" id="sx-s-'+gr.name+'"'+(gr.name===cur?'':' hidden')+'>'+items(gr).join('')+'</ol>').join('');
  $('flg-s-pick').innerHTML=Object.keys(NAMES).map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+NAMES[k]+'</button>').join('');
  const note=()=>{$('flg-s-note').textContent=TEACH[cur]};note();
  // the closed tables: channels and pending writes, versions_seen, at the stage's current step
  function tables(k){const gr=g(),S=gr.steps,a=at(gr,k),show=$('flg-s-hid').checked;
    const s=a.kind==='step'?a.nx:a.kind==='input'?S[Math.min(1,S.length-1)]:S[Math.min(k,S.length-1)],prev=a.kind==='step'?a.s:null;
    const keys=Object.keys(s.versions).filter(x=>show||!hid(x));Object.keys(s.values).forEach(x=>{if(!keys.includes(x)&&(show||!hid(x)))keys.push(x)});
    let h='<p class="small">Checkpoint '+s.step+(a.kind==='err'?' (the failed step writes none)':'')+':</p><div class="tw"><table class="flg-ct"><thead><tr><th>Channel</th><th class="num">Version</th><th>Value</th></tr></thead><tbody>'+
      keys.map(x=>{const c=prev&&s.versions[x]!==(prev.versions||{})[x];return '<tr'+(c?' class="flg-chg"':'')+(hid(x)?' style="color:var(--mute)"':'')+'><td class="mono">'+esc(x)+'</td><td class="num">'+esc(s.versions[x]||'')+'</td><td class="mono">'+esc(fmtv(s.values[x]==null?(hid(x)?'(trigger)':''):s.values[x]))+'</td></tr>'}).join('')+'</tbody></table></div>';
    if(a.s){h+='<div class="small"><b>Pending writes of this step</b> (saved against checkpoint '+a.s.step+'):</div><ul class="tight">'+a.s.writes.filter(w=>show||!hid(w.channel)).map(w=>'<li class="small mono">'+esc(w.task)+' → '+esc(w.channel)+(w.value!=null?' = '+esc(fmtv(w.value)):'')+'</li>').join('')+'</ul>'}
    $('flg-s-tab').innerHTML=h;
    const seen=Object.keys(s.seen).filter(n=>!n.startsWith('__'));
    $('flg-s-seen').innerHTML=seen.length?'<div class="tw"><table class="flg-ct"><thead><tr><th>Node</th><th>Channel versions it has seen</th></tr></thead><tbody>'+seen.map(n=>'<tr><td class="mono">'+esc(n)+'</td><td class="mono">'+esc(Object.entries(s.seen[n]).map(([c,v])=>c+': '+v).join(', '))+'</td></tr>').join('')+'</tbody></table></div>':'<p class="small mute">No node has run yet, so versions_seen is empty apart from the input.</p>';
    const tasks=S.slice(1,a.kind==='step'||a.kind==='err'?k+1:k).reduce((t,x)=>t+x.tasks.length,0);
    $('flg-s-cnt').innerHTML=RD.stat('Super-step',a.kind==='input'?'0':String(a.s?a.s.step+1:S[S.length-2].step+1),'')+RD.stat('Tasks run',tasks,'node executions so far')+RD.stat('Checkpoints saved',a.kind==='step'?a.ck:a.ck,a.kind==='err'?'no new checkpoint: the step failed':'one per super-step, plus the input')}
  const draw=F.tween('flg-s-fig',2600,(k,e)=>{render(k,e);if(e>=1||e===0)try{tables(k)}catch(err){console.error(err)}});
  const an=RD.anim({card:'flg-s-fig',ctl:'flg-s-ctl',n:g().steps.length,draw,ms:5400,label:'Step through Fig. 2',list:'sx-s-'+cur});
  RD.onResize(()=>an.redraw());
  RD.seg($('flg-s-pick'),m=>{cur=m;note();D.e1.forEach(gr=>{$('sx-s-'+gr.name).hidden=gr.name!==m});an.reset(g().steps.length,'sx-s-'+m)});
  $('flg-s-hid').addEventListener('change',()=>tables(an.i));
  // the summary table (closed)
  const runsOf=x=>{const c={};x.steps.forEach(s=>s.tasks.forEach(t=>c[t.name]=(c[t.name]||0)+1));return c};
  $('flg-s-sum').innerHTML='<thead><tr><th>Graph</th><th class="num">Super-steps</th><th>Node executions</th><th>Final state or error</th></tr></thead><tbody>'+
    D.e1.map(x=>{const r=runsOf(x);const n=x.steps.filter(s=>s.tasks.length).length;
      return '<tr><td class="small">'+NAMES[x.name]+'</td><td class="num">'+n+'</td><td class="small mono">'+esc(Object.entries(r).map(([k,v])=>k+(v>1?' ×'+v:'')).join(', '))+'</td><td class="small mono">'+esc(x.error?x.error.split('\n')[0]:JSON.stringify(x.final))+'</td></tr>'}).join('')+'</tbody>';
})();
