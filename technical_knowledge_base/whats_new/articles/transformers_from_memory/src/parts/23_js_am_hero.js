// ---- The hero: one recall, seen through each store's weighting of a similarity. ----
// Static 2D, drawn at the card's measured width. x: a stored key's similarity to the query; the grey bump is where the
// other M - 1 random unit keys sit at d = 64 (normal, spread 1/sqrt(64) = 0.125); the target key sits at 1.
// y (log): the weight a store gives a key, relative to the target's weight. Every number marked is in the caption.
(function(){
  if(!window.RD||!document.getElementById('am-hero-svg'))return;
  const el=document.getElementById('am-hero-svg'), d=64, b=8, sd=1/Math.sqrt(d);
  const C=[
    {n:'outer product: s',      c:'var(--c1)', f:s=>Math.abs(s)},
    {n:'ReLU',                  c:'var(--c5)', f:s=>s>0?s:0},
    {n:'squared ReLU',          c:'var(--c2)', f:s=>s>0?s*s:0},
    {n:'cubed ReLU',            c:'var(--c4)', f:s=>s>0?s*s*s:0},
    {n:'softmax: e^{8(s−1)}',   c:'var(--ink)', f:s=>Math.exp(b*(s-1))}
  ];
  function draw(){
    const W=RD.width(el), nar=W<480, H=nar?300:330, ml=nar?50:56, mr=nar?10:16, mt=14, mb=40, pw=W-ml-mr, ph=H-mt-mb;
    const X0=-0.35,X1=1.05, lx=s=>ml+(s-X0)/(X1-X0)*pw, Y0=-4, ly=w=>mt+(-Math.log10(Math.max(w,1e-4)))/(-Y0)*ph;
    let s='';
    // the crowd of other keys: a density drawn in the background (linear height, no y scale)
    let p='M'+lx(X0)+' '+(mt+ph);for(let i=0;i<=120;i++){const x=X0+(X1-X0)*i/120,g=Math.exp(-x*x/(2*sd*sd));p+='L'+lx(x).toFixed(1)+' '+(mt+ph-g*ph*0.62).toFixed(1)}
    p+='L'+lx(X1)+' '+(mt+ph)+'Z';
    s+='<path d="'+p+'" fill="var(--soft)" stroke="var(--line)"/>';
    const H2=' paint-order="stroke" stroke="var(--card)" stroke-width="4"';
    s+=RD.t(lx(X0)+4,mt+ph-34,nar?'other keys':'the M − 1 other keys',{fs:12,fill:'var(--mute)'}).replace('<text','<text'+H2);
    s+=RD.t(lx(X0)+4,mt+ph-19,nar?'±0.125':'spread ±1/√64 = ±0.125',{fs:11.5,fill:'var(--mute)'}).replace('<text','<text'+H2);
    // grid
    [0,-1,-2,-3,-4].forEach(e=>{const y=ly(Math.pow(10,e));s+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+RD.t(ml-5,y+4,['1','0.1','0.01','0.001','0.0001'][-e],{fs:11,a:'end',fill:'var(--mute)'})});
    [-0.25,0,0.25,0.5,0.75,1].forEach(v=>{s+=RD.t(lx(v),mt+ph+15,String(v),{fs:11,a:'middle',fill:'var(--mute)'})});
    s+=RD.t(ml+pw/2,H-6,'similarity of a stored key to the query',{fs:12,a:'middle',fill:'var(--mute)'});
    // the target
    s+='<line x1="'+lx(1)+'" x2="'+lx(1)+'" y1="'+ly(1)+'" y2="'+(mt+ph)+'" stroke="var(--bad)" stroke-width="3"/>';
    s+=RD.t(lx(1)-6,mt+ph-8,'target',{fs:12,a:'end',fill:'var(--bad)',w:600});
    // a typical other key, one spread out
    s+='<line x1="'+lx(sd)+'" x2="'+lx(sd)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    // the curves, labelled at s = 0.125 by the weight they give a typical other key
    const labs=[];
    C.forEach(c=>{let q='';for(let i=0;i<=200;i++){const x=X0+(X1-X0)*i/200,w=c.f(x);if(w<1e-4){q+=' ';continue}q+=((q===''||/ $/.test(q))?'M':'L')+lx(x).toFixed(1)+' '+ly(w).toFixed(1)}
      s+='<path d="'+q.replace(/ +M/g,'M').trim()+'" fill="none" stroke="'+c.c+'" stroke-width="2.4"/>';
      const w=c.f(sd);s+='<circle cx="'+lx(sd)+'" cy="'+ly(w)+'" r="3.6" fill="'+c.c+'"/>';labs.push({y:ly(w),c:c,w:w})});
    labs.sort((a,b)=>a.y-b.y);for(let i=1;i<labs.length;i++)if(labs[i].y<labs[i-1].y+15)labs[i].y=labs[i-1].y+15;
    const lx0=lx(sd)-8;
    labs.forEach(l=>{const v=l.w>=0.1?l.w.toFixed(3):l.w.toFixed(4);
      s+=RD.t(lx0,l.y+4,(nar?'':l.c.n.split(':')[0]+' ')+v,{fs:11.5,a:'end',fill:l.c.c,w:600}).replace('<text','<text paint-order="stroke" stroke="var(--card)" stroke-width="4"')});
    el.innerHTML=RD.svg(W,H,s,'The weight each store gives a stored key as a function of its similarity to the query, relative to the target key at similarity 1, over the spread of random other keys at d = 64');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
