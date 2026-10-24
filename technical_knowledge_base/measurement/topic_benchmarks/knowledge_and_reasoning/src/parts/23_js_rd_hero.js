// ---- Reading tab: the hero (launch against now, per benchmark), the four graders, the physics re-grade (data: window.KR) ----
(function(){
  const K=window.KR,hero=document.getElementById('rd-hero');if(!hero)return;
  // Hero: one row per benchmark, oldest first; grey dot at launch, accent dot now, green tick for the human reference
  function drawHero(){
    const W=Math.max(280,Math.min(860,KU.width(hero))),narrow=W<520,rows=K.hero,rh=narrow?38:34,mt=8,mb=26;
    const lab=narrow?96:150,ml=lab+10,mr=narrow?16:24,pw=W-ml-mr,X=v=>ml+pw*v/100,H=mt+rows.length*rh+mb;
    let g='';
    [0,25,50,75,100].forEach(v=>{g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/>'+KU.t(X(v),H-mb+15,v+'%',{a:'middle',fs:10.5,fill:'var(--mute)'})});
    rows.forEach((r,i)=>{const [name,yr,a,aw,b,bw,h,hw]=r,y=mt+i*rh+rh/2;
      g+=KU.t(lab,y+4,KU.esc(name),{a:'end',fs:11.5,w:600});
      if(!narrow)g+=KU.t(lab,y+16,String(yr),{a:'end',fs:10.5,fill:'var(--mute)'});
      else g+=KU.t(lab,y+15,String(yr),{a:'end',fs:10,fill:'var(--mute)'});
      if(h!=null)g+='<line x1="'+X(h)+'" x2="'+X(h)+'" y1="'+(y-7)+'" y2="'+(y+7)+'" stroke="var(--good)" stroke-width="3"><title>'+KU.esc(name)+' human reference: '+h+'% ('+KU.esc(hw)+')</title></line>';
      g+='<line x1="'+X(a)+'" x2="'+X(b)+'" y1="'+y+'" y2="'+y+'" stroke="var(--acc)" stroke-width="2.5" opacity=".4"/>';
      g+='<circle cx="'+X(a)+'" cy="'+y+'" r="5" fill="var(--mute)"><title>'+KU.esc(name)+' at launch: '+a+'% ('+KU.esc(aw)+')</title></circle>';
      g+='<circle cx="'+X(b)+'" cy="'+y+'" r="5.5" fill="var(--acc)"><title>'+KU.esc(name)+' now: '+b+'% ('+KU.esc(bw)+')</title></circle>';
      const fa=a<1?a.toFixed(2):(a%1?a.toFixed(1):String(a)),fb=b%1?(+b.toFixed(1)).toString():String(b);
      const cl=x=>Math.max(ml+10,Math.min(W-14,x));
      g+=KU.t(cl(X(a)),y-9,fa,{a:'middle',fs:10.5,fill:'var(--mute)'});
      g+=KU.t(cl(X(b)),y+17,fb,{a:'middle',fs:11,w:600});
    });
    hero.innerHTML=KU.svg(W,H,g,'Best score at launch and best dated reading now, per benchmark');
  }
  // Four graders: one small static diagram each
  const gp=document.getElementById('rd-gp');
  const P=[
    {n:'Letter, extracted by a regex',p:'The same correct answer, written another way, does not match and scores zero: extraction rules differ between harnesses.',d:(w)=>{
      const box=(y,txt,ok,res)=>'<rect x="2" y="'+y+'" width="'+(w*0.6)+'" height="26" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+KU.t(8,y+17,txt,{fs:11})+
        '<line x1="'+(w*0.6+4)+'" x2="'+(w*0.6+18)+'" y1="'+(y+13)+'" y2="'+(y+13)+'" stroke="var(--mute)"/>'+KU.t(w*0.6+22,y+17,res,{fs:11,w:600,fill:ok?'var(--good)':'var(--bad)'});
      return {h:96,b:KU.t(2,12,'key: C',{fs:11,fill:'var(--mute)'})+box(20,'...the answer is (C)',1,'C: right')+box(58,'...so C is correct',0,'no match: wrong')}}},
    {n:'Log-likelihood over the options',p:'No text is generated: the highest-probability option wins. A different measurement from a letter answer; length normalisation can change the winner. Probabilities illustrative.',d:(w)=>{
      const v=[.08,.21,.55,.16],L=['A','B','C','D'],bw=(w-40)/4;let b='';
      v.forEach((p,i)=>{const x=20+i*bw,hh=60*p/.55;b+='<rect x="'+(x+6)+'" y="'+(74-hh)+'" width="'+(bw-12)+'" height="'+hh+'" rx="2" fill="'+(i===2?'var(--acc)':'var(--dim)')+'"/>'+
        KU.t(x+bw/2,88,L[i],{a:'middle',fs:11,w:i===2?600:400})+KU.t(x+bw/2,70-hh,p.toFixed(2),{a:'middle',fs:10.5,fill:'var(--mute)'})});
      return {h:96,b}}},
    {n:'Free text, graded by an LLM judge',p:'The judge decides whether two strings mean the same; when it errs, the score errs. HLE: o3-mini with a fixed prompt; SimpleQA adds "not attempted".',d:(w)=>{
      const c=w/2;return {h:96,b:'<rect x="2" y="6" width="'+(c-10)+'" height="24" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+KU.t(8,22,'answer: 1.50 m',{fs:11})+
        '<rect x="'+(c+8)+'" y="6" width="'+(c-10)+'" height="24" rx="4" fill="var(--soft)" stroke="var(--line)"/>'+KU.t(c+14,22,'key: 150 cm',{fs:11})+
        '<line x1="'+(c/2)+'" x2="'+(w/2-6)+'" y1="30" y2="52" stroke="var(--mute)"/><line x1="'+(c+c/2)+'" x2="'+(w/2+6)+'" y1="30" y2="52" stroke="var(--mute)"/>'+
        '<rect x="'+(w/2-50)+'" y="52" width="100" height="24" rx="4" fill="var(--acc2)" stroke="var(--acc)"/>'+KU.t(w/2,68,'judge: same?',{a:'middle',fs:11,w:600})+
        KU.t(w/2,92,'correct / incorrect / not attempted',{a:'middle',fs:10.5,fill:'var(--mute)'})}}},
    {n:'Exact output, two tries',p:'ARC-AGI 1 and 2: the whole grid, every cell, within two attempts. Eight of nine cells right scores exactly what zero right scores.',d:(w)=>{
      const g1=[[1,0,1],[0,1,0],[1,0,1]],g2=[[1,0,1],[0,1,0],[1,1,1]],cs=20,ox=(w/2-cs*3)/2;let b='';
      const grid=(g,x0,bad)=>{let s='';g.forEach((row,r)=>row.forEach((v,c)=>{s+='<rect x="'+(x0+c*cs)+'" y="'+(14+r*cs)+'" width="'+cs+'" height="'+cs+'" fill="'+(v?KU.ARC[1]:KU.ARC[0])+'" stroke="#555" stroke-width=".5"/>';
        if(bad&&bad(r,c))s+='<rect x="'+(x0+c*cs+1.5)+'" y="'+(14+r*cs+1.5)+'" width="'+(cs-3)+'" height="'+(cs-3)+'" fill="none" stroke="var(--bad)" stroke-width="2"/>'}));return s};
      b+=KU.t(ox,10,'expected',{fs:10.5,fill:'var(--mute)'})+grid(g1,ox)+KU.t(w/2+ox,10,'attempt',{fs:10.5,fill:'var(--mute)'})+grid(g2,w/2+ox,(r,c)=>g1[r][c]!==g2[r][c]);
      b+=KU.t(w/2,92,'8 of 9 cells right: score 0',{a:'middle',fs:11,w:600,fill:'var(--bad)'});return {h:96,b}}},
  ];
  gp.innerHTML=P.map((x,i)=>'<div><div class="n">'+x.n+'</div><div class="svgbox" id="rd-gp'+i+'"></div></div>').join('');
  function drawGp(){P.forEach((x,i)=>{const el=document.getElementById('rd-gp'+i),w=Math.max(220,Math.min(420,KU.width(el))),o=x.d(w);el.innerHTML=KU.svg(w,o.h,o.b,x.n)})}
  // Physics re-grade: 250 answers marked wrong, split by cause; then two sets before and after cleaning
  const ph=document.getElementById('rd-phys');
  function drawPhys(){
    const W=Math.max(280,Math.min(860,KU.width(ph))),narrow=W<520,d=K.phys,tot=d.bench+d.grader+d.model,ml=4,mr=4,pw=W-ml-mr;
    let g='',x=ml;const segs=[['benchmark error',d.bench,'var(--c2)'],['grader error',d.grader,'var(--c5)'],['model error',d.model,'var(--acc)']];
    segs.forEach(([n,v,c],i)=>{const w=pw*v/tot;g+='<rect x="'+x+'" y="18" width="'+w+'" height="22" fill="'+c+'"><title>'+n+': '+v+'</title></rect>';
      const lx=i===2?x+w:x+4,an=i===2?'end':'start';g+=KU.t(lx,12,v+(narrow&&i===2?'':' '+n),{a:an,fs:11,w:600});if(narrow&&i===2)g+=KU.t(lx,54,'model error',{a:'end',fs:10.5});x+=w});
    const lab=narrow?110:190,X=v=>lab+12+(W-lab-50)*v/100;let y=narrow?74:64;
    g+=KU.t(4,y,'after removing or repairing defective items',{fs:10.5,fill:'var(--mute)'});y+=16;
    d.sets.forEach(([n,a,b])=>{y+=24;const nm=narrow?n.replace(/ \(.*\)/,''):n;g+=KU.t(lab,y+4,KU.esc(nm),{a:'end',fs:11});
      g+='<line x1="'+X(a)+'" x2="'+X(b)+'" y1="'+y+'" y2="'+y+'" stroke="var(--acc)" stroke-width="2.5" opacity=".4"/><circle cx="'+X(a)+'" cy="'+y+'" r="5" fill="var(--mute)"/><circle cx="'+X(b)+'" cy="'+y+'" r="5.5" fill="var(--acc)"/>'+
        KU.t(X(a)-8,y+4,a+'%',{a:'end',fs:10.5,fill:'var(--mute)'})+KU.t(X(b)+8,y+4,b+'%',{fs:11,w:600})});
    ph.innerHTML=KU.svg(W,y+14,g,'Causes of 250 answers marked wrong, and two sets before and after cleaning');
  }
  const all=()=>{drawHero();drawGp();drawPhys()};
  KU.onRender('t-read',all);KU.onResize('t-read',all);all();
})();
