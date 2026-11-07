// ---- Sections 3 to 5: recorded outputs, the freezer chart, the memory-limit animation, the oom.group table ----
(function(){
  const D=window.CT_DATA,E=RD.esc,$=id=>document.getElementById(id);
  const sec=(t,h)=>{const i=t.indexOf('### '+h);if(i<0)return '';const j=t.indexOf('\n### ',i+4);return t.slice(t.indexOf('\n',i)+1,j<0?undefined:j)};
  // section 3
  $('rd-upper').textContent=D.mini_upper;
  const it=D.image_txt;
  $('rd-copyup').textContent=sec(it,'first and second').trim();
  $('rd-cu1').textContent=D.copyup[0].toFixed(1);$('rd-cu2').textContent=D.copyup[1].toFixed(1);
  [['rd-cu1b',D.copyup[0].toFixed(1)],['rd-cu2b',D.copyup[1].toFixed(1)]].forEach(([k,v])=>{if($(k))$(k).textContent=v});
  {const m=/create a new file: ([\d.]+) ms/.exec(D.image_txt);if($('rd-tnew'))$('rd-tnew').textContent=m?m[1]:'?'}
  $('rd-image').textContent='$ docker history kb-os-cont:1   (size, build step; newest first)\n'+sec(it,'docker history').trim()+'\n\n$ docker diff   (a container that wrote /work/new.txt and deleted /etc/motd)\n'+sec(it,'docker diff').trim();
  // section 4
  $('rd-deleg').textContent=D.cg_deleg;
  $('rd-io0').textContent=D.io[0].s.toFixed(3)+' s ('+D.io[0].rate+')';$('rd-io1').textContent=D.io[1].s.toFixed(2)+' s ('+D.io[1].rate+')';
  if($('rd-io0b')){$('rd-io0b').textContent=$('rd-io0').textContent;$('rd-io1b').textContent=$('rd-io1').textContent}
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
  // 2026-11-07: a long replay (19 to 30 allocation steps) grouped into a few explained stretches, one step-list item each (sx-mem-<mode>);
  // the bars of a stretch ease in one after another during its step; the last item of each list is the run's result
  const ST={max:[9,18,-1],high:[18,19,20,-1],highswap:[18,29,-1]};
  let cur='max';
  function draw(i){
    const m=M[cur],pts=m.pts,n=pts.length,ends=ST[cur],last=ends[i]<0,e=last?n-1:ends[i],s0=i===0?0:(ends[i-1]<0?n:ends[i-1]+1),shown=pts.slice(0,e+1);
    $('rd-mem-cfg').innerHTML='<code>'+E(m.cfg)+'</code>, then <code>python3 hog.py 300</code>';
    const el=$('rd-mem-svg'),W=RD.width(el),H=200,L=40,B=20,T=12,ymax=320,x0=L,bw=(W-L-12)/30;
    const y=v=>H-B-(H-B-T)*v/ymax,step=Math.min(160,2600/Math.max(1,e-s0+1));
    let b='';
    b+='<line x1="'+L+'" x2="'+(W-6)+'" y1="'+y(lim)+'" y2="'+y(lim)+'" stroke="var(--bad)" stroke-dasharray="5 3"/>'+RD.t(L+4,y(lim)-5,(cur==='max'?'memory.max':'memory.high')+' 200 MiB',{fill:'var(--bad)',fs:11});
    [0,100,200,300].forEach(v=>{b+=RD.t(L-5,y(v)+4,v,{a:'end',fill:'var(--mute)',fs:11})});
    // the slots still to come, dashed, so the frame is filled from the first step
    for(let k=e+1;k<30;k++){b+='<rect x="'+(x0+k*bw+1)+'" y="'+y((k+1)*10)+'" width="'+Math.max(1,bw-2)+'" height="'+(H-B-y((k+1)*10))+'" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>'}
    shown.forEach((p,k)=>{const xx=x0+k*bw,h=H-B-y(p[2]),nw=k>=s0&&!last,st=nw?' class="rd-new" style="animation-delay:'+Math.round((k-s0)*step)+'ms"':'';
      b+='<g'+st+'><rect x="'+(xx+1)+'" y="'+y(p[2])+'" width="'+Math.max(1,bw-2)+'" height="'+h+'" fill="var(--acc)"/>';
      if(p[0]>p[2]+5)b+='<rect x="'+(xx+1)+'" y="'+y(p[0])+'" width="'+Math.max(1,bw-2)+'" height="'+(y(p[2])-y(p[0]))+'" fill="var(--c4)" opacity=".55"/>';
      const dt=p[1]-(k?shown[k-1][1]:0);if(dt>=100){const up=(k>0&&shown[k-1][1]-(k>1?shown[k-2][1]:0)>=100)?14:0;b+=RD.t(xx+bw/2,y(Math.max(p[0],p[2]))-5-up,dt>=1000?(dt/1000).toFixed(1)+' s':dt+' ms',{a:'middle',fill:'var(--bad)',fs:11,w:600})}
      b+='</g>'});
    if(last){const xx=x0+n*bw;b+=RD.t(Math.min(W-8,xx+4),y(lim)-22,cur==='max'?'OOM kill':cur==='high'?'no progress, 60 s':'done, no OOM',{a:xx+4>W-90?'end':'start',fill:cur==='highswap'?'var(--good)':'var(--bad)',w:700,fs:12})}
    [0,100,200,300].forEach(v=>{b+=RD.t(x0+(v/10)*bw,H-B+14,v,{a:'middle',fill:'var(--mute)',fs:11})});
    el.innerHTML=RD.svg(W,H,b,'memory.current per step')+'<div class="leg"><span style="--sw:var(--acc)">memory.current (charged to the cgroup)</span><span style="--sw:var(--c4)">swapped out</span></div><div class="small mute">Across: MiB requested so far, 10 MiB per step; dashed: steps still to come. Up: MiB. Red labels: steps that took 100 ms or more.</div>';
    const p=pts[e];
    $('rd-mem-cnt').innerHTML=RD.stat('elapsed',(last&&cur==='high'?'60,000 (timeout)':p[1].toLocaleString('en-US'))+' ms','measured')+RD.stat('memory.current',p[2]+' MiB','charged')+RD.stat('memory.events',last?'oom_kill '+m.ev.oom_kill+', high '+m.ev.high.toLocaleString('en-US'):'...','after the run');
  }
  const a=RD.anim({card:'rd-mem-card',ctl:'rd-mem-ctl',n:ST.max.length,draw,ms:4600,label:'Stretch of the run',list:'sx-mem-max'});
  RD.seg($('rd-mem-mode'),m=>{cur=m;['max','high','highswap'].forEach(k=>{$('sx-mem-'+k).hidden=k!==m});a.reset(ST[m].length,'sx-mem-'+m)});
  RD.onResize(()=>a.redraw());
})();
