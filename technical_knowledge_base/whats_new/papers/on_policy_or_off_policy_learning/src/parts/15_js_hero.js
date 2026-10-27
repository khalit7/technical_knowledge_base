// ---- Hero figure (light pass, 2026-10-26): the paper's 2 x 2 (who writes the rollouts against which KL direction),
// each cell with Figure 1's held-out accuracy and out-of-distribution change at both learning rates. Static: nothing moves.
// Values come from PAPER.rc.f1 (decoded from the vector figure by decode_figs.py, recomputed by recompute.py).
(function(){const el=$('heroSvg');if(!el||!window.PAPER)return;const F1=PAPER.rc.f1,CF=OPDV.CF,CR=OPDV.CR;
  const LR=[['1e-5','10⁻⁵'],['5e-5','5 × 10⁻⁵']];
  const cell=(x,y,w,k,title,conv)=>{const c=/F-KL/.test(k)?CF:CR;let s=rc(x,y,w,118,'var(--soft)',{s:'var(--line)',r:8})+rc(x,y,4,118,c,{r:2});
    s+=tx(x+12,y+18,title,{fs:12,w:600})+tx(x+w-8,y+18,conv?'usual pairing':'crossed',{fs:11,a:'end',c:'var(--mute)'});
    const lw=w<240?58:74,bw=w-12-lw-44;
    LR.forEach(([l,lab],j)=>{const v=F1.id[k+' '+l],yy=y+30+j*20;
      s+=tx(x+12,yy+11,lab,{fs:11,c:'var(--mute)'})+rc(x+12+lw,yy,bw,13,'var(--line)',{r:2,op:.35})+rc(x+12+lw,yy,bw*v/100,13,c,{r:2,op:j?1:.55})+tx(x+12+lw+bw*v/100+4,yy+11,v.toFixed(0)+'%',{fs:11,w:600})});
    s+=tx(x+12,y+84,'forgetting (OOD change):',{fs:11,c:'var(--mute)'});
    const o=LR.map(([l])=>{const d=F1.ood_change[k+' '+l];return (d>0?'+':'')+d.toFixed(1)});
    s+=tx(x+12,y+102,o[0]+' at 10⁻⁵, '+o[1]+' at 5 × 10⁻⁵',{fs:11,w:600});
    return s};
  fit(el,w=>{const wide=w>=620,g=10;let s='',y=0,x0=0,cw;
    if(wide){x0=118;cw=(w-x0-g)/2;
      s+=tx(x0+cw/2,14,'forward KL (mass-covering)',{fs:12,w:600,a:'middle',c:CF})+tx(x0+cw+g+cw/2,14,'reverse KL (mode-seeking)',{fs:12,w:600,a:'middle',c:CR});y=24;
      s+=tx(0,y+62,'Teacher writes',{fs:12,w:600})+tx(0,y+78,'(off-policy)',{fs:11,c:'var(--mute)'});
      s+=tx(0,y+118+g+62,'Student writes',{fs:12,w:600})+tx(0,y+118+g+78,'(on-policy)',{fs:11,c:'var(--mute)'});
      s+=cell(x0,y,cw,'OffPD F-KL','task accuracy',true)+cell(x0+cw+g,y,cw,'OffPD R-KL','task accuracy',false);
      s+=cell(x0,y+118+g,cw,'OnPD F-KL','task accuracy',false)+cell(x0+cw+g,y+118+g,cw,'OnPD R-KL','task accuracy',true);y+=2*118+g+8}
    else{cw=w-2;
      [['OffPD F-KL','Teacher writes, forward KL',true],['OffPD R-KL','Teacher writes, reverse KL',false],['OnPD F-KL','Student writes, forward KL',false],['OnPD R-KL','Student writes, reverse KL',true]]
        .forEach(([k,t,c])=>{s+=cell(1,y,cw,k,t,c);y+=118+g})}
    s+=tx(wide?x0:2,y+12,wide?'Bars: mean held-out accuracy over three tasks and three seeds, faint 10⁻⁵, solid 5 × 10⁻⁵':'faint bar 10⁻⁵, solid 5 × 10⁻⁵',{fs:11,c:'var(--mute)'});y+=18;
    el.innerHTML=svgW(w,y+2,s,'Two by two grid: who writes the rollouts against the KL direction, with accuracy and forgetting at two learning rates')});
})();
