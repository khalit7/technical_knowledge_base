// ---- Replay tab: step through a real LFM2-Terminal trace with the paper's replay rule ----
(function(){
  const TR=window.TRACES,ST=window.REPLAY_STATS;if(!TR||!$('rr'))return;
  const KC={'read-pre':'var(--c3)','read-part':'var(--c6)','read-held':'var(--c2)','write-new':'var(--c4)','write-mod':'var(--c4)','edit':'var(--c4)','list':'var(--c5)','run':'var(--bad)','look':'var(--dim)'};
  const KN={'read-pre':'read, pre-existing','read-part':'partial read','read-held':'read, held back','write-new':'agent writes a new file','write-mod':'agent overwrites a file','edit':'agent edits in place','list':'listing','run':'may change the workspace','look':'read-only, nothing to replay'};
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const short=p=>p.replace(/^\/app\//,'');
  let cur=0,R=null,B=null,mode='early';
  const o={id:'rr',mode:'early',dur:2200,modes:{early:[],late:[]},draw,counters};
  function load(i){cur=i;const C=TR[i];R=RP.run(C);B=[];C.turns.forEach(T=>T.blocks.forEach(b=>B.push(b)));
    $('rtTask').textContent=C.task;
    o.modes.early=R.events.map((e,k)=>({t:'command '+(k+1)+' (turn '+e.t+'): <code>'+esc(e.cmd.slice(0,90))+'</code>',c:cap(e,'early')}));
    o.modes.late=R.events.map((e,k)=>({t:'command '+(k+1)+' (turn '+e.t+'): <code>'+esc(e.cmd.slice(0,90))+'</code>',c:cap(e,'late')}));
    document.querySelectorAll('#rtPick button').forEach((b,j)=>{b.classList.toggle('on',j===i);b.setAttribute('aria-pressed',j===i?'true':'false')});
    files();if(AN){AN.st.k=0;AN.st.t=RM?1:0;AN.st.lk=-1;AN.draw()}}
  function cap(e,m){const p=e.path?'<code>'+esc(short(e.path))+'</code>':'';
    switch(e.kind){
      case 'read-pre':return 'The terminal shows '+e.n+' lines of '+p+(e.t&&R.snaps&&!R.snaps[R.events.indexOf(e)].mut?' before the agent has changed anything':' (listed before any change, never written by the agent)')+', so it is pre-existing: '+(m==='early'?'it enters Ê<sub>0</sub> at this version.':'replaying to the end also keeps it, but at its last version.');
      case 'read-part':return 'Only part of '+p+' is visible ('+e.n+' lines). '+(m==='early'?'Ê<sub>0</sub> holds a partial file; the completion agent must finish it, unless a later full read of the unchanged file fills it in.':'The partial view is kept until a fuller one appears.');
      case 'read-held':return p+' appears only after the agent started changing things, and was not listed before. '+(m==='early'?'It may be the agent\'s own output, so replay holds it back: the workspace must start unsolved.':'Replaying to the end keeps it: this is the agent\'s result, now part of the "environment".');
      case 'write-new':return 'The agent writes '+p+(e.n?' ('+e.n+' lines)':'')+'. '+(m==='early'?'It did not exist before, so it is excluded from Ê<sub>0</sub> and stored as the agent\'s change, for later checking.':'Replaying to the end keeps it: the workspace would start with the agent\'s code in it.');
      case 'write-mod':return 'The agent overwrites '+p+', a pre-existing file. '+(m==='early'?'Ê<sub>0</sub> keeps the earlier version.':'The last version, the agent\'s, replaces the original.');
      case 'edit':return 'The agent edits '+p+' in place; the new content is not visible. '+(m==='early'?'Ê<sub>0</sub> keeps the earlier version.':'The last version is unknown.');
      case 'list':return 'A listing shows '+e.n+' file name'+(e.n===1?'':'s')+'. '+(R.snaps[R.events.indexOf(e)].mut?'The agent has already changed things, so these names prove nothing about the starting workspace.':'Before any change, these paths are known to pre-exist, even if their content is never printed: completion must recreate them.');
      case 'run':return 'A command that can change the workspace (running a script, installing, moving files). From here on, anything new that appears could be the agent\'s doing.';
      default:return 'A read-only command (cd, wc, grep, a version check): nothing for replay to record.'}}
  function view(k,m){const s=R.snaps[k];const rows=[];
    if(m==='early'){s.e0.forEach(p=>{const v=s.e0n[p];rows.push({p,c:'var(--c3)',l:v[0]+' lines'+(v[1]?'':', partial'),tag:'Ê0'})});
      s.listed.filter(p=>s.e0.indexOf(p)<0&&!p.endsWith('.gitkeep')).forEach(p=>rows.push({p,c:'var(--c5)',l:'path only',tag:'listed',da:1}));
      s.cr.concat(s.held.filter(p=>s.cr.indexOf(p)<0)).forEach(p=>rows.push({p,c:'var(--c2)',l:'held back',tag:'agent',x:1}))}
    else{const seen=new Set();s.fin.forEach(p=>{seen.add(p);const ag=s.cr.indexOf(p)>=0||s.held.indexOf(p)>=0;rows.push({p,c:ag?'var(--bad)':'var(--c3)',l:ag?'agent-made':'',tag:ag?'leak':'kept'})});
      s.cr.filter(p=>!seen.has(p)).forEach(p=>rows.push({p,c:'var(--bad)',l:'agent-made',tag:'leak'}));
      s.listed.filter(p=>!seen.has(p)&&s.cr.indexOf(p)<0&&!p.endsWith('.gitkeep')).forEach(p=>rows.push({p,c:'var(--c5)',l:'path only',tag:'listed',da:1}))}
    return rows}
  function draw(m,k,e,w){mode=m;const N=R.events.length,ev=R.events[k],blk=B[k];
    const cw=Math.min(18,Math.max(6,(w-8)/N-2)),gap=2;let s='';
    const sx=(w-(cw+gap)*N)/2;
    R.events.forEach((x,i)=>{s+=rc(sx+i*(cw+gap),6,cw,16,KC[x.kind]||'var(--dim)',{r:2,op:i<=k?1:.28,s:i===k?'var(--ink)':null,sw:2})});
    s+=tx(sx,38,'commands in order: '+(k+1)+' of '+N,{fs:11,c:'var(--mute)'});
    s+=tx(w-sx,38,KN[ev.kind],{fs:11,c:'var(--mute)',a:'end'});
    const two=w>=640,colW=two?(w-24)/2:w-4,tY=50;
    // terminal panel
    const out=(blk[2]||[]).slice(0,7),th=22+16*(out.length+1)+(blk[3]||(blk[2]||[]).length>7?16:0);
    s+=rc(2,tY,colW,th,'var(--soft)',{s:'var(--line)'});
    const clip=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t,nc=Math.floor((colW-20)/6.7);
    s+=tx(10,tY+17,esc(clip('$ '+ev.cmd,nc)),{fs:11.5,w:600});
    out.forEach((ln,i)=>{s+=tx(10,tY+34+16*i,esc(clip(ln,nc)),{fs:11,c:'var(--mute)'})});
    const more=(blk[2]||[]).length-out.length+(blk[3]||0);if(more>0)s+=tx(10,tY+34+16*out.length,'['+more+' more lines]',{fs:11,c:'var(--mute)'});
    // workspace panel
    const rows=view(k,m),wx=two?colW+20:2,wy=two?tY:tY+th+12;
    const wh=30+18*Math.max(1,rows.length);
    s+=rc(wx,wy,colW,wh,'var(--bg)',{s:m==='early'?'var(--c3)':'var(--bad)',sw:1.4});
    s+=tx(wx+10,wy+18,m==='early'?'Replayed workspace Ê0 (and what is held back)':'Workspace replayed to the last version',{fs:12,w:600});
    if(!rows.length)s+=tx(wx+10,wy+38,'nothing recovered yet',{fs:11,c:'var(--mute)'});
    const nc2=Math.floor((colW-140)/6.6);
    rows.forEach((r,i)=>{const y=wy+30+18*i;s+=rc(wx+10,y,11,11,r.da?'none':r.c,{r:2,s:r.c,da:r.da?'2 2':null});
      s+=tx(wx+28,y+10,esc(clip(short(r.p),nc2)),{fs:11.5,c:r.x?'var(--mute)':null});
      s+=tx(wx+colW-8,y+10,r.l,{fs:11,c:'var(--mute)',a:'end'})});
    const H=Math.max(two?Math.max(th,wh)+tY+6:wy+wh+6,60);
    return svgW(w,H,s,'Replay of a terminal trajectory, step by step')}
  function counters(m,k){const s=R.snaps[k];let l=0;s.e0.forEach(p=>{l+=s.e0n[p][0]});
    const ag=s.cr.length+s.held.filter(p=>s.cr.indexOf(p)<0).length;
    if(m==='early')return stat('Ê0 files',s.e0.length,'pre-existing, earliest version')+stat('Ê0 lines',fmt(l),'observed so far')+stat('Paths known only by name',s.listed.filter(p=>s.e0.indexOf(p)<0&&!p.endsWith('.gitkeep')).length,'completion must recreate them')+stat('Held back',ag,'agent-created or agent output');
    const fin=new Set(s.fin.concat(s.cr));return stat('Files in the workspace',fin.size,'every file at its last version')+stat('Of which agent-made',[...fin].filter(p=>s.cr.indexOf(p)>=0||s.held.indexOf(p)>=0).length,'the answer leaks in')+stat('Commands',k+1,'of '+R.events.length)}
  function files(){const el=$('rrFiles');const ps=Object.keys(R.E0).concat(Object.keys(R.created).filter(p=>R.created[p]&&R.created[p].length));
    el.innerHTML=ps.map((p,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+esc(short(p))+'</button>').join('');
    const show=i=>{const p=ps[i];el.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',j===i));
      const E=R.E0[p],F=R.final[p];let h='';
      const blockOf=(v,ttl)=>'<p class="small"><b>'+ttl+'</b> <span class="mute">('+(v.lines.length+v.cut)+' lines'+(v.full?'':', partial view')+', turn '+v.t+(v.cut?'; '+v.cut+' lines cut for this page':'')+')</span></p><pre class="code">'+esc(v.lines.join('\n'))+'</pre>';
      if(E){h+=blockOf(E,'Earliest version: what Ê0 holds');if(F&&F.t!==E.t&&JSON.stringify(F.lines)!==JSON.stringify(E.lines))h+=blockOf(F,'Last version seen in the trace')}
      else{h+='<p class="small"><b>Written by the agent</b> <span class="mute">(held back from Ê0; kept as the agent\'s change for verification)</span></p><pre class="code">'+esc(R.created[p].join('\n'))+'</pre>'}
      $('rrView').innerHTML=h};
    el.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>show(i)));if(ps.length)show(0);else $('rrView').innerHTML='<p class="small mute">No file content recovered.</p>'}
  $('rtPick').innerHTML=TR.map((t,i)=>'<button data-i="'+i+'" aria-pressed="false">'+t.cat.replace(/_task$/,'').replace(/_/g,' ')+'</button>').join('');
  $('rtPick').querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>load(i)));
  let AN=null;load(0);AN=makeAnim(o);
  // sample statistics
  function stats(w){const h=ST.seed_hist_e0_files,ha=ST.all_hist_e0_files,mx=Math.max(...ha),pl=40,pb=30,H=220,bw=(w-pl-10)/h.length;let s='';
    const y=v=>H-pb-(H-pb-44)*v/mx;
    [0,100,200,300,400].filter(v=>v<=mx).forEach(v=>{s+=ln2(pl,y(v),w-10,y(v),'var(--line)')+tx(pl-6,y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    h.forEach((v,i)=>{const x=pl+i*bw;s+=rc(x+bw*.12,y(ha[i]),bw*.76,H-pb-y(ha[i]),'var(--dim)',{r:2})+rc(x+bw*.24,y(v),bw*.52,H-pb-y(v),'var(--acc)',{r:2});
      s+=tx(x+bw/2,H-pb+15,i===h.length-1?i+'+':i,{fs:11,a:'middle',c:'var(--mute)'});if(ha[i])s+=tx(x+bw/2,y(ha[i])-4,ha[i],{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w)/2,H-2,'pre-existing files recovered by replay (Ê0) per trajectory',{fs:11,a:'middle',c:'var(--mute)'});
    const lg=legend([['all 640 sampled',"var(--dim)"],['the 157 that pass the seed filter','var(--acc)']],pl,12,w-pl);
    $('rsPlot').innerHTML=svgW(w,H,s+lg.s,'Histogram of replayed files per trajectory')}
  fit($('rsPlot'),stats);
  const CK=PAPER.chk;$('ckN').textContent=fmt(CK.sample_traces);$('ckE').textContent=fmt(CK.sample_events);$('ckB').textContent=CK.sample_mismatching_fields;
  const cats=Object.entries(ST.categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k.replace(/_task$/,'').replace(/_/g,' ')+' '+v).join(', ');
  $('rsText').innerHTML='<p class="small">'+ST.n+' rows drawn at seeded random offsets ('+ST.distinct_tasks+' distinct tasks). Every one is a <b>'+Object.keys(ST.agents).join(', ')+'</b> session by <b>'+Object.keys(ST.models).join(', ')+'</b>; task families: '+cats+'. Replay finds a median of '+ST.all.e0_files.median+' pre-existing file ('+ST.all.e0_lines.median+' lines) per trace; '+ST.seed_pass+' of '+ST.n+' ('+(100*ST.seed_pass/ST.n).toFixed(1)+'%) pass the seed filter, and among those the median is '+ST.seed.e0_files.median+' file and '+ST.seed.e0_lines.median+' lines (mean '+ST.seed.e0_files.mean+' and '+ST.seed.e0_lines.mean+'). '+A(PAPER.meta.ax+'#A1.T13','Table 13')+' reports 2 files and 60 lines (means 2.9 and 90) for the replayed terminal pool. '+ST.held_any+' traces read a file the rule must hold back, and '+ST.created_any+' write files of their own.</p>'})();
