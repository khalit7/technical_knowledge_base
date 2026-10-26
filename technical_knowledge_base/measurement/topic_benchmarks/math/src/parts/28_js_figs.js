// ---- Reading: static figures drawn at the measured width (hero map, MATH split, contest freshness, FrontierMath v1 against v2, the formal pipeline) ----
(function(){
  if(!window.RD)return;
  const T=(x,y,s,o)=>RD.t(x,y,s,o);
  const R=(x,y,w,h,f,st,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+((o&&o.rx)!=null?o.rx:4)+'" fill="'+f+'"'+(st?' stroke="'+st+'"':'')+(o&&o.dash?' stroke-dasharray="4 3"':'')+(o&&o.op!=null?' fill-opacity="'+o.op+'"':'')+'/>';
  const L=(x1,y1,x2,y2,c,o)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'"'+(o&&o.w?' stroke-width="'+o.w+'"':'')+(o&&o.dash?' stroke-dasharray="5 4"':'')+(o&&o.arrow?' marker-end="url(#'+o.arrow+')"':'')+'/>';
  const tw=(s,fs)=>s.length*(fs||11)*0.58+2;
  const draws=[];
  function reg(f){draws.push(f);RD.onRender(f);}
  RD.onResize(()=>draws.forEach(f=>f()));

  // Hero: every math set by year of appearance (columns) and kind of check (rows), coloured by status
  reg(function(){const el=document.getElementById('mf-hero');if(!el)return;
    const W=RD.width(el),wide=W>=560;
    const ROWS=['Proof checker','Answer checked by code','Exact integer','Parsed expression','LLM judge','Human graders'];
    const YRS=[2021,2023,2024,2025,2026];
    // name, short name, year, row, status (sat: saturated or solved, ing: saturating, open, probe: probe or dormant board)
    const IT=[['miniF2F','miniF2F',2021,0,'sat'],['PutnamBench','Putnam',2024,0,'sat'],['FM Erdős','FM Erdős',2026,0,'open'],['ArXivLean','ArXivLean',2026,0,'open'],
      ['FrontierMath T1-3','FM T1-3',2024,1,'ing'],['FrontierMath T4','FM T4',2025,1,'sat'],
      ['GSM8K','GSM8K',2021,2,'sat'],['GSM-Symbolic','GSM-Sym',2024,2,'probe'],['AIME 2025','AIME 2025',2025,2,'sat'],['AIME 2026','AIME 2026',2026,2,'sat'],
      ['MATH','MATH',2021,3,'sat'],['MATH-500','MATH-500',2023,3,'sat'],['HMMT Feb 2026','HMMT 26',2026,3,'sat'],['ArXivMath','ArXivMath',2026,3,'open'],
      ['Omni-MATH','Omni-MATH',2024,4,'probe'],
      ['IMO 2026','IMO 2026',2026,5,'sat'],['USAMO 2026','USAMO 26',2026,5,'open']];
    const lw=wide?150:0,cw=(W-lw)/YRS.length,ch=19,gap=3,top=20,lab=wide?0:15;
    let y=top,body='';
    YRS.forEach((yr,i)=>{body+=T(lw+cw*i+cw/2,13,String(yr),{a:'middle',fill:'var(--mute)'})});
    ROWS.forEach((rn,r)=>{
      const cells=YRS.map(yr=>IT.filter(x=>x[3]===r&&x[2]===yr));const stack=Math.max(1,...cells.map(c=>c.length));
      const h=lab+stack*(ch+gap)+6;
      body+=L(0,y,W,y,'var(--line)');
      body+=wide?T(4,y+6+ch/2+4,rn,{fill:'var(--mute)'}):T(2,y+12,rn,{fill:'var(--mute)'});
      cells.forEach((c,i)=>c.forEach((x,k)=>{const cx=lw+cw*i+3,cy=y+lab+5+k*(ch+gap),w=cw-6;
        const name=tw(x[0])<=w-6?x[0]:x[1];
        const st=x[4];
        const f=st==='sat'?'var(--dim)':st==='ing'?'var(--c5)':st==='open'?'var(--acc2)':'none';
        const s=st==='sat'?'':st==='ing'?'var(--c5)':st==='open'?'var(--acc)':'var(--mute)';
        body+=R(cx,cy,w,ch,f,s,{op:st==='ing'?.45:null,dash:st==='probe'});
        body+=T(cx+w/2,cy+ch/2+4,name,{a:'middle',w:st==='open'?600:null})}));
      y+=h});
    body+=L(0,y,W,y,'var(--line)');
    el.innerHTML=RD.svg(W,y+2,body,'Math benchmarks by year and kind of check');
  });

  // MATH: 12,500 problems, 5,000 test, 4,500 of them moved into PRM800K training
  reg(function(){const el=document.getElementById('mf-split');if(!el)return;
    const W=RD.width(el),y1=18,y2=86,h=24;let b='';
    const tr=W*7500/12500;
    b+=R(0,y1,tr-1,h,'var(--dim)','')+T(6,y1+16,'MATH train: 7,500');
    b+=R(tr+1,y1,W-tr-1,h,'var(--acc2)','var(--acc)')+T(tr+6,y1+16,'test: 5,000');
    b+='<polygon points="'+[tr+1,y1+h,W,y1+h,W,y2,0,y2].join(' ')+'" fill="var(--soft)" stroke="var(--line)"/>';
    const m=W*4500/5000;
    b+=R(0,y2,m-1,h,'var(--closed2)','var(--closed)')+T(6,y2+16,W>=480?'4,500 test problems moved into PRM800K training (public, May 2023)':'4,500 into PRM800K training, May 2023');
    b+=R(m+1,y2,W-m-1,h,'var(--acc)','');
    b+=T(W,y2+h+15,'500 held out = MATH-500',{a:'end',w:600});
    b+=T(0,y1-5,'12,500 problems',{fill:'var(--mute)'})+T(0,y2-5,'the 5,000 test problems',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y2+h+20,b,'MATH split');
  });

  // Contests: best score from models released before the contest against the best from later (flagged) models
  reg(function(){const el=document.getElementById('mf-fresh');if(!el)return;
    const W=RD.width(el),wide=W>=560;
    const G=[['AIME 2025',86.67,100],['AIME 2026',98.33,100],['HMMT Feb 2026',96.97,98.48]];
    const lw=wide?120:0,vr=56,x0=lw,x1=W-vr,lo=50,sc=v=>x0+(x1-x0)*(v-lo)/(100-lo);
    let y=16,b='';
    [50,75,100].forEach(v=>{b+=L(sc(v),10,sc(v),10+G.length*(wide?44:60),'var(--line)');b+=T(sc(v),9,v+'%',{a:v===100?'end':v===50?'start':'middle',fill:'var(--mute)'})});
    G.forEach(([n,a,c])=>{
      if(!wide){b+=T(0,y+10,n,{w:600});y+=14}
      else b+=T(0,y+16,n,{w:600});
      b+=R(x0,y,sc(a)-x0,14,'var(--acc)','',{rx:2})+T(sc(a)+4,y+11,a.toFixed(2)+'%');
      b+=R(x0,y+18,sc(c)-x0,14,'var(--bad)','',{rx:2,op:.6})+T(sc(c)+4,y+29,c.toFixed(2)+'%');
      y+=wide?44:46});
    b+=T(x0,y+10,'blue: best model released before the contest (clean); orange: best later model (flagged). Axis from 50%.',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,y+16,b,'Contest freshness');
    // the legend line can be long at phone width: shorten it there
    if(!wide){const t=el.querySelector('svg text:last-child');if(t)t.textContent='blue: released before; orange: after. Axis from 50%.'}
  });

  // FrontierMath Tiers 1-3: the same two models on v1 and v2
  reg(function(){const el=document.getElementById('mf-slope');if(!el)return;
    const W=Math.min(RD.width(el),620),H=170,xa=96,xb=W-144,top=22,bot=H-22,sc=v=>bot-(bot-top)*v/60;let b='';
    [0,20,40,60].forEach(v=>{b+=L(xa,sc(v),xb,sc(v),'var(--line)');b+=T(0,sc(v)+4,v+'%',{fill:'var(--mute)'})});
    b+=T(xa,H-6,'v1 private set',{a:'middle',fill:'var(--mute)'})+T(xb,H-6,'v2 (12 June 2026)',{a:'middle',fill:'var(--mute)'});
    [['GPT-5 (high)',32.41,55.44,'var(--acc)'],['o4-mini (high)',24.83,36.14,'var(--c2)']].forEach(([n,a,c,col])=>{
      b+=L(xa,sc(a),xb,sc(c),col,{w:2.5});
      b+='<circle cx="'+xa+'" cy="'+sc(a).toFixed(1)+'" r="4" fill="'+col+'"/><circle cx="'+xb+'" cy="'+sc(c).toFixed(1)+'" r="4" fill="'+col+'"/>';
      b+=T(xa-8,sc(a)+4,a.toFixed(2)+'%',{a:'end'});b+=T(xb+8,sc(c)+4,c.toFixed(2)+'% '+n,{fill:col,w:600})});
    el.innerHTML=RD.svg(W,H,b,'FrontierMath v1 against v2');
  });

  // Formal proofs: what the checker checks
  reg(function(){const el=document.getElementById('mf-formal');if(!el)return;
    const W=RD.width(el),wide=W>=760;
    const B=[['Problem in words','the competition text'],['Formal statement','Lean, Isabelle, Rocq'],['Proof','from a prover model'],['Accepted','by the proof checker']];
    const A=[['formalise','people or a model','not checked','var(--bad)',true],['prove','search, tactics','','var(--mute)',false],['kernel checks','proof vs statement','checked','var(--good)',false]];
    let b='<defs><marker id="mf-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    if(wide){const g=118,bw=(W-3*g)/4,bh=46,y=24;
      B.forEach((x,i)=>{const bx=i*(bw+g);b+=R(bx,y,bw,bh,i===3?'var(--open2)':'var(--soft)',i===3?'var(--good)':'var(--line)');b+=T(bx+bw/2,y+20,x[0],{a:'middle',w:600})+T(bx+bw/2,y+35,x[1],{a:'middle',fill:'var(--mute)'})});
      A.forEach((a,i)=>{const xs=(i+1)*bw+i*g+4,xe=xs+g-8,ym=y+bh/2;b+=L(xs,ym,xe,ym,a[3],{w:a[4]?2.5:1.5,dash:a[4],arrow:'mf-ar'});
        b+=T((xs+xe)/2,ym-18,a[0],{a:'middle',w:600,fill:a[3]})+T((xs+xe)/2,ym+18,a[1],{a:'middle',fill:'var(--mute)'});if(a[2])b+=T((xs+xe)/2,ym+32,a[2],{a:'middle',fill:a[3],w:600})});
      el.innerHTML=RD.svg(W,y+bh+40,b,'Formal pipeline');
    }else{const bw=Math.min(W,230),bh=40,g=50;let y=4;
      B.forEach((x,i)=>{b+=R(0,y,bw,bh,i===3?'var(--open2)':'var(--soft)',i===3?'var(--good)':'var(--line)');b+=T(10,y+17,x[0],{w:600})+T(10,y+32,x[1],{fill:'var(--mute)'});
        if(i<3){const a=A[i],xm=bw/2,ys=y+bh+3,ye=y+bh+g-3;b+=L(xm,ys,xm,ye,a[3],{w:a[4]?2.5:1.5,dash:a[4],arrow:'mf-ar'});
          b+=T(xm+12,ys+16,a[0]+(a[2]?': '+a[2]:''),{w:600,fill:a[3]})+T(xm+12,ys+30,a[1],{fill:'var(--mute)'})}
        y+=bh+g});
      el.innerHTML=RD.svg(W,y-g+4,b,'Formal pipeline');
    }
  });
  draws.forEach(f=>f());
})();
