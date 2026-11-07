// ---- Reading, section 7: the Raft cluster to break yourself (free mode, a widget: it never plays by itself). The guided tour became Fig. 3, the 3D stage driven by 34_js_raft_trace.js (2026-11-07) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rf-svg'))return;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const SEED=11;let sim=RAFT.create(SEED),mode='free',playing=false,until=null,untilMax=0,sel=0,raf=0,last=0,tk=0,onDone=null,noLeaderSince=null;
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
      g+=RD.t(p.x,p.y-2,nm(i),{a:'middle',fs:13,w:600,fill:'var(--bg)'})+RD.t(p.x,p.y+12,'term '+s.term,{a:'middle',fs:11,fill:'var(--bg)'});
      if(!s.alive)g+=RD.t(p.x,p.y+40,'crashed',{a:'middle',fs:11,fill:'var(--bad)'});
      else if(sim.group&&sim.group[i]===1)g+=RD.t(p.x,p.y+40,'split off',{a:'middle',fs:11,fill:'var(--bad)'});
      else if(s.role==='leader')g+=RD.t(p.x,p.y+40,'leader',{a:'middle',fs:11,fill:'var(--good)',w:600});
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
  const visible=()=>!$('t-read').hidden&&!document.hidden&&$('rf-card').offsetParent!==null;
  function loop(ts){raf=0;if(!playing||!visible())return;const dt=last?Math.min(100,ts-last):16;last=ts;advance(dt*spd()/1000);draw();if(playing)raf=requestAnimationFrame(loop)}
  function setPlaying(p){playing=p;last=0;$('rf-play').innerHTML=p?'❚❚ Pause':'▶ Play';if(p&&!raf&&visible())raf=requestAnimationFrame(loop);draw()}
  function resetSim(){setPlaying(false);until=null;onDone=null;sim=RAFT.create(SEED);noLeaderSince=0}
  const FREE='Tap a server to select it, then crash or restart it, or split it off from the others. Send client writes, play, or advance one event at a time with <b>Next event</b>.';
  // ---------- controls ----------
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
  RD.onRender(()=>{draw();if(playing&&!raf){last=0;raf=requestAnimationFrame(loop)}});
  RD.onResize(draw);
  $('rf-cap').innerHTML=FREE;draw();
})();
