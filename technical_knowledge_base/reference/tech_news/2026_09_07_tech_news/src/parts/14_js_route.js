// ---- Portal by Spotify routing: one illustrative session through Claude alone and through the bulk-reader / code-writer modes ----
(function(){
  const card=$('v-route');if(!card)return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const SCALE=70000,BASE=12000,TPL=10; // illustrative: 10 tokens per line
  // per turn: ask, then each lane's route text and token deltas: f = file text into Claude, m = worker summary into Claude, o = Claude output, w = worker tokens
  const T=[
    {ask:'"What does this service do?" needs five files: 1,200, 950, 820, 700 and 430 lines (4,100 in all).',
     a:{route:['Read × 5','allowed','into Claude\'s context'],f:4100*TPL,o:300},
     b:{route:['Read × 5','blocked: each file over 350 lines','→ /bulk-reader on the worker → a 4,100-token summary'],m:4100,o:300,w:4100*TPL},
     cap:'The expensive part of most agent work is reading. Without routing all 41,000 tokens of source land in Claude\'s context. With it the hook blocks the reads and the worker returns structured bullets: 4,100 tokens, 90% fewer, the post\'s figure (set by construction here).'},
    {ask:'Follow-up: "Which methods call the database?" about the same five files.',
     a:{route:['no new read','the files are already in context','answer'],o:300},
     b:{route:['bulk-read again','same paths re-sent to the worker','→ a 1,200-token answer'],m:1200,o:300,w:4100*TPL},
     cap:'Here routing adds a little to Claude\'s context and the plain lane adds nothing. But the plain lane is now carrying 41,000 tokens of source that it re-reads on every call; re-sending the files to the worker costs worker tokens, not Claude tokens ("free where it matters", the post says).'},
    {ask:'"Write tests for UserService like OrderTest.java" (a 600-line reference; the new file is about 450 lines).',
     a:{route:['Read OrderTest.java','allowed','then Claude writes 4,500 tokens of test code'],f:600*TPL,o:4500},
     b:{route:['code-write','reference and spec to the worker','→ file written to disk; Claude sees a 150-token confirmation'],m:150,w:600*TPL+4500},
     cap:'Boilerplate is the second mode. Without routing Claude reads the reference and generates the whole file as expensive output tokens. With code-writer the worker matches the reference\'s patterns and writes to disk; Claude never sees the code. This is the part the issue had backwards: the code writing also goes to the cheap model.'},
    {ask:'"Fix the null check at line 212": a targeted Read of 60 lines, then an edit.',
     a:{route:['Read, offset and limit','allowed','600 tokens, then a 200-token edit'],f:600,o:200},
     b:{route:['Read, offset and limit','allowed: targeted reads pass the hook','600 tokens, then a 200-token edit'],f:600,o:200},
     cap:'Editing cannot be delegated: the worker\'s summaries have no reliable line numbers, so Claude reads the exact section itself. The hook lets targeted reads through, and both lanes do the same thing.'},
    {ask:'"Find the thread-safety bug in Cache.java" (300 lines).',
     a:{route:['Read Cache.java','allowed: under 350 lines','then 1,500 tokens of reasoning'],f:3000,o:1500},
     b:{route:['Read Cache.java','allowed: under 350 lines','then 1,500 tokens of reasoning'],f:3000,o:1500},
     cap:'Reasoning stays with Claude too. In the post\'s tests the worker found surface patterns but missed a subtle thread-safety bug that Claude spotted in seconds, so debugging, architecture and safety-critical code are excluded from routing.'}];
  const NF=1+T.length*3; // start, then ask, route, land per turn
  // cumulative state after each completed turn
  function stateAt(k,lane){let s={base:BASE,f:0,m:0,o:0,w:0,proc:0};for(let i=0;i<k;i++){const d=T[i][lane];s.f+=d.f||0;s.m+=d.m||0;s.o+=d.o||0;s.w+=d.w||0;s.proc+=s.base+s.f+s.m+s.o}return s}
  const lanes=[{id:'a',h:'Without routing',sm:'Claude reads and writes everything'},{id:'b',h:'With the bulk-reader and code-writer modes',sm:'the hook routes large reads and boilerplate to a cheap worker'}];
  $('rtLanes').innerHTML=lanes.map(l=>'<div class="rt-lane" id="rtL_'+l.id+'"><h4>'+l.h+'</h4><div class="sm">'+l.sm+'</div><div class="rt-route" id="rtR_'+l.id+'"></div>'+
    '<div class="rt-lbl">Claude\'s context</div><div class="rt-bar" id="rtB_'+l.id+'"></div><div class="rt-lbl" id="rtWl_'+l.id+'">Worker model</div><div class="rt-bar rt-w" id="rtW_'+l.id+'"></div><div class="an-cnt" id="rtC_'+l.id+'"></div></div>').join('');
  const st={c:0,play:!RM,spd:1,vis:false,raf:0,last:0};
  const pct=v=>(100*v/SCALE).toFixed(2)+'%';
  function draw(){
    const f=Math.min(NF-1,Math.floor(st.c+1e-9)),turn=f===0?-1:Math.floor((f-1)/3),ph=f===0?-1:(f-1)%3,frac=Math.min(1,st.c-f);
    lanes.forEach(l=>{
      const done=turn<0?0:(ph===2?turn+1:turn);let s=stateAt(done,l.id);
      // during the landing phase the new tokens grow in smoothly
      if(ph===2&&frac<1&&st.play){const p=stateAt(turn,l.id),g=x=>p[x]+(s[x]-p[x])*frac;s={base:BASE,f:g('f'),m:g('m'),o:g('o'),w:g('w'),proc:s.proc}}
      const ctx=s.base+s.f+s.m+s.o;
      $('rtB_'+l.id).innerHTML='<span style="width:'+pct(s.base)+';background:var(--dim)"></span><span style="width:'+pct(s.f)+';background:var(--c2)"></span><span style="width:'+pct(s.m)+';background:var(--c3)"></span><span style="width:'+pct(s.o)+';background:var(--c1)"></span>';
      $('rtW_'+l.id).innerHTML=s.w?'<span style="width:'+pct(Math.min(s.w,SCALE))+';background:var(--c5)"></span>':'<em>none</em>';
      $('rtWl_'+l.id).textContent='Worker model'+(s.w>SCALE?': '+fmt(Math.round(s.w))+' tokens, beyond the 70,000 scale':'');
      $('rtC_'+l.id).innerHTML=stat('Context now',fmt(Math.round(ctx)),'tokens')+stat('Input processed',fmt(s.proc),'summed over turns')+stat('Claude output',fmt(Math.round(s.o)),'tokens')+stat('Worker tokens',fmt(Math.round(s.w)),l.id==='a'?'no worker':'cheap model');
      const r=$('rtR_'+l.id);
      if(turn<0)r.innerHTML='<span class="mute">Starting context: '+fmt(BASE)+' tokens.</span>';
      else{const d=T[turn][l.id].route,blocked=/blocked/.test(d[1]);r.innerHTML='<b>Turn '+(turn+1)+'</b> · '+d[0]+(ph>=1?' <span class="rt-hook'+(blocked?' bl':'')+'">'+d[1]+'</span>':'')+(ph>=2?' <span>'+d[2]+'</span>':'')}});
    let t,c;
    if(f===0){t='Start: the same project, twice';c='Both lanes start with the same 12,000-token context (system prompt, tool definitions, project notes). Press play or step through the five requests.'}
    else{const k=turn+1;t='Turn '+k+' of 5: '+['the request','the hook decides','the result lands'][ph];
      c=ph===0?T[turn].ask:ph===1?'Claude Code fires the PreToolUse hook before the tool call. Without routing there is no hook; with it, a Read of a file over 350 lines is blocked and Claude is pointed at the /bulk-reader skill.':T[turn].cap}
    if(f===NF-1){const A=stateAt(5,'a'),B=stateAt(5,'b');c+=' Over the session: '+fmt(A.proc)+' against '+fmt(B.proc)+' input tokens processed by Claude ('+Math.round(100*(1-B.proc/A.proc))+'% fewer), and '+fmt(A.o)+' against '+fmt(B.o)+' output tokens; the worker handled '+fmt(B.w)+'.'}
    $('rtStep').textContent=t;$('rtCap').textContent=c;
    $('rtScrub').value=Math.round(1000*st.c/(NF-1));
    const end=st.c>=NF-1-1e-9,pb=$('rtPlay');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.c+=dt/1000*0.7*st.spd;if(st.c>=NF-1){st.c=NF-1;st.play=false}card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('rtPlay').addEventListener('click',()=>{if(st.play)pause();else{if(st.c>=NF-1-1e-9)st.c=0;st.play=true;kick()}draw()});
  $('rtFwd').addEventListener('click',()=>{pause();st.c=Math.min(NF-1,Math.floor(st.c+1e-9)+1);draw()});
  $('rtBack').addEventListener('click',()=>{pause();st.c=Math.max(0,Math.ceil(st.c-1e-9)-1);draw()});
  $('rtScrub').addEventListener('input',e=>{pause();st.c=Math.round((NF-1)*(+e.target.value)/1000);draw()});
  $('rtSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  onTab(card.closest('.tab').id,()=>{draw();kick()});
  draw();
})();
