// ---- Reading, the idea: the hero, one failure at 16,384 GPUs under defaults and under the best stacked design, to scale ----
// Same model and inputs as section 5 (window.FT.rec, window.FTREC from 32_js_ft_rec.js), fixed at Llama 3's rate.
(function(){
const $=id=>document.getElementById(id), D=window.FT&&window.FT.rec, F=window.FTREC;
if(!D||!F||!$('hr-card'))return;
const N=16384, rate=D.rates.find(r=>r.k==='l3').per_gpu_s, M=1/(N*rate);
const fmt=s=>s<90?Math.round(s)+' s':(s/60).toFixed(s<600?1:0)+' min';
function lane(id){const d=D.designs.find(x=>x.id===id);const segs=D.components.filter(c=>d.R[c.k]).map(c=>({k:c.k,col:c.col,v:d.R[c.k]}));
  const R=segs.reduce((a,x)=>a+x.v,0),b=F.best(d.C_s,R,M);segs.push({k:'rework',col:'var(--bad)',v:(b.tau+d.C_s)/2,op:.55});return {d,segs,R,g:b.g,tot:R+(b.tau+d.C_s)/2}}
function draw(){
  const el=$('hr-svg'),w=RD.width(el),L=[lane('base'),lane('mem')],sx=(w-8)/L[0].tot,lh=34,top=18;let s='';
  const names=['Defaults: requeue, 10-min timeout, new machine, 5-min blocking checkpoint','In-memory peer checkpoints, hot spares, fast detection'];
  L.forEach((l,j)=>{const y=top+j*(lh+26);s+=RD.t(2,y-5,RD.esc(w<760?(j?'Best stacked design':'Defaults'):names[j]),{fs:12,w:600});
    let x=2;l.segs.forEach(p=>{const ww=p.v*sx;s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1.5,ww).toFixed(1)+'" height="'+lh+'" fill="'+p.col+'"'+(p.op?' opacity="'+p.op+'"':'')+'><title>'+p.k+': '+fmt(p.v)+'</title></rect>';
      const lb=p.k+' '+fmt(p.v);if(ww>lb.length*6.6+10)s+=RD.t(x+4,y+lh/2+4,lb,{fs:11,fill:'var(--bg)',w:600});x+=Math.max(1.5,ww)});
    s+=RD.t(w-2,y-5,fmt(l.tot)+' lost, goodput '+(100*l.g).toFixed(1)+'%',{fs:11.5,w:600,a:'end'})});
  el.innerHTML=RD.svg(w,top+2*(lh+26)-8,s,'One failure on a 16,384-GPU job: time lost under default recovery and under the best stacked design, same scale');
}
RD.onRender(draw);RD.onResize(draw);draw();
})();
