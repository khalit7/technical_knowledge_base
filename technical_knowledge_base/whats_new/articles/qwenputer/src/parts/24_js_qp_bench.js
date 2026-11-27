// Section 6 chart: accuracy per 40-problem set with Wilson 95% intervals. Data: window.ARTICLE.bench, copied by mk_article.py
// from inputs/recompute.json (written by src/recompute.py from docs/rv32.md and the README's base column); check_page.mjs compares them.
(function(){
  const el=document.getElementById('qp-bench-svg');if(!el||!window.ARTICLE||!ARTICLE.bench)return;
  const B=ARTICLE.bench,N=ARTICLE.nupa;
  const COL=['var(--mute)','var(--acc)','var(--c2)'],KEY=['base','qp','py'];
  const short={'Synthetic integer arithmetic (not in the blog)':'Synthetic integers (not in the post)','DeepMind mul_big':'mul_big','DeepMind div_big':'div_big','DeepMind add_or_sub_big':'add_or_sub_big','DeepMind mul_div_multiple_longer':'mul_div_multiple_longer'};
  function draw(){
    const W=RD.width(el),L=10,R=W-58,bh=9,gap=3,lab=18,rowH=lab+3*(bh+gap)+12;
    const X=v=>L+(R-L)*v/100;let s='',y=6;
    const rows=B.map(b=>({name:short[b.set]||b.set,v:b.pct,ci:b.ci,c:[b.base,b.qp,b.py],n:b.n}));
    rows.push({name:'NUPA long integers: CHIP-8 version, 576 problems',v:[N.base,N.qp,N.py],ci:null,c:null,n:N.n,hatch:true});
    s+='<defs><pattern id="qp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--card)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--mute)" stroke-width="2.5"/></pattern></defs>';
    [0,25,50,75,100].forEach(t=>{s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="4" y2="'+(rows.length*rowH+6)+'" stroke="var(--line)"/>'});
    rows.forEach(r=>{
      s+=RD.t(L,y+13,r.name,{fs:12.5,w:600,fill:r.hatch?'var(--mute)':'var(--ink)'});
      for(let k=0;k<3;k++){const yy=y+lab+k*(bh+gap);
        s+='<rect x="'+L+'" y="'+yy+'" width="'+Math.max(1,X(r.v[k])-L)+'" height="'+bh+'" rx="2" fill="'+(r.hatch?'url(#qp-hatch)':COL[k])+'"'+(r.hatch?' stroke="'+COL[k]+'"':'')+'/>';
        if(r.ci){s+='<line x1="'+X(r.ci[k][0])+'" x2="'+X(r.ci[k][1])+'" y1="'+(yy+bh/2)+'" y2="'+(yy+bh/2)+'" stroke="var(--ink)" stroke-width="1.3"/>'+
          '<line x1="'+X(r.ci[k][0])+'" x2="'+X(r.ci[k][0])+'" y1="'+(yy+1)+'" y2="'+(yy+bh-1)+'" stroke="var(--ink)" stroke-width="1.3"/>'+
          '<line x1="'+X(r.ci[k][1])+'" x2="'+X(r.ci[k][1])+'" y1="'+(yy+1)+'" y2="'+(yy+bh-1)+'" stroke="var(--ink)" stroke-width="1.3"/>'}
        s+=RD.t(R+6,yy+bh-0.5,r.c?r.c[k]+'/40':r.v[k].toFixed(1)+'%',{fs:11,fill:'var(--mute)'});
      }
      y+=rowH;
    });
    [0,25,50,75,100].forEach(t=>{s+=RD.t(X(t),y+10,t+(t===100?'%':''),{a:'middle',fs:11,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,y+16,s,'Accuracy of base Qwen, Qwenputer and base Qwen with a host tool on five 40-problem arithmetic sets, plus the CHIP-8 version on NUPA');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
