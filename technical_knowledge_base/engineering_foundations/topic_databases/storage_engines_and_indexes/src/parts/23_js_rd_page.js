// ---- Reading sections 1, 3, 4: the page drawn to scale, WAL bars, commit bars, crash log (all from SE, the measured data) ----
window.BARS=function(el,rows,o){o=o||{};const mx=o.max||Math.max(...rows.map(r=>r.v));
  el.innerHTML=(o.title?'<div class="small" style="font-weight:600;margin:4px 0">'+o.title+'</div>':'')+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+RD.esc(r.n)+'">'+r.n+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.6,100*r.v/mx).toFixed(2)+'%;background:'+(r.c||'var(--acc)')+'"></span></span><span class="val">'+r.l+'</span></div>').join('')};
window.FMT={
  b:v=>v>=1e9?(v/1e9).toFixed(2)+' GB':v>=1e6?(v/1e6).toFixed(v>=1e8?0:1)+' MB':v>=1e3?(v/1e3).toFixed(v>=1e5?0:1)+' kB':v+' B',
  n:v=>Math.round(v).toLocaleString('en-US')};
(function(){
  const h=SE.m1.page0_header,el=document.getElementById('rd-pg0');
  if(el){const lp=h.lower-24,free=h.upper-h.lower,tup=h.special-h.upper,P=h.pagesize;
    const seg=(w,c,t)=>'<span style="width:'+(100*w/P).toFixed(3)+'%;background:'+c+'" title="'+t+'">'+(w/P>0.08?t:'')+'</span>';
    el.innerHTML=seg(24,'var(--c4)','header')+seg(lp,'var(--c1)','line pointers')+seg(free,'var(--dim)','free')+seg(tup,'var(--c3)','tuples ('+FMT.n(tup)+' bytes)')}
  const w=SE.m2,one=w.one_insert,ru=w.random_updates.runs;
  const own=x=>x.filter(r=>r.rm!=='Heap2').reduce((a,r)=>a+r.len,0); // the insert's own records (the Heap2 PRUNE records were catalog housekeeping)
  const fb=document.getElementById('rd-fpw-bars');
  if(fb){const rows=[{n:'1 insert, page images off',v:own(one.off.first),l:FMT.n(own(one.off.first))+' B',c:'var(--c3)'},{n:'1 insert, page images on',v:own(one.on.first),l:FMT.n(own(one.on.first))+' B',c:'var(--c2)'}];
    BARS(fb,rows,{title:'WAL bytes for one insert just after a checkpoint'});
    const r2=document.createElement('div');r2.className='bars';fb.after(r2);
    const on=ru.find(r=>r.full_page_writes==='on'&&r.wal_compression==='off'),off=ru.find(r=>r.full_page_writes==='off'),cp=ru.find(r=>r.wal_compression!=='off');
    BARS(r2,[{n:'images off',v:off.first_bytes,l:FMT.b(off.first_bytes),c:'var(--c3)'},{n:'images on',v:on.first_bytes,l:FMT.b(on.first_bytes),c:'var(--c2)',hl:1},
      {n:'images on, pglz',v:cp.first_bytes,l:FMT.b(cp.first_bytes),c:'var(--c5)'},{n:'same 1,000 again',v:on.second_bytes,l:FMT.b(on.second_bytes),c:'var(--c1)'}],{title:'WAL bytes for 1,000 random-row updates just after a checkpoint'})}
  const cb=document.getElementById('rd-commit-bars');
  if(cb){const R=w.commit.runs,g=(s,c)=>R.find(r=>r.synchronous_commit===s&&r.clients===c);
    BARS(cb,[['on',1],['on',32],['off',1],['off',32]].map(([s,c])=>({n:'sync '+s+', '+c+' client'+(c>1?'s':''),v:g(s,c).tps,l:FMT.n(g(s,c).tps)+'/s',c:s==='on'?'var(--c2)':'var(--c3)'})),{title:'Committed write transactions per second'})}
  const cl=document.getElementById('rd-crashlog');
  if(cl){cl.innerHTML=SE.m1.crash.log.filter(l=>!/listening on|starting PostgreSQL/.test(l)).map(l=>{l=RD.esc(l.replace(/^LOG:\s+/,''));return /redo starts|invalid record|redo done|end-of-recovery/.test(l)?'<span class="on">'+l+'</span>':l}).join('\n')}
})();
