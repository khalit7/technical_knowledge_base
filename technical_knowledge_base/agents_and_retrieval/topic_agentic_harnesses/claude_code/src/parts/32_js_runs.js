// ---- Recordings tab (t-runs): pick a run, read it call by call ----
(function(){
  const D=window.HCC,esc=RD.esc;const list=document.getElementById('rn-list');if(!list)return;
  const GN={tools:'Tools',perm:'Permissions',hooks:'Hooks',memory:'Memory',skills:'Skills',subagents:'Subagents',loop:'Loop',headless:'Headless'};
  list.innerHTML=D.runs.map(r=>'<button data-id="'+r.id+'"><span class="g">'+esc(GN[r.group]||r.group)+' &#183; '+esc(r.id)+'</span>'+esc(r.title)+'</button>').join('');
  const $=id=>document.getElementById(id);
  const fmt=n=>n==null?'n/a':Math.round(n).toLocaleString('en-US');
  const show={think:false,hook:true,task:true};
  let cur=null;
  function calls(r){
    const el=$('rn-calls');const W=RD.width(el),H=120,L=40,R=8,B=18;
    const c=r.calls;if(!c.length){el.innerHTML='';return}
    const tot=x=>x[0]+x[1]+x[2],mx=Math.max(...c.map(tot)),bw=Math.max(3,Math.min(34,(W-L-R)/c.length-3));
    let s='';[0,.5,1].forEach(f=>{const y=H-B-(H-B-8)*f;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,fmt(mx*f/1000)+'k',{a:'end',fs:9.5,fill:'var(--mute)'})});
    c.forEach((x,i)=>{const X=L+i*(bw+3)+2;let y=H-B;[[x[2],'var(--c1)'],[x[1],'var(--c5)'],[x[0],'var(--c2)']].forEach(([v,col])=>{const h=(H-B-8)*v/mx;y-=h;s+='<rect x="'+X+'" y="'+y+'" width="'+bw+'" height="'+Math.max(0,h)+'" fill="'+col+'"><title>call '+(i+1)+': '+fmt(v)+' tokens</title></rect>'});
      if(c.length<=24||i%2===0)s+=RD.t(X+bw/2,H-5,String(i+1),{a:'middle',fs:9,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'Input tokens of each model call');
    $('rn-leg').innerHTML='Input of each model call (main thread; subagent calls are not in the stream): <span style="color:var(--c1)">&#9632;</span> cache read <span style="color:var(--c5)">&#9632;</span> cache write <span style="color:var(--c2)">&#9632;</span> fresh input';
  }
  function evs(r){
    const K={tool:'tool',res:'result',text:'text',think:'thinking',hook:'hook',deny:'denied',task:'subagent',result:'result record',user:'user'};
    const out=r.ev.filter(e=>!(e.k in show)||show[e.k]).map(e=>{
      let k=e.k,body='',head='';
      if(k==='tool'){head='<b>'+esc(e.n)+'</b>';body=e.s}
      else if(k==='res'){k=e.e?'err':'res';head=(e.n?esc(e.n)+' ':'')+(e.e?'error':'result')+(e.deny?' (permission layer)':'')+' <span class="small mute">'+fmt(e.len)+' chars</span>';body=e.s}
      else if(k==='text'||k==='user'){body=e.s}
      else if(k==='think'){head='<span class="small mute">thinking (text not in the stream)</span>'}
      else if(k==='hook'){head=esc(e.name||e.ev||'hook')+' exit '+(e.code==null?'?':e.code);body=e.out||''}
      else if(k==='deny'){head=esc(e.n)+' denied, type <code>'+esc(e.why||'')+'</code>'}
      else if(k==='task'){head=esc(e.sub)+(e.tok?' <span class="small mute">'+fmt(e.tok)+' tokens, '+e.tu+' tool uses</span>':'');body=e.s}
      else if(k==='result'){head='<code>'+esc(e.sub)+'</code>, num_turns '+e.turns;body=e.s||''}
      return '<div class="rn-ev'+(e.p?' sub':'')+'"><div class="h"><span class="t">'+(e.t!=null?e.t.toFixed(1)+' s':'')+'</span><span class="rn-k k-'+k+'">'+(K[e.k]||k)+(e.p?' (subagent)':'')+'</span>'+head+'</div>'+(body?'<pre>'+esc(body)+'</pre>':'')+'</div>'}).join('');
    $('rn-evs').innerHTML=out;
  }
  function pick(id){
    const r=D.runs.find(x=>x.id===id);if(!r)return;cur=r;
    list.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.id===id));
    $('rn-title').textContent=r.title;$('rn-note').innerHTML=(r.note?esc(r.note)+' ':'')+'<span class="mute">Flags: <code>'+esc(r.flags||'')+'</code></span>';
    const models=Object.keys(r.mu).join(', ');
    $('rn-kv').innerHTML='<dt>Asked for</dt><dd>'+esc(r.model||'')+', mode <code>'+esc(r.perm||'')+'</code></dd><dt>Answered by</dt><dd>'+esc([...new Set(r.calls.map(c=>c[7]).filter(Boolean))].join(', ')||models)+'</dd><dt>Tools offered</dt><dd>'+esc((r.tools||[]).join(', ')||'none')+'</dd>'+
      '<dt>Model calls</dt><dd>'+r.calls.length+' in the stream; num_turns '+r.turns+'; result records '+r.nres+'; '+r.nthink+' thinking blocks (their text is not in the stream)</dd><dt>Result</dt><dd><code>'+esc(r.stop||'')+'</code>, '+((r.dur||0)/1000).toFixed(1)+' s</dd>'+
      '<dt>Cost (CLI)</dt><dd>$'+(r.cost||0).toFixed(4)+' API-price equivalent; modelUsage: '+Object.entries(r.mu).map(([m,v])=>esc(m)+' in '+fmt(v.in)+', cache write '+fmt(v.cw)+', cache read '+fmt(v.cr)+', out '+fmt(v.out)).join('; ')+'</dd>'+
      (r.denials?'<dt>Permission denials</dt><dd>'+r.denials+'</dd>':'')+'<dt>Tests afterwards</dt><dd>'+(r.pass?'pass':'not all passing (or not the task)')+'</dd>';
    calls(r);evs(r);
    $('rn-meta').innerHTML='<p class="small"><b>Prompt</b></p><pre class="rn-pre">'+esc(D.prompts[r.prompt]||'')+'</pre><p class="small"><b>Test runner afterwards</b></p><pre class="rn-pre">'+esc(r.post||'')+'</pre>'+(r.diff?'<p class="small"><b>Diff against the task repository</b></p><pre class="rn-pre">'+esc(r.diff)+'</pre>':'')+(r.hooklog?'<p class="small"><b>The logging hook\'s file</b></p><pre class="rn-pre">'+esc(r.hooklog.slice(0,1800))+'</pre>':'');
    try{localStorage.setItem('hcc-run',id)}catch(e){}
  }
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(b)pick(b.dataset.id)});
  $('rn-filter').addEventListener('change',e=>{const k=e.target.dataset.k;if(k){show[k]=e.target.checked;if(cur)evs(cur)}});
  let start='hooks_on';try{const v=localStorage.getItem('hcc-run');if(v&&D.runs.some(r=>r.id===v))start=v}catch(e){}
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-runs']=[()=>{if(cur)calls(cur)}];
  pick(start);
  addEventListener('resize',()=>{const t=document.getElementById('t-runs');if(t&&!t.hidden&&cur)calls(cur)});
})();
