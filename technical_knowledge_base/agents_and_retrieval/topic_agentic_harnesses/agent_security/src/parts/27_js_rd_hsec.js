/* 27_js_rd_hsec.js: Reading-tab visuals for Agent security. Uses window.HSEC (26_js_hsec_data.js).
   Defensive only: a gate deciding, a benign sandbox demo, a destination egress allow-list, a trifecta
   checker. No model, no attack, no injection payload anywhere. */
(function(){
  var H = window.HSEC || {};
  var esc = RD.esc;
  function vclass(v){ return v==='allow'?'allow':(v==='ask'?'ask':'deny'); }
  function vlabel(v){ return v==='allow'?'ALLOW':(v==='ask'?'ASK':'DENY'); }
  function tgt(o){ return (o.args && (o.args.cmd || o.args.path)) || o.target || ''; }

  // ---- Section 2: the gate deciding, one call at a time (reused root gate cases, no model) ----
  (function(){
    var gc = H.gate_cases || [];
    var list = document.getElementById('hsec-g-list'), cap = document.getElementById('hsec-g-cap');
    if(!list || !gc.length) return;
    // a teaching subset in a deliberate order: allowed work, then clearly-dangerous, then the brittle gap
    var want = [
      {find:function(o){return o.tool==='read_file';}, note:'Reading the library code is ALLOWED by an explicit allow rule. A gate has an action policy, not a data policy: it does not know what is in the file.'},
      {find:function(o){return o.tool==='edit_file' && /textstats/.test(tgt(o));}, note:'Editing inside the project directory is ALLOWED. The scope of the allow rule is the first security decision.'},
      {find:function(o){return o.tool==='edit_file' && /tests/.test(tgt(o));}, note:'Editing the tests is DENIED by a named deny rule (the task forbids it). Deny rules are checked first, so they win over any allow.'},
      {find:function(o){return tgt(o)==='python3 tests/test_core.py';}, note:'Running the tests the intended way is ALLOWED by an exact allow rule.'},
      {find:function(o){return tgt(o)==='python tests/test_core.py';}, note:'The same command spelled python, not python3, matches NO rule, so it falls through to the fail-closed default and is DENIED. The gate is brittle against the task, not only against danger.'},
      {find:function(o){return /rm -rf/.test(tgt(o));}, note:'An allowed prefix followed by a chained destructive command is DENIED by a named deny rule. A string gate must treat chaining syntax as dangerous.'}
    ];
    var cases = [];
    want.forEach(function(w){ var o = gc.find(w.find); if(o){ cases.push({o:o, note:w.note}); } });
    function draw(i){
      list.innerHTML = cases.map(function(c,idx){
        var o=c.o, cls = idx<i?'past':(idx===i?'on':'');
        return '<div class="hsec-act '+cls+'"><code>'+esc(tgt(o))+'</code>'+
          '<span class="v '+vclass(o.verdict)+'">'+vlabel(o.verdict)+'</span>'+
          '<span class="why">'+esc(o.why)+'</span></div>';
      }).join('');
      var c = cases[i];
      cap.innerHTML = c? '<div class="t">'+vlabel(c.o.verdict)+': '+esc(tgt(c.o)).slice(0,70)+'</div><p>'+c.note+'</p>' : '';
    }
    RD.anim({card:'hsec-g-list', ctl:'hsec-g-ctl', n:cases.length, draw:draw, ms:2200, label:'Gate case'});
  })();

  // ---- Section 3: sandbox before/after toggle (benign demo) ----
  (function(){
    var sb = H.sandbox || {}, cases = sb.cases || [];
    var grid = document.getElementById('hsec-sb-grid'), note = document.getElementById('hsec-sb-note'), seg = document.getElementById('hsec-sb-seg');
    if(!grid || !cases.length) return;
    function render(mode){
      var want = mode==='net' ? function(c){return /connect/.test(c.op);} : function(c){return /write/.test(c.op);};
      var cs = cases.filter(want);
      grid.innerHTML = cs.map(function(c){
        var ok = /_OK/.test(c.result);
        return '<div class="c '+(ok?'ok':'block')+'"><div class="op">'+esc(c.profile)+'</div><div class="r">'+esc(c.result)+'</div></div>';
      }).join('');
      note.textContent = mode==='net'
        ? 'A benign command opens a local socket and sends the fixed marker. Unsandboxed it connects; under (deny network*) the kernel refuses the socket, whatever the command intended.'
        : 'A benign file write. Unsandboxed it writes anywhere; under a profile that allows writes only inside the work directory, a write to /tmp is refused and a write inside succeeds.';
    }
    RD.seg(seg, render); render('net');
  })();

  // ---- Section 4: the egress allow-list deciding each outbound request (policy simulation) ----
  (function(){
    var eg = H.egress || [];
    var list = document.getElementById('hsec-eg-list'), cap = document.getElementById('hsec-eg-cap'), cnt = document.getElementById('hsec-eg-cnt');
    if(!list || !eg.length) return;
    function label(r){ return (r.kind==='dns'?'DNS ':'HTTPS ') + r.dest; }
    function draw(i){
      var allowed=0, denied=0;
      list.innerHTML = eg.map(function(r,idx){
        var cls = idx<i?'past':(idx===i?'on':'');
        if(idx<=i){ if(r.verdict==='allow') allowed++; else denied++; }
        return '<div class="hsec-act '+cls+'"><code>'+esc(label(r))+'</code>'+
          '<span class="v '+vclass(r.verdict)+'">'+vlabel(r.verdict)+'</span>'+
          '<span class="why">'+esc(r.why)+'</span></div>';
      }).join('');
      cnt.innerHTML = RD.stat('Allowed so far', allowed, 'on the destination list')
        + RD.stat('Denied so far', denied, 'default-deny by destination')
        + RD.stat('Covers DNS?', 'yes', 'name lookups decided the same way');
      var r = eg[i];
      cap.innerHTML = r ? '<div class="t">'+vlabel(r.verdict)+': '+esc(label(r)).slice(0,66)+'</div><p>'
        + esc(r.why_for.charAt(0).toUpperCase()+r.why_for.slice(1)) + '. ' + esc(r.why) + '.</p>' : '';
    }
    RD.anim({card:'hsec-eg-list', ctl:'hsec-eg-ctl', n:eg.length, draw:draw, ms:2000, label:'Request'});
  })();

  // ---- Section 7: lethal trifecta checker ----
  (function(){
    var wrap = document.getElementById('hsec-tri'), out = document.getElementById('hsec-tri-out');
    if(!wrap || !out) return;
    var labels = {p:'private data', u:'untrusted content', e:'a way out'};
    function update(){
      var st = {};
      wrap.querySelectorAll('input[type=checkbox]').forEach(function(cb){ st[cb.dataset.k]=cb.checked; });
      wrap.querySelectorAll('label').forEach(function(l){ var cb=l.querySelector('input'); l.classList.toggle('on', cb.checked); });
      var all = st.p && st.u && st.e;
      if(all){
        out.className='hsec-tri-out bad';
        out.innerHTML='<b>All three legs present: exfiltration is possible.</b> An injected instruction could read your data and send it out, and no model-level filter reliably prevents it. Remove one leg.';
      } else {
        var missing = Object.keys(labels).filter(function(k){return !st[k];}).map(function(k){return labels[k];});
        out.className='hsec-tri-out';
        out.innerHTML='<b>Safe from exfiltration: the chain is broken.</b> Missing '+missing.map(esc).join(' and ')+'. '+
          (!st.e?'No way out is the leg you can usually enforce outside the model.':(!st.p?'With no private data in reach there is nothing worth sending.':'With no untrusted content there is no injection, though few useful agents can promise this.'));
      }
    }
    wrap.querySelectorAll('input[type=checkbox]').forEach(function(cb){ cb.addEventListener('change', update); });
    update();
  })();
})();
