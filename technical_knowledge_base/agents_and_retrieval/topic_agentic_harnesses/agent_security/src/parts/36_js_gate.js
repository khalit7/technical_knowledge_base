/* 36_js_gate.js: Permission gate decisions tab (t-hsgate). Uses window.HSEC.gate_cases (reused root table). */
(function(){
  var H = window.HSEC || {};
  var gc = H.gate_cases || [];
  var esc = RD.esc;
  function subj(o){ return (o.args && (o.args.cmd || o.args.path)) || o.target || ''; }
  function vclass(v){ return v==='allow'?'allow':(v==='ask'?'ask':'deny'); }
  // classify what the verdict depends on
  function dep(o){
    var w = o.why || '';
    if(o.verdict==='allow') return {k:'allowrule', t:'an allow rule'};
    if(w.indexOf('deny rule')>=0) return {k:'named', t:'a deny rule that names it'};
    if(w.indexOf('ask rule')>=0) return {k:'meta', t:'a metacharacter rule, then fail-closed'};
    return {k:'fc', t:'the fail-closed default'};
  }
  function inFilter(o, m){
    if(m==='all') return true;
    if(m==='allow') return o.verdict==='allow';
    if(m==='deny') return o.verdict!=='allow';
    return true;
  }
  var tbody = document.querySelector('#hsgate-tbl tbody');
  var note = document.getElementById('hsgate-note');
  var sum = document.getElementById('hsgate-sum');
  if(!tbody) return;
  var mode='all';
  function render(){
    tbody.innerHTML = gc.map(function(o){
      var d = dep(o), show = inFilter(o,mode);
      return '<tr class="'+(show?'':'dim')+'"><td><span class="v '+vclass(o.verdict)+'">'+o.verdict.toUpperCase()+'</span></td>'+
        '<td class="cmd">'+esc(subj(o))+'<br><span class="small mute">'+esc(o.note||'')+'</span></td>'+
        '<td><span class="dep '+d.k+'">'+esc(d.t)+'</span></td>'+
        '<td class="small mute">'+esc(o.why)+'</td></tr>';
    }).join('');
  }
  var deny = gc.filter(function(o){return o.verdict!=='allow';});
  var byName = deny.filter(function(o){return dep(o).k==='named';}).length;
  var byFc = deny.filter(function(o){return dep(o).k==='meta'||dep(o).k==='fc';}).length;
  if(sum){
    sum.innerHTML = RD.stat('Actions decided', gc.length, '')
      + RD.stat('Allowed', gc.length-deny.length, 'the task’s own work')
      + RD.stat('Denied by a named rule', byName, 'the deny list')
      + RD.stat('Denied by fail-closed', byFc, 'unmatched or metacharacter');
  }
  RD.seg(document.getElementById('hsgate-fam'), function(m){ mode=m; render(); });
  if(note) note.innerHTML = 'Read the "depends on" column: only '+byName+' of the '+deny.length+' denials rest on a rule that names the action (editing the tests, curl, git push). The other '+byFc+' rest on the fail-closed default, which is what protects you against the actions the author never listed. Note too that the legitimate <code>python tests/test_core.py</code> is denied for exactly that reason, because the gate reasons about a string, not about intent: a gate is cheap and always on, but it decides which commands start, not what a started command can reach.';
  render();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-hsgate']=[render];
})();
