// ---- Reading, outliers: the migration explorer (a widget the reader drives: method and α; no autoplay, no steps). Numbers from QV.mig (checked against visuals_ref.py) ----
// SmoothQuant and AWQ on the real slice, each against the plain method it improves; the heat maps show X and W as they are quantised (after smoothing when the method smooths).
(function(){
  const $=id=>document.getElementById(id);
  if(!$('rd-mg'))return;
  const D=window.QD,L=D.lab,T=16,C=64,O=8;
  const M=[{k:'w8',n:'W8A8, plain',pair:'sq',sm:false},{k:'sq',n:'SmoothQuant',pair:'sq',sm:true},{k:'w4',n:'INT4 weights, plain',pair:'awq',sm:false},{k:'awq',n:'AWQ',pair:'awq',sm:true}];
  let mi=1,alpha=0.5;
  $('rd-mgM').innerHTML=M.map((m,i)=>'<button data-i="'+i+'"'+(i===mi?' class="on"':'')+'>'+m.n+'</button>').join('');
  const mm=A=>{let m=0;for(const r of A)for(const x of r)m=Math.max(m,Math.abs(x));return m};
  function whole(m){
    if(m.pair==='sq'){if(!m.sm)return L.w8a8.int8_tensor_static;const c=L.w8a8.smoothquant_curve;let b=c[0];for(const r of c)if(Math.abs(r[0]-alpha)<Math.abs(b[0]-alpha))b=r;return b[1]}
    if(!m.sm)return L.schemes.int4_g128.out_relerr;const c=L.stats.awq_curve;let b=c[0];for(const r of c)if(Math.abs(r[0]-alpha)<Math.abs(b[0]-alpha))b=r;return b[2]}
  function heat(R,x0,y0,cw,ch,mx,col,hl){let s='';for(let i=0;i<R.length;i++)for(let j=0;j<R[i].length;j++){const v=Math.abs(R[i][j])/mx;
      s+='<rect x="'+(x0+j*cw).toFixed(1)+'" y="'+(y0+i*ch).toFixed(1)+'" width="'+(cw+0.3).toFixed(1)+'" height="'+(ch+0.3).toFixed(1)+'" fill="'+(hl&&hl(i,j)?'var(--bad)':col)+'" fill-opacity="'+Math.max(0.04,Math.sqrt(v)).toFixed(3)+'"/>'}return s}
  function svg(m,r){
    const Wd=RD.width($('rd-mgP')),pl=52,pr=6,cw=(Wd-pl-pr)/C,ch=Math.max(5,Math.min(9,cw*1.1));
    let y=4,s='';const XA=r.Xs,WA=r.Ws,xm=r.xmax,wm=r.wmax;
    s+=RD.t(0,y+9,m.sm?'X ÷ s: 16 tokens':'X: 16 tokens',{fs:11,fill:'var(--mute)'});y+=14;
    s+=heat(XA,pl,y,cw,ch,xm,'var(--c1)',m.pair==='sq'?((i,j)=>Math.abs(XA[i][j])<4*r.dx):null);
    s+=RD.t(pl-4,y+ch*8,'max '+xm.toFixed(1),{a:'end',fs:11,fill:'var(--mute)'});y+=T*ch+8;
    for(let c=0;c<C;c++){if(r.isTop[c])s+='<rect x="'+(pl+c*cw)+'" y="'+y+'" width="'+cw+'" height="4" fill="var(--c5)"/>'}
    s+=RD.t(pl-4,y+6,'top 8',{a:'end',fs:11,fill:'var(--c5)'});y+=8;
    if(m.sm){const sm=Math.max(...r.s),hh=22;for(let c=0;c<C;c++){const h=hh*Math.log1p(r.s[c])/Math.log1p(sm);s+='<rect x="'+(pl+c*cw+cw*0.15)+'" y="'+(y+hh-h)+'" width="'+(cw*0.7)+'" height="'+Math.max(0.5,h)+'" fill="var(--c4)"/>'}
      s+=RD.t(pl-4,y+hh-4,'s',{a:'end',fs:11,fill:'var(--c4)'});y+=hh+6}
    s+=RD.t(0,y+9,m.sm?'W · s: 8 outputs':'W: 8 outputs',{fs:11,fill:'var(--mute)'});y+=14;
    s+=heat(WA,pl,y,cw,ch,wm,'var(--c3)',null);
    s+=RD.t(pl-4,y+ch*4,'max '+wm.toFixed(2),{a:'end',fs:11,fill:'var(--mute)'});y+=O*ch+6;
    return RD.svg(Wd,y,s,'Activation and weight heat maps, as quantised')}
  function draw(){const m=M[mi],r=QV.mig(m.k,alpha),other=M.find(o=>o.pair===m.pair&&o.sm!==m.sm),ro=QV.mig(other.k,alpha);
    $('rd-mgM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===mi));
    $('rd-mgA').disabled=!m.sm;$('rd-mgP').innerHTML=svg(m,r);
    let h=RD.stat('Largest activation',r.xmax.toFixed(1),m.sm?'after smoothing':'as measured');
    if(m.pair==='sq')h+=RD.stat('Activations within 4 steps of zero',(100*r.coarse).toFixed(0)+'%','INT8 step '+r.dx.toFixed(3));
    else h+=RD.stat('Weight error, salient against rest',(100*r.eTop).toFixed(1)+'% / '+(100*r.eRest).toFixed(1)+'%','weighted by mean |x|');
    h+=RD.stat('Output error, this slice',(100*r.err).toFixed(2)+'%',other.n+': '+(100*ro.err).toFixed(2)+'%');
    h+=RD.stat('Output error, whole layer',(100*whole(m)).toFixed(2)+'%',other.n+': '+(100*whole(other)).toFixed(2)+'%');
    $('rd-mgN').innerHTML=h}
  $('rd-mgM').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;mi=+b.dataset.i;draw()});
  $('rd-mgA').addEventListener('input',e=>{alpha=+e.target.value;$('rd-mgAv').textContent=alpha.toFixed(2);draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
