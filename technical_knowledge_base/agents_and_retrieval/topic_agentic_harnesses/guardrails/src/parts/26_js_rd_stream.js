// ---- Reading: where a token-level stream rail (Qwen3Guard-Stream-0.6B) would cut each answer ----
(function(){
  const rows=GR.X.filter(x=>x.st);
  const el=document.getElementById('rd-st-svg');if(!el)return;
  if(!rows.length){el.innerHTML='<p class="small mute">Stream-rail data not built yet (run runs/run_stream.py, then mk_data.py).</p>';return}
  document.getElementById('rd-st-n').textContent=rows.length;
  const st={mode:'U'};
  const seg=document.getElementById('rd-st-mode');
  seg.innerHTML='<button data-m="U">Cut on Unsafe</button><button data-m="UC">Cut on Unsafe or Controversial</button>';
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.mode=b.dataset.m;draw()});
  const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
  function draw(){
    seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===st.mode));
    const cut=x=>st.mode==='U'?x.st[1]:x.st[2];
    const H=rows.filter(x=>x.unsafe).sort((a,b)=>a.st[0]-b.st[0]),G=rows.filter(x=>!x.unsafe).sort((a,b)=>a.st[0]-b.st[0]);
    const w=RD.width(el),L=118,R=8,maxT=Math.max(...rows.map(x=>x.st[0])),sx=(w-L-R)/maxT,bh=2,gap=1;
    let y=14,b='';
    const grp=(arr,name,col)=>{
      b+=RD.t(0,y+8,name,{fs:11,w:600});b+=RD.t(0,y+21,arr.length+' answers',{fs:10.5,fill:'var(--mute)'});
      const y0=y;
      arr.forEach(x=>{const c=cut(x),n=x.st[0];
        b+='<rect x="'+L+'" y="'+y+'" width="'+Math.max(1,n*sx)+'" height="'+bh+'" fill="'+(c>=0?'var(--dim)':col)+'"/>';
        if(c>=0){b+='<rect x="'+L+'" y="'+y+'" width="'+Math.max(1,c*sx)+'" height="'+bh+'" fill="'+col+'"/>';
          b+='<rect x="'+(L+c*sx-0.5)+'" y="'+(y-1)+'" width="2" height="'+(bh+2)+'" fill="var(--ink)"/>'}
        y+=bh+gap});
      y+=16;return y0};
    grp(H,'Harmful answers','var(--bad)');grp(G,'Good answers','var(--good)');
    // axis
    const ax=y;b+='<line x1="'+L+'" x2="'+(L+maxT*sx)+'" y1="'+ax+'" y2="'+ax+'" stroke="var(--line)"/>';
    const step=maxT>400?100:50;for(let t=0;t<=maxT;t+=step)b+=RD.t(L+t*sx,ax+13,t,{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,ax+18,b,'Where the stream rail cuts each answer')+'<div class="leg"><span>Axis: tokens of the answer (Qwen tokeniser)</span><span><i style="background:var(--bad)"></i>harmful answer, shown before the cut</span><span><i style="background:var(--good)"></i>good answer, shown</span><span><i style="background:var(--dim)"></i>never shown (after the cut)</span><span><i class="ln" style="background:var(--ink)"></i>the cut</span></div>';
    const hc=H.filter(x=>cut(x)>=0),gc=G.filter(x=>cut(x)>=0);
    const shown=hc.map(x=>cut(x)),frac=hc.map(x=>cut(x)/x.st[0]);
    document.getElementById('rd-st-out').innerHTML=RD.stat('Harmful answers cut',hc.length+' of '+H.length,'never flagged: '+(H.length-hc.length))+
      RD.stat('Tokens shown before the cut',med(shown).toFixed(0)+' (median)','of a median '+med(H.map(x=>x.st[0])).toFixed(0)+'-token answer; '+(100*med(frac)).toFixed(0)+'% of it')+
      RD.stat('Good answers cut',gc.length+' of '+G.length,'a good answer stopped partway');
    document.getElementById('rd-st-note').innerHTML='Every full compliance with an unsafe prompt ('+H.length+') plus '+G.length+' full compliances with safe prompts drawn at random (seed 0): the run was capped at about 20 minutes, so the other safe answers were not streamed. The user turn is moderated first, as the model card does; this chart shows only the answer. A cut after the first sentence still delivers that sentence, which is the cost of streaming without a buffer.';
    window.GR.stream={hc:hc.length,H:H.length,gc:gc.length,G:G.length,medShown:med(shown)};
  }
  draw();RD.onResize(draw);RD.onRender(draw);
})();
