// ---- Reading: the DataLoader's processes as a static annotated figure (section 9). The 2026-10-24 hero, clone-flags, signal's-life and
// three-tables figures became the 3D stages of Figs. 1, 3, 5 and 7 on 2026-11-07 (36a to 36f).
// All drawn at the measured width, two layouts (narrow below 560 px), labels on the figure, captions in HTML. No motion.
(function(){
  if(!window.RD)return;
  const esc=RD.esc;
  const T=(x,y,s,o)=>RD.t(x,y,esc(s),o);
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const defs=id=>'<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const arr=(id,x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.col||'var(--mute)')+'" stroke-width="'+(o.w||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+' marker-end="url(#'+id+')"/>'};
  const lines=(x,y,arr2,o)=>arr2.map((s,i)=>T(x,y+i*((o&&o.lh)||14),s,o)).join('');

  // 5. The DataLoader: main process, two forked workers, queues, SIGCHLD and the watchdog
  function dl(){
    const el=document.getElementById('rd-dl-svg');if(!el)return;
    const W=RD.width(el),nar=W<640,fs=12;let b=defs('rddA');
    const mainL=['train.py main process','SIGCHLD handler (4)','index queue per worker','one result queue'];
    if(!nar){
      const mw=Math.min(240,W*0.34),ww=Math.min(280,W*0.42),wx=W-ww-2,wh=80,mh=2*wh+28;
      b+=box(2,4,mw,mh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+T(10,22,mainL[0],{fs:fs,w:600})+lines(10,42,mainL.slice(1),{fs:11.5,lh:16});
      [0,1].forEach(i=>{const y=4+i*(wh+28);b+=box(wx,y,ww,wh)+T(wx+8,y+17,'pt_data_worker '+i+' (forked, daemon)',{fs:fs,w:600})+lines(wx+8,y+34,['(2) handlers for SIGBUS, SIGSEGV,','SIGFPE, SIGTERM; 1 thread; seed','(3) watchdog: getppid() every 5.0 s'],{fs:11,fill:'var(--mute)',lh:15});
        const yc=y+wh/2,x1=2+mw,x2=wx;
        b+=arr('rddA',x1+2,yc-8,x2-2,yc-8,{col:'var(--acc)'})+T((x1+x2)/2,yc-12,'(1) fork; (3) indices',{fs:11.5,a:'middle',fill:'var(--acc)'});
        b+=arr('rddA',x2-2,yc+8,x1+2,yc+8)+T((x1+x2)/2,yc+21,'(3) batch as a /dev/shm fd',{fs:11.5,a:'middle',fill:'var(--mute)'})});
      const H=4+2*(wh+28)+36;
      b+=T(2,H-22,'(4) a worker dies: SIGCHLD, waitid, RuntimeError in the main thread.',{fs:11.5,fill:'var(--mute)'})+T(2,H-6,'(5) shutdown: done event, stop message, join 5.0 s.',{fs:11.5,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,b,'The DataLoader main process and its two forked worker processes');return}
    const mh=74;b+=box(2,2,W-4,mh,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5})+T(10,20,mainL[0],{fs:fs,w:600})+lines(10,38,mainL.slice(1),{fs:11.5});
    const ww=(W-14)/2,wy=mh+58,wh=104;
    [0,1].forEach(i=>{const x=2+i*(ww+10);b+=box(x,wy,ww,wh)+T(x+6,wy+16,'worker '+i+' (forked)',{fs:fs,w:600})+lines(x+6,wy+32,['(2) C handlers','for SIGTERM and','crashes; 1 thread','(3) getppid()','every 5.0 s'],{fs:11,fill:'var(--mute)',lh:13.5});
      const xc=x+ww/2;b+=arr('rddA',xc-10,mh+4,xc-10,wy-2,{col:'var(--acc)'})+arr('rddA',xc+10,wy-2,xc+10,mh+4)});
    const lx=2+ww/2+18;b+=T(lx,mh+24,'(1) fork, (3) indices',{fs:11.5,fill:'var(--acc)'})+T(lx,mh+40,'(3) batches as fds',{fs:11.5,fill:'var(--mute)'});
    const H=wy+wh+40;
    b+=T(2,H-22,'(4) a worker dies: SIGCHLD, RuntimeError',{fs:11.5,fill:'var(--mute)'})+T(2,H-7,'(5) shutdown: stop message, join 5.0 s',{fs:11.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'The DataLoader main process and its two forked worker processes');
  }

  const all=()=>{dl()};
  all();RD.onRender(all);RD.onResize(all);
})();
