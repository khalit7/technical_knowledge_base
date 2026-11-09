// ---- Reading tab: the hero (launch against now, per benchmark) and the physics re-grade (the four graders are the 3D stage in 35_js_sc_gr.js) (data: window.KR) ----
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
  const all=()=>{drawHero();drawPhys()};
  KU.onRender('t-read',all);KU.onResize('t-read',all);all();
})();
