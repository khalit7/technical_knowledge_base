// ---- Reading hero: one real next-token distribution (Qwen2.5-0.5B-Instruct, lighthouse story, token 2) through the six stages of a decoder ----
// Static diagram drawn from the page's data with the page's sampler (numbers quoted in the caption: src/reading_numbers.mjs).
(function(){
  const el=document.getElementById('sd-hero');if(!el||!window.SD||!SD.run)return;
  const pos=SD.LAB.prompts.find(p=>p.k==='story').pos[1];
  const E=SD.entries(pos),base={k:0,p:1,minp:0,typ:1,order:'first'};
  const R1=SD.run(E,Object.assign({},base,{T:1})),RT=SD.run(E,Object.assign({},base,{T:1.5})),RM=SD.run(E,Object.assign({},base,{T:1.5,minp:0.1}));
  const N=8,V=E.reduce((a,e)=>a+e.n,0),sc=R1.pre[0];
  const pick=+Object.keys(SD.draw(RM,1,7))[0];
  const lmin=E[N-1].l-1,lmax=E[0].l;
  const pct=v=>(v*100).toFixed(1)+'%';
  const stages=[
    ['1 Logits',SD.fmtN(V)+' scores',j=>(E[j].l-lmin)/(lmax-lmin),()=> 'var(--mute)'],
    ['2 Processors','penalties, mask',j=>(E[j].l-lmin)/(lmax-lmin),()=> 'var(--mute)'],
    ['3 Temperature','T 1.5: top '+pct(RT.pre[0]),j=>RT.pre[j]/sc,()=> 'var(--mute)'],
    ['4 Truncate','min-p 0.1: '+RM.kept+' kept',j=>RT.pre[j]/sc,j=>RM.keep[j]?'var(--acc)':'var(--dim)'],
    ['5 Renormalise','top '+pct(RM.fin[0]),j=>RM.fin[j]/sc,()=> 'var(--acc)'],
    ['6 Choose','argmax or a draw',j=>RM.fin[j]/sc,j=>j===pick?'var(--acc)':'var(--dim)']
  ];
  function draw(){
    const W=RD.width(el),cols=W>=640?6:3,gap=W>=640?14:12,bw=(W-(cols-1)*gap)/cols,bh=100,rg=26;
    const rows=Math.ceil(stages.length/cols),H=rows*bh+(rows-1)*rg+2;
    let s='';
    const xy=i=>[(i%cols)*(bw+gap),Math.floor(i/cols)*(bh+rg)+1];
    stages.forEach((st,i)=>{
      const [x,y]=xy(i);
      s+='<rect class="'+(i===3?'boxa':'box')+'" x="'+(x+.5)+'" y="'+y+'" width="'+(bw-1)+'" height="'+bh+'" rx="7"/>';
      s+='<text class="b" x="'+(x+8)+'" y="'+(y+16)+'">'+st[0]+'</text><text class="m" x="'+(x+8)+'" y="'+(y+31)+'">'+st[1]+'</text>';
      const bx=x+8,bwid=bw-16,slot=bwid/N,top=y+40,hh=bh-48;
      for(let j=0;j<N;j++){const v=Math.max(0,Math.min(1,st[2](j)));const h=Math.max(1,v*hh);
        s+='<rect x="'+(bx+j*slot+1).toFixed(1)+'" y="'+(top+hh-h).toFixed(1)+'" width="'+Math.max(1,slot-2).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1" fill="'+st[3](j)+'"/>'}
      if(i<stages.length-1){const [x2,y2]=xy(i+1);
        if(y2===y)s+='<path d="M'+(x+bw+1)+' '+(y+bh/2)+' H'+(x2-3)+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#sdh-ar)"/>';
        else s+='<path d="M'+(x+bw/2)+' '+(y+bh)+' V'+(y+bh+rg/2)+' H'+(x2+bw/2)+' V'+(y2-3)+'" fill="none" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#sdh-ar)"/>'}
    });
    const defs='<defs><marker id="sdh-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,H,defs+s,'The decoder in six stages on one real distribution');
  }
  RD.onRender(draw);RD.onResize(draw);
})();
