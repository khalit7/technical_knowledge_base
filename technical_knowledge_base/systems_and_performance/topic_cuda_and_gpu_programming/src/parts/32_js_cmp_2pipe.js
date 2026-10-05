// ---- Compiler explorer: 1. the pipeline animation (CUDA path vs Triton path, same vector add) ----
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('cmp-pipe'))return;
  let mode='cuda';
  const steps=()=>D.pipe[mode];
  function draw(i){
    const S=steps(),el=X.$('cmp-pipe-svg'),W=X.width(el),n=S.length;
    const narrow=W<560,bw=narrow?W-8:Math.min(150,(W-8-(n-1)*14)/n),bh=narrow?26:46;
    let svg='';
    S.forEach((s,j)=>{
      const x=narrow?4:4+j*(bw+14),y=narrow?4+j*(bh+8):6;
      const on=j===i,done=j<i,col=s.kind==='run'?'var(--c3)':(s.kind==='ir'?'var(--c4)':'var(--c1)');
      svg+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="6" fill="'+(on?col:'var(--soft)')+'" stroke="'+(on||done?col:'var(--line)')+'" stroke-width="'+(on?2:1)+'"/>';
      const lab=X.esc(s.name),sub=X.esc(s.tool);
      if(narrow){svg+='<text x="'+(x+8)+'" y="'+(y+17)+'" font-size="12" fill="'+(on?'var(--bg)':'var(--ink)')+'" font-weight="600">'+lab+'</text><text x="'+(x+bw-8)+'" y="'+(y+17)+'" font-size="11" text-anchor="end" fill="'+(on?'var(--bg)':'var(--mute)')+'">'+sub+'</text>'}
      else{svg+='<text x="'+(x+bw/2)+'" y="'+(y+19)+'" font-size="12" text-anchor="middle" fill="'+(on?'var(--bg)':'var(--ink)')+'" font-weight="600">'+lab+'</text><text x="'+(x+bw/2)+'" y="'+(y+36)+'" font-size="10.5" text-anchor="middle" fill="'+(on?'var(--bg)':'var(--mute)')+'">'+sub+'</text>';
        if(j<n-1)svg+='<path d="M'+(x+bw+2)+' '+(y+bh/2)+'h9" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#cmp-arr)"/>'}
    });
    const H=narrow?4+n*(bh+8):bh+12;
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Compiler stages"><defs><marker id="cmp-arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L6,3L0,6z" fill="var(--mute)"/></marker></defs>'+svg+'</svg>';
    const s=S[i];
    X.$('cmp-pipe-cap').innerHTML='<b>Step '+(i+1)+' of '+n+': '+X.esc(s.name)+'</b> ('+X.esc(s.tool)+'). '+s.cap;
    X.$('cmp-pipe-code').innerHTML=s.text.map(l=>'<span class="cmp-ln'+(l[1]?' on':'')+'"><span class="n"></span>'+X.esc(l[0])+'</span>').join('');
    X.$('cmp-pipe-note').innerHTML=s.note||'';
  }
  const A=X.anim({card:'cmp-pipe',ctl:'cmp-pipe-ctl',n:steps().length,draw,ms:2600,label:'Compiler stage'});
  X.seg(X.$('cmp-pipe-mode'),m=>{mode=m;A.reset(steps().length)});
  X.onResize(()=>A.redraw());
})();
