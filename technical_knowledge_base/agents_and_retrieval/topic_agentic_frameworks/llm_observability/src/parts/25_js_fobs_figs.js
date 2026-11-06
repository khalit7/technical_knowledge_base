// ---- fobs: static figure in the Reading tab: token accounting to scale (section 2). Drawn at the measured width; nothing moves.
// (The hero, the Langfuse stack and the eval loop became the 3D stages 40 to 42 on 2026-11-06.) ----
(function(){
  if(!document.getElementById('fobs-tok-svg'))return;
  const {D,fmt}=FOBSU,T=RD.t;
  // Section 2: the first Claude Code call's input tokens to scale
  function tok(){const el=document.getElementById('fobs-tok-svg');if(!el)return;const w=Math.floor(RD.width(el));
    const a=D.cc.spans.filter(s=>s[3]==='claude_code.llm_request')[0][7];
    const f=a.input_tokens,r=a.cache_read_tokens,c=a.cache_creation_tokens,tot=f+r+c,x0=6,W=w-12,sx=v=>v/tot*W;
    const wf=Math.max(3,sx(f)),wr=sx(r)-(wf-sx(f)),wc=sx(c);let b='';const y=40,h=24;
    b+='<rect x="'+x0+'" y="'+y+'" width="'+wf+'" height="'+h+'" fill="var(--c1)"/>';
    b+='<rect x="'+(x0+wf)+'" y="'+y+'" width="'+wr+'" height="'+h+'" fill="var(--c6)" opacity=".85"/>';
    b+='<rect x="'+(x0+wf+wr)+'" y="'+y+'" width="'+wc+'" height="'+h+'" fill="var(--c5)" opacity=".85"/>';
    b+=T(x0+wf+wr/2,y+16,'cache read '+fmt(r),{a:'middle',fs:11.5,fill:'var(--bg)',w:600});
    b+=T(x0+wf+wr+wc/2,y+16,'cache write '+fmt(c),{a:'middle',fs:11.5,fill:'var(--bg)',w:600});
    b+='<path d="M'+(x0+1)+','+(y-3)+' V'+(y-14)+' H'+(x0+14)+'" fill="none" stroke="var(--acc)" stroke-width="1.5"/>'+T(x0+18,y-10,'Anthropic input_tokens = '+fmt(f)+' (fresh only)',{fs:12,fill:'var(--acc)',w:600});
    b+='<path d="M'+x0+','+(y+h+4)+' V'+(y+h+10)+' H'+(x0+W)+' V'+(y+h+4)+'" fill="none" stroke="var(--ink)" stroke-width="1.2"/>'+T(x0+W/2,y+h+26,'gen_ai.usage.input_tokens = '+fmt(tot),{a:'middle',fs:12,fill:'var(--ink)',w:600});
    el.innerHTML=RD.svg(w,y+h+34,b,'Input tokens of the first model call: fresh, cache read and cache write, drawn to scale')}

  function all(){tok()}
  all();RD.onRender(all);RD.onResize(all);
})();
