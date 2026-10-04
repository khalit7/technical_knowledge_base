// ---- Raft lab: drawing, guided tour and free mode ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rf-svg'))return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const SEED=11;let sim=RAFT.create(SEED),mode='tour',playing=false,until=null,untilMax=0,sel=0,raf=0,last=0,tk=0,onDone=null,noLeaderSince=null;
  const spd=()=>+$('rf-speed').value;
  const nm=i=>'S'+(i+1);
  // ---------- drawing ----------
  function draw(){
    const el=$('rf-svg'),W=Math.min(640,RD.width(el)),H=Math.min(300,Math.max(250,W*0.55)),cx=W/2,cy=H/2+4,R=Math.min(W/2-44,H/2-40),pos=[];
    for(let i=0;i<5;i++){const a=-Math.PI/2+i*2*Math.PI/5;pos.push({x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)})}
    let g='';
    for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){const ok=sim.conn(i,j);g+='<line x1="'+pos[i].x+'" y1="'+pos[i].y+'" x2="'+pos[j].x+'" y2="'+pos[j].y+'" stroke="'+(ok?'var(--line)':'var(--bad)')+'" stroke-width="1" '+(ok?'':'stroke-dasharray="3 5" opacity=".6"')+'/>'}
    sim.msgs.forEach(m=>{const f=Math.max(0,Math.min(1,(sim.now-m.sent)/(m.at-m.sent))),a=pos[m.from],b=pos[m.to],x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f;
      const vote=m.k==='RV'||m.k==='RVR',rep=m.k==='RVR'||m.k==='AER';
      g+='<circle cx="'+x+'" cy="'+y+'" r="'+(rep?3.2:4.6)+'" fill="'+(vote?'var(--c4)':'var(--acc)')+'"'+(rep?' opacity=".65"':'')+'/>'});
    sim.S.forEach((s,i)=>{const p=pos[i],col=!s.alive?'var(--dim)':s.role==='leader'?'var(--good)':s.role==='candidate'?'var(--c5)':'var(--acc)';
      g+='<g class="rf-node" data-i="'+i+'" style="cursor:pointer">';
      if(i===sel&&mode==='free')g+='<circle cx="'+p.x+'" cy="'+p.y+'" r="33" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="2 3"/>';
      if(s.alive&&s.role!=='leader'){const frac=Math.max(0,Math.min(1,(s.deadline-sim.now)/s.eto)),r=28,len=2*Math.PI*r;
        g+='<circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="3" opacity=".45" stroke-dasharray="'+(len*frac)+' '+len+'" transform="rotate(-90 '+p.x+' '+p.y+')"/>'}
      g+='<circle cx="'+p.x+'" cy="'+p.y+'" r="22" fill="'+col+'" opacity="'+(s.alive?0.9:0.55)+'"/>';
      g+=RD.t(p.x,p.y-2,nm(i),{a:'middle',fs:13,w:600,fill:'var(--bg)'})+RD.t(p.x,p.y+12,'term '+s.term,{a:'middle',fs:9.5,fill:'var(--bg)'});
      if(!s.alive)g+=RD.t(p.x,p.y+40,'crashed',{a:'middle',fs:10.5,fill:'var(--bad)'});
      else if(sim.group&&sim.group[i]===1)g+=RD.t(p.x,p.y+40,'split off',{a:'middle',fs:10.5,fill:'var(--bad)'});
      else if(s.role==='leader')g+=RD.t(p.x,p.y+40,'leader',{a:'middle',fs:10.5,fill:'var(--good)',w:600});
      g+='</g>'});
    el.innerHTML=RD.svg(W,H,g,'Five Raft servers and their messages');
    const L=sim.leader();
    $('rf-stats').innerHTML=RD.stat('Simulated time',Math.round(sim.now)+' ms','')+RD.stat('Leader',L?nm(L.id)+', term '+L.term:'none',L?'':(noLeaderSince!=null?'for '+Math.round(sim.now-noLeaderSince)+' ms':''))+
      RD.stat('Committed (leader)',L?'up to entry '+L.commit:'n/a',L?L.log.length+' entries in its log':'')+RD.stat('Messages in flight',String(sim.msgs.length),'');
    // logs
    const mx=Math.max(1,...sim.S.map(s=>s.log.length)),from=Math.max(1,mx-11);
    let t='<table><tr><th></th>';for(let k=from;k<=mx;k++)t+='<th>'+k+'</th>';t+='</tr>';
    sim.S.forEach((s,i)=>{t+='<tr><th>'+nm(i)+(s.alive?'':' ✕')+'</th>';
      for(let k=from;k<=mx;k++){const e=s.log[k-1];t+=e?'<td class="e'+(k<=s.commit?' c':'')+'">t'+e.term+'<small>'+e.cmd+'</small></td>':'<td></td>'}t+='</tr>'});
    $('rf-log').innerHTML=t+'</table>';
    $('rf-ev').innerHTML=sim.log.slice(-12).reverse().map(e=>'<div>'+String(Math.round(e.t)).padStart(5,' ')+' ms  '+e.m+'</div>').join('')||'<div>Nothing yet.</div>';
    $('rf-selname').textContent=nm(sel);$('rf-crash').textContent=sim.S[sel].alive?'Crash '+nm(sel):'Restart '+nm(sel);
    $('rf-iso').textContent=sim.group&&sim.group[sel]===1?'Rejoin '+nm(sel):'Split '+nm(sel)+' off';
  }
  function track(){const L=sim.leader();if(L)noLeaderSince=null;else if(noLeaderSince==null)noLeaderSince=sim.now}
  // ---------- time ----------
  function advance(dt){const t=sim.now+dt;
    while(sim.nextAt()<=t){sim.step();track();if(until&&(until()||sim.now>untilMax)){done();return}}
    sim.runTo(t);track();if(until&&sim.now>untilMax)done()}
  function done(){until=null;setPlaying(false);if(onDone){const f=onDone;onDone=null;f()}}
  const visible=()=>!$('t-raft').hidden&&!document.hidden;
  function loop(ts){raf=0;if(!playing||!visible())return;const dt=last?Math.min(100,ts-last):16;last=ts;advance(dt*spd()/1000);draw();if(playing)raf=requestAnimationFrame(loop)}
  function setPlaying(p){playing=p;last=0;$('rf-play').innerHTML=p?'❚❚ Pause':'▶ Play';$('rf-next').disabled=p&&mode==='tour';if(p&&!raf&&visible())raf=requestAnimationFrame(loop);draw()}
  function runUntil(cond,maxMs,then){until=cond;untilMax=sim.now+maxMs;onDone=then;
    if(RM){let g=0;while(until&&g++<20000){const nx=sim.nextAt();if(!isFinite(nx)||nx>untilMax){sim.runTo(untilMax);track();done();break}sim.step();track();if(until()){done();break}}draw()}
    else setPlaying(true)}
  // ---------- guided tour ----------
  const lead=()=>sim.leader();
  const allCommitted=()=>{const L=lead();return L&&L.commit===L.log.length&&sim.S.filter(s=>s.alive&&sim.conn(s.id,L.id)).every(s=>s.commit===L.commit&&s.log.length===L.log.length)};
  let ctx={};
  const TOUR=[
    {t:'Five followers, no leader',act:()=>{},until:null,cap:()=>'All five servers start as followers in term 0, each with its own random election timeout (the arc around each server drains as its timer runs down). Nobody is sending heartbeats, so the first timer to run out will start an election. Press <b>Next step</b>.'},
    {t:'An election',act:()=>{},until:()=>{const L=lead();return L&&L.commit>=1},max:3000,cap:()=>{const L=lead();const e=sim.log.find(x=>/becomes candidate/.test(x.m));return (e?e.m.replace(/:.*$/,'')+'. ':'')+(L?nm(L.id)+' collected votes from a majority (3 of 5, counting its own) and became leader for term '+L.term+'. It appended a <b>no-op</b> entry and committed it once a majority stored it: that tells it which entries are committed. Its heartbeats now reset everyone\'s timers, so no one else runs.':'')}},
    {t:'A client write commits',act:()=>{ctx.c=sim.write()},until:allCommitted,max:2000,cap:()=>'The client sent <b>'+ctx.c+'</b> to the leader. The leader appended it, sent it in AppendEntries, and committed it as soon as <b>3 of 5</b> servers had stored it; only then may it answer the client "done". Followers learn the new commit index from the next heartbeat (watch the cells turn green).'},
    {t:'Two more writes',act:()=>{sim.write();sim.write()},until:allCommitted,max:2000,cap:()=>'Writes are just more entries in the same log, in the same order on every server.'},
    {t:'Crash the leader',act:()=>{const L=lead();ctx.old=L.id;ctx.oldTerm=L.term;ctx.t0=sim.now;sim.crash(L.id)},until:()=>{const L=lead();return L&&L.term>ctx.oldTerm&&L.commit===L.log.length},max:4000,
      cap:()=>{const L=lead();return 'The leader '+nm(ctx.old)+' crashed. Followers stopped hearing heartbeats; the first whose timer ran out started an election for a higher term. '+(L?nm(L.id)+' won term '+L.term+' about '+Math.round(sim.now-ctx.t0)+' ms after the crash (the paper measured a median of 287 ms with 5 ms of randomness, and 35 ms with 12 to 24 ms timeouts). The election restriction made sure the winner already had every committed entry.':'')}},
    {t:'Writes continue with four servers',act:()=>{ctx.c=sim.write()},until:allCommitted,max:2000,cap:()=>'With one server down, 3 of the 4 remaining still form a majority of 5, so <b>'+ctx.c+'</b> commits as before.'},
    {t:'The old leader restarts',act:()=>{sim.restart(ctx.old)},until:()=>{const L=lead(),s=sim.S[ctx.old];return L&&s.log.length===L.log.length&&s.commit===L.commit},max:3000,
      cap:()=>nm(ctx.old)+' restarts as a follower with its log from disk and its old term. The first message from the current leader carries a higher term, so it adopts it. The leader finds where their logs agree (the AppendEntries consistency check) and sends the missing entries; '+nm(ctx.old)+' catches up.'},
    {t:'A network split: leader on the small side',act:()=>{const L=lead();ctx.ml=L.id;ctx.mterm=L.term;const f=sim.S.find(s=>s.id!==L.id&&s.alive).id;ctx.mf=f;const g=[0,0,0,0,0];g[L.id]=1;g[f]=1;sim.partition(g);ctx.c1=sim.write(L.id);ctx.c2=sim.write(L.id)},
      until:()=>sim.S.some(s=>s.alive&&s.role==='leader'&&s.term>ctx.mterm&&s.commit===s.log.length),max:4000,
      cap:()=>'The network split '+nm(ctx.ml)+' (the leader) and '+nm(ctx.mf)+' away from the other three. A client on their side sent <b>'+ctx.c1+'</b> and <b>'+ctx.c2+'</b> to '+nm(ctx.ml)+': it appends them but can reach only 2 of 5 servers, so they <b>never commit</b> and the client never hears "done". On the majority side the timers ran out and a new leader was elected for a higher term. Two servers now call themselves leader, but only one can commit: that is why Raft is safe during a split.'},
    {t:'Writes on the majority side, then the network heals',act:()=>{const L=sim.S.filter(s=>s.alive&&s.role==='leader').sort((a,b)=>b.term-a.term)[0];ctx.nl=L.id;ctx.c3=sim.write(L.id);ctx.t1=sim.now;
        setTimeout(()=>{},0);ctx.healAt=sim.now+300},
      until:()=>{if(sim.group&&sim.now>=ctx.healAt)sim.partition(null);return !sim.group&&allCommitted()&&sim.S.every(s=>!s.alive||s.log.length===sim.S[ctx.nl].log.length)},max:5000,
      cap:()=>'The majority-side leader '+nm(ctx.nl)+' committed <b>'+ctx.c3+'</b>. Then the network healed. The old leader '+nm(ctx.ml)+' received a message with a higher term and stepped down; its uncommitted entries '+ctx.c1+' and '+ctx.c2+' conflicted with the new leader\'s log and were <b>overwritten</b>. Nothing promised was lost: those writes were never acknowledged, so their client must retry (safely, if they are idempotent).'},
    {t:'Lose the majority',act:()=>{const alive=sim.S.filter(s=>s.alive).map(s=>s.id);const L=lead();const order=alive.filter(i=>!L||i!==L.id);sim.crash(order[0]);sim.crash(order[1]);if(L)sim.crash(L.id);ctx.t2=sim.now},
      until:()=>false,max:1500,cap:()=>'Three of five servers are down. The two survivors keep timing out and starting elections (watch their terms climb), but neither can collect 3 votes, so there is <b>no leader and no writes</b>, and a client write is refused. Raft chooses consistency over availability: a minority never decides anything. Switch to <b>Free mode</b> to restart servers and experiment.'}];
  function showCap(i){const s=TOUR[i];$('rf-cap').innerHTML='<div class="t">'+(i+1)+'/'+TOUR.length+'. '+s.t+'</div>'+s.cap();$('rf-k').textContent='Step '+(i+1)+' of '+TOUR.length;$('rf-next').disabled=i>=TOUR.length-1;draw()}
  function resetSim(){setPlaying(false);until=null;onDone=null;sim=RAFT.create(SEED);noLeaderSince=0;ctx={}}
  function tourStart(){resetSim();tk=0;showCap(0)}
  function tourNext(){if(tk>=TOUR.length-1||playing)return;tk++;const s=TOUR[tk];s.act();
    $('rf-cap').innerHTML='<div class="t">'+(tk+1)+'/'+TOUR.length+'. '+s.t+'</div><span class="mute">Running…</span>';$('rf-k').textContent='Step '+(tk+1)+' of '+TOUR.length;
    runUntil(s.until||(()=>true),s.max||1000,()=>showCap(tk))}
  // ---------- controls ----------
  RD.seg($('rf-mode'),m=>{mode=m;$('rf-tour').hidden=m!=='tour';$('rf-free').hidden=m!=='free';setPlaying(false);until=null;onDone=null;
    if(m==='free')$('rf-cap').innerHTML='<div class="t">Free mode</div>Tap a server to select it, then crash or restart it, or split it off from the others (servers you split off can still talk to each other). Send client writes, play, or advance one event at a time with <b>Next event</b>. The log below and the event list show exactly what happened.';
    else tourStart();draw()});
  $('rf-next').addEventListener('click',tourNext);$('rf-restart').addEventListener('click',tourStart);
  $('rf-play').addEventListener('click',()=>{until=null;setPlaying(!playing)});
  $('rf-step').addEventListener('click',()=>{setPlaying(false);sim.step();track();draw()});
  $('rf-write').addEventListener('click',()=>{sim.write();draw()});
  $('rf-heal').addEventListener('click',()=>{sim.partition(null);draw()});
  $('rf-reset').addEventListener('click',()=>{resetSim();draw()});
  $('rf-crash').addEventListener('click',()=>{if(sim.S[sel].alive)sim.crash(sel);else sim.restart(sel);track();draw()});
  $('rf-iso').addEventListener('click',()=>{const g=sim.group?sim.group.slice():[0,0,0,0,0];g[sel]=g[sel]?0:1;sim.partition(g.some(x=>x)?g:null);draw()});
  $('rf-svg').addEventListener('click',e=>{const n=e.target.closest('.rf-node');if(!n)return;sel=+n.dataset.i;draw()});
  $('rf-speed').addEventListener('change',()=>{});
  document.addEventListener('visibilitychange',()=>{if(playing&&visible()&&!raf){last=0;raf=requestAnimationFrame(loop)}});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-raft']=window.TAB_RENDER['t-raft']||[]).push(()=>{draw();if(playing&&!raf){last=0;raf=requestAnimationFrame(loop)}});
  addEventListener('resize',()=>{if(!$('t-raft').hidden)draw()});
  tourStart();
})();
