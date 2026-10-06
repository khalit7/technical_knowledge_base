// ---- Crash lab (t-crash) ----
(function(){
  const D=window.FLG,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=n=>Number(n).toLocaleString('en-US');
  let sc='A';
  const run=()=>D.e6.runs[sc];
  const CAP={process_start:e=>e.process==='start'?'Process 1 starts the graph on a fresh thread.':e.process==='resume'?'Process 2 starts and asks for the thread’s state.':'Process 3 starts: a person (here the driver) answers the interrupt with Command(resume="approve").',
    checkpoint_found:()=>'A checkpoint exists. invoke(None) continues from it: read_and_test is not run again, and the diagnosis that returned before the kill is read from its pending write.',
    no_checkpoint:()=>'No checkpoint: with durability="exit" nothing is written until the run ends, so the graph has to start again from the input.',
    llm_start:e=>'Model call starts: '+e.node+'.',
    llm_done:e=>'Model call returns: '+e.node+'.',
    SIGKILL:()=>'SIGKILL to the whole process group: Python and the claude process of the call still running die at once. That call returns nothing.',
    human_review:()=>'human_review calls interrupt(): the state is saved and invoke returns the diff. Process 2 exits.',
    resumed:e=>'interrupt() returns "'+e.decision+'"; the node finishes.',
    tested:e=>'The patch is applied and the tests '+(e.passed?'pass':'fail')+'.',
    read_and_test:()=>'read_and_test runs again (only happens without a checkpoint).'};
  function frames(r){
    const F=[];r.events.forEach(e=>{let k=null;
      if(e.what==='process_start'||e.what==='checkpoint_found'||e.what==='no_checkpoint'||e.what==='llm_start'||e.what==='llm_done'||e.what==='SIGKILL'||e.what==='resumed'||e.what==='tested')k=e.what;
      if(e.what==='start'&&e.node==='human_review'&&e.process==='resume')k='human_review';
      if(e.what==='start'&&e.node==='read_and_test'&&e.process==='resume')k='read_and_test';
      if(k)F.push({t:e.t,k,e})});
    // merge simultaneous llm_start events
    const out=[];F.forEach(f=>{const p=out[out.length-1];if(p&&p.k==='llm_start'&&f.k==='llm_start'&&Math.abs(p.t-f.t)<0.01){p.e2=f.e;return}out.push(f)});
    return out;
  }
  let F=frames(run());
  const draw=i=>{const r=run();const f=F[Math.min(i,F.length-1)];const el=$('flg-c-svg');
    el.innerHTML=FLGC.lanes(r,RD.width(el),f.t+0.001);
    const s=FLGC.sums(r,f.t+0.001);
    $('flg-c-out').innerHTML=RD.stat('t',f.t.toFixed(1)+' s','since process 1 started')+RD.stat('Model calls started',s.calls,s.lost?s.lost+' killed in flight':'')+
      RD.stat('Tokens of returned calls',fmt(s.inp+s.out),fmt(s.inp)+' in, '+fmt(s.out)+' out')+RD.stat('Cost equivalent','$'+s.cost.toFixed(4),'returned calls only');
    let txt=CAP[f.k]?CAP[f.k](f.e):f.k;if(f.e2)txt='Two model calls start in parallel: '+f.e.node+' and '+f.e2.node+'.';
    $('flg-c-cap').innerHTML='<div class="t">'+esc(f.e.process==='driver'?'driver':('process '+({start:1,resume:2,approve:3}[f.e.process])))+', t = '+f.t.toFixed(2)+' s</div><p>'+esc(txt)+'</p>'};
  const a=RD.anim({card:'flg-c-card',ctl:'flg-c-ctl',n:F.length,draw,ms:1300,label:'Replay the run',tab:'t-crash'});
  const calls=()=>{const r=run();
    $('flg-c-calls').innerHTML='<thead><tr><th>Process</th><th>Node</th><th class="num">Start</th><th class="num">Seconds</th><th class="num">In</th><th class="num">Out (thinking)</th><th class="num">Cost</th></tr></thead><tbody>'+
      r.calls.map((c,i)=>'<tr data-i="'+i+'" style="cursor:pointer"><td>'+({start:1,resume:2,approve:3}[c.process])+'</td><td class="mono small">'+esc(c.node)+'</td><td class="num">'+c.t0.toFixed(1)+'</td><td class="num">'+(c.t1===null?'killed':(c.t1-c.t0).toFixed(1))+'</td><td class="num">'+(c.t1===null?'':fmt(c.input))+'</td><td class="num">'+(c.t1===null?'':fmt(c.output)+' ('+fmt(c.thinking)+')')+'</td><td class="num">'+(c.t1===null?'':'$'+c.cost.toFixed(4))+'</td></tr>').join('')+'</tbody>';
    $('flg-c-text').textContent='Click a call above.'};
  $('flg-c-calls').addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;const c=run().calls[+tr.dataset.i];
    [...$('flg-c-calls').querySelectorAll('tr')].forEach(x=>x.classList.toggle('on',x===tr));
    $('flg-c-text').textContent=c.t1===null?'This call was cut by the SIGKILL: no result record exists.':c.text});
  RD.seg($('flg-c-mode'),m=>{sc=m;F=frames(run());a.reset(F.length);calls()});
  RD.onResize(()=>a.redraw(),'t-crash');calls();
  // no-model database after the kill
  const cases=D.e2.scenarios;
  $('flg-c-db').innerHTML=cases.map((s,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+(s.kind==='kill'?'SIGKILL, '+s.durability:'exception, '+s.durability)+'</button>').join('');
  const showDb=i=>{const s=cases[i];const rows=s.raw_after_first;
    $('flg-c-dbv').textContent=rows.length?rows.map(c=>'checkpoint step '+c.step+' ('+c.source+')  state '+JSON.stringify(Object.fromEntries(Object.entries(c.values).filter(([k])=>!/^(branch:|join:|__)/.test(k))))+(Object.keys(c.values).some(k=>/^(branch:|join:)/.test(k))?'  triggers: '+Object.keys(c.values).filter(k=>/^(branch:|join:)/.test(k)).join(', '):'')+'\n'+(c.pending.length?c.pending.map(p=>'    pending write  task '+p.task+'  '+p.channel+(p.value!==null&&p.value!==undefined?' = '+JSON.stringify(p.value):'')).join('\n'):'    (no pending writes)')).join('\n'):
      '(no checkpoints and no writes: durability="exit" writes only when the run ends)'};
  RD.seg($('flg-c-db'),m=>showDb(+m));showDb(0);
  $('flg-c-cli').textContent=D.e6.cli;
})();
