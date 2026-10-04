// ---- Reading: latency of a staged pipeline under three arrangements, and the list-price cost of managed rails ----
(function(){
  const card=document.getElementById('rd-lc');if(!card)return;
  const S=[['main','Main model, request to answer (ms)',910,100,5000,10],['a','Input guard A (ms)',380,0,1500,1],['b','Input guard B (ms)',70,0,1000,1],['c','Input guard C (ms)',80,0,1000,1],['o','Output guard (ms)',0,0,1500,1],
    ['req','Requests per day',100000,1000,10000000,1000],['ci','Characters per prompt',2000,100,50000,100],['co','Characters per answer',1500,100,50000,100]];
  const sl=document.getElementById('rd-lc-sl');
  sl.innerHTML=S.map(([k,n,v,a,b,s])=>'<label>'+n+': <b id="rd-lc-'+k+'v"></b><input type="range" id="rd-lc-'+k+'" min="'+a+'" max="'+b+'" step="'+s+'" value="'+v+'"></label>').join('')+
    '<div class="rd-btns" style="grid-column:1/-1"><span class="small mute" style="align-self:center">Guard A preset:</span><button data-a="380">8B content-safety guard, +380 ms (NVIDIA)</button><button data-a="92.4">Prompt Guard 2 86M, 92.4 ms</button><button data-a="19.3">Prompt Guard 2 22M, 19.3 ms</button><button data-a="7.65">LLM Guard scanner, ONNX GPU, 7.65 ms</button></div>';
  sl.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;document.getElementById('rd-lc-a').value=b.dataset.a;calc()});
  const seg=document.getElementById('rd-lc-mode');const st={mode:'serial'};
  const MODES=[['serial','Serial'],['par','Guards in parallel'],['spec','Input rails alongside generation']];
  seg.innerHTML=MODES.map(([k,n])=>'<button data-m="'+k+'">'+n+'</button>').join('');
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.mode=b.dataset.m;calc()});
  const v=k=>+document.getElementById('rd-lc-'+k).value;
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  function total(mode,o){const ins=[o.a,o.b,o.c];
    if(mode==='serial')return ins.reduce((x,y)=>x+y,0)+o.main+o.o;
    if(mode==='par')return Math.max(...ins)+o.main+o.o;
    return Math.max(Math.max(...ins),o.main)+o.o;}
  function calc(){
    const o={};S.forEach(([k])=>o[k]=v(k));
    S.forEach(([k])=>{const x=o[k];document.getElementById('rd-lc-'+k+'v').textContent=(x%1?x.toFixed(2):fmt(x))+(['req','ci','co'].includes(k)?'':' ms')});
    seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.mode));
    // timeline drawing: one row per arrangement, current one highlighted
    const el=document.getElementById('rd-lc-svg'),w=RD.width(el),L=0,R=60;
    const tmax=Math.max(...MODES.map(([k])=>total(k,o)))*1.04,sx=(w-L-R)/tmax;
    let b='',y=6;
    MODES.forEach(([k,n])=>{const on=k===st.mode,ins=[['a',o.a,'var(--c1)'],['b',o.b,'var(--c6)'],['c',o.c,'var(--c3)']];
      b+=RD.t(0,y+11,n,{fs:11,w:on?600:400,fill:on?'':'var(--mute)'});y+=16;
      const h=18,op=on?1:0.45;let x=L;
      if(k==='serial'){ins.forEach(([,ms,c])=>{b+='<rect x="'+x+'" y="'+y+'" width="'+ms*sx+'" height="'+h+'" fill="'+c+'" opacity="'+op+'"/>';x+=ms*sx});
        b+='<rect x="'+x+'" y="'+y+'" width="'+o.main*sx+'" height="'+h+'" fill="var(--dim)" opacity="'+op+'"/>';x+=o.main*sx}
      else if(k==='par'){const m=Math.max(o.a,o.b,o.c);ins.forEach(([,ms,c],j)=>{b+='<rect x="'+x+'" y="'+(y+j*6)+'" width="'+ms*sx+'" height="6" fill="'+c+'" opacity="'+op+'"/>'});x+=m*sx;
        b+='<rect x="'+x+'" y="'+y+'" width="'+o.main*sx+'" height="'+h+'" fill="var(--dim)" opacity="'+op+'"/>';x+=o.main*sx}
      else{const m=Math.max(o.a,o.b,o.c);ins.forEach(([,ms,c],j)=>{b+='<rect x="'+x+'" y="'+(y+j*6)+'" width="'+ms*sx+'" height="6" fill="'+c+'" opacity="'+op+'"/>'});
        b+='<rect x="'+x+'" y="'+(y+h+2)+'" width="'+o.main*sx+'" height="6" fill="var(--ink)" opacity="'+(op*0.5)+'"/>';x+=Math.max(m,o.main)*sx}
      if(o.o>0){b+='<rect x="'+x+'" y="'+y+'" width="'+o.o*sx+'" height="'+h+'" fill="var(--c4)" opacity="'+op+'"/>';x+=o.o*sx}
      b+=RD.t(x+4,y+13,(total(k,o)/1000).toFixed(2)+' s',{fs:11,w:on?600:400});
      y+=h+(k==='spec'?16:10)});
    el.innerHTML=RD.svg(w,y,b,'Request timeline under three arrangements')+'<div class="leg"><span><i style="background:var(--c1)"></i>guard A</span><span><i style="background:var(--c6)"></i>guard B</span><span><i style="background:var(--c3)"></i>guard C</span><span><i style="background:var(--dim)"></i>main model, waiting on the guards</span><span><i style="background:var(--ink);opacity:.5"></i>main model, running alongside</span><span><i style="background:var(--c4)"></i>output guard</span></div>';
    const T=total(st.mode,o),base=o.main;
    // cost: Bedrock list prices per 1,000 text units (1 unit = up to 1,000 characters), per text checked
    const ui=Math.ceil(o.ci/1000),uo=Math.ceil(o.co/1000);
    const bed=o.req*(ui*(0.15+0.15+0.10)+uo*(0.15+0.10))/1000;
    const tokMonth=o.req*30*(o.ci+o.co)/4,arm=Math.max(0,tokMonth-2e6)*0.10/1e6/30;
    document.getElementById('rd-lc-out').innerHTML=RD.stat('Request latency',(T/1000).toFixed(2)+' s','+'+fmt(T-base)+' ms over the main model ('+(100*(T-base)/base).toFixed(0)+'%)')+
      RD.stat('Bedrock Guardrails, per day','$'+bed.toLocaleString('en-US',{maximumFractionDigits:0}),'content filter and PII on both sides, denied topics on the prompt')+
      RD.stat('Model Armor, per day','$'+arm.toLocaleString('en-US',{maximumFractionDigits:2}),'every prompt and answer, 2M free tokens a month');
    document.getElementById('rd-lc-f').innerHTML='Serial: A + B + C + main + output. Parallel guards: max(A, B, C) + main + output. Alongside generation: max(max(A, B, C), main) + output; when a guard fires, the generation already paid for is wasted, and with side-effecting tools the action may already have happened (the OpenAI Agents SDK warns of exactly this). Bedrock: requests &times; (prompt units &times; ($0.15 + $0.15 + $0.10) + answer units &times; ($0.15 + $0.10)) / 1,000, units = characters / 1,000 rounded up per text. Model Armor: (requests &times; 30 &times; characters / 4 &minus; 2,000,000) &times; $0.10 / 1,000,000 per month, divided by 30. List prices read 4 Oct 2026; self-hosted guards cost GPU time instead.';
    card.dataset.total=T.toFixed(2);card.dataset.bed=bed.toFixed(4);card.dataset.arm=arm.toFixed(4);
  }
  S.forEach(([k])=>document.getElementById('rd-lc-'+k).addEventListener('input',calc));
  calc();RD.onResize(calc);RD.onRender(calc);
})();
