// ---- The hero: where position enters, the five choices the article walks through, on one attention layer. ----
// Static 2D, drawn at the card's measured width and redrawn on resize. Every label is also in the figure's caption.
(function(){
  if(!window.RD||!document.getElementById('rp-hero-svg'))return;
  const t=RD.t, el=document.getElementById('rp-hero-svg');
  // left column: the path of one token; right: the choices, each tied to the step it changes
  const STEPS=[
    {k:'emb', s:['token embedding']},
    {k:'add', s:['+ position?'], op:true},
    {k:'qkv', s:['q, k, v = W x'], blk:true},
    {k:'rot', s:['rotate q and k?'], op:true, blk:true},
    {k:'sc',  s:['score q·k / √d','+ bias?'], op:true, blk:true},
    {k:'out', s:['softmax, mix v'], blk:true}
  ];
  const CH=[
    {at:'add', c:'var(--c1)', n:'§2', l:['Add once at the input:','GPT-2 table, 2017 sines']},
    {at:'rot', c:'var(--c2)', n:'§3-5', l:['All pairs: full RoPE','(most models)']},
    {at:'rot', c:'var(--c2)', n:'§6.1', l:['Some pairs: partial RoPE','(MiniMax-M3: 64 of 128)']},
    {at:'rot', c:'var(--c3)', n:'§6.2', l:['None here: a NoPE layer','(SmolLM3: every 4th)']},
    {at:'sc',  c:'var(--c4)', n:'§6.3', l:['Learned bias by distance','(Inkling; T5 earlier)']}
  ];
  function draw(){
    const W=RD.width(el), nar=W<440, bw=Math.min(190,Math.round(W*(nar?0.34:0.4))), x0=6, gap=Math.max(14,Math.min(40,W*0.05)), lx=x0+bw+gap;
    const rowH=56, choiceH=46, top=8;
    // vertical positions: each step row; a step with several choices gets taller
    let y=top; const Y={};
    STEPS.forEach(s=>{const n=Math.max(1,CH.filter(c=>c.at===s.k).length);const h=Math.max(rowH,n*choiceH+6);Y[s.k]={y:y,h:h};y+=h});
    const H=y+24;
    let s='';
    // the transformer block bracket
    const b0=Y.qkv.y-4, b1=Y.out.y+Y.out.h+14;
    s+='<rect x="'+(x0-3)+'" y="'+b0+'" width="'+(bw+6)+'" height="'+(b1-b0)+'" rx="10" fill="var(--soft)" stroke="var(--line)"/>';
    s+=t(x0+6,b1-6,'inside every block',{fs:11,fill:'var(--mute)'});
    STEPS.forEach((st,i)=>{
      const r=Y[st.k], cy=r.y+r.h/2, bh=st.s.length>1?40:28;
      const by=cy-bh/2;
      s+='<rect x="'+(x0+8)+'" y="'+by+'" width="'+(bw-16)+'" height="'+bh+'" rx="7" fill="var(--card)" stroke="'+(st.op?'var(--ink)':'var(--line)')+'" stroke-width="'+(st.op?1.4:1)+'"'+(st.op?' stroke-dasharray="4 3"':'')+'/>';
      st.s.forEach((line,j)=>{s+=t(x0+bw/2,by+(st.s.length>1?16+j*16:18),line,{fs:12,a:'middle',fill:'var(--ink)',w:st.op&&j===st.s.length-1?600:400})});
      if(i<STEPS.length-1){const ny=Y[STEPS[i+1].k];const nb=STEPS[i+1].s.length>1?40:28;
        s+='<line x1="'+(x0+bw/2)+'" x2="'+(x0+bw/2)+'" y1="'+(by+bh)+'" y2="'+(ny.y+ny.h/2-nb/2-2)+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#rp-ar)"/>'}
      // the choices that act at this step
      const cs=CH.filter(c=>c.at===st.k);
      cs.forEach((c,j)=>{const cyy=r.y+r.h/2+(j-(cs.length-1)/2)*choiceH;
        s+='<path d="M'+(x0+bw-8)+' '+cy+' C'+(x0+bw+gap*0.6)+' '+cy+' '+(lx-gap*0.6)+' '+cyy+' '+(lx-2)+' '+cyy+'" fill="none" stroke="'+c.c+'" stroke-width="1.6"/>';
        s+='<rect x="'+lx+'" y="'+(cyy-18)+'" width="5" height="36" rx="2" fill="'+c.c+'"/>';
        s+=t(lx+11,cyy-3,c.l[0],{fs:12,fill:'var(--ink)',w:600})+t(lx+11,cyy+13,c.l[1]+(nar?'':'  '+c.n),{fs:12,fill:'var(--mute)'});
      });
    });
    const defs='<defs><marker id="rp-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,H,defs+s,'One token through one attention layer, with the five places the article puts position: added at the input, rotating all, some or none of the query and key pairs, or a learned bias on the score');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
