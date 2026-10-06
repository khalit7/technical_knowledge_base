// ---- Super-step lab (t-steps) ----
(function(){
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
  let cur='linear';
  const btns=Object.keys(NAMES).map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+NAMES[k]+'</button>').join('');
  $('flg-s-pick').innerHTML=btns;
  const g=()=>D.e1.find(x=>x.name===cur);
  const note=()=>{$('flg-s-note').textContent=TEACH[cur]};
  const pl=FLGS.mount({card:'flg-s-card',ctl:'flg-s-ctl',svgEl:$('flg-s-svg'),capEl:$('flg-s-cap'),tableEl:$('flg-s-tab'),seenEl:$('flg-s-seen'),counterEl:$('flg-s-cnt'),tab:'t-steps',getGraph:g,hidden:()=>$('flg-s-hid').checked});
  RD.seg($('flg-s-pick'),m=>{cur=m;note();pl.reload()});
  $('flg-s-hid').addEventListener('change',()=>pl.redraw());
  RD.onResize(()=>pl.redraw(),'t-steps');note();
  // summary table
  const runs=x=>{const c={};x.steps.forEach(s=>s.tasks.forEach(t=>c[t.name]=(c[t.name]||0)+1));return c};
  $('flg-s-sum').innerHTML='<thead><tr><th>Graph</th><th class="num">Super-steps</th><th>Node executions</th><th>Final state or error</th></tr></thead><tbody>'+
    D.e1.map(x=>{const r=runs(x);const n=x.steps.filter(s=>s.tasks.length).length;
      return '<tr><td class="small">'+NAMES[x.name]+'</td><td class="num">'+n+'</td><td class="small mono">'+esc(Object.entries(r).map(([k,v])=>k+(v>1?' ×'+v:'')).join(', '))+'</td><td class="small mono">'+esc(x.error?x.error.split('\n')[0]:JSON.stringify(x.final))+'</td></tr>'}).join('')+'</tbody>';
})();
