// ---- Hero: standard attention against FlashAttention, HBM against SRAM, with Figure 2's numbers; static, nothing moves ----
(function(){const host=$('heroSvg');if(!host)return;
  function panel(x0,pw,fa){const c=fa?'var(--acc)':'var(--c2)',top=24,bh=100,sy=top+bh+34,sh=58;let o='';
    o+=tx(x0,14,fa?'FlashAttention (Algorithm 1)':'Standard attention (Algorithm 0)',{fs:13,w:600,c});
    // HBM band
    o+=rc(x0,top,pw,bh,'var(--soft)',{s:'var(--line)'})+tx(x0+8,top+15,'HBM: 40 to 80 GB, 1.5 TB/s',{fs:11,c:'var(--mute)'});
    const ix=x0+10,iy=top+24,ih=58,thin=(x,l)=>rc(x,iy,10,ih,'var(--ink)',{op:.55,r:2})+tx(x+5,iy+ih+13,l,{fs:11,a:'middle'});
    o+=thin(ix,'Q')+thin(ix+20,'K')+thin(ix+40,'V');
    if(!fa){o+=rc(ix+64,iy,ih,ih,c,{op:.8,r:2})+tx(ix+64+ih/2,iy+ih/2+4,'S',{fs:13,a:'middle',w:600,c:'var(--bg)'})+tx(ix+64+ih/2,iy+ih+13,'N × N',{fs:11,a:'middle'});
      o+=rc(ix+130,iy,ih,ih,c,{op:.8,r:2})+tx(ix+130+ih/2,iy+ih/2+4,'P',{fs:13,a:'middle',w:600,c:'var(--bg)'})+tx(ix+130+ih/2,iy+ih+13,'N × N',{fs:11,a:'middle'});
      o+=thin(ix+198,'O')}
    else{o+=rc(ix+64,iy,ih,ih,'none',{s:'var(--mute)',da:'4 3',r:2})+tx(ix+64+ih/2,iy+ih/2-2,'N × N',{fs:11,a:'middle',c:'var(--mute)'})+tx(ix+64+ih/2,iy+ih/2+12,'not stored',{fs:11,a:'middle',c:'var(--mute)'});
      o+=thin(ix+132,'O')+rc(ix+152,iy+ih-14,10,14,'var(--ink)',{op:.55,r:2})+tx(ix+157,iy+ih+13,'m, ℓ',{fs:11,a:'middle'})}
    // traffic: one arrow pair per HBM round trip
    const n=fa?2:6,aw=pw-40;for(let k=0;k<n;k++){const x=x0+20+(k+.5)*aw/n;o+=ln2(x-3,top+bh+4,x-3,sy-4,c,{sw:fa?1.6:2.2})+ln2(x+3,top+bh+4,x+3,sy-4,c,{sw:fa?1.6:2.2,op:.6})}
    // SRAM box
    o+=rc(x0,sy,pw,sh,'var(--bg)',{s:'var(--line)'})+tx(x0+8,sy+15,'SRAM: 192 KB per SM, ~19 TB/s',{fs:11,c:'var(--mute)'});
    o+=tx(x0+8,sy+33,fa?'tiles of Q, K, V, S, P; one fused kernel':'a kernel per step: QKᵀ, softmax, PV',{fs:12});
    o+=tx(x0+8,sy+50,fa?'each row keeps a running m and ℓ':'each one reads and writes HBM',{fs:12,c:'var(--mute)'});
    o+=tx(x0,sy+sh+22,fa?'4.4 GB moved, 7.3 ms':'40.3 GB moved, 41.7 ms',{fs:13,w:600,c});
    o+=tx(x0,sy+sh+39,fa?'75.2 GFLOPs: 13% more arithmetic':'66.6 GFLOPs',{fs:11,c:'var(--mute)'});
    return o}
  function draw(W){const two=W>=600,pw=two?(W-28)/2:W-2,ph=280;
    const s=two?panel(1,pw,0)+panel(pw+27,pw,1):panel(1,pw,0)+'<g transform="translate(0,'+(ph+14)+')">'+panel(1,pw,1)+'</g>';
    host.innerHTML=svgW(W,two?ph:2*ph+14,s,'Standard attention writes the N by N matrices S and P to HBM and reads them back, moving 40.3 GB in 41.7 ms; FlashAttention keeps tiles in on-chip SRAM, stores only O and the per-row statistics, and moves 4.4 GB in 7.3 ms')}
  fit(host,draw)})();
