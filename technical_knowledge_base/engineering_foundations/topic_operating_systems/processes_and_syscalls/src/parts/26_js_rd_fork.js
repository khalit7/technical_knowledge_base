// ---- Reading 3: clone flags, process-creation cost against parent size, the Python table ----
(function(){
  if(!window.PD)return;
  const cl=document.getElementById('rd-clones');
  if(cl)cl.textContent=PD.clones.replace(/child_stack=0x[0-9a-f]+/g,'child_stack=0x...').replace(/0x[0-9a-f]{6,} \/\*/g,'0x... /*');
  const el=document.getElementById('rd-fork-chart');
  const M=[['fork_exit','fork, child exits','c2'],['fork_exec','fork + exec /bin/true','c5'],['vfork_exit','vfork, child exits','c3'],['spawn_exec','posix_spawn /bin/true','c1']];
  const sizes=[...new Set(PD.spawn.map(r=>r.mib))];
  function chart(){
    if(!el)return;
    const W=RD.width(el),lw=W<520?64:90,pw=W-lw-64,bh=11,gh=M.length*(bh+3)+16,h=sizes.length*gh+34;
    const lo=50,hi=30000,x=v=>lw+pw*(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo));
    let b='';
    [100,1000,10000].forEach(t=>{b+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="2" y2="'+(h-24)+'" stroke="var(--line)"/>'+RD.t(x(t),h-10,t>=1000?(t/1000)+' ms':t+' µs',{a:'middle',fs:10,fill:'var(--mute)'})});
    sizes.forEach((s,gi)=>{
      const y0=4+gi*gh,pte=PD.spawn.find(r=>r.mib===s).pte_kib;
      b+=RD.t(4,y0+12,s+' MiB',{fs:11.5,w:600})+RD.t(4,y0+26,'PTE '+pte+' KiB',{fs:10,fill:'var(--mute)'});
      M.forEach((m,mi)=>{const r=PD.spawn.find(q=>q.mib===s&&q.m===m[0]);const y=y0+mi*(bh+3);
        b+='<rect x="'+lw+'" y="'+y+'" width="'+(x(r.med)-lw)+'" height="'+bh+'" rx="2" fill="var(--'+m[2]+')"><title>'+m[1]+': median '+r.med+' µs</title></rect>'+
          '<line x1="'+x(r.p10)+'" x2="'+x(r.p90)+'" y1="'+(y+bh/2)+'" y2="'+(y+bh/2)+'" stroke="var(--ink)" stroke-width="1" opacity=".55"/>'+
          RD.t(Math.min(x(r.p90),x(r.med))+4+(x(r.p90)>x(r.med)?x(r.p90)-x(r.med):0),y+bh-1,r.med>=1000?(r.med/1000).toFixed(1)+' ms':Math.round(r.med)+' µs',{fs:10})});
    });
    el.innerHTML=RD.svg(W,h,b,'Time to start and reap a child against parent memory, four methods, log scale')+
      '<div class="leg">'+M.map(m=>'<span style="--sw:var(--'+m[2]+')">'+m[1]+'</span>').join('')+'</div>';
  }
  chart();RD.onRender(chart);RD.onResize(chart);
  // Python table
  const t=document.getElementById('rd-pyspawn');
  if(t){
    const f=(v,d)=>v===undefined?'<span class="mute">not run</span>':v.toFixed(d);
    t.innerHTML='<table class="tbl-sm"><thead><tr><th>Parent process</th><th class="num">RSS MiB</th><th class="num">huge-page MiB</th><th class="num">os.fork ms</th><th class="num">subprocess.run ms</th><th class="num">mp fork ms</th><th class="num">mp spawn ms</th><th class="num">mp forkserver ms</th></tr></thead><tbody>'+
      PD.pyspawn.map(r=>'<tr><td>'+RD.esc(r.label)+'</td><td class="num">'+r.rss+'</td><td class="num">'+r.anon_huge+'</td><td class="num">'+f(r.os_fork,2)+'</td><td class="num">'+f(r.subprocess,2)+'</td><td class="num">'+f(r.mp_fork,1)+'</td><td class="num">'+f(r.mp_spawn,0)+'</td><td class="num">'+f(r.mp_forkserver,0)+'</td></tr>').join('')+
      '</tbody></table><p class="small mute">Median of 21 (os.fork, subprocess) or 5 (multiprocessing: <code>Process(target=noop).start(); join()</code>), 2 CPUs, Python 3.11.2, torch 2.14.1+cpu, NumPy 2.4.6. Source <code>src/runs/py/py_spawn.py</code>. The multiprocessing columns were not run for the last row.</p>';
  }
})();
