// ---- Loop lab (t-loop): shared helpers, the step-animation controller, the scoreboard and the transcript viewer.
window.LP=(function(){
  const D=window.LOOPDATA||{runs:[],cc:[],code:[]};
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=n=>n==null||isNaN(n)?'n/a':Math.round(n).toLocaleString('en-US');
  const $=id=>document.getElementById(id);
  const run=id=>D.runs.find(r=>r.id===id);
  const tab=()=>$('t-loop');
  const visible=()=>{const t=tab();return t&&!t.hidden&&t.offsetParent!==null};
  const renders=[];
  const onRender=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-loop']=window.TAB_RENDER['t-loop']||[]).push(f)};
  let rt=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){}}),80)});
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  // per-call context = fresh input + cache write + cache read (what the model read on that call)
  const ctx=u=>u[0]+u[1]+u[2];
  // fit ctx = fixed + rate * prompt characters over a run's calls (least squares); used to split a measured total into blocks
  function fit(r){
    const pts=r.turns.filter(t=>t.w==='main'||!t.w).map(t=>[t.pc,t.pctx]);
    if(pts.length<2)return {fixed:400,rate:0.3};
    const n=pts.length,mx=pts.reduce((a,p)=>a+p[0],0)/n,my=pts.reduce((a,p)=>a+p[1],0)/n;
    let sxy=0,sxx=0;pts.forEach(p=>{sxy+=(p[0]-mx)*(p[1]-my);sxx+=(p[0]-mx)*(p[0]-mx)});
    const rate=sxx>0?sxy/sxx:0.3;return {fixed:Math.max(0,my-rate*mx),rate:rate};
  }
  // API-price equivalent (list prices per million tokens, from the shared facts file; 1-hour cache writes at 2x input)
  const PRICE={'claude-haiku-4-5-20251001':{i:1,w:2,r:0.1,o:5},'claude-sonnet-5-5':{i:2,w:4,r:0.2,o:10}};
  function cost(model,u){const p=PRICE[model]||null;if(!p)return null;
    return (u[0]*p.i+u[1]*p.w+u[2]*p.r+u[3]*p.o)/1e6}
  // the animation controller (play, pause, step, scrub, speed); animates only on screen in the visible tab; paused under reduced motion
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const p=o.ctl+'-';
    ctl.innerHTML='<button id="'+p+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+p+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+p+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+p+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'">'+
      '<label>Speed <select id="'+p+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option><option value="4">4x</option></select></label>';
    const g=s=>$(p+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&visible();
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();
      if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1100)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1100)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(v){st.play=v;g('p').innerHTML=v?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',v?'Pause':'Play');
      if(!v&&st.timer){clearTimeout(st.timer);st.timer=0}if(v&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&visible()){st.started=true;if(!RM)setPlay(true)}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();setTimeout(kick,50)});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},redraw(){o.draw(st.i)},get i(){return st.i}};
  }
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;el.querySelectorAll('button[data-m]').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  // packed prompt blocks ('x627|r150|R*795') to [[label, characters], ...]
  const NAMES={x:'task',r:'reply',e:'error',R:'result:read_file',T:'result:run_tests',E:'result:edit_file',C:'result:run_command',D:'result:delegate',U:'result:unknown tool'};
  const blocks=t=>(t.b||'').split('|').filter(Boolean).map(p=>{const m=p.match(/^(\w)(\*?)(\d+)$/);return [NAMES[m[1]]+(m[2]?' (masked)':''),+m[3]]});
  const actStr=a=>a?(a.tool+' '+JSON.stringify(a.args||{})):'(no ACTION line)';
  return {D,RM,esc,fmt,$,run,onRender,width,ctx,fit,cost,anim,seg,actStr,visible,blocks};
})();

// ---- Scoreboard: every recorded run, one row each
(function(){
  const {D,esc,fmt,$,ctx}=LP;const el=$('loop-board');if(!el)return;
  const pass=r=>r.passed?'<span class="loop-ok">pass</span>':'<span class="loop-bad">fail</span>';
  const rows=D.runs.map(r=>{const t=r.tot;
    return '<tr data-run="'+r.id+'"><td>'+esc(r.step)+'</td><td><b>'+esc(r.name)+'</b><div class="loop-mute">'+esc(r.model==='haiku'?'Haiku 4.5':r.model==='sonnet'?'Sonnet':r.model)+(r.lite?' &middot; metrics only':'')+'</div></td>'+
      '<td class="num">'+t.calls+'</td><td class="num">'+fmt(t.ctx)+'</td><td class="num">'+fmt(t.maxctx)+'</td><td class="num">'+fmt(t.out)+'</td><td class="num">'+fmt(t.secs)+' s</td><td>'+esc(r.stop)+'</td><td>'+pass(r)+'</td></tr>'}).join('');
  el.innerHTML='<div class="tw"><table class="loop-t"><thead><tr><th>Step</th><th>Run</th><th class="num">Model calls</th><th class="num">Tokens read, all calls</th><th class="num">Largest call</th><th class="num">Output tokens</th><th class="num">Model time</th><th>Stopped on</th><th>Tests</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  el.addEventListener('click',e=>{const tr=e.target.closest('tr[data-run]');if(!tr)return;const r=LP.run(tr.dataset.run);if(r&&!r.lite&&LP.showRun){LP.showRun(r.id);$('loop-viewer').scrollIntoView({block:'start'})}});
})();

// ---- Transcript viewer
(function(){
  const {D,esc,fmt,$,ctx,actStr}=LP;const sel=$('loop-vsel'),out=$('loop-vout');if(!sel)return;
  sel.innerHTML=D.runs.filter(r=>!r.lite).map(r=>'<option value="'+r.id+'">Step '+esc(r.step)+': '+esc(r.name)+'</option>').join('');
  function draw(id){
    const r=LP.run(id);if(!r)return;sel.value=id;
    const t=r.tot;let h='<p class="loop-desc">'+esc(r.desc)+'</p><div class="loop-chips">'+
      '<span>'+t.calls+' model calls</span><span>'+fmt(t.ctx)+' tokens read</span><span>'+fmt(t.out)+' output ('+fmt(t.think)+' thinking)</span><span>cache write '+fmt(t.cw)+', read '+fmt(t.cr)+'</span><span>'+fmt(t.secs)+' s model time</span><span>'+(r.passed?'tests pass':'tests fail')+'</span></div>';
    const sys=r.sys||{};Object.keys(sys).forEach(w=>{h+='<details class="loop-det"><summary>System prompt'+(Object.keys(sys).length>1?' ('+esc(w)+')':'')+'</summary><pre class="loop-pre">'+esc(sys[w])+'</pre></details>'});
    r.turns.forEach(tu=>{
      const helper=tu.w==='helper';
      h+='<div class="loop-turn'+(helper?' loop-helper':'')+'"><div class="loop-th"><b>'+(helper?'Helper ':'')+'Turn '+tu.n+'</b> <span class="loop-mute">read '+fmt(ctx(tu.u))+' tokens'+(tu.u[1]?' (cache write '+fmt(tu.u[1])+')':'')+', wrote '+fmt(tu.u[3])+(tu.u[4]?' ('+fmt(tu.u[4])+' thinking)':'')+', '+tu.s+' s'+(tu.mk?', masked '+tu.mk+' old results':'')+'</span></div>'+
        '<div class="loop-lbl">Model reply</div><pre class="loop-pre loop-wrap">'+esc(tu.txt)+'</pre>';
      if(tu.discN>0){h+='<div class="loop-lbl loop-warnl">'+(r.step==='1'?'After the ACTION line the model kept writing; this harness kept it in the transcript':'After the ACTION line; the harness threw this away')+' ('+fmt(tu.discN)+' characters)</div><pre class="loop-pre loop-wrap loop-disc">'+esc(tu.disc)+(tu.discN>tu.disc.length?'\n[... '+fmt(tu.discN-tu.disc.length)+' more characters]':'')+'</pre>'}
      h+='<div class="loop-row"><span class="loop-k">Parsed</span><code>'+esc(actStr(tu.act))+'</code></div>';
      if(tu.dec)h+='<div class="loop-row"><span class="loop-k">Gate</span><span class="'+(tu.dec==='deny'?'loop-bad':'loop-ok')+'">'+esc(tu.dec)+'</span> <span class="loop-mute">'+esc(tu.why)+'</span></div>';
      if(tu.obs!=null){const cut=tu.raw>tu.obsN?' (tool returned '+fmt(tu.raw)+' characters; the harness passed on '+fmt(tu.obsN)+')':' ('+fmt(tu.obsN)+' characters)';
        h+='<details class="loop-det"'+(tu.obsN<700?' open':'')+'><summary>Observation appended'+cut+'</summary><pre class="loop-pre">'+esc(tu.obs)+(tu.obsN>tu.obs.length?'\n[... viewer shows the first '+fmt(tu.obs.length)+' characters; the full text is in the recording]':'')+'</pre></details>'}
      h+='</div>'});
    h+='<div class="loop-row"><span class="loop-k">Grader</span>the harness runs the tests after the loop ends (the model never sees this): <code>'+esc((r.tests||'').trim().split('\n').pop())+'</code></div>';
    out.innerHTML=h;
  }
  sel.addEventListener('change',()=>draw(sel.value));
  LP.showRun=draw;
  draw('s2_haiku_r1');
})();
