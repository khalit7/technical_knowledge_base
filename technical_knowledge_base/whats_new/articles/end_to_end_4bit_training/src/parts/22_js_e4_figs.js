// ---- Static figures of the Reading tab: the hero (the article's priorities table, with the format each stage got) and the
// MoE traffic diagram (bits per value on each NVLink hop). Every number is printed by the article (see each caption).
// Colours as on Quantization and Precision: 16 bits blue (c1), 8 bits orange (c2), 4 bits green (c3).
(function(){
  if(!window.RD||!document.getElementById('e4-hero-svg'))return;
  const $=id=>document.getElementById(id), t=RD.t;
  const STAGES=[
    {n:'Pretraining forward',m:[3,0,2,0],f:[['NVFP4','c3','expert matmuls'],['MXFP8','c2','last 1/6 of layers']]},
    {n:'Pretraining backward',m:[1,3,2,0],f:[['MXFP8','c2','re-quantised, stochastic rounding']]},
    {n:'RL sampler',m:[3,0,3,3],f:[['NVFP4','c3','the same forward as training']]},
    {n:'RL trainer',m:[1,3,1,0],f:[['MXFP8','c2','backward, as in pretraining']]}];
  const COLS=['error','bias','speed','memory'];
  function hero(){
    const el=$('e4-hero-svg'),W=RD.width(el),narrow=W<520,L=8,R=W-8;
    const labW=narrow?0:150, x0=L+labW, cw=(R-x0)/(narrow?4:4);
    const head=34, blk=narrow?92:70; let s='', H=head+blk*STAGES.length+4;
    // column headers: two risks, two rewards
    s+=t(x0+cw,14,'Risks to minimise',{fs:12,a:'middle',fill:'var(--mute)',w:600})+t(x0+3*cw,14,'Rewards',{fs:12,a:'middle',fill:'var(--mute)',w:600});
    COLS.forEach((c,k)=>{s+=t(x0+k*cw+cw/2,30,c,{fs:12,a:'middle',fill:'var(--mute)'})});
    s+='<line x1="'+(x0+2*cw)+'" x2="'+(x0+2*cw)+'" y1="4" y2="'+(H-4)+'" stroke="var(--line)" stroke-dasharray="3 3"/>';
    STAGES.forEach((g,i)=>{
      const y=head+i*blk+4;
      s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+(blk-6)+'" rx="8" fill="var(--soft)"/>';
      const ny=narrow?y+17:y+22, dy=narrow?y+38:y+24;
      s+=t(L+4,ny,g.n,{fs:13,w:600,fill:'var(--ink)'});
      g.m.forEach((v,k)=>{const cx=x0+k*cw+cw/2;
        if(!v){s+='<line x1="'+(cx-7)+'" x2="'+(cx+7)+'" y1="'+(dy-4)+'" y2="'+(dy-4)+'" stroke="var(--mute)" stroke-width="2"/>';return}
        for(let d=0;d<v;d++){const dx=cx+(d-(v-1)/2)*13;s+='<circle cx="'+dx+'" cy="'+(dy-4)+'" r="5" fill="var(--ink)"/>'}});
      // the format(s) chosen for the stage
      let fx=narrow?L+4:L+4, fy=narrow?y+70:y+50;
      if(!narrow){fy=y+48}
      g.f.forEach(([fmt,c,why])=>{const w=fmt.length*8+14;
        s+='<rect x="'+fx+'" y="'+(fy-13)+'" width="'+w+'" height="18" rx="9" fill="var(--'+c+')"/>'+t(fx+w/2,fy,fmt,{fs:12,a:'middle',w:600,fill:'var(--bg)'});
        s+=t(fx+w+5,fy,why,{fs:12,fill:'var(--ink)'});
        fx+=w+10+why.length*6.3+12;});
    });
    if(!narrow){} // layout identical otherwise
    el.innerHTML=RD.svg(W,H,s,'Priorities of four training stages and the format chosen for each');
  }

  // the MoE traffic: a vertical path, source GPU, NVLink, expert GPU, NVLink, source GPU
  function comm(){
    const el=$('e4-comm-svg'); if(!el)return;
    const W=RD.width(el),cx=W/2,bw=Math.min(W-24,330),bx=cx-bw/2,bh=36,gap=50;
    const N=[
      {t:'Source GPU: hidden state, BF16',c:'c1',g:'src'},
      {t:'quantise to NVFP4',c:'c3',g:'src'},
      {hop:'dispatch all-to-all: 4.5 bits a value',c:'c3'},
      {t:'w13 matmul (NVFP4)',c:'c3',g:'exp'},
      {t:'quantise to NVFP4',c:'c3',g:'exp'},
      {t:'w2 matmul (NVFP4) + RHT + S2F6',c:'c3',g:'exp'},
      {hop:'combine all-to-all: 8.25 bits (was 16)',c:'c2'},
      {t:'de-quantise, sum, inverse RHT',c:'c1',g:'src'}];
    let y=8,s='',prev=null;
    N.forEach(n=>{
      if(n.hop){ // an NVLink hop: a tall arrow with its label
        const y2=y+gap;
        s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+y+'" y2="'+(y2-6)+'" stroke="var(--'+n.c+')" stroke-width="5"/>';
        s+='<path d="M'+(cx-7)+' '+(y2-9)+' L'+cx+' '+(y2-1)+' L'+(cx+7)+' '+(y2-9)+' Z" fill="var(--'+n.c+')"/>';
        s+='<rect x="'+(cx+10)+'" y="'+(y+gap/2-12)+'" width="'+Math.min(W-cx-14,220)+'" height="20" rx="4" fill="var(--card)"/>';
        s+=t(cx+14,y+gap/2+3,n.hop.length*6.4>W-cx-20?n.hop.split(':')[0]+':':n.hop,{fs:12,fill:'var(--ink)',w:600});
        if(n.hop.length*6.4>W-cx-20)s+=t(cx+14,y+gap/2+17,n.hop.split(':')[1].trim(),{fs:12,fill:'var(--ink)'});
        s+=t(cx-12,y+gap/2+3,'NVLink',{fs:12,a:'end',fill:'var(--mute)'});
        y=y2; prev=null; return}
      if(prev){s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+y+'" y2="'+(y+12)+'" stroke="var(--line)" stroke-width="2"/>';y+=12}
      s+='<rect x="'+bx+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="var(--soft)" stroke="var(--'+n.c+')" stroke-width="2"/>';
      s+=t(cx,y+bh/2+4,n.t,{fs:12.5,a:'middle',fill:'var(--ink)'});
      y+=bh; prev=n;});
    s+=t(cx,y+20,'15 PFLOPS / 900 GB/s = 16,667 FLOP per byte',{fs:12,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+28,s,'The NVLink hops of one MoE layer and their bits per value');
  }
  const draw=()=>{hero();comm()};
  RD.onRender(draw); RD.onResize(draw);
})();
