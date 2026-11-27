// ---- The hero: Nanbeige4.2-3B as stored (22 blocks, run twice), as computed (44 applications), and an unlooped 44-block model. ----
// Static 2D, drawn at the card's measured width and redrawn on resize. Numbers from window.ARTICLE.recompute (src/recompute.py);
// every number drawn is also in the figure's caption.
(function(){
  if(!window.RD||!window.ARTICLE||!ARTICLE.recompute||!document.getElementById('lt-hero-svg'))return;
  const t=RD.t, el=document.getElementById('lt-hero-svg'), R=ARTICLE.recompute;
  const row=R.rows.find(x=>x.r===2&&x.mode==='per');
  const blocks=R.params.blocks, gf=row.flops_per_token/1e9, kv=row.kv_bytes_per_token/1024;
  function stack(x,yb,n,u,w,fill,op,dash){let s='';for(let i=0;i<n;i++){const y=yb-(i+1)*u;s+='<rect x="'+x+'" y="'+(y+0.6)+'" width="'+w+'" height="'+Math.max(1.5,u-1.2)+'" rx="1.2" fill="'+fill+'" fill-opacity="'+op+'"'+(dash?' stroke="var(--ink)" stroke-opacity=".25" stroke-width=".6"':'')+'/>'}return s}
  function draw(){
    const W=RD.width(el), nar=W<460, u=nar?4:4.6, top=34, sh=44*u, yb=top+sh;
    const cw=nar?Math.min(46,W*0.12):Math.min(64,W*0.11);
    // three stacks: stored, unrolled, distinct; the first two form the looped panel
    const gx=nar?Math.max(30,W*0.09):Math.max(46,W*0.1);
    const x1=8, x2=x1+cw+gx, x3=W-8-cw;
    let s='';
    // panel backgrounds
    s+='<rect x="2" y="4" width="'+(x2+cw+8)+'" height="'+(yb+8)+'" rx="10" fill="var(--soft)" stroke="var(--line)"/>';
    s+='<rect x="'+(x3-8)+'" y="4" width="'+(cw+14)+'" height="'+(yb+8)+'" rx="10" fill="var(--soft)" stroke="var(--line)"/>';
    s+=t(x1+cw/2,22,'stored',{fs:12,a:'middle',fill:'var(--mute)'})+t(x2+cw/2,22,'computed',{fs:12,a:'middle',fill:'var(--mute)'})+t(x3+cw/2,22,'44 distinct',{fs:12,a:'middle',fill:'var(--mute)'});
    // stored: 22 blocks, with the loop arrow
    s+=stack(x1,yb,22,u,cw,'var(--c1)',0.9);
    const ly=yb-22*u, lx=x1+cw+Math.min(16,gx*0.4);
    s+='<path d="M'+(x1+cw)+' '+(ly+3)+' H'+lx+' V'+(yb-3)+' H'+(x1+cw+5)+'" fill="none" stroke="var(--c2)" stroke-width="1.8" marker-end="url(#lt-ar)"/>';
    s+=t(lx+4,(ly+yb)/2+4,'×2',{fs:13,fill:'var(--c2)',w:700});
    s+=t(x1+cw/2,ly-6,'22 blocks',{fs:12,a:'middle',fill:'var(--ink)'});
    // computed: pass 1 and pass 2, same weights
    s+=stack(x2,yb,22,u,cw,'var(--c1)',0.9);
    s+=stack(x2,yb-22*u,22,u,cw,'var(--c1)',0.45,true);
    s+=t(x2+cw+5,yb-11*u+4,nar?'1':'pass 1',{fs:12,fill:'var(--mute)'})+t(x2+cw+5,yb-33*u+4,nar?'2':'pass 2',{fs:12,fill:'var(--mute)'});
    // distinct: 44 blocks, each its own weights
    s+=stack(x3,yb,44,u,cw,'var(--c3)',0.85);
    // the middle: what is equal and what is not
    const mx=(x2+cw+(nar?16:46)+x3-8)/2, mw=x3-8-(x2+cw+(nar?16:46));
    const lines=[['block weights',(blocks/1e9).toFixed(2)+'B vs '+(2*blocks/1e9).toFixed(2)+'B',1],['compute / token',gf.toFixed(1)+' GFLOP, same',0],['KV cache / token',kv+' KiB, same',0],['hidden depth','44 applications, same',0]];
    let y=top+18;
    lines.forEach(L=>{s+=t(mx,y,L[0],{fs:12,a:'middle',fill:'var(--mute)'});s+=t(mx,y+16,L[1],{fs:nar?12:13,a:'middle',fill:L[2]?'var(--c2)':'var(--ink)',w:L[2]?700:500});y+=nar?46:52});
    if(mw<120){/* very narrow: the middle text would collide; the caption carries the numbers */}
    const defs='<defs><marker id="lt-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--c2)"/></marker></defs>';
    el.innerHTML=RD.svg(W,yb+14,defs+s,'Nanbeige4.2-3B stores 22 blocks and runs them twice, 44 block applications; an unlooped model of the same depth stores 44 blocks. Block weights differ, 3.15 against 6.30 billion parameters; compute, KV cache and hidden depth per token are the same');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
