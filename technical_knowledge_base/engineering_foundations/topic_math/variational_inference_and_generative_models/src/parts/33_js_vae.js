// ---- A VAE on MNIST ----
(function(){
  const $=id=>document.getElementById(id);if(!$('va-map'))return;const V=window.VIVAE;
  const COL=['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#8c8c8c'];
  let hi=-1,mark=null;
  const un4=b64=>{const s=atob(b64),o=new Float32Array(s.length*2);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);o[2*i]=(c>>4)/15;o[2*i+1]=(c&15)/15}return o};
  const un1=b64=>{const s=atob(b64),o=new Uint8Array(s.length*8);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);for(let k=0;k<8;k++)o[8*i+k]=(c>>(7-k))&1}return o};
  const G=un4(V.grid),RX=un1(V.rx),RP=un4(V.rp);
  $('va-chips').innerHTML='<button data-d="-1" class="on">all digits</button>'+COL.map((c,d)=>'<button data-d="'+d+'" style="border-left:6px solid '+c+'">'+d+'</button>').join('');
  $('va-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;hi=+b.dataset.d;$('va-chips').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));map()});
  function map(){const el=$("va-map"),W=Math.min(RD.width(el),460),H=W,R=Math.max(3.2,1.04*Math.max(...V.latent.map(p=>Math.max(Math.abs(p[0]),Math.abs(p[1]))))),X=v=>(v+R)/(2*R)*W,Y=v=>(R-v)/(2*R)*H;
    let s='<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none" stroke="var(--line)"/>';
    [-5,-4,-3,-2,-1,0,1,2,3,4,5].filter(v=>Math.abs(v)<R).forEach(v=>{s+='<line x1="'+X(v)+'" y1="0" x2="'+X(v)+'" y2="'+H+'" stroke="var(--line)" stroke-opacity="0.6"/><line x1="0" y1="'+Y(v)+'" x2="'+W+'" y2="'+Y(v)+'" stroke="var(--line)" stroke-opacity="0.6"/>'});
    V.latent.forEach(p=>{const on=hi<0||p[2]===hi;s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="'+(on?2.2:1.4)+'" fill="'+COL[p[2]]+'" fill-opacity="'+(on?0.85:0.12)+'"/>'});
    if(mark)s+='<circle cx="'+X(mark[0])+'" cy="'+Y(mark[1])+'" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    s+=RD.t(4,H-6,'z₁ →',{fs:10.5})+RD.t(4,12,'↑ z₂',{fs:10.5});
    el.innerHTML=RD.svg(W,H,s,'Latent codes of test images')}
  function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#000'}
  function rgb(h){const c=document.createElement('canvas').getContext('2d');c.fillStyle=h;const v=c.fillStyle;if(v[0]==='#')return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16));const m=v.match(/\d+/g);return m.slice(0,3).map(Number)}
  function paint(ctx,x0,y0,px,get,size){const bg=rgb(css('--bg')),fg=rgb(css('--ink'));const img=ctx.createImageData(28*px,28*px);
    for(let r=0;r<28;r++)for(let c=0;c<28;c++){const v=get(r*28+c);for(let a=0;a<px;a++)for(let b=0;b<px;b++){const i=4*((r*px+a)*28*px+c*px+b);for(let k=0;k<3;k++)img.data[i+k]=Math.round(bg[k]+(fg[k]-bg[k])*v);img.data[i+3]=255}}
    ctx.putImageData(img,x0,y0)}
  function grid(){const cv=$('va-grid'),ctx=cv.getContext('2d');cv.width=280;cv.height=280;for(let i=0;i<10;i++)for(let j=0;j<10;j++)paint(ctx,j*28,i*28,1,k=>G[(i*10+j)*784+k]);
    cv.style.width=Math.min(RD.width(cv.parentNode),420)+'px'}
  $('va-grid').addEventListener('click',e=>{const r=e.target.getBoundingClientRect(),j=Math.min(9,Math.floor((e.clientX-r.left)/r.width*10)),i=Math.min(9,Math.floor((e.clientY-r.top)/r.height*10));
    mark=[V.gz[j],V.gz[9-i]];$('va-gz').textContent='Cell row '+(i+1)+', column '+(j+1)+': z = ('+mark[0].toFixed(2)+', '+mark[1].toFixed(2)+'), marked on the map.';map()});
  function rec(){const cv=$('va-rec'),ctx=cv.getContext('2d');const px=2;cv.width=10*28*px;cv.height=2*28*px;
    for(let d=0;d<10;d++){paint(ctx,d*28*px,0,px,k=>RX[d*784+k]);paint(ctx,d*28*px,28*px,px,k=>RP[d*784+k])}cv.style.width=Math.min(RD.width(cv.parentNode),560)+'px'}
  function meas(){const g=V.gap,e=V.epochs,last=e[e.length-1];const row=(k,v,d)=>'<tr><td>'+k+'</td><td class="num">'+v+'</td><td>'+d+'</td></tr>';
    $('va-meas').innerHTML='<div class="tw"><table class="mini" style="white-space:normal"><tr><th>Quantity</th><th>Value</th><th>Note</th></tr>'+
      row('Reconstruction after epoch 1, 30',e[0][1].toFixed(2)+', '+last[1].toFixed(2),'−E_q log p(x|z), 10,000 test images')+
      row('KL to the prior after epoch 1, 30',e[0][2].toFixed(2)+', '+last[2].toFixed(2),'closed form, section 7')+
      row('Negative ELBO after epoch 30',(last[1]+last[2]).toFixed(2),'reconstruction + KL')+
      row('Importance-weighted bound, K = 1, 10, 100, 1000',['1','10','100','1000'].map(k=>V.iwae[k].toFixed(1)).join(', '),'first 1,000 test images; encoder as proposal (section 4)')+
      row('Mean encoder sd per latent dimension',V.sdmean.map(v=>v.toFixed(3)).join(', '),'prior sd is 1')+
      row('log p(x) by quadrature',g.logpx_quadrature.toFixed(2),'first 100 test images, 161 × 161 grid per image (section 9)')+
      row('ELBO with the encoder’s q; with q optimised per image',g.elbo_encoder.toFixed(2)+'; '+g.elbo_optimised.toFixed(2),'same 100 images')+
      row('Approximation gap; amortisation gap',g.approximation_gap.toFixed(2)+'; '+g.amortisation_gap.toFixed(2),'Cremer et al. 2018 split')+'</table></div>'}
  let drawn=false;function all(){map();grid();rec();if(!drawn){meas();drawn=true}}
  RD.onRender(all,'t-vae');addEventListener('resize',()=>{if(!$('t-vae').hidden){map()}});
})();
