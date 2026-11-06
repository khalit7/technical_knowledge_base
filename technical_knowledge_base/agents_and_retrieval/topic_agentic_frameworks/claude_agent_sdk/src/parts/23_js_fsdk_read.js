// ---- Reading tab: one-screen numbers, rewind, structured output (the hero is the 3D stage in 40_js_sc_hero.js) ----
(function(){
  const F=window.FSDK,R=F.runs,esc=RD.esc;
  const fmt=n=>n==null?'n/a':Number(n).toLocaleString('en-US');
  const usd=(x,d)=>'$'+Number(x).toFixed(d==null?4:d);
  const s1=R.s1_wire,s3=R.s3_bare;
  const ctrlOut=F.wire.s1_wire.filter(w=>w[1]==='out'&&w[2]==='control_request');
  const cnt=sub=>ctrlOut.filter(w=>w[3]===sub).length;
  window.FSDK_X={fmt,usd,ctrlOut,cnt};

  // one-screen stats
  const one=document.getElementById('fsdk-onestats');
  one.innerHTML=RD.stat('Questions to your process','<span id="fsdk-n-ctrl">'+ctrlOut.length+'</span>','run s1: '+cnt('hook_callback')+' hooks, '+cnt('can_use_tool')+' permission, '+cnt('mcp_message')+' MCP')+
    RD.stat('First call, own prompt and tools',fmt(s1.n.first_call_in)+' tokens','run s1; defaults (s3): '+fmt(s3.n.first_call_in))+
    RD.stat('Defaults, nobody answering',s3.results[0].denials+' refused','s3: "'+s3.results[0].subtype+'", tests '+s3.n.tests_after+', '+usd(s3.results[0].cost))+
    RD.stat('Options','49 / 69','Python 0.2.163 / TypeScript 0.3.291');

  // rewind (s9)
  const rw=R.s9_rewind.other.filter(o=>o.kind==='tests');
  document.getElementById('fsdk-rewind').innerHTML='<div class="k">Run s9: tests at three moments</div><div class="v">'+rw.map(o=>esc(o.result)).join(' &#8594; ')+'</div><div class="d">'+rw.map(o=>o.phase.replace(/_/g,' ')).join(' &#8594; ')+'</div>';

  // structured output (s6)
  document.getElementById('fsdk-struct').textContent='structured_output = '+JSON.stringify(R.s6_structured.results[0].structured_output,null,1);
})();
