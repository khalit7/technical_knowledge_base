// ---- This page's shared chart helpers: colours as in the paper (forward KL purple, reverse KL orange) ----
window.OPDV=(function(){
  const CF='var(--c4)',CR='var(--c2)';
  const col=k=>k==='f'||/^forward|F-KL/.test(k)?CF:CR;
  // a lambda-axis chart: series [{n, c, da, pts:[[x,y,sem]]}], y range, labels; returns svg string at width w
  function lamChart(w,series,o){o=o||{};const H=o.h||(w<520?240:260),pl=46,pr=10,pt=o.leg?8:10,pb=46;
    const lg=o.leg?legendW(o.leg,pl,12,w-pl-pr):{s:'',h:0};const top=pt+lg.h;
    const F=linFrame({W:w,H:H,pl,pr,pt:top,pb,x:[-2.15,2.15],y:o.y,xt:[-2,-1,0,1,2],fx:v=>v===0?'0':(v>0?'+':'−')+Math.abs(v),fy:o.fy,yt:o.yt,xl:o.xl||'λ: teacher-favoured ← → student-favoured',yl:o.yl});
    let s=F.s+lg.s;
    s+=ln2(F.X(-1),top,F.X(-1),H-pb,'var(--line)',{da:'3 3'})+ln2(F.X(1),top,F.X(1),H-pb,'var(--line)',{da:'3 3'});
    s+=tx(F.X(-1),H-pb+28,'OffPD',{fs:11,c:'var(--mute)',a:'middle'})+tx(F.X(1),H-pb+28,'OnPD',{fs:11,c:'var(--mute)',a:'middle'});
    series.forEach(S=>{const P=S.pts.filter(p=>p[1]!=null);
      P.forEach(p=>{if(p[2])s+=ln2(F.X(p[0]),F.Y(p[1]-p[2]),F.X(p[0]),F.Y(p[1]+p[2]),S.c,{sw:1,op:.7})});
      s+=lineS(P,F.X,F.Y,S.c,{sw:2,da:S.da});
      P.forEach(p=>{s+=dotS(F.X(p[0]),F.Y(p[1]),S.da?2.6:3.2,S.c,{hollow:!!S.da,sw:1.4,t:S.n+', λ = '+p[0]+': '+p[1].toFixed(o.dec==null?1:o.dec)+(p[2]?' ± '+p[2].toFixed(1):'')})})});
    if(o.mark!=null)s+=ln2(F.X(o.mark),top,F.X(o.mark),H-pb,'var(--ink)',{sw:1.2,op:.6});
    return svgW(w,H,s,o.label||'chart along the rollout-policy spectrum')}
  return {CF,CR,col,lamChart};
})();
