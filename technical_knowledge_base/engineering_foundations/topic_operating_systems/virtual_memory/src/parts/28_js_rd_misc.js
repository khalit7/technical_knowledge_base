// ---- Static figures: section 6 watermarks (derived from the measured min_free_kbytes), section 9 pageable against pinned copy, section 10 commit bars ----
(function(){
  const $=id=>document.getElementById(id),D=window.VM_DATA;
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const W=el=>Math.min(860,RD.width(el));
  // section 6: watermarks. 5.10: low = min + max(min/4, managed*scale/10000), high = min + 2*that (summed over zones)
  function wm(){const el=$('vm-wm');if(!el)return;const w=W(el),nar=w<560,m=4,U=w-2*m;
    const min=+D.env.min_free_kbytes,step=Math.max(min/4,D.commit.MemTotal_kb*(+D.env.watermark_scale_factor)/10000),low=min+step,high=min+2*step,top=Math.ceil((high+step*1.6)/1024)*1024;
    const x=v=>m+U*v/top,y0=34,h=30;
    const Z=[[0,min,'var(--bad)',nar?'direct reclaim':'direct reclaim: the allocating process stalls'],[min,low,'var(--c5)',nar?'kswapd':'kswapd awake'],[low,high,'var(--c1)',nar?'until high':'kswapd until high'],[high,top,'var(--c3)',nar?'asleep':'kswapd asleep']];
    let b='';Z.forEach(z=>{b+='<rect x="'+x(z[0]).toFixed(1)+'" y="'+y0+'" width="'+(x(z[1])-x(z[0])).toFixed(1)+'" height="'+h+'" fill="'+z[2]+'" fill-opacity=".25" stroke="'+z[2]+'"/>'});
    Z.forEach((z,k)=>{const cx=(x(z[0])+x(z[1]))/2;b+=RD.t(cx.toFixed(1),y0+h+16+(nar&&k%2?13:0),z[3],{a:'middle',fs:10.5,fill:'var(--ink)'})});
    [[min,'min '+fmt(min/1024)+' MiB'],[low,(nar?'low ':'low ~')+fmt(low/1024)],[high,(nar?'high ':'high ~')+fmt(high/1024)]].forEach((t,k)=>{b+='<line x1="'+x(t[0]).toFixed(1)+'" x2="'+x(t[0]).toFixed(1)+'" y1="'+(y0-6)+'" y2="'+(y0+h)+'" stroke="var(--ink)" stroke-width="1.5"/>'+RD.t(x(t[0]).toFixed(1),y0-10-(nar&&k===1?12:0),t[1],{a:'middle',fs:10.5,w:600,fill:'var(--ink)'})});
    b+=RD.t(m,12,'free memory (MiB) →',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,y0+h+(nar?36:24),b,'Free memory with the min, low and high watermarks');}
  // section 9: one host-to-GPU copy, pageable against pinned
  function pin(){const el=$('vm-pin');if(!el)return;const w=W(el),nar=w<560,m=2;
    let b='<defs><marker id="vmp-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    const bw=nar?(w-2*m)*.215:(w-2*m)*.22,gap=((w-2*m)-3*bw)/2,bh=40;
    const box=(x,y,l1,l2,c,dim)=>'<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+bw.toFixed(1)+'" height="'+bh+'" rx="4" fill="'+c+'" fill-opacity="'+(dim?.06:.22)+'" stroke="'+c+'"'+(dim?' stroke-dasharray="4 3"':'')+'/>'+RD.t((x+bw/2).toFixed(1),y+17,l1,{a:'middle',fs:nar?10.5:11.5,w:600,fill:'var(--ink)'})+RD.t((x+bw/2).toFixed(1),y+32,l2,{a:'middle',fs:10.5,fill:'var(--mute)'});
    const arr=(x1,x2,y,l)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y+'" x2="'+x2.toFixed(1)+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#vmp-ar)"/>'+RD.t(((x1+x2)/2).toFixed(1),y-6,l,{a:'middle',fs:10.5,fill:'var(--ink)'});
    const X=k=>m+k*(bw+gap);
    b+=RD.t(m,14,nar?'Pageable (default): two copies':'Pageable tensor (default): two copies, the call waits',{fs:11.5,w:600,fill:'var(--bad)'});
    b+=box(X(0),22,'tensor',nar?'pageable':'pageable RAM','var(--c3)')+arr(X(0)+bw+2,X(1)-2,42,nar?'memcpy':'CPU memcpy')+box(X(1),22,'staging',nar?'pinned':'pinned, driver-owned','var(--c4)')+arr(X(1)+bw+2,X(2)-2,42,'DMA')+box(X(2),22,'GPU','memory','var(--c1)');
    const y2=100;
    b+=RD.t(m,y2-8,nar?'Pinned (pin_memory=True): one copy':'Pinned tensor (pin_memory=True): one DMA, can overlap compute',{fs:11.5,w:600,fill:'var(--good)'});
    b+=box(X(0),y2,'tensor',nar?'pinned':'pinned RAM','var(--c4)')+arr(X(0)+bw+2,X(2)-2,y2+20,nar?'DMA, async':'DMA, non_blocking=True')+box(X(2),y2,'GPU','memory','var(--c1)');
    el.innerHTML=RD.svg(w,y2+bh+6,b,'Pageable memory is copied to a pinned staging buffer before DMA; pinned memory is copied by DMA directly');}
  // section 10: commit accounting bars
  function cmt(){if(!$('vm-cmt')||!window.VMB)return;const C=D.commit,rss=+((D.commit_txt.match(/VmRSS_kb (\d+)/)||[0,0])[1]);
    const g=kb=>fmt(kb/1048576,1)+' GiB';
    VMB('vm-cmt',[{n:'RAM',v:C.MemTotal_kb,c:'var(--c6)',t:g(C.MemTotal_kb)},{n:'CommitLimit',v:C.CommitLimit_kb,c:'var(--bad)',t:g(C.CommitLimit_kb)},{n:'Committed before',v:C.Committed_AS_kb,c:'var(--c1)',t:g(C.Committed_AS_kb)},{n:'Committed after',v:C.after_kb,c:'var(--c1)',t:g(C.after_kb),hl:1},{n:'Process RSS',v:rss,c:'var(--c3)',t:fmt(rss)+' KiB'}],{cap:'RAM is MemTotal; CommitLimit is where mode 2 would refuse; Committed_AS before and after one mmap(64 GiB), '+fmt(C.after_kb/C.CommitLimit_kb,1)+'x the limit; RSS of the process that made it.'});}
  function all(){wm();pin();cmt()}
  all();RD.onRender(all);RD.onResize(()=>{wm();pin()});
})();
