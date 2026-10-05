// ---- Syscall tracer (t-trace): helpers, numbers in the prose, phase chart, predict question ----
window.TR=(function(){
  const D=window.TRDATA, TAB='t-trace';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f)};
  const tab=()=>$(TAB);
  const visible=()=>{const t=tab();return t&&!t.hidden&&t.offsetParent!==null};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  const fmt=n=>Number(n).toLocaleString('en-GB');
  const ms=s=>(s*1000).toFixed(s<0.1?1:0)+' ms';
  const sec=s=>s>=10?s.toFixed(0)+' s':s.toFixed(s<1?3:2)+' s';
  const med=a=>{const b=[...a].sort((x,y)=>x-y),n=b.length;return n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2};
  const KINDS=['proc','mem','file','ipc','time','other','sig'];
  const KLABEL={proc:'Processes and signals',mem:'Memory',file:'Files and I/O',ipc:'IPC and synchronisation',time:'Time and randomness',other:'Other',sig:'Signal delivered'};
  const KVAR={proc:'--c1',mem:'--c3',file:'--c2',ipc:'--c4',time:'--c5',other:'--mute',sig:'--bad'};
  function color(k){const v=getComputedStyle(tab()).getPropertyValue(KVAR[k]||'--mute').trim();return v||'#888'}
  function cssv(n){return getComputedStyle(tab()).getPropertyValue(n).trim()}
  function kindOf(name,text){
    if(name==='SIGNAL')return 'sig';if(name==='EXIT')return 'proc';if(name==='IMPORT')return 'file';
    if(/\/dev\/shm/.test(text||'')&&/^(openat|unlinkat|ftruncate|mmap|close|fstat|newfstatat|fallocate|fadvise64|linkat|write)$/.test(name))return 'ipc';
    const d=window.TRD[name];return d?d[0]:'other'}
  function chip(k){return '<span class="tr-chip" style="background:var('+KVAR[k]+')">'+esc(KLABEL[k])+'</span>'}
  function legend(el,kinds,onToggle,state){
    el.innerHTML=kinds.map(k=>onToggle?'<label><input type="checkbox" data-k="'+k+'"'+(state[k]!==false?' checked':'')+'><i style="background:var('+KVAR[k]+')"></i>'+KLABEL[k]+'</label>':'<span><i style="background:var('+KVAR[k]+')"></i>'+KLABEL[k]+'</span>').join('');
    if(onToggle)el.addEventListener('change',e=>{const c=e.target.closest('input');if(!c)return;state[c.dataset.k]=c.checked;onToggle()});
  }
  // segmented buttons
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // step animation: play, pause, step, scrub, speed; animates only on screen in the visible tab; paused under reduced motion
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const p=o.ctl+'-';
    ctl.innerHTML='<button id="'+p+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+p+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+p+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+p+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+p+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
    const g=s=>$(p+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}
      st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1300)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1300)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(v){st.play=v;g('p').innerHTML=v?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',v?'Pause':'Play');
      if(!v&&st.timer){clearTimeout(st.timer);st.timer=0}if(v&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  function onResize(f){let t=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(t);t=setTimeout(f,80)})}
  return {D,RM,esc,$,onRender,visible,width,fmt,ms,sec,med,KINDS,KLABEL,KVAR,color,cssv,kindOf,chip,legend,seg,anim,onResize};
})();

// ---- numbers in the prose, from the data ----
(function(){
  const {D,$,fmt,sec,med}=TR;
  const tot=D.job_untraced.map(l=>+((l.match(/total ([\d.]+)s/)||[])[1])).filter(x=>x>0);
  const vals={date:D.env.date_utc.slice(0,10)+' (Linux '+D.env.kernel.split(' ')[0]+', Python '+D.env.python+', PyTorch '+D.env.torch+')',
    slow:sec(D.runs.fork.t_end)+' (fork run)',fast:sec(med(tot)),fork_total:fmt(D.runs.fork.n_total),
    optim_ms:Math.round(med(D.first_optimizer_ms))+' ms',import_ms:Math.round(med(D.import_torch_ms))+' ms'};
  document.querySelectorAll('#t-trace [data-tr]').forEach(el=>{const v=vals[el.dataset.tr];if(v!=null)el.textContent=v});
})();

// ---- section 1: system calls per phase (log scale), and the predict question ----
(function(){
  const {D,$,esc,fmt,KINDS,color,legend,seg,onRender,onResize,width}=TR;
  let run='fork';
  legend($('tr-ph-leg'),['proc','mem','file','ipc','time']);
  function draw(){
    const el=$('tr-ph-svg'),W=Math.min(width(el),900),r=D.runs[run],P=r.phase_counts;
    const narrow=W<560,lw=narrow?0:190,rowH=narrow?34:22,top=18,H=top+P.length*rowH+20;
    const max=Math.max(...P.map(p=>p.n)),lmax=Math.log10(max+1),x0=lw+4,bw=W-x0-60;
    let s='';
    [1,10,100,1000,10000,100000].filter(v=>v<=max*1.2).forEach(v=>{const x=x0+bw*Math.log10(v+1)/lmax;
      s+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-4)+'" y2="'+(H-18)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(top-7)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+fmt(v)+'</text>'});
    P.forEach((p,i)=>{const y=top+i*rowH+(narrow?13:0),len=bw*Math.log10(p.n+1)/lmax;
      if(narrow)s+='<text x="0" y="'+(y-3)+'" font-size="11" fill="var(--ink)">'+esc(p.label)+'</text>';
      else s+='<text x="'+lw+'" y="'+(y+13)+'" font-size="11.5" text-anchor="end" fill="var(--ink)">'+esc(p.label)+'</text>';
      // split the log-length bar in proportion to each kind's share
      let x=x0;p.kinds.forEach((c,k)=>{if(!c)return;const w=len*c/p.n;s+='<rect x="'+x.toFixed(1)+'" y="'+(y+3)+'" width="'+Math.max(.6,w).toFixed(1)+'" height="14" fill="'+color(KINDS[k])+'"><title>'+esc(p.label)+': '+fmt(c)+' '+KINDS[k]+'</title></rect>';x+=w});
      s+='<text x="'+(x0+len+4)+'" y="'+(y+14)+'" font-size="11" fill="var(--mute)">'+fmt(p.n)+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="System calls per phase, '+run+' run, log scale">'+s+'</svg>';
    const tot=r.n_total,imp=r.storms.reduce((a,b)=>a+b.n,0);
    $('tr-ph-cap').innerHTML=fmt(tot)+' system calls in the '+run+' run, from '+r.lanes.length+' lanes ('+r.lanes.filter(l=>!l.threads).length+' processes, the rest threads). The three biggest phases: '+
      [...P].sort((a,b)=>b.n-a.n).slice(0,3).map(p=>esc(p.label)+' ('+fmt(p.n)+')').join(', ')+'. Hover a bar segment for its count.';
  }
  seg($('tr-ph-run'),m=>{run=m;draw()});
  onRender(draw);onResize(draw);
  // predict, then reveal
  const q=$('tr-q1');
  q.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
    const r=D.runs.fork,imp=r.storms.reduce((a,s)=>a+s.n,0),share=imp/r.n_total;
    q.querySelectorAll('button[data-a]').forEach(x=>x.classList.toggle('on',x===b));
    const a=q.querySelector('.ans');a.hidden=false;
    a.innerHTML=(b.dataset.a==='2'?'<b>Yes.</b> ':'<b>More than that.</b> ')+'The three collapsed storms (interpreter start-up, <code>import numpy, torch</code>, and the optimizer\'s lazy imports) hold '+fmt(imp)+' of '+fmt(r.n_total)+' calls, '+(share*100).toFixed(1)+'%. Loading 8 MiB of data, six training steps and a checkpoint need a few thousand. For a short job, start-up is the system-call bill; for a long one it is noise, but every <i>new process</i> (a spawned worker, a restarted job, a <code>torchrun</code> rank) pays it again.'});
})();
