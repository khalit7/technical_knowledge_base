// ---- Reading visuals in 2D: GIL against free-threaded (before/after) and the choosing tree ----
// (The hero, the lost update and the deadlock cycle became 3D stages on 2026-11-07: 28a to 28d.) Drawn at the measured width (RD.width), redrawn on resize.
(function(){
  const V=(window.CD&&window.CD.v)||{},T=RD.t;
  const rect=(x,y,w,h,f,s,r)=>'<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+h+'" rx="'+(r==null?6:r)+'" fill="'+f+'" stroke="'+s+'"/>';

  // ---- section 7: GIL build against free-threaded build, same job (before/after) ----
  (function(){const el=document.getElementById('rd-ft-svg');if(!el)return;const cap=document.getElementById('rd-ft-cap');
    const GIL=0.99,FT=0.37;let mode='gil';
    function draw(){const W=Math.min(760,RD.width(el)),lw=40,pw=W-lw-10,rh=26,H=4*rh+44;let s='';
      const x=t=>lw+t/GIL*pw,cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
      for(let k=0;k<4;k++){const y=8+k*rh;s+=T(4,y+15,'T'+(k+1),{w:600,fs:12,fill:cols[k]});
        s+='<line x1="'+lw+'" x2="'+(lw+pw)+'" y1="'+(y+rh/2-2)+'" y2="'+(y+rh/2-2)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
        if(mode==='gil'){const sl=GIL/24;for(let j=0;j<24;j++)if(j%4===k)s+=rect(x(j*sl),y+2,x(sl)-lw-0.5,rh-10,cols[k],'none',1)}
        else s+=rect(x(0),y+2,x(FT)-lw,rh-10,cols[k],'none',2);}
      const end=mode==='gil'?GIL:FT,ye=8+4*rh;
      s+='<line x1="'+x(end)+'" x2="'+x(end)+'" y1="4" y2="'+(ye+2)+'" stroke="var(--ink)" stroke-width="1.2"/>';
      s+=T(Math.min(x(end)+4,W-4),ye+16,end.toFixed(2)+' s',{a:x(end)+60>W?'end':'start',fs:12,w:600});
      s+=T(lw,ye+30,mode==='gil'?'one thread holds the GIL at a time; others wait on gil_cond':'all four run Python at once on four cores',{fs:11,fill:'var(--mute)'});
      el.innerHTML=RD.svg(W,H,s,'Four threads counting primes under each build');
      cap.innerHTML=mode==='gil'?'Same job, four threads counting primes: under the GIL they take turns (slices drawn schematically; the real hand-over follows the switch interval), so four threads took 0.99 s against 0.96 s serially. Totals to scale, from the Python page’s measurement (Python 3.14.8, 10 CPUs).':
        'Free-threaded 3.14t: no interpreter lock. dict, list and set take internal per-object locks, reference counts are biased to the owning thread, and constants are immortal; four threads took 0.37 s against 0.94 s serially (a busy laptop, so not a clean 4x). Your own shared data still needs a lock.';}
    RD.seg(document.getElementById('rd-ft-mode'),m=>{mode=m;draw()});
    RD.onRender(draw);RD.onResize(draw);draw();})();

  // ---- section 9: choosing, as a tree ----
  (function(){const el=document.getElementById('rd-ch-svg');if(!el)return;
    const R=[[0,'What does the work wait on?','q'],[1,'I/O: thousands of connections, async libraries?','q'],[2,'yes: one event loop (asyncio, uvloop, tokio)','a'],[2,'no: a thread pool (blocking libraries)','a'],
      [1,'CPU: is the hot loop Python?','q'],[2,'yes: processes, or free-threaded threads','a'],[2,'no (NumPy, PyTorch drop the GIL): threads','a']];
    function draw(){const W=Math.min(760,RD.width(el)),rh=26,ind=W<460?16:26,H=R.length*rh+6;let s='';
      R.forEach(([d,t,k],i)=>{const y=4+i*rh,x=6+d*ind;
        if(d>0){let p=i-1;while(p>=0&&R[p][0]>=d)p--;const px=6+(d-1)*ind+6,py=4+p*rh+rh-6;
          s+='<path d="M'+px+' '+py+' V'+(y+rh/2-2)+' H'+(x-2)+'" fill="none" stroke="var(--mute)"/>';}
        if(k==='a')s+=rect(x,y+2,Math.min(W-x-4,t.length*6.6+16),rh-6,'var(--acc2)','var(--acc)',5);
        s+=T(x+(k==='a'?8:0),y+17,t,{fs:k==='q'?12:11.5,w:k==='q'?600:400});});
      el.innerHTML=RD.svg(W,H,s,'Decision tree: threads, processes or an event loop');}
    RD.onRender(draw);RD.onResize(draw);draw();})();
})();
