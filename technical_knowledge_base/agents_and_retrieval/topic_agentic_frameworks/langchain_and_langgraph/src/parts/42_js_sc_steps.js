// ---- Scene: Fig. 2, super-steps (section 3; renderer v2, 2026-11-06; replaces the 2D super-step player). Seven recorded graphs (FLG.e1, langgraph 1.2.14,
// InMemorySaver, no model). Step 0 is the input; each later step is one super-step, played in its three phases during the step's tween:
// plan (the triggered nodes are outlined, their trigger channels flow in), execute (the nodes run; each task's writes land on the pending-writes tray),
// update (the writes go through the reducers into the state's channels, whose columns rise with their version, and a checkpoint drops onto the stack).
// The step lists on the left are generated from the same recorded checkpoints, one item per step. ----
(function(){
  if(!document.getElementById('stg-steps'))return;const {mix,cl}=S3;
  const D=window.FLG,G=window.FLG3,esc=RD.esc,$=id=>document.getElementById(id);
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
  // derived per graph: its state keys (in order of first write), node positions
  function info(gr){if(gr._i)return gr._i;const keys=[];gr.steps.forEach(s=>Object.keys(s.versions).concat(Object.keys(s.values)).forEach(k=>{if(!hid(k)&&!keys.includes(k))keys.push(k)}));
    const pos=G.layout(FLGG.LAYOUT[gr.name],-4.6,1.0,-.9,1.45);const err=!!gr.error;return gr._i={keys,pos,err,n:gr.steps.length}}
  const X0=-5.0,X1=.9,ZT=.55,ZS=1.65,DB=[3.7,0,-.6];
  const keyX=(I,k)=>{const n=I.keys.length,i=I.keys.indexOf(k);return n>1?X0+.3+(X1-X0-.6)*i/(n-1):(X0+X1)/2};
  const ver=(s,k)=>+((s&&s.versions[k])||0);
  const chgd=(a,b)=>Object.keys(b.versions).filter(k=>!hid(k)&&b.versions[k]!==(a.versions||{})[k]);
  // what the stage shows at step k: tasks run, writes pending, the checkpoint the update saves
  function at(gr,k){const S=gr.steps,I=info(gr);if(k===0)return {kind:'input',ck:Math.min(2,S.length)};
    const s=S[k],nx=S[k+1];if(!s.tasks.length)return {kind:'end',ck:S.length};
    if(!nx)return {kind:'err',ck:S.length,s};return {kind:'step',ck:k+2,s,nx}}
  function draw(R,k,e){const P=R.P,gr=g(),I=info(gr),S=gr.steps,a=at(gr,k),nar=R.W<520;R.grid(-6.4,4.6,-2.6,2.6,.5);
    const p1=cl(e/.3,0,1),p2=cl((e-.3)/.35,0,1),p3=cl((e-.65)/.35,0,1);
    // node states: done for every task of an earlier step, next/run/err for this step's tasks
    const ns={},runs={},cp={};for(let j=1;j<k;j++)(S[j].tasks||[]).forEach(t=>{ns[t.name]='done';runs[t.name]=(runs[t.name]||0)+1});
    const tasks=a.s?a.s.tasks:[];tasks.forEach(t=>{cp[t.name]=(cp[t.name]||0)+1});
    Object.keys(cp).forEach(n=>{ns[n]=a.kind==='err'&&p3>0?'err':p2>0?'run':'next';runs[n]=(runs[n]||0)+(p2>0?1:0)});
    if(a.kind==='end')ns.__end__='done';
    // edges; trigger flows into this step's nodes during plan and execute
    gr.edges.forEach(ed=>{const pts=G.edge(R,I.pos[ed.s],I.pos[ed.t],{a:.5,cond:ed.cond,s:ed.s,t:ed.t});
      if(pts&&cp[ed.t]&&p3<1&&!(cur==='send'&&ed.t==='review'&&false))R.flow(pts,{c:P.c5,r:.06,n:5,speed:1,a:(1-p3)*(.4+.6*p1)});
      if(pts&&k===0&&ed.s==='__start__')R.flow(pts,{c:P.c5,r:.06,n:5,speed:1})});
    Object.keys(I.pos).forEach(n=>{const st=ns[n]||'idle',rn=runs[n]||0;
      const show=!nar||st==='run'||st==='next'||st==='err'||G.isSE(n);
      G.node(R,I.pos[n],n,{st,a:st==='idle'?.5:1,copies:cp[n]>1?cp[n]:1,label:show,text:n+(cp[n]>1?' ×'+cp[n]:'')+(rn>1?' · run '+rn:'')})});
    // the pending-writes tray: a glass plate between the graph and the state
    const trayA=a.kind==='step'||a.kind==='err'?1:.35;
    R.glass([X0-.4,.02,ZT-.3],[X1-X0+.8,0,0],[0,0,.6],{c:P.c3,a:trayA*.8,nu:10,nv:2});
    R.label([X0-.45,.02,ZT],'pending writes',{al:'right',dx:-6,fs:12.5,b:1,c:P.c3,a:trayA,wide:1});
    const W=a.s?a.s.writes.filter(w=>!hid(w.channel)):[];
    W.forEach((w,i)=>{const p=I.pos[w.task]||[X0,0],x=p[0]+(i%3-1)*.06+(W.filter((v,j)=>j<i&&v.task===w.task).length)*.32,c=[x,.04,ZT];
      const shown=a.kind==='err'?p2:p2*(1-p3*.999);if(shown<=.01)return;
      R.box(c,[.26,.16,.26],{fill:mix(P.paper,a.kind==='err'&&p3>0?P.bad:P.c3,.6),a:shown,lw:.7,shadow:false});
      if(p3<.2||a.kind==='err')R.label([c[0],.2,c[2]],w.channel,{mono:true,fs:12,c:a.kind==='err'&&p3>0?P.bad:P.c3,dy:-8,a:shown,grp:'w'});
      if(p2>0&&p3<1)R.flowArc([p[0],.3,p[1]],[c[0],.2,c[2]],.35,{c:P.c3,r:.055,n:4,speed:1,a:p2*(1-p3)});
      if(a.kind==='step'&&p3>0)R.flowArc([c[0],.2,c[2]],[keyX(I,w.channel),.3,ZS],.4,{c:P.c3,r:.06,n:5,speed:1.1,a:p3})});
    // the state's channels: a column per key whose height is its version; this step's changed keys light up
    const sv=a.kind==='step'?(p3>.5?a.nx:a.s):a.kind==='input'?S[Math.min(1,S.length-1)]:S[Math.min(k,S.length-1)];
    const changed=a.kind==='step'?chgd(a.s,a.nx):[];
    I.keys.forEach(key=>{const x=keyX(I,key),v=a.kind==='step'?ver(a.s,key)+(ver(a.nx,key)-ver(a.s,key))*p3:ver(sv,key),hi=changed.includes(key)&&p3>0;
      R.box([x,0,ZS],[.8,.05,.5],{a:.9,lw:.7});
      if(v>0)R.box([x,.05,ZS],[.5,v*.2,.32],{fill:mix(P.paper,P.c3,hi?.75:.35),a:1,lw:.7,shadow:false});
      R.label([x,0,ZS+.25],key,{mono:true,fs:12,c:hi?P.c3:P.mute,b:hi,dy:14,a:!nar||hi?1:0});
      if(v>0)R.label([x,.05+v*.2,ZS],'v'+Math.round(v),{mono:true,fs:12,c:P.mute,dy:-9,a:!nar||hi?1:0});
      if(hi&&!nar&&p3>.6){const val=(a.nx.values||{})[key];if(val!==undefined)R.label([x,.05+v*.2,ZS],cut(fmtv(val),34),{mono:true,fs:12,c:P.c3,b:1,dy:-26,a:(p3-.6)/.4,grp:'val'})}});
    R.label([X0-.45,.1,ZS],'state channels',{al:'right',dx:-6,fs:12.5,b:1,c:P.c3,wide:1});
    // the checkpointer: one slab per saved checkpoint; the update drops the next one in
    const n=a.ck,drop=a.kind==='step'?Math.max(0,(p3-.4)/.6):a.kind==='input'?e:1,top=G.stack(R,DB,a.kind==='step'&&drop<=0?n-1:n,a.kind==='step'||a.kind==='input'?drop:1,{hiLast:a.kind==='step'||a.kind==='input'});
    R.label([DB[0],top,DB[2]],(a.kind==='step'&&drop<=0?n-1:n)+' checkpoints',{fs:12.5,b:1,c:P.acc,dy:-12});
    if(a.kind==='step'&&p3>.3)R.flowArc([X1+.2,.4,ZS],[DB[0]-.3,top,DB[2]],.5,{c:P.acc,r:.06,n:6,speed:1.1,a:p3});
    if((a.kind==='step'||a.kind==='err')&&p2>.3&&p3<1)R.flowArc([X1+.3,.15,ZT],[DB[0]-.4,top*.6,DB[2]+.3],.4,{c:P.c3,r:.05,n:5,speed:1.1,a:.7*(a.kind==='err'?1:1-p3)});
    if(a.kind==='err'&&p3>0)R.label([DB[0]-1.6,0,ZT],'InvalidUpdateError: no checkpoint',{fs:13,b:1,c:P.bad,dy:30,a:p3});
    if(a.kind==='end'&&!nar)R.label([DB[0],top,DB[2]],'run ends: nothing triggered',{fs:12.5,c:P.mute,dy:-30,a:e});
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
  const full={cam:[.12,.78],bounds:[[-6.0,0,-2.0],[4.5,1.0,2.1]]};
  const st=S3.stage({id:'stg-steps',list:'sx-s-'+cur,fig:'Fig. 2 · super-steps of a recorded run',cam:full.cam,bounds:full.bounds,aspect:.47,dur:2700,hold:4600,draw,
    margin:w=>w<520?[14,10,24,10]:[18,16,30,130],onStep:k=>{try{tables(k)}catch(e){console.error(e)}},view:()=>innerWidth<520?{cam:[.5,.92]}:null});
  RD.seg($('flg-s-pick'),m=>{cur=m;note();D.e1.forEach(gr=>{$('sx-s-'+gr.name).hidden=gr.name!==m});st.list('sx-s-'+m)});
  $('flg-s-hid').addEventListener('change',()=>tables(st.st.k));
  // the summary table (closed)
  const runsOf=x=>{const c={};x.steps.forEach(s=>s.tasks.forEach(t=>c[t.name]=(c[t.name]||0)+1));return c};
  $('flg-s-sum').innerHTML='<thead><tr><th>Graph</th><th class="num">Super-steps</th><th>Node executions</th><th>Final state or error</th></tr></thead><tbody>'+
    D.e1.map(x=>{const r=runsOf(x);const n=x.steps.filter(s=>s.tasks.length).length;
      return '<tr><td class="small">'+NAMES[x.name]+'</td><td class="num">'+n+'</td><td class="small mono">'+esc(Object.entries(r).map(([k,v])=>k+(v>1?' ×'+v:'')).join(', '))+'</td><td class="small mono">'+esc(x.error?x.error.split('\n')[0]:JSON.stringify(x.final))+'</td></tr>'}).join('')+'</tbody>';
})();
