// ---- Reading tab: HLE tools dumbbells, ARC-AGI-3 harness x effort chart, SimpleQA guessing what-if (data: window.KR) ----
(function(){
  const K=window.KR;
  // HLE: no tools vs with tools, one row per published pair
  const tb=document.getElementById('rd-tools');
  function drawTools(){
    const W=Math.max(280,Math.min(860,KU.width(tb))),rows=K.tools,rh=28,hh=20,mt=6,mb=34,narrow=W<520;
    const lab=narrow?118:210,ml=lab+8,mr=50,pw=W-ml-mr,X=v=>ml+pw*v/100;
    // layout: a header line whenever the set changes, then one line per pair
    const L=[];let y=mt,last='';
    rows.forEach(r=>{if(r.set!==last){L.push({h:r.set,y:y+14});y+=hh;last=r.set}L.push({r,y:y+rh/2});y+=rh});
    const H=y+mb;let g='';
    [0,25,50,75,100].forEach(v=>{g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+mt+'" y2="'+(H-mb+2)+'" stroke="var(--line)"/>'+KU.t(X(v),H-mb+16,v+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    L.forEach(o=>{if(o.h){g+=KU.t(4,o.y,o.h,{fs:10.5,fill:'var(--mute)',w:600});return}
      const r=o.r,yy=o.y;const nm=narrow&&r.m.length>17?r.m.slice(0,16)+'…':r.m;
      g+=KU.t(lab,yy+4,KU.esc(nm)+(r.k!=='maint'?' *':''),{a:'end',fs:11});
      g+='<line x1="'+X(r.a)+'" x2="'+X(r.b)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--c1)" stroke-width="2.5" opacity=".45"/>';
      g+='<circle cx="'+X(r.a)+'" cy="'+yy+'" r="5" fill="var(--mute)"><title>'+r.m+', no tools: '+r.a+'%</title></circle>';
      g+='<circle cx="'+X(r.b)+'" cy="'+yy+'" r="5" fill="var(--c1)"><title>'+r.m+', with tools: '+r.b+'%</title></circle>';
      g+=KU.t(X(Math.max(r.a,r.b))+9,yy+4,'+'+(r.b-r.a).toFixed(1),{fs:11,w:600})});
    g+=KU.t(4,H-4,'* lab or secondary figure',{fs:10,fill:'var(--mute)'});
    tb.innerHTML=KU.svg(W,H,g,'What tools add on HLE, per published pair');
  }
  // ARC-AGI-3: GPT-6 Astra by effort, both harnesses
  const ab=document.getElementById('rd-arc3-svg');
  const EF=['none','low','medium','high','xhigh','max'];
  function drawArc(){
    const W=Math.max(280,Math.min(860,KU.width(ab))),H=Math.round(Math.max(230,Math.min(300,W*0.42)));
    const ml=36,mr=14,mt=14,mb=34,pw=W-ml-mr,ph=H-mt-mb,step=pw/EF.length,X=i=>ml+step*(i+.5),Y=v=>mt+ph*(1-v/100);
    let g='';
    [0,25,50,75,100].forEach(v=>{g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+KU.t(ml-5,Y(v)+4,v+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    const small=W<480;
    EF.forEach((e,i)=>{const d=K.arc3[e];g+=KU.t(X(i),H-mb+15,e,{a:'middle',fs:11});
      [['std','var(--c2)',-1],['ad','var(--c1)',1]].forEach(([h,col,s])=>{const v=d[h][0],c=d[h][1];
        const x=X(i)+s*Math.min(14,step*.18),y=Y(v);
        g+='<line x1="'+x+'" x2="'+x+'" y1="'+Y(0)+'" y2="'+y+'" stroke="'+col+'" stroke-width="'+(small?7:10)+'" opacity=".85"><title>'+(h==='std'?'Standard':'Provider Adapter')+', '+e+': '+v+'%, run cost '+c+'</title></line>';
        g+=KU.t(x,y-4,v.toFixed(1),{a:'middle',fs:small?9:10,w:600});
        if(!small)g+=KU.t(x,Y(0)-4,c.replace(/,\d{3}$/,'k'),{a:'middle',fs:8.5,fill:'var(--bg)'});
      })});
    g+=KU.t(W-mr,H-3,'reasoning effort setting',{a:'end',fs:10,fill:'var(--mute)'});
    ab.innerHTML=KU.svg(W,H,g,'ARC-AGI-3, GPT-6 Astra, score by harness and effort');
  }
  // SimpleQA: what if the model guessed on part of what it skipped?
  const sel=document.getElementById('rd-sqa-m'),gs=document.getElementById('rd-sqa-g'),ps=document.getElementById('rd-sqa-p'),out=document.getElementById('rd-sqa-out');
  Object.keys(K.sqa).forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;if(m==='Claude 3.5 Sonnet')o.selected=true;sel.appendChild(o)});
  function sqa(){
    const [C,N,I]=K.sqa[sel.value],g=+gs.value/100,p=+ps.value/100;
    document.getElementById('rd-sqa-gv').textContent=gs.value+'%';document.getElementById('rd-sqa-pv').textContent=ps.value+'%';
    const F=(c,i,n)=>2*c/(2*c+2*i+n)*100;
    const c2=C+N*g*p,i2=I+N*g*(1-p),n2=N*(1-g);
    const f0=F(C,I,N),f1=F(c2,i2,n2);
    out.innerHTML=KU.stat('F-score, as published',f0.toFixed(1),'F = 2C/(2C+2I+N)')+KU.stat('F-score after guessing',f1.toFixed(1),(f1>=f0?'+':'')+(f1-f0).toFixed(1)+' points')+
      KU.stat('Incorrect answers',i2.toFixed(1)+'%','was '+I.toFixed(1)+'%')+KU.stat('Guessing pays when p &gt;',(f0/2).toFixed(1)+'%','F/2, derived');
  }
  [sel,gs,ps].forEach(e=>e.addEventListener('input',sqa));sel.addEventListener('change',sqa);
  sqa();
  const all=()=>{drawTools();drawArc()};
  KU.onRender('t-read',all);KU.onResize('t-read',all);all();
})();
