// ---- Reading: every entry of the official Terminal-Bench 4.0 board, score against dollars ----
(function(){
  const fig=document.getElementById('tbb-fig');if(!fig)return;
  const B=AG.tb4;let ym='acc',cur=0;
  const COL={'Codex':'var(--c1)','Claude Code':'var(--c2)','Grok Build':'var(--c3)','mini-SWE-agent':'var(--c4)'};
  const y=r=>ym==='acc'?r.acc:100*r.p5;
  function draw(){
    const W=RD.width(fig),H=Math.max(260,Math.min(360,W*0.62)),L=40,R=12,T=14,Bm=36;
    const xs=B.map(r=>r.cost),lx0=Math.log10(250),lx1=Math.log10(12000);
    const X=c=>L+(W-L-R)*(Math.log10(c)-lx0)/(lx1-lx0),Y=v=>T+(H-T-Bm)*(1-v/100);
    let b='';
    [0,20,40,60,80,100].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,Y(v)+4,v+'%',{a:'end',fs:10.5,fill:'var(--mute)'})});
    [300,1000,3000,10000].forEach(c=>{b+='<line x1="'+X(c)+'" x2="'+X(c)+'" y1="'+T+'" y2="'+(H-Bm)+'" stroke="var(--line)"/>'+RD.t(X(c),H-Bm+15,'$'+c.toLocaleString('en-US'),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    b+=RD.t((L+W-R)/2,H-6,'dollars for the whole run (330 trials, log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    // effort ladders: join entries of the same agent and model
    const groups={};B.forEach((r,i)=>{(groups[r.agent+'|'+r.model]=groups[r.agent+'|'+r.model]||[]).push(i)});
    Object.values(groups).forEach(g=>{if(g.length<2)return;const pts=g.map(i=>B[i]).sort((a,b)=>a.cost-b.cost);
      b+='<polyline fill="none" stroke="'+(COL[pts[0].agent]||'var(--mute)')+'" stroke-opacity=".45" stroke-width="1.5" points="'+pts.map(r=>X(r.cost)+','+Y(y(r))).join(' ')+'"/>'});
    B.forEach((r,i)=>{const cx=X(r.cost),cy=Y(y(r)),c=COL[r.agent]||'var(--mute)';
      if(ym==='acc')b+='<line x1="'+cx+'" x2="'+cx+'" y1="'+Y(r.acc+r.ci)+'" y2="'+Y(r.acc-r.ci)+'" stroke="'+c+'" stroke-opacity=".6"/>';
      b+='<circle data-i="'+i+'" cx="'+cx+'" cy="'+cy+'" r="'+(i===cur?6.5:4.5)+'" fill="'+c+'" stroke="'+(i===cur?'var(--ink)':'var(--bg)')+'" stroke-width="1.5" style="cursor:pointer"/>'});
    const r=B[cur];b+=RD.t(Math.min(W-R-4,Math.max(L+4,X(r.cost))),Math.max(T+10,Y(y(r))-10),r.model+' ('+r.effort+')',{a:X(r.cost)>W*0.6?'end':'start',fs:11,w:600});
    fig.innerHTML=RD.svg(W,H,b,'Terminal-Bench 4.0 board')+'<div class="leg">'+Object.keys(COL).map(k=>'<span><i style="background:'+COL[k]+'"></i>'+k+'</span>').join('')+'</div>';
    fig.querySelectorAll('circle[data-i]').forEach(c=>c.addEventListener('click',()=>{cur=+c.dataset.i;draw()}));
    document.getElementById('tbb-info').innerHTML='<b>'+r.agent+' + '+r.model+' ('+r.effort+')</b>, rank '+r.rank+', dated '+r.date+': mean '+r.acc.toFixed(2)+'% &plusmn; '+r.ci+' ('+r.succ+' of '+r.n+' trials), pass@5 '+(100*r.p5).toFixed(1)+'%, $'+Math.round(r.cost).toLocaleString('en-US')+' for the run, about $'+(r.cost/r.n).toFixed(2)+' per trial.';
  }
  document.querySelectorAll('#tbb-y button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#tbb-y button').forEach(x=>x.classList.toggle('on',x===b));ym=b.dataset.y;draw()}));
  draw();RD.onResize(draw);RD.onRender(draw);
})();
