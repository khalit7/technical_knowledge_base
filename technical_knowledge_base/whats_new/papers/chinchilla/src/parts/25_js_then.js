// ---- Then and now: tokens per parameter over time, replications (the inference-aware stepper moved to Pretraining on 2026-10-26) ----
// tokens per parameter over time
(function(){const M=PAPER.tables.models.rows;$('tlSrc').innerHTML=M.map(r=>A(r[4],r[0])).join(', ');
  function draw(w){const H=w<500?330:Math.min(320,w*.5),t=s=>{const [y,m]=s.split('-').map(Number);return y+(m-.5)/12},X=[2020,2025.9],Y=[0.6,4000],pl=44,pr=12,pt=12,pb=36;
    const lx=v=>pl+(w-pl-pr)*(v-X[0])/(X[1]-X[0]),ly=v=>pt+(H-pt-pb)*(1-(lg10(v)-lg10(Y[0]))/(lg10(Y[1])-lg10(Y[0])));
    let s='';[1,10,100,1000].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-6,ly(v)+4,fmt(v),{fs:11,a:'end',c:'var(--mute)'})});
    [2020,2021,2022,2023,2024,2025].forEach(y=>{s+=tx(lx(y),H-pb+16,String(y),{fs:11,a:'middle',c:'var(--mute)'})});
    s+=ln2(pl,ly(20),w-pr,ly(20),'var(--c1)',{da:'1 3',sw:1.6})+tx(pl+4,ly(20)+14,'20',{fs:11,c:'var(--c1)'});
    s+=tx(12,(pt+H-pb)/2,'tokens per parameter',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text','<text transform="rotate(-90 12 '+((pt+H-pb)/2)+')"');
    const pts=M.map(r=>({x:lx(t(r[3])),y:ly(r[2]/r[1]),t:(w<500?r[0].replace(' (37B active)','').replace('DeepSeek-','DS-'):r[0].replace(' (37B active)',''))+' '+(r[2]/r[1]<10?(r[2]/r[1]).toFixed(1):fmt(r[2]/r[1])),fs:11}));placeLabels(pts,w,H);
    pts.forEach((p,i)=>{s+=dot(p.x,p.y,4.5,/Chinchilla/.test(M[i][0])?'var(--c1)':'var(--c2)',{f:/Chinchilla/.test(M[i][0])?'var(--c1)':'var(--bg)'})+tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--mute)'})});
    $('tlSvg').innerHTML=svgW(w,H,s,'Tokens per parameter of major models over time')}
  onTab('t-then',()=>refit($('tlSvg')));fit($('tlSvg'),draw);
})();
// replications
(function(){const T=PAPER.tables.repl,F=PAPER.fit.fits;
  const rows=T.rows.map(r=>{let a=r[3],b=r[4];if(a==='RC_SUM'){a=F.sum.a_exp.toFixed(3);b=(1-F.sum.a_exp).toFixed(3)}if(a==='RC_A2'){a=A2.a.toFixed(3);b=A2.b.toFixed(3)}
    const u=r[5],nm=/^tab:/.test(u)?'<a href="#" data-tab="'+u.split(':')[1]+'"'+(u.split(':')[2]?' data-to="'+u.split(':')[2]+'"':'')+'>'+r[0]+'</a>':A(u,r[0]);return [nm,r[1],r[2],'<b>'+a+'</b>',b]});
  tbl('replT',T.head,rows);
  $('replT').querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b)b.click();const to=a.dataset.to&&$(a.dataset.to);if(to)to.scrollIntoView({block:'start'})}));
})();
