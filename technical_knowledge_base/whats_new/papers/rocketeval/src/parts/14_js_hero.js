// ---- Hero figure (light pass 2026-10-25): the three stages and the two outcomes, a static diagram drawn at the measured width.
// Numbers: checklist cost and size from Table 4 and recompute.py (8.8 items on average in the released WildBench lists);
// outcomes from Table 3 (Spearman), Table 2 (agreement) and Table 4 (cost at 1,000 runs). Wide: three boxes in a row; narrow: stacked.
(function(){const el=$('heroSvg');if(!el)return;
  const S=[
    {h:'1. GPT-4o, once per query',c:'var(--c2)',l:['reads query and reference answer','writes yes/no checklist items','WildBench: 8.8 items per query','all lists: $2.87, paid once']},
    {h:'2. Small judge, per response',c:'var(--c1)',l:['e.g. Gemma-2-2B; one prompt per item','may answer only Yes or No','p̂ = P(Yes) / (P(Yes) + P(No))','no analysis asked of it']},
    {h:'3. Score',c:'var(--c3)',l:['mean of item scores (9 × mean + 1)','or trees fitted to labels','averaged per model to rank']}];
  const O=[
    {c:'var(--good)',t:'Ranking 12 models: Spearman 0.965',s:'GPT-4o 0.979; one pair of 66 apart'},
    {c:'var(--bad)',t:'One verdict: 57.9% human agreement',s:'humans agree with each other 64.7%'},
    {c:'var(--acc)',t:'1,000 runs: $27.7 against $3,400',s:'Gemma-2-2B vs GPT-4o, batch prices'}];
  fit(el,w=>{const wide=w>=800,g=wide?16:0,lh=17,pad=10;let s='',y=0;
    const bw=wide?(w-2*g)/3:w,bh=pad*2+20+lh*Math.max(...S.map(x=>x.l.length));
    S.forEach((b,i)=>{const x=wide?i*(bw+g):0,yy=wide?0:i*(bh+22);
      s+=rc(x+.5,yy+.5,bw-1,bh-1,'var(--soft)',{s:b.c,sw:1.6,r:8});
      s+=tx(x+pad,yy+pad+13,b.h,{fs:13,w:600,c:b.c});
      b.l.forEach((t,j)=>{s+=tx(x+pad,yy+pad+20+lh*(j+1),t,{fs:11.5,c:j===2&&i===1?'var(--ink)':'var(--mute)',w:j===2&&i===1?600:null})});
      if(i<2){if(wide){const ax=x+bw+3,ay=bh/2;s+='<path d="M'+ax+','+ay+' l'+(g-8)+',0" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#heroA)"/>'}
        else{const ax=w/2,ay=yy+bh+3;s+='<path d="M'+ax+','+ay+' l0,14" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#heroA)"/>'}}});
    y=wide?bh+18:3*bh+2*22+18;
    const ow=wide?(w-2*g)/3:w,oh=44;
    O.forEach((o,i)=>{const x=wide?i*(ow+g):0,yy=y+(wide?0:i*(oh+8));
      s+=rc(x,yy,4,oh,o.c,{r:2});s+=tx(x+12,yy+17,o.t,{fs:12,w:600});s+=tx(x+12,yy+35,o.s,{fs:11.5,c:'var(--mute)'})});
    const H=y+(wide?oh:3*oh+16)+4;
    el.innerHTML=svgW(w,H,'<defs><marker id="heroA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+s,'RocketEval in three stages: GPT-4o writes a checklist once per query, a small judge answers each item as a probability, the scores are averaged; it ranks models almost like GPT-4o but agrees with humans on single verdicts less often than humans agree with each other')});
  onTab('t-read',()=>refit(el));
})();
