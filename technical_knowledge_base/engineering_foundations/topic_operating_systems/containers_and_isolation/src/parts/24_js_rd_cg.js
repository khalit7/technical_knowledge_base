// ---- Sections 3 to 5: recorded outputs, the freezer chart, the memory-limit animation, the oom.group table ----
(function(){
  const D=window.CT_DATA,E=RD.esc,$=id=>document.getElementById(id);
  const sec=(t,h)=>{const i=t.indexOf('### '+h);if(i<0)return '';const j=t.indexOf('\n### ',i+4);return t.slice(t.indexOf('\n',i)+1,j<0?undefined:j)};
  // section 3
  $('rd-upper').textContent=D.mini_upper;
  const it=D.image_txt;
  $('rd-copyup').textContent=sec(it,'first and second').trim();
  $('rd-cu1').textContent=D.copyup[0].toFixed(1);$('rd-cu2').textContent=D.copyup[1].toFixed(1);
  $('rd-image').textContent='$ docker history kb-os-cont:1   (size, build step; newest first)\n'+sec(it,'docker history').trim()+'\n\n$ docker diff   (a container that wrote /work/new.txt and deleted /etc/motd)\n'+sec(it,'docker diff').trim();
  // section 4
  $('rd-deleg').textContent=D.cg_deleg;
  $('rd-io0').textContent=D.io[0].s.toFixed(3)+' s ('+D.io[0].rate+')';$('rd-io1').textContent=D.io[1].s.toFixed(2)+' s ('+D.io[1].rate+')';
  function fz(){const el=$('rd-fz'),W=RD.width(el),H=150,L=44,B=28,pts=D.fz,t0=pts[0][0]-0.5,t1=pts[pts.length-1][0],mx=Math.max(...pts.map(p=>p[1]));
    const x=t=>L+(W-L-10)*(t-t0)/(t1-t0),y=v=>H-B-(H-B-10)*v/mx;
    let b='';pts.forEach((p,i)=>{if(i&&p[0]-pts[i-1][0]>1){b+='<rect x="'+x(pts[i-1][0])+'" y="10" width="'+(x(p[0]-0.5)-x(pts[i-1][0]))+'" height="'+(H-B-10)+'" fill="var(--soft)"/>'+RD.t((x(pts[i-1][0])+x(p[0]-0.5))/2,26,'frozen',{a:'middle',fill:'var(--mute)'})}});
    pts.forEach(p=>{b+='<rect x="'+(x(p[0])-((W-L)/pts.length/3))+'" y="'+y(p[1])+'" width="'+((W-L)/pts.length/1.5)+'" height="'+(H-B-y(p[1]))+'" fill="var(--acc)"/>'});
    b+='<line x1="'+L+'" x2="'+(W-10)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="var(--line)"/>'+RD.t(L-4,y(mx)+4,(mx/1e6).toFixed(1)+'M',{a:'end',fill:'var(--mute)'})+RD.t(L-4,H-B,'0',{a:'end',fill:'var(--mute)'});
    pts.forEach(p=>{b+=RD.t(x(p[0]),H-B+14,(p[0]-pts[0][0]).toFixed(1),{a:'middle',fill:'var(--mute)',fs:10})});
    b+=RD.t((W+L)/2,H-2,'seconds since the first sample',{a:'middle',fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(W,H,b,'Loop iterations per half second; zero while frozen')}
  fz();RD.onRender(fz);RD.onResize(fz);
  // section 5: the same 300 MiB allocation under three limits
  const M=D.mem,lim=200;
  $('rd-mx-last').textContent=M.max.pts[M.max.pts.length-1][0];
  const hp=M.high.pts;$('rd-hi-a').textContent=(hp[hp.length-2][1]-hp[hp.length-3][1]).toLocaleString('en-US');$('rd-hi-b').textContent=((hp[hp.length-1][1]-hp[hp.length-2][1])/1000).toFixed(1);
  $('rd-hi-ev').textContent=M.high.ev.high.toLocaleString('en-US');
  $('rd-hs-t').textContent=M.highswap.pts[M.highswap.pts.length-1][1];$('rd-hs-mf').textContent=M.highswap.stat.pgmajfault;
  $('rd-oomg').querySelector('tbody').innerHTML=D.oomg.map(o=>'<tr><td>'+o.g+'</td><td>killed ('+o.worker+')</td><td>'+(o.main?'<span class="pill bad">killed too</span>':'<span class="pill ok">still alive</span>')+'</td><td><code>'+E(o.txt.match(/memory.events: (.*)/)[1].trim())+'</code></td></tr>').join('');
  let cur='max';
  function draw(i){
    const m=M[cur],pts=m.pts,n=pts.length,last=i>=n,shown=pts.slice(0,Math.min(i+1,n));
    $('rd-mem-cfg').innerHTML='<code>'+E(m.cfg)+'</code>, then <code>python3 hog.py 300</code>';
    const el=$('rd-mem-svg'),W=RD.width(el),H=190,L=40,B=20,T=12,ymax=320,x0=L,bw=(W-L-12)/30;
    const y=v=>H-B-(H-B-T)*v/ymax;
    let b='';
    b+='<line x1="'+L+'" x2="'+(W-6)+'" y1="'+y(lim)+'" y2="'+y(lim)+'" stroke="var(--bad)" stroke-dasharray="5 3"/>'+RD.t(L+4,y(lim)-5,(cur==='max'?'memory.max':'memory.high')+' 200 MiB',{fill:'var(--bad)',fs:10.5});
    [0,100,200,300].forEach(v=>{b+=RD.t(L-5,y(v)+4,v,{a:'end',fill:'var(--mute)',fs:10})});
    shown.forEach((p,k)=>{const xx=x0+k*bw,h=H-B-y(p[2]);
      b+='<rect x="'+(xx+1)+'" y="'+y(p[2])+'" width="'+Math.max(1,bw-2)+'" height="'+h+'" fill="var(--acc)"/>';
      const dt=p[1]-(k?shown[k-1][1]:0);if(dt>=100){const up=(k>0&&shown[k-1][1]-(k>1?shown[k-2][1]:0)>=100)?14:0;b+=RD.t(xx+bw/2,y(Math.max(p[0],p[2]))-5-up,dt>=1000?(dt/1000).toFixed(1)+' s':dt+' ms',{a:'middle',fill:'var(--bad)',fs:10.5,w:600})}
      if(p[0]>p[2]+5)b+='<rect x="'+(xx+1)+'" y="'+y(p[0])+'" width="'+Math.max(1,bw-2)+'" height="'+(y(p[2])-y(p[0]))+'" fill="var(--c4)" opacity=".55"/>'});
    [0,100,200,300].forEach(v=>{b+=RD.t(x0+(v/10)*bw,H-B+13,v,{a:'middle',fill:'var(--mute)',fs:10})});
    el.innerHTML=RD.svg(W,H,b,'memory.current per step')+'<div class="leg"><span style="--sw:var(--acc)">memory.current (charged to the cgroup)</span><span style="--sw:var(--c4)">swapped out</span></div><div class="small mute">Across: MiB requested so far, 10 MiB per step. Up: MiB. Red labels: steps that took 100 ms or more.</div>';
    const p=pts[Math.min(i,n-1)],prev=i>0?pts[Math.min(i,n-1)-1]:[0,0,0];
    let cap;
    if(!last){const dt=p[1]-prev[1];cap=(p[0]<=lim-10?'Under the limit: each 10 MiB costs about '+Math.max(1,dt)+' ms of copying.':cur==='max'?'Still under 200 MiB of charge; the next 10 MiB will not fit.':cur==='high'?(dt>1000?'Over memory.high and nothing to reclaim: the task slept '+(dt/1000).toFixed(1)+' s in throttling before this 10 MiB returned.':'Over memory.high: reclaim found nothing to free (no swap) and the task was made to sleep; this step took '+dt+' ms.'):'Over memory.high: reclaim swapped pages out, memory.current stays near 200 MiB; this step took '+dt+' ms.')}
    else cap=cur==='max'?'The next allocation could not be charged and nothing could be reclaimed: the cgroup OOM killer sent SIGKILL. Exit '+m.exit+', memory.events oom_kill '+m.ev.oom_kill+'.':cur==='high'?'No further step completed. The 60 s timeout sent SIGKILL (exit '+m.exit+'); the kernel never did: memory.events oom '+m.ev.oom+', high '+m.ev.high.toLocaleString('en-US')+'.':'All 300 MiB allocated in '+p[1]+' ms with 100 MiB swapped out; exit '+m.exit+', no OOM.';
    $('rd-mem-cap').innerHTML='<div class="t">'+(last?'Result':'Step '+(i+1)+' of '+n+': '+p[0]+' MiB requested')+'</div><p>'+E(cap)+'</p>';
    $('rd-mem-cnt').innerHTML=RD.stat('elapsed',(last&&cur==='high'?'60,000 (timeout)':p[1].toLocaleString('en-US'))+' ms','measured')+RD.stat('memory.current',p[2]+' MiB','charged')+RD.stat('memory.events',last?'oom_kill '+m.ev.oom_kill+', high '+m.ev.high.toLocaleString('en-US'):'...','after the run');
  }
  const a=RD.anim({card:'rd-mem-card',ctl:'rd-mem-ctl',n:M.max.pts.length+1,draw,ms:450,label:'Allocation step'});
  RD.seg($('rd-mem-mode'),m=>{cur=m;a.reset(M[m].pts.length+1);a.play()});
  RD.onResize(()=>a.redraw());
})();
