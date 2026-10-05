// ---- Loop lab: step panels (before/after cards, code diffs, numbers from data), the gate table, the Claude Code comparison
(function(){
  const {D,esc,fmt,$,ctx,cost}=LP;const tabEl=$('t-loop');if(!tabEl)return;
  // numbers in prose come from the data: data-v="<run id>.tot.out" or "cc:<id>.cr"
  function val(path){
    if(path.indexOf('cc:')===0){const [id,k]=path.slice(3).split('.');const c=D.cc.find(x=>x.id===id);if(!c)return null;
      return {first:ctx(c.calls[0].u),cr:c.usage[2],cw:c.usage[1],out:c.usage[3]}[k]}
    const [id,...ks]=path.split('.');const r=LP.run(id);if(!r)return null;
    if(ks[0]==='tests'&&ks[1]==='last'){const l=(r.tests||'').trim().split('\n');return {txt:(l.find(x=>x.indexOf('FAIL')===0)||l[l.length-1])+' (and '+l[l.length-1]+')'}}
    let v=r;ks.forEach(k=>{v=v==null?null:v[k]});return v}
  tabEl.querySelectorAll('[data-v]').forEach(el=>{const v=val(el.dataset.v);el.textContent=v==null?'n/a':(typeof v==='object'?v.txt:(typeof v==='number'?fmt(v):String(v)))});
  // before/after cards
  const M=[['Model calls',t=>t.calls],['Tokens read',t=>t.ctx],['Largest call',t=>t.maxctx],['Output tokens',t=>t.out],['Model time (s)',t=>t.secs]];
  tabEl.querySelectorAll('.loop-cmp[data-runs]').forEach(el=>{
    const rs=el.dataset.runs.split(' ').map(LP.run).filter(Boolean);
    const mx=M.map(m=>Math.max(...rs.map(r=>m[1](r.tot)),1));
    el.innerHTML=rs.map(r=>{const c=cost(r.modelId,[r.tot.ctx-r.tot.cw-r.tot.cr,r.tot.cw,r.tot.cr,r.tot.out]);
      return '<div class="side"><h4>Step '+esc(r.step)+': '+esc(r.name)+' <span class="'+(r.passed?'loop-ok':'loop-bad')+'">'+(r.passed?'pass':'fail')+'</span></h4>'+
      M.map((m,i)=>'<div class="mrow"><span>'+m[0]+'</span><span class="trk"><span class="fil" style="width:'+(100*m[1](r.tot)/mx[i]).toFixed(1)+'%"></span></span><span>'+fmt(m[1](r.tot))+'</span></div>').join('')+
      '<div class="loop-mute">'+(r.modelId.indexOf('sonnet')>=0?'Sonnet':'Haiku')+'; stopped on '+esc(r.stop)+(c!=null?'; API-price equivalent $'+c.toFixed(4):'')+'</div>'+
      '<div class="acts">'+r.acts.map(esc).join(' &rarr; ')+'</div>'+
      (r.lite?'<div class="loop-mute">Metrics only on the page; full run in src/loop/recordings/'+esc(r.id)+'.jsonl</div>':'<button class="loop-open" data-run="'+r.id+'" style="margin-top:6px;font-size:12px">Open transcript</button>')+'</div>'}).join('');
  });
  tabEl.addEventListener('click',e=>{const b=e.target.closest('button.loop-open');if(!b)return;LP.showRun(b.dataset.run);$('loop-viewer').scrollIntoView({block:'start'})});
  // code: full file or the diff against the step before
  tabEl.querySelectorAll('.loop-code[data-f]').forEach(el=>{
    const c=D.code.find(x=>x.f===el.dataset.f);if(!c)return;let h='';
    const chg=c.plus!=null?' (+'+c.plus+' / -'+c.minus+' lines against the step before)':'';
    if(c.diff){h+='<details class="loop-det"><summary>Code added in this step: diff of '+esc(c.f)+chg+'</summary><pre class="loop-pre loop-diff">'+
      c.diff.map(l=>'<span class="'+(l[0]==='+'?'add':l[0]==='-'?'del':'hunk')+'">'+esc(l)+'</span>').join('\n')+'</pre></details>'}
    if(c.full&&el.dataset.full){h+='<details class="loop-det"><summary>The whole of '+esc(c.f)+' ('+c.lines+' lines'+(chg?'; '+chg.slice(2,-1):'')+')</summary><pre class="loop-pre">'+esc(c.full)+'</pre></details>'}
    el.innerHTML=h;
  });
  // step buttons
  const panels=[...tabEl.querySelectorAll('.loop-panel')],sb=$('loop-stepbtn');
  sb.innerHTML=panels.map((p,i)=>'<button data-m="'+p.dataset.step+'" role="tab"'+(i===0?' class="on"':'')+'>Step '+p.dataset.step+'</button>').join('');
  LP.seg(sb,m=>panels.forEach(p=>{p.hidden=p.dataset.step!==m}));
  // gate table (step 3's check() run on eleven actions, no model)
  const G=D.gate||[];const ge=$('loop-gate');
  if(ge&&G.length)ge.innerHTML='<div class="tw"><table class="loop-t" style="cursor:auto"><thead><tr><th>Action tried</th><th>Why it matters</th><th>Verdict</th><th>Rule</th></tr></thead><tbody>'+
    G.map(g=>'<tr><td><code>'+esc(g.tool+' '+(g.args.cmd||g.args.path))+'</code></td><td>'+esc(g.note)+'</td><td class="'+(g.verdict==='deny'?'loop-bad':'loop-ok')+'">'+esc(g.verdict)+'</td><td class="loop-mute">'+esc(g.why)+'</td></tr>').join('')+'</tbody></table></div>';
  // Claude Code comparison table
  const ct=$('loop-cctable');
  if(ct){const mine=['s5_haiku','s5_sonnet'].map(LP.run).filter(Boolean).map(r=>({name:'Our harness, step 5, '+(r.modelId.indexOf('sonnet')>=0?'Sonnet':'Haiku'),calls:r.tot.calls,fresh:r.tot.ctx-r.tot.cw-r.tot.cr,cw:r.tot.cw,cr:r.tot.cr,out:r.tot.out,time:r.tot.secs+' s model time',pass:r.passed,cost:cost(r.modelId,[r.tot.ctx-r.tot.cw-r.tot.cr,r.tot.cw,r.tot.cr,r.tot.out]),tested:'yes',calc:true}));
    const cc=D.cc.map(c=>({name:c.name,calls:c.calls.length,fresh:c.usage[0],cw:c.usage[1],cr:c.usage[2],out:c.usage[3],time:(c.ms/1000).toFixed(1)+' s',pass:c.passed,cost:c.cost,tested:c.calls.some(k=>k.c.some(x=>x.t==='tool'&&x.in&&/python3? tests\/test_core/.test(x.in.command||'')&&!k.denied))?'yes':'no (denied)'}));
    const rows=mine.concat(cc);
    ct.innerHTML='<div class="tw"><table class="loop-t" style="cursor:auto"><thead><tr><th>Run</th><th class="num">Model calls</th><th class="num">Fresh input</th><th class="num">Cache write</th><th class="num">Cache read</th><th class="num">Output</th><th class="num">Time</th><th class="num">API-price equivalent</th><th>Ran the tests itself</th><th>Tests after</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+esc(r.name)+'</td><td class="num">'+r.calls+'</td><td class="num">'+fmt(r.fresh)+'</td><td class="num">'+fmt(r.cw)+'</td><td class="num">'+fmt(r.cr)+'</td><td class="num">'+fmt(r.out)+'</td><td class="num">'+esc(r.time)+'</td><td class="num">'+(r.cost==null?'n/a':'$'+r.cost.toFixed(4))+(r.calc?'*':'')+'</td><td>'+r.tested+'</td><td class="'+(r.pass?'loop-ok':'loop-bad')+'">'+(r.pass?'pass':'fail')+'</td></tr>').join('')+'</tbody></table></div>'+
      '<p class="loop-mute">* computed here from the usage records at the same list prices (fresh input x1, 1-hour cache write x2, cache read x0.1 of the input price); for Claude Code the CLI reports the figure itself. Our step 5 time is the sum of model calls; Claude Code\'s is its reported duration. Our Sonnet run costs more than Claude Code\'s Sonnet runs although it read fewer tokens: every one of its prompts passed Sonnet 5.5\'s 512-token caching minimum and was written to the cache at twice the input price, and none was ever read back.</p>'}
  // Claude Code call viewer
  const cs=$('loop-ccsel'),co=$('loop-ccout');
  if(cs){cs.innerHTML=D.cc.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');
    const draw=id=>{const c=D.cc.find(x=>x.id===id);if(!c)return;
      let h='<p class="loop-mute">Claude Code '+esc(c.version)+', model '+esc(c.model)+', permission mode '+esc(c.mode)+', tools: '+esc((c.tools||[]).join(', '))+'. Reported: '+c.numTurns+' turns, '+fmt(c.ms)+' ms.</p>';
      c.calls.forEach((k,i)=>{h+='<div class="call"><b>Model call '+(i+1)+'</b> <span class="loop-mute">fresh '+fmt(k.u[0])+', cache write '+fmt(k.u[1])+', cache read '+fmt(k.u[2])+', output '+fmt(k.u[3])+(k.denied?'; <span class="loop-bad">'+k.denied+' denied</span>':'')+'</span>';
        k.c.forEach(x=>{if(x.t==='think')h+='<div class="loop-mute">(thinking; text not returned)</div>';else if(x.t==='text')h+='<div>'+esc(x.x)+'</div>';
          else{const r=k.res.find(y=>y.id===x.id);h+='<div class="tu">&#9654; '+esc(x.name)+' '+esc(JSON.stringify(x.in))+'</div>'+(r?'<details class="loop-det"><summary>'+(r.err?'error: ':'')+'result ('+fmt(r.n)+' characters)</summary><pre class="loop-pre">'+esc(r.x)+(r.n>r.x.length?'\n[...]':'')+'</pre></details>':'')}});
        h+='</div>'});co.innerHTML=h};
    cs.addEventListener('change',()=>draw(cs.value));draw(D.cc[D.cc.length-1].id);cs.value=D.cc[D.cc.length-1].id}
})();
