/* 38_js_def.js: Defence-in-depth simulator tab (t-hsdef). Pure design logic: no model, no attack. */
(function(){
  var esc = RD.esc;
  var tog = document.getElementById('hsdef-tog');
  if(!tog) return;

  // Each control, what it enforces, which trifecta leg it removes, and where the page demonstrates it.
  var CONTROLS = [
    {k:'gate', on:true, name:'Permission gate (fail-closed)', leg:null,
     d:'Decides which tool calls start; unmatched = deny. Cheap and always on, but it does not contain what a started command reaches.',
     legtxt:'Hardens every layer; removes no leg on its own',
     ev:'the gate deciding, no model', ref:'#t-hsgate'},
    {k:'sandbox', on:false, name:'OS sandbox (Seatbelt / bubblewrap)', leg:'e',
     d:'Confines writes to the project and blocks sockets at the kernel. Removes the network way out, if it is on and covers the tool. In Claude Code it is off by default and wraps the shell only.',
     legtxt:'Removes the way out (network), at the kernel',
     ev:'benign sandbox demo, measured here', ref:'#rd-s3'},
    {k:'egress', on:false, name:'Egress allow-list by destination', leg:'e',
     d:'A proxy or firewall below the agent allows outbound only to named destinations, including DNS. Cannot be talked out of it, whatever command made the request.',
     legtxt:'Removes the way out, by destination',
     ev:'allow-list policy simulation', ref:'#rd-s4'},
    {k:'cred', on:false, name:'Credential isolation', leg:'p',
     d:'Keep secrets out of the agent’s reach: a broker holds them, or a proxy splices them in only on allow-listed requests. The model cannot leak what it never sees.',
     legtxt:'Removes the private data',
     ev:'section 5', ref:'#rd-s5'}
  ];
  var state = {}; CONTROLS.forEach(function(c){ state[c.k]=c.on; });

  var legsEl = document.getElementById('hsdef-legs');
  var verdictEl = document.getElementById('hsdef-verdict');
  var effectsEl = document.getElementById('hsdef-effects');

  function legRemoved(leg){
    // 'untrusted content' (u) is always present in this scenario.
    if(leg==='u') return {removed:false, by:null};
    var by = CONTROLS.filter(function(c){ return c.leg===leg && state[c.k]; });
    return {removed:by.length>0, by:by};
  }

  function render(){
    tog.innerHTML = CONTROLS.map(function(c){
      return '<label class="tog '+(state[c.k]?'on':'')+'" data-k="'+c.k+'">'+
        '<span class="h"><input type="checkbox" data-k="'+c.k+'"'+(state[c.k]?' checked':'')+'> '+esc(c.name)+'</span>'+
        '<span class="d">'+esc(c.d)+'</span>'+
        '<span class="leg">'+esc(c.legtxt)+'</span></label>';
    }).join('');
    tog.querySelectorAll('input[type=checkbox]').forEach(function(cb){
      cb.addEventListener('change', function(){ state[cb.dataset.k]=cb.checked; render(); });
    });

    var legs = [
      {k:'p', n:'Private data', rm:'removed from reach', pr:'in reach'},
      {k:'u', n:'Untrusted content', rm:'none read', pr:'always read'},
      {k:'e', n:'A way out', rm:'closed', pr:'open'}
    ];
    legsEl.innerHTML = legs.map(function(L){
      var r = legRemoved(L.k);
      var cls = r.removed ? 'removed' : 'present';
      var by = r.removed ? ('by ' + r.by.map(function(c){return c.name.split(' (')[0];}).join(' + ')) :
               (L.k==='u' ? 'inherent to a useful agent' : 'no control enabled');
      return '<div class="leg-c '+cls+'"><div class="n">'+esc(L.n)+'</div><div class="s">'+(r.removed?L.rm:L.pr)+'</div><div class="by">'+esc(by)+'</div></div>';
    }).join('');

    var pGone = legRemoved('p').removed, eGone = legRemoved('e').removed;
    var broken = pGone || eGone;
    verdictEl.className = 'verdict' + (broken?'':' bad');
    if(broken){
      var leg = eGone ? 'the way out is closed' : 'there is no private data to send';
      verdictEl.innerHTML = '<b>Chain broken: exfiltration cannot complete.</b> The agent can still be injected and can still read untrusted content, but '+leg+', enforced outside the model. This is the design you ship.';
    } else {
      verdictEl.innerHTML = '<b>All three legs present: exfiltration is possible.</b> Private data is in reach, untrusted content is read, and a way out is open. The permission gate and good model behaviour help, but neither is a boundary. Enable a control that removes the private data or the way out.';
    }

    var enabled = CONTROLS.filter(function(c){return state[c.k];});
    effectsEl.innerHTML = enabled.map(function(c){
      var isTab = c.ref.charAt(1)==='t';
      var link = '<a href="#" data-'+(isTab?'tab="'+c.ref.slice(1)+'"':'sec="'+c.ref.slice(1)+'"')+'>'+esc(c.ev)+'</a>';
      return '<li><b>'+esc(c.name.split(' (')[0])+':</b> '+esc(c.d)+' <span class="ev">[shown: '+link+']</span></li>';
    }).join('') || '<li class="mute">No control enabled.</li>';
    // wire the links
    effectsEl.querySelectorAll('a[data-tab]').forEach(function(a){
      a.addEventListener('click', function(e){ e.preventDefault();
        var b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]'); if(b){ b.click(); document.getElementById('tabs').scrollIntoView({block:'start'}); } });
    });
    effectsEl.querySelectorAll('a[data-sec]').forEach(function(a){
      a.addEventListener('click', function(e){ e.preventDefault();
        var rb=document.querySelector('#tabs button[data-t="t-read"]'); if(rb) rb.click();
        var s=document.getElementById(a.dataset.sec); if(s) s.scrollIntoView({block:'start'}); });
    });
  }
  render();
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-hsdef']=[render];
})();
