// ---- Hero figure (light pass 2026-10-25), static: the reward scale on SCORING.md's own worked example (kv-traffic-sol:
// reference 2.58x scores 0, 4.14x scores 0.5, 6.656x scores 1), above the eight models' mean reward over 85 tasks (Table 2, Full)
// with the largest standard error a mean of 85 rewards in [0, 1] can have (seBound, computed here; the paper reports none).
(function(){const el=$('heroSvg');if(!el)return;
  const REF=2.58,full=T.T2,se=RC.se_full;
  fit(el,w=>{let s='',y=4;const pad=2,nar=w<560;
    // panel A: speed-up axis (log), reward ramp
    s+=tx(pad,y+13,nar?'Reward against speed-up, one task':'One task (kv-traffic-sol): the speed-up that earns each reward',{fs:12.5,w:600});y+=24;
    const x0=pad+8,x1=w-pad-14,lo=Math.log(0.9),hi=Math.log(8),sx=v=>x0+(Math.log(v)-lo)/(hi-lo)*(x1-x0);
    const rampY=y+8;
    s+=rc(sx(1),rampY,sx(REF)-sx(1),14,'var(--soft)',{r:2,s:'var(--line)'});
    const n=24;for(let i=0;i<n;i++){const a=Math.exp(Math.log(REF)+i/n*Math.log(REF)),b=Math.exp(Math.log(REF)+(i+1)/n*Math.log(REF));s+=rc(sx(a),rampY,sx(b)-sx(a)+.5,14,'var(--c2)',{r:0,op:.15+.85*(i+1)/n})}
    s+=rc(sx(REF*REF),rampY,x1-sx(REF*REF),14,'var(--c2)',{r:0});
    const tick=(v,l1,l2,anc)=>{const x=sx(v);s+=ln2(x,rampY-3,x,rampY+18,'var(--ink)',{sw:1.4});s+=tx(x,rampY+31,l1,{fs:11.5,a:anc||'middle',w:600});if(l2)s+=tx(x,rampY+45,l2,{fs:11,a:anc||'middle',c:'var(--mute)'})};
    tick(1,'1x',nar?'start':'starting code','start');tick(REF,'2.58x',nar?'expert = 0':'expert reference: 0');tick(4.14,'4.14x','0.5');tick(REF*REF,'6.656x',nar?'scores 1':'ref. squared: 1','end');
    y=rampY+58;
    // panel B: eight models
    s+=tx(pad,y+13,nar?'Mean reward over 85 tasks (Table 2)':'Mean reward over all 85 tasks (Table 2), with the largest possible standard error',{fs:12.5,w:600});y+=22;
    const lw=nar?78:120,bx0=pad+lw,bx1=w-pad-48,sb=v=>bx0+v/50*(bx1-bx0),bh=13,gap=7;
    for(let v=0;v<=50;v+=10){const x=sb(v);s+=ln2(x,y,x,y+MS.length*(bh+gap),'var(--line)');}
    MS.forEach((m,i)=>{const yy=y+i*(bh+gap),v=full[m][9],e=se[m],top=i===0;
      s+=tx(bx0-6,yy+bh-2,nar?SN[m]:MN[m],{fs:11.5,a:'end',w:top?600:400});
      s+=rc(bx0,yy,sb(v)-bx0,bh,top?'var(--c2)':'var(--dim)',{r:2});
      s+=ln2(sb(v-e),yy+bh/2,sb(v+e),yy+bh/2,'var(--ink)',{sw:1.2});s+=ln2(sb(v-e),yy+2,sb(v-e),yy+bh-2,'var(--ink)');s+=ln2(sb(v+e),yy+2,sb(v+e),yy+bh-2,'var(--ink)');
      s+=tx(sb(v+e)+5,yy+bh-2,v.toFixed(2),{fs:11.5,w:top?600:400})});
    y+=MS.length*(bh+gap)+2;
    for(let v=0;v<=50;v+=10)s+=tx(sb(v),y+12,v+'%',{fs:11,a:'middle',c:'var(--mute)'});
    el.innerHTML=svgW(w,y+18,s,'Reward scale: matching the expert reference speed-up scores 0 and its square scores 1; Claude Opus 5 leads the eight models with a mean reward of 36.53 over 85 tasks')});
  onTab('t-read',()=>refit(el));
})();
